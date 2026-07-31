#!/usr/bin/env node
/**
 * SessionStart + UserPromptSubmit — Le pone nombre a la sesion para que `/resume` muestre algo
 * util, y lo mantiene fresco mientras la sesion avanza.
 *
 * EL PROBLEMA:
 * El picker de `/resume` no se puede customizar: es UI interna de Claude Code, no hay setting
 * ni hook que dibuje esa lista. Lo que SI tiene es una cadena de fallback, textual de la doc:
 *
 *   "Each row shows the session name if you set one, otherwise the AI-generated session title,
 *    conversation summary, or first prompt"
 *
 * Cuando en la lista ves un pedazo de conversacion en vez de un titulo, es porque cayo hasta el
 * ULTIMO eslabon. No se arregla cambiando el picker — se arregla llenando el PRIMERO.
 *
 * QUE HACE:
 * Emite `sessionTitle` con el mismo dato que la statusline muestra como ‹sesion›, asi las dos
 * vistas dicen lo mismo: el change SDD abierto con su fase, o la rama de trabajo.
 *
 * POR QUE TAMBIEN CORRE EN UserPromptSubmit (v2.1.101+, confirmado en el changelog oficial:
 * "UserPromptSubmit hooks can set the session title via hookSpecificOutput.sessionTitle"):
 * SessionStart solo dispara al abrir/resumir/compactar. En una sesion larga el change SDD activo
 * puede avanzar de fase varias veces SIN que ninguno de esos eventos ocurra, y el titulo de arriba
 * quedaba pegado a la fase de cuando arranco la sesion — desincronizado del `SDD:` de la statusline,
 * que si se recalcula en cada render. Repetir el mismo calculo en cada prompt lo mantiene al dia.
 *
 * DOS COSAS QUE NO PISA, Y ES DELIBERADO:
 *
 * 1. Un nombre puesto por vos (`--name`, `/rename`, Ctrl+R en el picker). Llega en el input como
 *    `session_title`; si viene, nos vamos sin tocar nada.
 *
 * 2. El titulo autogenerado por IA, cuando ese titulo va a ser MEJOR. Claude Code escribe un
 *    resumen de tu primer prompt con un modelo rapido, y ese resumen suele ser mas informativo
 *    que un nombre de rama. Pero en SessionStart corremos ANTES del primer prompt: no tenemos con
 *    que competir. Por eso solo ponemos nombre cuando tenemos algo genuinamente mejor —un change
 *    SDD abierto o una rama de feature—, y en una sesion suelta sobre master nos callamos la boca.
 *    Ponerle "master" a todo seria peor que el problema que vinimos a resolver.
 *
 * OJO — riesgo asumido a proposito: no hay confirmacion oficial de que `session_title` llegue
 * poblado en el payload de UserPromptSubmit igual que en SessionStart (la doc no lo detalla). Si
 * en la practica NO llega, el punto 1 de arriba deja de protegerse en este evento y un `/rename`
 * manual podria pisarse en el proximo mensaje. Probar: renombrar la sesion y mandar un mensaje;
 * si el nombre puesto a mano no sobrevive, sacar este hook de `UserPromptSubmit` en settings.json
 * y dejarlo solo en `SessionStart`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { faseValida } = require('./lib/agent-meta');

const MAX = 40;
const RAMAS_SIN_VALOR = /^(master|main|develop|dev|trunk|HEAD)$/i;

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  let titulo = '';
  let evento = 'SessionStart';
  try {
    const payload = JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}');
    evento = payload.hook_event_name || evento;
    titulo = main(payload);
  } catch {
    /* nunca frenamos la sesion por el titulo */
  }

  if (titulo) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: evento, sessionTitle: titulo },
      })
    );
  }
  process.exit(0);
});

const corto = (s) => (s.length > MAX ? s.slice(0, MAX - 1) + '…' : s);

/** Change SDD abierto mas reciente: `{change}→{fase}`. Mismo criterio que la statusline. */
function changeSdd(cwd) {
  try {
    const changesDir = path.join(cwd, '.atl', 'changes');
    let mejor = null;
    for (const name of fs.readdirSync(changesDir)) {
      const st = path.join(changesDir, name, 'state.md');
      if (!fs.existsSync(st)) continue;
      const m = fs.readFileSync(st, 'utf8').match(/##\s*Current Phase\s*\r?\n+\s*([^\r\n]+)/i);
      // state.md a veces trae prosa despues del token ("verify (completado — ...)").
      const fase = (m ? m[1] : '').trim().split(/[(\-–—;,]/)[0].trim();
      // Si no es uno de los 9 tokens del protocolo (sdd-artifact-protocol), el state.md esta
      // corrupto o a medio escribir: mejor no mostrarlo que mostrar texto libre/markdown crudo.
      if (!faseValida(fase) || /^closed$/i.test(fase)) continue;
      const mtime = fs.statSync(st).mtimeMs;
      if (!mejor || mtime > mejor.mtime) mejor = { name, fase, mtime };
    }
    return mejor ? `${mejor.name}→${mejor.fase}` : '';
  } catch {
    return '';
  }
}

/** Rama de trabajo, sin el prefijo de tipo: "feat/12345-alta-vales" -> "12345-alta-vales". */
function rama(cwd) {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (r.status !== 0) return '';
  const full = (r.stdout || '').trim();
  if (!full || RAMAS_SIN_VALOR.test(full)) return '';
  return full.split('/').pop() || full;
}

function main(p) {
  // Nombre puesto a mano: es de la persona, no se toca.
  if (p.session_title) return '';

  const cwd = p.cwd || process.cwd();
  return corto(changeSdd(cwd) || rama(cwd) || '');
}
