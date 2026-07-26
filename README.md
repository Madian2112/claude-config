# claude-config

Configuración de Claude Code versionada: memoria global, sub-agentes del flujo SDD, ecosistema de
skills, hooks de enforcement y permisos.

Este repo **es** el contenido de `~/.claude`.

## Requisitos

| Requisito | Por qué |
|-----------|---------|
| **Git for Windows** (Git Bash) | Claude Code solo usa una shell POSIX si lo detecta. Sin él cae a PowerShell y los comandos POSIX de agentes y skills rompen **en silencio**. |
| **Node.js** | Los hooks están escritos en Node. Ya viene con el toolchain de Angular. |
| **`engram` en el `PATH`** | Memoria persistente vía MCP. Sin él, el protocolo de `CLAUDE.md` no se puede cumplir — el hook `SessionStart` avisa. |
| **.NET SDK / Angular CLI** | Opcionales: los usa el hook `auto-format` si están. Si no están, no formatea y sigue. |

## Bootstrap en una máquina nueva

```bash
git clone <repo> "$HOME/.claude"          # el repo ES ~/.claude
claude mcp add --scope user engram -- engram mcp   # ver mcp/engram.json
claude                                    # verificar que la statusline aparezca
```

Los plugins **no** se versionan (son caché regenerable): se re-clonan solos a partir de
`enabledPlugins` en `settings.json`.

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
| `statusline.js` | statusLine | `proyecto · rama* · [modelo] · SDD:change→fase` |

**Criterio**: un hook falla siempre **abierto** (nunca frena el trabajo por un error propio),
salvo los dos guards, cuyo trabajo ES bloquear.

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
| `/graphify` | Knowledge graph del codebase |

## Cosas que NO son negociables

- El agente **no** ejecuta `git commit/push/merge/rebase` en repos de proyecto (hook + permisos).
- **Nunca** `Co-Authored-By` ni atribución de AI (`includeCoAuthoredBy: false`).
- **Nunca** buildear para "verificar". `dotnet test` en la fase verify sí.
- Los sub-agentes **no pueden preguntarle nada al usuario**: registran supuestos en
  `## Assumptions & Open Questions` y el orquestador escala.
