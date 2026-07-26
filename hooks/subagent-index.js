#!/usr/bin/env node
/**
 * SubagentStop — Indice de corridas de sub-agentes.
 *
 * Complementa la skill agent-output-persistence. Esa skill le PIDE al sub-agente
 * que guarde su output; si el sub-agente falla, se queda sin tokens o ignora la
 * instruccion, no queda rastro. Este hook siempre deja el registro, porque corre
 * fuera del modelo.
 *
 * Ojo con el alcance: el hook NO puede recuperar el texto final del sub-agente.
 * Lo que garantiza es la TRAZA (que corrio, cuando, y donde esta su transcript),
 * de modo que el orquestador pueda ir a buscarlo aunque el archivo .md no exista.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  try {
    const p = JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}');
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const dir = path.join(configDir, 'session-state', 'agent-outputs');
    fs.mkdirSync(dir, { recursive: true });

    const entry = {
      ts: new Date().toISOString(),
      agent_type: p.agent_type || 'desconocido',
      session_id: p.session_id || '',
      transcript_path: p.transcript_path || '',
      cwd: p.cwd || '',
    };
    fs.appendFileSync(path.join(dir, '_index.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    /* nunca frenamos por el indice */
  }
  process.exit(0);
});
