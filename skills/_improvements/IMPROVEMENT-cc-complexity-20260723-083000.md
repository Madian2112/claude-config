# Skill Improvement: cc-complexity

## Issue
Durante el apply de Fase 3 pasos 4-5 (VB.NET legacy, `FrmAgregarFacturas.vb`), el sub-agente
`sdd-apply` reportó que la regla "preferir helpers pequeños sobre monolito / un método hace UNA
cosa" es insuficiente para código VB.NET legacy con `GoTo` y `Continue For`: esas construcciones
NO cruzan procedimientos, así que un bucle `For` con `Continue For`/`GoTo escape` intercalado no
se puede extraer entero a un helper. Solución aplicada: el bucle `For` queda in situ dentro del
método y solo el CUERPO por iteración se extrae a un helper con retorno `Boolean` (que reemplaza
el `Continue For`/rollback por un valor de retorno evaluado en el call site).

## Suggestion
Agregar a cc-complexity una nota para el caso legacy con saltos no estructurados:
"En VB.NET/lenguajes con `GoTo`/`Continue`/`Exit For` que no cruzan procedimientos: no intentar
extraer el bucle completo; dejar el `For` in situ y extraer el CUERPO de la iteración a un helper
que devuelva un flag (Boolean/enum) para señalar continue/abort, evaluado en el call site."

## Evidence
Reportado por sdd-apply en el change fase3-pasos-4-5 (2026-07-23). Regla actual asume código
estructurado sin saltos; en legacy VB provoca ambigüedad sobre cómo cumplir "un método hace UNA
cosa" sin romper la semántica de `Continue For`/`GoTo escape`.
