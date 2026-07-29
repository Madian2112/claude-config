'use strict';

/**
 * Resolucion de metadatos de sub-agentes, compartida por los hooks y la statusline.
 *
 * POR QUE EXISTE:
 * Ni `SubagentStart` ni `SubagentStop` traen el modelo del sub-agente en su payload. La doc
 * lista agent_type, agent_id, prompt, description y last_assistant_message — y nada mas.
 * Como el modelo lo decidimos NOSOTROS en el frontmatter de agents/*.md, lo resolvemos desde
 * ahi: es la fuente de verdad y no depende de que la plataforma nos lo cuente.
 *
 * OJO: `agent_type` es el campo `name` del frontmatter, que NO tiene por que coincidir con el
 * nombre del archivo. Por eso se indexa por `name` leido, nunca por basename.
 */

const fs = require('fs');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.resolve(__dirname, '..', '..');

const RUNS_DIR = path.join(configDir, 'session-state', 'agent-runs');
const OUT_DIR = path.join(configDir, 'session-state', 'agent-outputs');

/** Indice { name -> { model, effort, color, file } } leyendo el frontmatter de agents/. */
function cargarAgentes() {
  const dir = path.join(configDir, 'agents');
  const idx = {};
  let archivos = [];
  try {
    archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return idx;
  }

  for (const f of archivos) {
    try {
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      if (!txt.startsWith('---')) continue;
      const fin = txt.indexOf('\n---', 3);
      if (fin === -1) continue;
      const fm = txt.slice(4, fin);

      const campo = (k) => {
        const m = fm.match(new RegExp(`^${k}:[ \\t]*(.+?)[ \\t]*$`, 'm'));
        return m ? m[1].replace(/^["']|["']$/g, '') : '';
      };

      const name = campo('name');
      if (!name) continue;
      idx[name] = { model: campo('model') || 'inherit', effort: campo('effort'), color: campo('color'), file: f };
    } catch {
      /* un agente ilegible no puede tumbar al hook */
    }
  }
  return idx;
}

/** Modelo declarado para un agent_type. Devuelve '' si no lo conocemos (agente nativo o de plugin). */
function modeloDe(agentType) {
  const meta = cargarAgentes()[agentType];
  return meta ? meta.model : '';
}

/** Etiqueta compacta para UI: `sdd-design[opus]`, o solo `Explore` si no sabemos el modelo. */
function etiqueta(agentType, model) {
  const m = model || modeloDe(agentType);
  return m && m !== 'inherit' ? `${agentType}[${m}]` : agentType;
}

/** Duracion legible y corta: 45s, 3m12s, 1h04m. */
function duracion(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
}

module.exports = { configDir, RUNS_DIR, OUT_DIR, cargarAgentes, modeloDe, etiqueta, duracion };
