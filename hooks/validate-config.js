#!/usr/bin/env node
/**
 * Validador de la configuracion. Corrélo a mano antes de commitear:
 *
 *     node hooks/validate-config.js
 *
 * POR QUE EXISTE: con 26 skills, 10 agentes y 6 hooks, la informacion vive en varios
 * lugares que tienen que estar de acuerdo entre si. Cada vez que se borra o renombra
 * algo, quedan referencias colgadas — y se descubren leyendo a mano, tarde y por casualidad.
 * Este script las encuentra en dos segundos.
 *
 * Comprueba:
 *   1. Frontmatter YAML presente y parseable en agents/ y skills/
 *   2. Todo `skills:` de un agente apunta a una skill que existe
 *   3. Toda skill nombrada en SKILL-REGISTRY.md tiene su carpeta
 *   4. Toda skill de stack esta en el registry (y al reves)
 *   5. Todo comando de hook en settings.json apunta a un archivo existente
 *   6. settings.json es JSON valido y no quedaron `model` invalidos en agentes
 *
 * Sale con codigo 1 si encuentra errores, 0 si esta todo bien.
 * Sin dependencias: parser de YAML minimo, suficiente para frontmatter plano.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errores = [];
const avisos = [];

const err = (m) => errores.push(m);
const warn = (m) => avisos.push(m);

/** Extrae el frontmatter crudo de un archivo markdown. */
function frontmatter(file) {
  const txt = fs.readFileSync(file, 'utf8');
  if (!txt.startsWith('---')) return null;
  const end = txt.indexOf('\n---', 3);
  if (end === -1) return null;
  return txt.slice(4, end);
}

