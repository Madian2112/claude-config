# claude-config

Configuración de Claude Code versionada: memoria global, sub-agentes del flujo SDD, ecosistema de
skills, hooks de enforcement y permisos.

Este repo **es** el contenido de la carpeta de configuración de Claude Code (`.claude`).

## Todo vive dentro de la carpeta de configuración

**Principio de este setup: no hay configuración de Claude Code fuera de esta carpeta.**
Nada en el home del usuario, nada en rutas absolutas de la máquina. Un solo lugar.

Esto incluye `.claude.json` — el archivo con los MCP servers registrados y el estado local — que
por defecto Claude Code deja en el home, pero acá vive **adentro** de esta carpeta
(vía `CLAUDE_CONFIG_DIR`). Está en `.gitignore` porque contiene tokens, no porque esté afuera.

| Archivo | Dónde | Versionado |
|---------|-------|------------|
| `settings.json`, `CLAUDE.md`, `agents/`, `skills/`, `hooks/`, `memory/`, `mcp/` | Esta carpeta | ✅ Sí |
| `.claude.json` (MCP registrados, estado local, tokens) | Esta carpeta | ❌ No — tiene tokens |
| `session-state/`, `projects/`, `history.jsonl`, `plugins/marketplaces/` | Esta carpeta | ❌ No — estado y caché |

> **Para el agente:** si necesitás resolver configuración, buscá **acá adentro**. No salgas al home
> del usuario ni asumas rutas tipo `%USERPROFILE%\...` o `C:\Users\<user>\...`.
>
> **Única excepción**, y no es config de Claude Code: la base de datos de **Engram** pertenece a la
> herramienta Engram y su ubicación la resuelve ese binario (variable `ENGRAM_DB`).

**Los hooks se ubican solos.** Cada script resuelve la carpeta de configuración desde su propia
ruta (`path.resolve(__dirname, '..')`), con `CLAUDE_CONFIG_DIR` como override. No dependen de
`os.homedir()`, así que funcionan aunque muevas la carpeta.

Lo único con la ruta escrita a mano son los comandos de hook en `settings.json`
(`node "$HOME/.claude/hooks/..."`). **Asunción de este setup: la carpeta siempre vive en el home
del usuario actual** (`$HOME/.claude`), así que esas rutas son estables en cualquier máquina.
Si algún día la movés a otro lado, hay que actualizar esas 7 líneas.

## Requisitos

| Requisito | Por qué |
|-----------|---------|
| **Git for Windows** (Git Bash) | Claude Code solo usa una shell POSIX si lo detecta. Sin él cae a PowerShell y los comandos POSIX de agentes y skills rompen **en silencio**. |
| **Node.js** | Los hooks están escritos en Node. Ya viene con el toolchain de Angular. |
| **`engram` v1.12.0+ en el `PATH`** | Memoria persistente vía MCP. [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) — verificar con `engram --version`. Sin él, el protocolo de `CLAUDE.md` no se puede cumplir; el hook `SessionStart` avisa fuerte. |
| **.NET SDK / Angular CLI** | Opcionales: los usa el hook `auto-format` si están. Si no están, no formatea y sigue. |

## Bootstrap en una máquina nueva

```bash
git clone <repo> "$HOME/.claude"          # el repo ES la carpeta de configuracion
claude mcp add --scope user engram -- engram mcp   # queda en .claude.json, ver mcp/engram.json
claude                                    # verificar que la statusline aparezca
```

Si querés la carpeta en otro lado, cloná donde quieras y apuntá `CLAUDE_CONFIG_DIR` ahí
(recordá ajustar las rutas de los hooks en `settings.json` — ver abajo).

## Plugins — qué se versiona y qué no

El objetivo es que al clonar este repo en otra máquina tengas **los mismos plugins**. Eso se logra
versionando la **declaración**, no los archivos descargados:

| Qué | Dónde | ¿Se versiona? |
|-----|-------|---------------|
| Qué marketplaces usás | `extraKnownMarketplaces` en `settings.json` | ✅ **Sí** — es la declaración portable |
| Qué plugins están activos | `enabledPlugins` en `settings.json` | ✅ **Sí** — `"plugin@marketplace": true` |
| Los repos clonados de cada marketplace | `plugins/marketplaces/` | ❌ No — caché, se re-clona sola |
| `known_marketplaces.json` | `plugins/` | ❌ No — tiene `installLocation` con ruta absoluta de la máquina |

Con las dos primeras claves versionadas, en una máquina nueva Claude Code lee `settings.json`,
clona los marketplaces declarados e instala los plugins habilitados. **Subir los clones no ayuda**:
la doc los trata como caché (`rm -rf ~/.claude/plugins/cache` es el fix oficial cuando se corrompen)
y el auto-update los pisa igual.

Para llenar `enabledPlugins`, corré `/plugin list --enabled` y volcá cada entrada como
`"nombre-del-plugin@claude-plugins-official": true`.

## Estructura

```
CLAUDE.md                 Memoria global: reglas, persona, stack, restricciones de sub-agentes
memory/
  ENGRAM-PROTOCOL.md      Protocolo de memoria persistente (cargado con @import desde CLAUDE.md)
agents/                   dev-orchestrator + los 9 sub-agentes del flujo SDD
skills/                   Ecosistema de skills (stack, metodología e invocables)
  SKILL-REGISTRY.md       Cheat-sheet humano + compact rules de las skills de STACK
hooks/                    Enforcement en Node.js
mcp/engram.json           Definición reproducible del MCP server
settings.json             Modelo, permisos, hooks, statusline
```

