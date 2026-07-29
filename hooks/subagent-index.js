#!/usr/bin/env node
/**
 * SubagentStop — Cierre e indice de corridas de sub-agentes.
 *
 * Complementa la skill agent-output-persistence. Esa skill le PIDE al sub-agente
 * que guarde su output; si el sub-agente falla, se queda sin tokens o ignora la
 * instruccion, no queda rastro. Este hook siempre deja el registro, porque corre
 * fuera del modelo.
 *
 * Ojo con el alcance: el hook NO puede recuperar el texto final del sub-agente.
 * Lo que garantiza es la TRAZA (que corrio, con que modelo, cuanto tardo y donde
 * esta su transcript), de modo que el orquestador pueda ir a buscarlo aunque el
 * archivo .md no exista.
 *
 * Hace tres cosas:
 *   1. Cierra la ficha que abrio subagent-start.js y calcula la duracion real.
 *   2. Escribe la entrada en _index.jsonl, ahora con modelo, agent_id y duracion.
 *   3. Devuelve UNA linea al hilo padre via additionalContext.
 *
 * El punto 3 es lo que cambia el dia a dia: hasta ahora el indice era un .jsonl que
 * nadie abria nunca. SubagentStop soporta `hookSpecificOutput.additionalContext`
 * hacia la conversacion padre, asi que el orquestador ve que termino, con que modelo
 * y cuanto tardo, sin que nadie lea nada. UNA linea, no un parrafo: el contexto del
 * orquestador es justamente lo que estamos cuidando.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { RUNS_DIR, OUT_DIR, modeloDe, etiqueta, duracion } = require('./lib/agent-meta');

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  let linea = '';
  try {
    linea = main(JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}'));
  } catch {
    /* nunca frenamos por el indice */
  }

  if (linea) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: linea },
      })
    );
  }
  process.exit(0);
});

/** El agent_id viene del payload: se sanea antes de convertirlo en nombre de archivo. */
const fichaDe = (agentId) => path.join(RUNS_DIR, `${agentId.replace(/[^\w.-]/g, '_').slice(0, 120)}.json`);

function main(p) {
  const agentType = p.agent_type || 'desconocido';
  const agentId = p.agent_id || '';

  // ---------------------------------------- 1. Cerrar la ficha en vuelo
  let ficha = null;
  if (agentId) {
    const fichaPath = fichaDe(agentId);
    if (fs.existsSync(fichaPath)) {
      try {
        ficha = JSON.parse(fs.readFileSync(fichaPath, 'utf8'));
      } catch {
        /* ficha corrupta: seguimos, solo perdemos la duracion */
      }
      try {
        fs.unlinkSync(fichaPath);
      } catch {
        /* si no se puede borrar, el barrido por TTL de session-bootstrap la limpia */
      }
    }
  }

  const model = (ficha && ficha.model) || modeloDe(agentType);
  const ms = ficha && ficha.started_ms ? Date.now() - ficha.started_ms : NaN;
  const dur = duracion(ms);

  // ---------------------------------------------- 2. Indice persistente
  const entry = {
    ts: new Date().toISOString(),
    agent_type: agentType,
    agent_id: agentId,
    model: model || null,
    duration_ms: Number.isFinite(ms) ? ms : null,
    session_id: p.session_id || '',
    transcript_path: p.transcript_path || '',
    cwd: p.cwd || '',
  };

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.appendFileSync(path.join(OUT_DIR, '_index.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    /* ignorar */
  }

  // ------------------------------- 3. Una linea de vuelta al orquestador
  return `✅ sub-agente ${etiqueta(agentType, model)} terminó${dur ? ` en ${dur}` : ''}.`;
}