/** Parser minimo: claves de primer nivel + listas `- item`. Alcanza para frontmatter. */
function parseFm(raw) {
  const out = {};
  let claveLista = null;
  for (const linea of raw.split('\n')) {
    const item = linea.match(/^\s+-\s+(.+?)\s*$/);
    if (item && claveLista) {
      out[claveLista].push(item[1].replace(/^["']|["']$/g, ''));
      continue;
    }
    const kv = linea.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v.trim() === '') {
      claveLista = k;
      out[k] = [];
    } else {
      claveLista = null;
      out[k] = v.trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const dirs = (p) =>
  fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

// ---------------------------------------------------------------- 1. Skills
const skillsDir = path.join(ROOT, 'skills');
const skills = new Set();

for (const nombre of dirs(skillsDir)) {
  const file = path.join(skillsDir, nombre, 'SKILL.md');
  if (!fs.existsSync(file)) {
    err(`skills/${nombre}/ no tiene SKILL.md`);
    continue;
  }
  skills.add(nombre);
  const raw = frontmatter(file);
  if (raw === null) {
    err(`skills/${nombre}/SKILL.md no tiene frontmatter cerrado`);
    continue;
  }
  const fm = parseFm(raw);
  if (!fm.description) warn(`skills/${nombre}: sin 'description' — Claude no sabe cuando activarla`);
  if (fm.name && fm.name !== nombre) {
    warn(`skills/${nombre}: el campo name es "${fm.name}" y no coincide con la carpeta`);
  }
}

// ---------------------------------------------------------------- 2. Agentes
const agentsDir = path.join(ROOT, 'agents');
const MODELOS = ['haiku', 'sonnet', 'opus', 'fable', 'inherit'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const COLORES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

for (const f of fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter((x) => x.endsWith('.md')) : []) {
  const file = path.join(agentsDir, f);
  const raw = frontmatter(file);
  if (raw === null) {
    err(`agents/${f}: sin frontmatter cerrado`);
    continue;
  }
  const fm = parseFm(raw);

  if (!fm.name) err(`agents/${f}: falta 'name' (obligatorio)`);
  if (!fm.description) err(`agents/${f}: falta 'description' (obligatorio)`);
  if (fm.model && !MODELOS.includes(fm.model) && !fm.model.startsWith('claude-')) {
    err(`agents/${f}: model "${fm.model}" no es valido (${MODELOS.join(', ')} o un id completo)`);
  }
  if (fm.effort && !EFFORTS.includes(fm.effort)) {
    err(`agents/${f}: effort "${fm.effort}" no es valido (${EFFORTS.join(', ')})`);
  }
  if (fm.color && !COLORES.includes(fm.color)) {
    err(`agents/${f}: color "${fm.color}" no es valido (${COLORES.join(', ')})`);
  }
  // La razon #1 por la que un agente arranca roto: precargar una skill que ya no existe.
  for (const s of fm.skills || []) {
    if (!skills.has(s)) err(`agents/${f}: precarga la skill "${s}", que NO existe en skills/`);
  }
}

// -------------------------------------------------------------- 3. Registry
const registryFile = path.join(skillsDir, 'SKILL-REGISTRY.md');
if (!fs.existsSync(registryFile)) {
  err('falta skills/SKILL-REGISTRY.md');
} else {
  const reg = fs.readFileSync(registryFile, 'utf8');

  // Skills nombradas en el registry que ya no existen (referencias colgadas)
  const nombradas = new Set();
  for (const m of reg.matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)) nombradas.add(m[1]);
  for (const m of reg.matchAll(/^### ([a-z0-9-]+)$/gm)) nombradas.add(m[1]);
  for (const n of nombradas) {
    if (!skills.has(n)) err(`SKILL-REGISTRY menciona "${n}", que ya no existe en skills/`);
  }

  // Skills de stack que existen pero nadie registro (el orquestador no las va a inyectar)
  const esStack = (n) => /^(cc-|csharp-|angular-|sql-|typescript-|dotnet-|efcore-|frontend-)/.test(n);
  for (const n of skills) {
    if (esStack(n) && !reg.includes(`### ${n}`)) {
      err(`skills/${n} es de stack pero NO tiene compact rules en SKILL-REGISTRY`);
    }
  }
}

// -------------------------------------------------------------- 4. Settings
const settingsFile = path.join(ROOT, 'settings.json');
try {
  const s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  const eventos = s.hooks || {};
  for (const [evento, grupos] of Object.entries(eventos)) {
    for (const g of grupos) {
      for (const h of g.hooks || []) {
        const m = (h.command || '').match(/hooks\/([\w.-]+\.js)/);
        if (!m) continue;
        if (!fs.existsSync(path.join(ROOT, 'hooks', m[1]))) {
          err(`settings.json → hook ${evento} apunta a hooks/${m[1]}, que no existe`);
        }
      }
    }
  }
  const sl = (s.statusLine && s.statusLine.command) || '';
  const mSl = sl.match(/hooks\/([\w.-]+\.js)/);
  if (mSl && !fs.existsSync(path.join(ROOT, 'hooks', mSl[1]))) {
    err(`settings.json → statusLine apunta a hooks/${mSl[1]}, que no existe`);
  }
} catch (e) {
  err(`settings.json no es JSON valido: ${e.message}`);
}

// ------------------------------------------------------------- 5. Sintaxis JS
for (const f of fs.readdirSync(path.join(ROOT, 'hooks')).filter((x) => x.endsWith('.js'))) {
  try {
    new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'hooks', f), 'utf8'), { filename: f });
  } catch (e) {
    err(`hooks/${f}: error de sintaxis — ${e.message}`);
  }
}

// ------------------------------------------------------------------ Reporte
const totalAgentes = fs.readdirSync(agentsDir).filter((x) => x.endsWith('.md')).length;
console.log(`\nValidacion de configuracion — ${skills.size} skills, ${totalAgentes} agentes\n`);

for (const a of avisos) console.log(`  ⚠️  ${a}`);
for (const e of errores) console.log(`  ❌ ${e}`);

if (!errores.length && !avisos.length) console.log('  ✅ Todo consistente.\n');
else console.log(`\n  ${errores.length} error(es), ${avisos.length} aviso(s).\n`);

process.exit(errores.length ? 1 : 0);
