---
name: agent-output-persistence
description: >
  Protocolo para persistir outputs de sub-agentes en disco con TTL de 24h.
  Permite al orquestador recuperar resultados cuando no puede leer el output de un
  subagente, después de compactación de sesión, o para re-validación de outputs previos.
  Trigger: ALWAYS load at orchestrator session start (mandatory for dev-orchestrator).
license: Apache-2.0
metadata:
  author: madian-velasquez
  version: "1.0"
---

## When to Use

- **SIEMPRE** que el orquestador (dev-orchestrator) delegue trabajo a un sub-agente
- Cuando el orquestador no pueda leer el output de un sub-agente completado
- Después de una compactación de sesión para recuperar contexto perdido
- Cuando el orquestador necesite re-validar o comparar outputs de sub-agentes previos

## Critical Patterns

### 1. Directorio de outputs

```
~/.claude/session-state/agent-outputs/
```

Todos los outputs se guardan acá. El orquestador tiene acceso nativo con `Read`.

### 2. Convención de nombres de archivo

```
{agent-id}__{timestamp}.md
```

- `agent-id`: el nombre/id del sub-agente (ej: `idor-audit-usuarios-webapi`)
- `timestamp`: formato `yyyyMMdd-HHmmss` en hora local
- Separador: doble underscore `__`
- Extensión: siempre `.md`

Ejemplo: `idor-audit-usuarios-webapi__20260512-115530.md`

### 3. Formato del archivo de output

```markdown
# Agent Output: {agent-id}
- **Agent type**: {explore|task|general-purpose|sdd-*|etc}
- **Delegated at**: {timestamp ISO 8601}
- **Task summary**: {1 línea describiendo qué se le pidió}
- **Status**: {completed|failed|partial}

---

## Output

{contenido completo del output del sub-agente}

---

## Metadata
- **Duration**: {si se conoce}
- **Files analyzed**: {lista si aplica}
- **Skill resolution**: {injected|fallback-registry|fallback-path|none}
```

### 4. Instrucción a inyectar en CADA prompt de sub-agente

El orquestador DEBE agregar este bloque al final del prompt de cada sub-agente:

```
## Output Persistence (MANDATORY)
Al finalizar tu trabajo, ANTES de tu respuesta final, guardar tu output completo
en un archivo usando la herramienta `Write`:
- Path: ~/.claude/session-state/agent-outputs/{agent-id}__{timestamp}.md
- Usar el formato documentado (header con metadata + output completo)
- Si no podés crear el archivo, incluir todo el output en tu respuesta igualmente
```

### 5. Protocolo de recovery del orquestador

Cuando el orquestador NO puede leer el output de un sub-agente:

```
PASO 1: Buscar en disco
  → Read ~/.claude/session-state/agent-outputs/{agent-id}__*.md (o Glob si no sabés el timestamp exacto)
  → Si existe → leer y usar el contenido

PASO 2: Si no existe en disco
  → Re-ejecutar la tarea inline (Grep + Read directo)
  → NO re-delegar a otro sub-agente para "buscar el output"
```

> Sin Engram no hay un paso intermedio de búsqueda en memoria — si no está en disco, se
> re-ejecuta directo. Si en el futuro se agrega memoria persistente a Claude Code, este
> paso 2 puede reintroducirse antes del re-ejecutar inline.

### 6. Cleanup automático — TTL 24 horas (OBLIGATORIO)

Al inicio de CADA sesión del orquestador, ejecutar cleanup:

```bash
find ~/.claude/session-state/agent-outputs -type f -name "*.md" -mmin +1440 -delete 2>/dev/null
```

**Reglas del cleanup:**
- Se ejecuta UNA VEZ al inicio de sesión, ANTES de cualquier delegación
- Solo elimina archivos con más de 24h desde última escritura
- No eliminar archivos de la sesión actual aunque tengan >24h de creación
- Si el directorio no existe, crearlo silenciosamente (`mkdir -p ~/.claude/session-state/agent-outputs`)
- Log breve al usuario: `🧹 Cleanup agent-outputs: {N} archivos eliminados` (solo si N > 0)

### 7. Integración con compactación de sesión

Cuando el orquestador detecta una compactación:

1. **ANTES de cualquier otra acción**: listar archivos en `agent-outputs/`
2. Incluir en el resumen post-compactación una referencia a los outputs disponibles:
   ```
   ## Agent Outputs (backup en disco)
   - {agent-id}__{timestamp}.md — {task summary}
   ```
3. Los archivos sobreviven la compactación porque están en disco, no en contexto

## Commands

```bash
# Listar outputs disponibles (más reciente primero)
ls -lt ~/.claude/session-state/agent-outputs/

# Cleanup manual (>24h)
find ~/.claude/session-state/agent-outputs -type f -name "*.md" -mmin +1440 -delete

# Leer output específico
cat ~/.claude/session-state/agent-outputs/{agent-id}__{timestamp}.md
```
