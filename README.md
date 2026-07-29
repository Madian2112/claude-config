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

**Los comandos de hook en `settings.json` también.** Usan `${CLAUDE_CONFIG_DIR:-$HOME/.claude}`:
si moviste la carpeta y apuntaste `CLAUDE_CONFIG_DIR` ahí, los hooks siguen encontrándose solos;
si no la moviste, cae al default de siempre. No hay ninguna ruta que actualizar a mano.

> Antes esas líneas decían `$HOME/.claude` fijo, lo cual contradecía en silencio al párrafo de
> arriba: los scripts se ubicaban solos pero `settings.json` no los encontraba. Moverla te dejaba
> con los hooks muertos y ningún mensaje de error.

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
| `clean-arch-guard.js` | PreToolUse (Edit·MultiEdit·Write) | **Bloquea** violaciones de capas: EF/HTTP en Domain, HttpContext/DbContext en Application, mensajes de negocio en Repository, DTOs como `record`, sufijos prohibidos |
| `git-guard.js` | PreToolUse (Bash) | **Bloquea** `git commit/push/merge/rebase` en repos de proyecto. Exento el repo de config |
| `precommit-validate.js` | PreToolUse (Bash) | **Bloquea** `git commit` en ESTE repo si `validate-config.js` falla. La config no se commitea rota |
| `atl-only-guard.js` | PreToolUse — scoped a 8 sub-agentes | **Bloquea** escrituras fuera de `.atl/`. Enganchado por el campo `hooks:` del frontmatter, no global. Lo llevan todas las fases SDD **menos `sdd-apply`**, que es la única que escribe código de proyecto |
| `detect-subagent-model.js` | PostToolUse — scoped a los sub-agentes | Lee del transcript el modelo **real** que la plataforma asignó y lo compara con el declarado |
| `auto-format.js` | PostToolUse (Edit·MultiEdit·Write) | `dotnet format` / `prettier` sobre el archivo tocado. No compila |
| `session-bootstrap.js` | SessionStart | Cleanup de `agent-outputs` (TTL 24h) y de marcas de cierre (TTL 7d), inyecta changes SDD abiertos, avisa si Engram no está |
| `post-compact-memory.js` | SessionStart (`compact`) | Inyecta el protocolo AFTER COMPACTION de Engram apenas se compacta el contexto |
| `session-close-guard.js` | Stop | Bloquea **una vez por sesión** si hubo escrituras y no se llamó a `mem_session_summary` |
| `subagent-start.js` | SubagentStart | Abre la ficha del sub-agente en vuelo (tipo + **modelo** + inicio) que lee la statusline |
| `subagent-index.js` | SubagentStop | Cierra la ficha, calcula duración, traza en `_index.jsonl` y **devuelve una línea al orquestador** |
| `statusline.js` | statusLine | `proyecto · ‹sesión› · rama* · [modelo] · SDD:change→fase` — el segmento SDD **solo** aparece bajo `dev-orchestrator` (ver abajo) |
| `validate-config.js` | manual | Valida la consistencia de toda la config — ver abajo |

## Validar la configuración

```bash
node hooks/validate-config.js     # exit 0 si esta todo bien, 1 si hay errores
```

Ya no hace falta que te acuerdes: el hook `precommit-validate.js` lo corre solo y **bloquea el
`git commit`** si algo está roto. Corrélo a mano igual cuando quieras feedback rápido.

Detecta lo que se rompe al borrar o renombrar cosas, que es de donde salieron todos los problemas
históricos de este repo:

1. Frontmatter YAML ausente o roto en `agents/` y `skills/`
2. **Campos de frontmatter que no existen en el schema** → se ignoran en silencio (ver abajo)
3. Un agente que precarga (`skills:`) una skill que ya no existe → **el agente no arranca**
4. Referencias colgadas en `SKILL-REGISTRY.md` a skills borradas
5. Skills de stack sin compact rules en el registry → el orquestador nunca las inyecta
6. Hooks de `settings.json` apuntando a archivos inexistentes
7. `model`, `effort` o `color` inválidos en el frontmatter de un agente
8. Errores de sintaxis en los hooks