## Hooks

| Hook | Evento | Qué hace |
|------|--------|----------|
| `clean-arch-guard.js` | PreToolUse (Edit·Write) | **Bloquea** violaciones de capas: EF/HTTP en Domain, HttpContext/DbContext en Application, mensajes de negocio en Repository, DTOs como `record`, sufijos prohibidos |
| `git-guard.js` | PreToolUse (Bash) | **Bloquea** `git commit/push/merge/rebase` en repos de proyecto. Exento el repo de config |
| `auto-format.js` | PostToolUse (Edit·Write) | `dotnet format` / `prettier` sobre el archivo tocado. No compila |
| `session-bootstrap.js` | SessionStart | Cleanup de `agent-outputs` (TTL 24h), inyecta changes SDD abiertos, avisa si Engram no está |
| `subagent-index.js` | SubagentStop | Traza de cada corrida de sub-agente en `_index.jsonl` |
| `statusline.js` | statusLine | `proyecto · rama* · [modelo] · SDD:change→fase` — el segmento SDD **solo** aparece bajo `dev-orchestrator` (ver abajo) |
| `validate-config.js` | manual | Valida la consistencia de toda la config — ver abajo |

## Validar la configuración

```bash
node hooks/validate-config.js     # exit 0 si esta todo bien, 1 si hay errores
```

Corrélo **antes de commitear cambios en esta config**. Detecta lo que se rompe al borrar o
renombrar cosas, que es de donde salieron todos los problemas históricos de este repo:

1. Frontmatter YAML ausente o roto en `agents/` y `skills/`
2. Un agente que precarga (`skills:`) una skill que ya no existe → **el agente no arranca**
3. Referencias colgadas en `SKILL-REGISTRY.md` a skills borradas
4. Skills de stack sin compact rules en el registry → el orquestador nunca las inyecta
5. Hooks de `settings.json` apuntando a archivos inexistentes
6. `model`, `effort` o `color` inválidos en el frontmatter de un agente
7. Errores de sintaxis en los hooks

**Criterio**: un hook falla siempre **abierto** (nunca frena el trabajo por un error propio),
salvo los dos guards, cuyo trabajo ES bloquear.

### La statusline según el agente activo

El payload de `statusLine` trae `agent.name`, pero **solo** cuando la sesión corre con `--agent`
o con el setting `agent`. La barra usa ese dato para mostrar lo que corresponde a cada contexto:

| Sesión | Qué muestra |
|--------|-------------|
| `claude --agent=dev-orchestrator` | `proyecto · rama* · [modelo] · SDD:change→fase` |
| `claude` sin agente | `proyecto · rama* · [modelo]` — sin ruido de SDD |
| `claude --agent=otro` | `proyecto · rama* · [modelo] · @nombre-del-agente` |

La fase se **trunca en el primer paréntesis, guion o punto y coma** y se corta a 24 caracteres:
`state.md` a veces trae prosa después del token (`verify (completado — falta ejecución BD)`) y eso
se comía toda la barra. El detalle completo se lee donde corresponde: en `state.md` o con
`/sdd-status`.

## Flujo SDD

```
init → explore → [propose] → spec ∥ design → tasks → apply → verify → archive
```

Artifacts en `.atl/changes/{change-name}/` dentro de cada proyecto. `state.md` es la fuente de
verdad del ESTADO; Engram guarda el APRENDIZAJE. No son intercambiables.

Modelos por fase: `opus` en design (el blueprint), `sonnet` en propose/apply/verify (deciden o
producen código), `haiku` en init/explore/spec/tasks/archive (transformaciones estructuradas).

## Comandos

| Comando | Qué hace |
|---------|----------|
| `/sdd-status` | Estado del flujo SDD: changes abiertos, fase, progreso, preguntas pendientes |
| `/arch-review` | Auditoría de Clean Architecture del diff actual |
| `/workshop-material` | Material de taller a partir de las skills |
| `/tdd` | Ciclo estricto red-green-refactor |

## Cosas que NO son negociables

- El agente **no** ejecuta `git commit/push/merge/rebase` en repos de proyecto (hook + permisos).
- **Nunca** `Co-Authored-By` ni atribución de AI (`includeCoAuthoredBy: false`).
- **Nunca** buildear para "verificar". `dotnet test` en la fase verify sí.
- Los sub-agentes **no pueden preguntarle nada al usuario**: registran supuestos en
  `## Assumptions & Open Questions` y el orquestador escala.

## Créditos

La metodología SDD (los sub-agentes por fase) y **Engram** (la memoria persistente vía MCP) están
basadas en el trabajo de [Gentleman Programming](https://github.com/Gentleman-Programming):

- [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) — memoria
  persistente cross-sesión y cross-herramienta vía MCP.

Lo que hay en este repo es esa base adaptada a un stack .NET + Angular: las skills de arquitectura,
los hooks de enforcement y la resolución de reglas por stack son propias, pero el esqueleto
conceptual del flujo por fases y la capa de memoria no salieron de la nada.
