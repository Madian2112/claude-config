---
name: tdd
description: Arranca un ciclo estricto red-green-refactor sobre la funcionalidad indicada, con gates explícitos entre fases.
argument-hint: "[descripción de la funcionalidad]"
disable-model-invocation: true
skills:
  - cc-solid
  - cc-complexity
---

# Strict TDD — **$ARGUMENTS**

## Paso 0 — Verificar que se pueda hacer TDD acá

Antes de escribir una línea, confirmá que el proyecto tiene con qué correr tests
(`*.Tests.csproj`, `*.spec.ts`, configuración de xUnit / Jest / Karma).

**Si NO hay harness de tests**: paralo acá y decilo. No armes un proyecto de tests por tu cuenta
como efecto colateral de este comando — eso es una decisión de arquitectura del proyecto, no algo
que se cuela en un pedido de feature. Ofrecé las dos salidas:

- montar el harness primero (y qué implica), o
- implementar sin TDD, con `/arch-review` al final como red de seguridad.

Y esperá la decisión.

## El ciclo — no se negocia

### 1. 🔴 RED
Escribí **SOLO el test**. Nada de producción.
Corrélo. Pegá la salida que demuestra que falla, **y verificá que falla por el motivo correcto**
(que la aserción no se cumple, no que no compila por un typo).

> **PARÁ ACÁ.** Mostrame el test en rojo antes de seguir.

### 2. 🟢 GREEN
El código **MÍNIMO** que lo pasa. Sin generalizar, sin "ya que estoy", sin manejar casos que
ningún test pide todavía. Corré los tests y mostrá el verde.

### 3. 🔧 REFACTOR
Recién ahora aplicás `cc-solid` y `cc-complexity`, con la red de seguridad puesta.
Volvé a correr los tests. Si algo se puso rojo, el refactor está mal: revertí, no parchees el test.

## Reglas duras

- Si escribís producción antes que su test, **PARÁ y avisá que rompiste el ciclo**. No sigas como
  si nada.
- Un test = un comportamiento. Si necesitás "y" para describirlo, son dos tests.
- Naming: `Metodo_Escenario_ResultadoEsperado`.
- Nunca ajustes un test para que pase. El test describe el comportamiento deseado; si falla,
  el que está mal es el código.
- Cubrí happy path + al menos un error + al menos un borde (cero, vacío, null, límite exacto).
  El bug siempre vive en el borde.
