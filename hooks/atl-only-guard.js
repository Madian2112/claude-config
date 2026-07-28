#!/usr/bin/env node
/**
 * PreToolUse (Edit|MultiEdit|Write) — scoped por frontmatter a los sub-agentes de solo-lectura.
 *
 * PROBLEMA QUE RESUELVE:
 * sdd-verify se describe como "Solo lectura — no modifica codigo" y su cuerpo repite "NO
 * modificar codigo — solo reportar problemas, no corregirlos". Pero necesita `Write` de verdad,
 * porque tiene que producir `.atl/changes/{change}/verify-report.md` y `.atl/tech-debt.md`.
 *
 * POR QUE NO ALCANZA `disallowedTools`:
 * `disallowedTools` saca un TOOL entero. La restriccion real acá no es sobre el tool, es sobre
 * el DESTINO: escribir en `.atl/` esta bien, escribir en `src/` no. Sacarle Write lo romperia;
 * dejarselo sin guard deja la regla en prosa. La unica forma de expresar "solo dentro de .atl/"
 * es un hook que mire el path.
 *
 * Se engancha via el campo `hooks:` del frontmatter del sub-agente, asi que su alcance es la
 * vida del agente: en el hilo principal no existe.
 *
 * Falla ABIERTO ante lo inesperado, salvo cuando puede afirmar que el destino esta fuera de .atl/.
 */

'use strict';

const path = require('path');

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
  const destino = (payload.tool_input && payload.tool_input.file_path) || '';
  if (!destino) process.exit(0);

  const cwd = payload.cwd || process.cwd();

  // Resolvemos contra el cwd para que un path relativo no se escape, y normalizamos separadores
  // porque en Windows llegan con backslash.
  const abs = path.resolve(cwd, destino).replace(/\\/g, '/');

  // Permitido: cualquier cosa bajo un directorio .atl/ (artifacts SDD, tech-debt tracker).
  if (/(^|\/)\.atl\//i.test(abs)) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `❌ FASE DE SOLO LECTURA — este sub-agente no escribe fuera de \`.atl/\`.\n` +
          `Destino rechazado: ${destino}\n\n` +
          'Verificar es reportar, no corregir. Si encontraste algo para arreglar, va al reporte ' +
          'como CRITICAL / WARNING / SUGGESTION y lo corrige quien corresponda (sdd-apply o el ' +
          'humano). Arreglarlo vos mismo destruye la evidencia de que el codigo entregado estaba ' +
          'mal, y ademas te convierte en juez y parte.\n\n' +
          'Salidas validas: `.atl/changes/{change}/verify-report.md` y `.atl/tech-debt.md`.',
      },
    })
  );
  process.exit(0);
}
