#!/usr/bin/env node
/**
 * PreToolUse (Bash) — Regla absoluta: el agente NO commitea en repos de PROYECTO.
 *
 * Vos preparas el cambio, el humano revisa y ejecuta git. El unico repo donde el
 * agente si puede commitear es el de configuracion (~/.claude), porque ahi el
 * "producto" ES la config.
 *
 * Esta regla vivia solo en prosa dentro de dev-orchestrator.md. Ahora es codigo.
 */

'use strict';

const path = require('path');
const os = require('os');

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

  const cwd = (payload.cwd || process.cwd()).replace(/\\/g, '/').toLowerCase();
  const configDir = path.join(os.homedir(), '.claude').replace(/\\/g, '/').toLowerCase();

  // El repo de configuracion queda exento (ahi si trabajamos con git normalmente).
  const isConfigRepo = cwd.startsWith(configDir) || /claude-config/.test(cwd);
  if (isConfigRepo) process.exit(0);

  const match = cmd.match(/\bgit\s+(commit|push|merge|rebase|cherry-pick)\b/);
  if (!match) process.exit(0);

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
