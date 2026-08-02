'use strict';

/**
 * Notificacion de escritorio (toast de Windows via BurntToast) para poder
 * desligarse del CLI. Cubre: Notification (permission_prompt, idle_prompt)
 * y SubagentStart. No-op en cualquier plataforma que no sea Windows.
 *
 * Un hook de notificacion falla siempre abierto: nunca debe bloquear ni
 * retrasar a Claude Code, aunque PowerShell o BurntToast no esten disponibles.
 */

const { spawn } = require('node:child_process');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function forPowerShellSingleQuoted(text) {
  return String(text ?? '')
    .replace(/'/g, "''")
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 200);
}

function buildMessage(input) {
  const event = input.hook_event_name;

  if (event === 'Notification') {
    if (input.notification_type === 'permission_prompt') {
      return {
        title: 'Claude Code — permiso pendiente',
        body: input.message || 'Necesita que apruebes una accion',
      };
    }
    if (input.notification_type === 'idle_prompt') {
      return {
        title: 'Claude Code — esperando',
        body: 'Termino de responder y espera tu proximo mensaje',
      };
    }
    return { title: 'Claude Code', body: input.message || 'Notificacion' };
  }

  if (event === 'SubagentStart') {
    const agentType = input.agent_type || 'sub-agente';
    return { title: 'Claude Code — sub-agente', body: `Arranco: ${agentType}` };
  }

  return null;
}

async function main() {
  if (process.platform !== 'win32') {
    return;
  }

  let input = {};
  try {
    input = JSON.parse((await readStdin()) || '{}');
  } catch {
    return;
  }

  const message = buildMessage(input);
  if (!message) {
    return;
  }

  const title = forPowerShellSingleQuoted(message.title);
  const body = forPowerShellSingleQuoted(message.body);

  const psScript = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    'if (-not (Get-Module -ListAvailable -Name BurntToast)) { exit 0 }',
    'Import-Module BurntToast',
    `New-BurntToastNotification -Text '${title}', '${body}'`,
  ].join('; ');

  try {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  } catch {
    // fail open — nunca romper el hook por esto
  }
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
