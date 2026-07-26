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

  // Fase SDD del change abierto mas reciente
  try {
    const changesDir = path.join(cwd, '.atl', 'changes');
    let best = null;
    for (const name of fs.readdirSync(changesDir)) {
      const st = path.join(changesDir, name, 'state.md');
      if (!fs.existsSync(st)) continue;
      const m = fs.readFileSync(st, 'utf8').match(/##\s*Current Phase\s*\r?\n+\s*([^\r\n]+)/i);
      const fase = (m ? m[1] : '').trim();
      if (!fase || /^closed$/i.test(fase)) continue;
      const mtime = fs.statSync(st).mtimeMs;
      if (!best || mtime > best.mtime) best = { name, fase, mtime };
    }
    if (best) parts.push(`[32mSDD:${best.name}→${best.fase}[0m`);
  } catch {
    /* proyecto sin SDD */
  }

  process.stdout.write(parts.join('  '));
});
