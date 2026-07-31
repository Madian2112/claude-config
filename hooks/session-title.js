#!/usr/bin/env node
/**
 * SessionStart — Le pone nombre a la sesion para que `/resume` muestre algo util.
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
 * Emite `sessionTitle` con la rama de trabajo, para que `/resume` muestre algo util en vez de un
 * pedazo de conversacion.
 *
 * DELIBERADAMENTE NO incluye la fase SDD (change→fase). La continuidad entre sesiones de un mismo
 * feature ya la da Engram (mem_context) + los archivos `.atl/changes/` cuando arrancas con
 * dev-orchestrator — el titulo de sesion no necesita repetirla, y en una sesion SIN el orquestador
 * ese dato no aporta nada. La statusline (`SDD:{change}→{fase}` en la barra de abajo) es harina de
 * otro costal: esa es una vista EN VIVO mientras laburas bajo dev-orchestrator, no un mecanismo de
 * continuidad entre sesiones, y sigue mostrandolo sin cambios.
 *
 * DOS COSAS QUE NO PISA, Y ES DELIBERADO:
 *
 * 1. Un nombre puesto por vos (`--name`, `/rename`, Ctrl+R en el picker). Llega en el input como
 *    `session_title`; si viene, nos vamos sin tocar nada.
 *
 * 2. El titulo autogenerado por IA, cuando ese titulo va a ser MEJOR. Claude Code escribe un
 *    resumen de tu primer prompt con un modelo rapido, y ese resumen suele ser mas informativo
 *    que un nombre de rama. Pero nosotros corremos ANTES del primer prompt: no tenemos con que
 *    competir. Por eso solo ponemos nombre cuando tenemos algo genuinamente mejor —una rama de
 *    feature—, y en una sesion suelta sobre master nos callamos la boca. Ponerle "master" a todo
 *    seria peor que el problema que vinimos a resolver.
 */

'use strict';

const { spawnSync } = require('child_process');

const MAX = 40;
const RAMAS_SIN_VALOR = /^(master|main|develop|dev|trunk|HEAD)$/i;

const CHUNKS = [];
process.stdin.on('data', (c) => CHUNKS.push(c));
process.stdin.on('end', () => {
  let titulo = '';
  try {
    titulo = main(JSON.parse(Buffer.concat(CHUNKS).toString('utf8') || '{}'));
  } catch {
    /* nunca frenamos la sesion por el titulo */
  }

  if (titulo) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: titulo },
      })
    );
  }
  process.exit(0);
});

const corto = (s) => (s.length > MAX ? s.slice(0, MAX - 1) + '…' : s);

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
  return corto(rama(cwd) || '');
}