### El chequeo de schema (punto 2) y por qué existe

`skills/arch-review` y `skills/tdd` declaraban `skills:` en su frontmatter, convencidas de que
precargaban `cc-solid` y compañía. **Ese campo no existe en `SKILL.md`** — es campo de sub-agente.
Claude Code lo ignoraba sin decir nada, y las dos corrían **sin una sola regla cargada**.

Un campo mal escrito no explota: no hace nada. Por eso el validador compara contra un **schema
cerrado** y no contra una lista de prohibidos. Ojo con el casing, que son dos schemas distintos:

| | Campo de herramientas denegadas | Otros ejemplos |
|---|---|---|
| `skills/*/SKILL.md` | `disallowed-tools` (kebab) | `allowed-tools`, `argument-hint`, `paths` |
| `agents/*.md` | `disallowedTools` (camel) | `tools`, `permissionMode`, `maxTurns`, `skills` |

Una skill **no puede precargar otras skills**. Si necesitás reglas cargadas, pedilas en el body
con el tool `Skill` o usá `context: fork` + `agent:`.

**Criterio**: un hook falla siempre **abierto** (nunca frena el trabajo por un error propio),
salvo los dos guards, cuyo trabajo ES bloquear.

### La statusline según el agente activo

El payload de `statusLine` trae `agent.name`, pero **solo** cuando la sesión corre con `--agent`
o con el setting `agent`. La barra usa ese dato para mostrar lo que corresponde a cada contexto:

| Sesión | Qué muestra |
|--------|-------------|
| `claude --agent=dev-orchestrator` | `proyecto · ‹sesión› · rama* · [modelo] · SDD:change→fase` |
| `claude` sin agente | `proyecto · ‹sesión› · rama* · [modelo]` — sin ruido de SDD |
| `claude --agent=otro` | `proyecto · ‹sesión› · rama* · [modelo] · @nombre-del-agente` |

### Sub-agentes en vuelo

Cuando hay sub-agentes corriendo, la barra cierra con `⚙ sdd-design[opus] sdd-spec[haiku] +1`
(los 2 más viejos, y `+N` para el resto). Con modelos mixtos por fase, saber **qué está corriendo
y con qué modelo** es la diferencia entre esperar tranquilo y preguntarse si se colgó.

> **El modelo NO viene en el payload de los hooks.** `SubagentStart` trae `agent_type`,
> `agent_id`, `prompt` y `description`, y nada más.

Se muestran **dos** modelos, y la diferencia es el punto:

| En la barra | Significa |
|---|---|
| `sdd-design[opus]` | El declarado en `agents/sdd-design.md`. Si además se pudo leer el real, coinciden |
| `sdd-design[opus≠sonnet]` | **Declaraste `opus` y Claude Code lo corrió con `sonnet`.** Ni el costo ni la calidad de esa fase son los que planificaste |

El **declarado** sale del frontmatter (indexado por el campo `name`, **no** por el nombre del
archivo, porque no tienen por qué coincidir). El **real** sale del transcript: cada turno del
assistant registra un `message.model` con el id completo que la plataforma usó de verdad. Lo lee
`detect-subagent-model.js`, enganchado como `PostToolUse` **dentro** de cada sub-agente — ahí el
payload trae `agent_id`, así que la correlación "este modelo es de ESTA corrida" es exacta y no
hay que adivinar cuando corren varios en paralelo.

> **Regla de oro del detector: ante la duda, no afirma nada.** Solo acepta un turno como propio
> del sub-agente si `isSidechain === true`, o si el `sessionId` del turno difiere del de la sesión
> padre (transcript propio). Cualquier otro turno se ignora: leer uno del hilo principal
> produciría un mismatch fantasma. Cuando no puede probarlo, deja `model_real` sin setear y la UI
> cae al declarado — `null` en el índice significa **"no se pudo determinar"**, que no es lo mismo
> que "coincide".

Los que discrepan se ordenan **primero** en la barra: con truncación a 2 elementos, una alarma
escondida detrás del `+N` no es una alarma.

