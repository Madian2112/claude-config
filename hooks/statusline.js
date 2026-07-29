#!/usr/bin/env node
/**
 * statusLine — Barra de estado.
 *
 * Con 9 sub-agentes corriendo en background y modelos mixtos, tener a la vista
 * proyecto / rama / modelo / fase SDD evita la mitad de las preguntas de "¿en que
 * estabamos?".
 *
 *   ~/erp-facturacion  feat/12345-alta-vales*  [sonnet]  SDD:alta-vales→design
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { RUNS_DIR, etiqueta } = require('./lib/agent-meta');

/**
 * Sub-agentes EN VUELO de esta sesion, leyendo las fichas que abre subagent-start.js.
 *
 * Se descartan las fichas de mas de 2h: si un sub-agente muere de forma sucia, SubagentStop
 * nunca corre y la ficha queda huerfana para siempre. Mejor mostrar de menos que mentir.
 */
function enVuelo(sessionId) {
  let archivos = [];
  try {
    archivos = fs.readdirSync(RUNS_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }

  const corte = Date.now() - 2 * 60 * 60 * 1000;
  const vivos = [];
  for (const f of archivos) {
    try {
      const full = path.join(RUNS_DIR, f);
      if (fs.statSync(full).mtimeMs < corte) continue;
      const ficha = JSON.parse(fs.readFileSync(full, 'utf8'));
      // Otra sesion en paralelo puede tener sus propios sub-agentes: no son asunto de esta barra.
      if (sessionId && ficha.session_id && ficha.session_id !== sessionId) continue;
      vivos.push(ficha);
    } catch {
      /* ficha ilegible: se ignora */
    }
  }
  return vivos.sort((a, b) => (a.started_ms || 0) - (b.started_ms || 0));
}

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  let p = {};
  try {
    p = JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}');
  } catch {
    /* seguimos con defaults */
  }

  const cwd = (p.workspace && p.workspace.current_dir) || p.cwd || process.cwd();
  const parts = [`[36m${path.basename(cwd)}[0m`];

  // Nombre de la sesion. OJO: el campo puede NO venir — solo aparece si la nombraste con
  // --name / /rename, o una vez que existe un titulo autogenerado. El nombre por defecto
  // (tipo "my-app-3f") NO lo popula. Por eso siempre hay que tolerar la ausencia.
  const sesion = (p.session_name || '').trim();
  if (sesion) {
    const corta = sesion.length > 26 ? sesion.slice(0, 25) + '…' : sesion;
    parts.push(`[90m‹${corta}›[0m`);
  }

  // Rama + dirty flag
  const git = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (git.status === 0) {
    const branch = (git.stdout || '').trim();
    const dirty =
      (spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', timeout: 3000 }).stdout || '').trim()
        .length > 0
        ? '*'
        : '';
    if (branch) parts.push(`[33m${branch}${dirty}[0m`);
  }

  // Modelo activo
  const model = (p.model && (p.model.display_name || p.model.id)) || '';
  if (model) parts.push(`[35m[${model}][0m`);

  // Agente principal de la sesion. El campo `agent` SOLO llega cuando se corre con --agent
  // o con el setting `agent` configurado; en una sesion normal no existe.
  const agente = (p.agent && p.agent.name) || '';

  // La fase SDD se muestra UNICAMENTE bajo dev-orchestrator: es el unico contexto donde el
  // flujo por fases esta corriendo. En una sesion suelta ese dato es ruido.
  if (agente === 'dev-orchestrator') {
    try {
      const changesDir = path.join(cwd, '.atl', 'changes');
      let best = null;
      for (const name of fs.readdirSync(changesDir)) {
        const st = path.join(changesDir, name, 'state.md');
        if (!fs.existsSync(st)) continue;
        const m = fs.readFileSync(st, 'utf8').match(/##\s*Current Phase\s*\r?\n+\s*([^\r\n]+)/i);
        // state.md a veces trae prosa despues del token ("verify (completado — ...)").
        // Nos quedamos con el token: cortamos en el primer parentesis, guion o punto y coma.
        const fase = (m ? m[1] : '')
          .trim()
          .split(/[(\-–—;,]/)[0]
          .trim()
          .slice(0, 24);
        if (!fase || /^closed$/i.test(fase)) continue;
        const mtime = fs.statSync(st).mtimeMs;
        if (!best || mtime > best.mtime) best = { name, fase, mtime };
      }
      if (best) {
        const change = best.name.length > 28 ? best.name.slice(0, 27) + '…' : best.name;
        parts.push(`[32mSDD:${change}→${best.fase}[0m`);
      }
    } catch {
      /* proyecto sin SDD */
    }
  } else if (agente) {
    // Otro agente principal: mostrar cual, para saber bajo que persona estas trabajando.
    parts.push(`[34m@${agente}[0m`);
  }

  // Sub-agentes corriendo AHORA, con su modelo. Con 9 sub-agentes y modelos mixtos (opus en
  // design, haiku en spec), saber que hay en vuelo y con que modelo es la diferencia entre
  // esperar tranquilo y preguntarse si se colgo.
  const corriendo = enVuelo(p.session_id || '');
  if (corriendo.length) {
    const visibles = corriendo.slice(0, 2).map((f) => etiqueta(f.agent_type, f.model));
    const resto = corriendo.length - visibles.length;
    parts.push(`[36m⚙ ${visibles.join(' ')}${resto > 0 ? ` +${resto}` : ''}[0m`);
  }

  process.stdout.write(parts.join('  '));
});
