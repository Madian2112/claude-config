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

  process.stdout.write(parts.join('  '));
});