Las fichas viven en `session-state/agent-runs/` (no versionado). Si un sub-agente muere de forma
sucia, `SubagentStop` nunca corre y la ficha queda huérfana: se descartan las de más de 2h al
leerlas y `session-bootstrap` las barre al arrancar. Mejor mostrar de menos que mentir.

El segmento `‹sesión›` sale de `session_name`, que **no siempre viene**: aparece solo si nombraste
la sesión con `--name` o `/rename`, o una vez que existe un título autogenerado. El nombre por
defecto (tipo `my-app-3f`) NO lo popula, así que el segmento simplemente se omite. Se trunca a
26 caracteres.

La fase se **trunca en el primer paréntesis, guion o punto y coma** y se corta a 24 caracteres:
`state.md` a veces trae prosa después del token (`verify (completado — falta ejecución BD)`) y eso
se comía toda la barra. El detalle completo se lee donde corresponde: en `state.md` o con
`/sdd-status`.

## Judgment Day — por qué es un agente y no una skill

```
/judgment-day  ó  dev-orchestrator  ó  sdd-verify
        │
        ▼
  judgment-day (coordina; SIN Edit ni Write)
        │
        ├──► jd-judge  ┐  en paralelo, ciegos, sin Edit/Write
        ├──► jd-judge  ┘  ninguno sabe del otro
        │
        └──► jd-fixer     solo los hallazgos CONFIRMADOS por ambos
```

**Una skill no crea una identidad**: se carga en el contexto de quien la invoca. Cuando Judgment
Day era skill y lo lanzaba `dev-orchestrator`, el "juez" **era** el orquestador con instrucciones
nuevas — mismo contexto, misma persona, mismo color en la UI. Un review adversarial hecho por el
mismo que orquesta el trabajo no es adversarial: es alguien revisándose a sí mismo.

La separación de roles es **estructural**, no una promesa en prosa:

| Agente | Rol | `Edit`/`Write` |
|---|---|---|
| `judgment-day` | Coordina. Nunca revisa ni arregla | ❌ No los tiene |
| `jd-judge` (×2) | Encuentra problemas. Nunca aprueba ni arregla | ❌ No los tiene |
| `jd-fixer` | Aplica solo los confirmados | ✅ Sí |

Acá **sí** alcanza con acotar `tools:`, porque la restricción es sobre la herramienta. Compará con
`sdd-verify`, donde es sobre el *destino* (necesita escribir su reporte) y hace falta un hook.

`skills/judgment-day/SKILL.md` quedó como **lanzador** de 20 líneas con `context: fork` +
`agent: judgment-day`: `/judgment-day` sigue funcionando, pero el protocolo vive en un solo lugar
y corre en contexto propio.

> **Costo del cambio: un nivel de anidamiento.** `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` pasó de
> `2` a `3`, porque la cadena más larga es `sdd-verify` (1) → `judgment-day` (2) → jueces (3).
> Como skill, JD se cargaba *dentro* de `sdd-verify` sin gastar nivel. Tener identidad propia se
> paga con profundidad.

**El gate humano se mudó hacia arriba.** Un sub-agente no puede preguntarle nada al usuario, así
que JD ya no pregunta "¿seguimos iterando?": tras 2 iteraciones devuelve `ESCALATED` con la
pregunta formulada, y quien lo llamó (`dev-orchestrator`, que sí habla con vos) decide.

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
- `sdd-verify` **no escribe fuera de `.atl/`** (hook `atl-only-guard.js`). Verificar es reportar,
  no corregir: quien arregla lo que encontró es juez y parte, y borra la evidencia.
- La config **no se commitea rota** (hook `precommit-validate.js`).

## Créditos

La metodología SDD (los sub-agentes por fase) y **Engram** (la memoria persistente vía MCP) están
basadas en el trabajo de [Gentleman Programming](https://github.com/Gentleman-Programming):

- [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) — memoria
  persistente cross-sesión y cross-herramienta vía MCP.

Lo que hay en este repo es esa base adaptada a un stack .NET + Angular: las skills de arquitectura,
los hooks de enforcement y la resolución de reglas por stack son propias, pero el esqueleto
conceptual del flujo por fases y la capa de memoria no salieron de la nada.
