#!/usr/bin/env node
/**
 * PreToolUse (Bash) — Regla absoluta: el agente NO commitea en repos de PROYECTO.
 *
 * Vos preparas el cambio, el humano revisa y ejecuta git. El unico repo donde el
 * agente si puede commitear es el de configuracion (~/.claude), porque ahi el
 * "producto" ES la config.
 *
 * Esta regla vivia solo en prosa dentro de dev-orchestrator.md. Ahora es codigo.
 *
 * COMO DETECTAMOS EL REPO DE CONFIG (y por que NO por nombre de carpeta):
 * Una version anterior matcheaba el cwd contra los literales ".claude" / "claude-config" por
 * SUFIJO de path. Barato, pero le daba la exencion a CUALQUIER repo de proyecto que un cliente
 * nombrara igual (ej. alguien clona este mismo repo con otro fin, o un proyecto vive en una
 * carpeta ".claude"): la "regla absoluta" quedaba burlada por un nombre de carpeta, exactamente
 * el error que `precommit-validate.js` ya evita comparando contra el TOPLEVEL real de git.
 *
 * Ahora hacemos lo mismo aca, pero solo cuando hace falta: `git rev-parse --show-toplevel` es un
 * spawn por comando, y este hook corre en CADA Bash. Filtramos primero por el comando riesgoso
 * (regex, gratis) y recien si matchea pagamos el spawn — que es exactamente el puñado de casos
 * donde la exencion importa.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.resolve(__dirname, '..');

/** Normaliza para comparar rutas entre Git Bash (/c/Users/...) y Windows (C:\Users\...). */
function norm(p) {
  try {
    return fs.realpathSync(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  } catch {
    return String(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }
}

/** ¿El cwd cae dentro del repo de configuracion? Contra el toplevel real, no contra el nombre. */
function esRepoDeConfig(cwd) {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
    timeout: 5000,
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) return false;
  const top = norm((r.stdout || '').trim());
  return !!top && top === norm(configDir);
}

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  try {
    main(JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}'));
  } catch {
    process.exit(0);
  }
});

function main(payload) {
  const cmd = (payload.tool_input && payload.tool_input.command) || '';
  if (!cmd.trim()) process.exit(0);

  const match = cmd.match(/\bgit\s+(commit|push|merge|rebase|cherry-pick)\b/);
  if (!match) process.exit(0);

  const cwd = payload.cwd || process.cwd();
  if (esRepoDeConfig(cwd)) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `❌ REGLA ABSOLUTA — el agente no ejecuta "git ${match[1]}" en repos de proyecto.\n` +
          'Dejá el working tree listo y resumí el cambio; el humano revisa, commitea y pushea.\n' +
          'Podés usar git status / diff / log / branch / show sin restriccion. Ver skill branch-pr.',
      },
    })
  );
  process.exit(0);
}
