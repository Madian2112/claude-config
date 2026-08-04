# Carrusel LinkedIn — "Mi configuración de Claude Code"

Prompts para generar el carrusel con **Claude Design**, más el texto de la publicación.

> Este folder es material de apoyo, **no** configuración de Claude Code. Es inerte: se puede
> borrar sin romper nada.

## Números verificados contra el repo

No usar otros. Estos salieron de contar los archivos, no de memoria.

| Qué | Cuánto | Fuente |
|-----|--------|--------|
| Skills | **29** | `skills/*/SKILL.md` |
| Agentes | **13** | `agents/` — 1 orquestador + 9 SDD + 3 de Judgment Day |
| Hooks enganchados a eventos | **15** | `settings.json` + campo `hooks:` de frontmatter |
| Scripts Node en `hooks/` | **17** | 15 hooks + `statusline.js` + `validate-config.js` |
| MCP servers declarados | **2** | `mcp/engram.json`, `mcp/playwright.json` |
| Comandos `/` invocables | **5** | `sdd-status`, `arch-review`, `workshop-material`, `tdd`, `form-audit` |
| Fases del flujo SDD | **8** | +1 opcional (`propose`) |

---

## Cómo usar estos prompts con Claude Design

Como Claude Design compone la slide en vez de alucinarla, aprovechalo así:

1. **Pasá el bloque `SISTEMA VISUAL` en el primer mensaje** y después referí a él ("misma
   grilla, ahora en púrpura"). Mantiene la coherencia mejor que repetir el bloque entero.
2. **Generá en orden.** La slide 4 hereda la grilla de la 3. Saltear rompe la continuidad.
3. **Exportá a 1080x1350 (4:5)** y armá un PDF vertical. Es el formato que LinkedIn muestra más
   grande en mobile.
4. El texto va **literal**: si una tarjeta dice `efcore-data-access`, tiene que decir eso, no
   "EF Core Data Access". Son nombres de archivo reales, y quien conoce Claude Code lo nota.

---

## Sistema visual compartido

```
SISTEMA VISUAL (constante en las 10 slides):

Formato vertical 4:5, 1080x1350 px.
Fondo crema cálido #EDE9E0 con una textura de papel muy sutil.
Estética editorial minimalista: mucho aire, márgenes generosos, jerarquía tipográfica marcada.

Tipografía:
- Titulares: serif de alto contraste, tipo Playfair Display o Tiempos. Negro #1A1A1A.
- Subtítulos y body: sans geométrica, tipo Inter. Gris #6B6B6B.
- Nombres técnicos (skills, agentes, hooks): monoespaciada, tipo JetBrains Mono. Negro.
- Kicker superior: sans, MAYÚSCULAS, tracking amplio (0.15em), 12px, gris #9A9A9A.

Mascota recurrente: un "space invader" pixel art de 8 bits, silueta simple y ancha, color plano
sólido sin degradados. Cambia de color según el bloque temático de la slide.

Tarjetas: fondo blanco puro, radio de esquina 20px, sombra difusa muy suave (0 4px 20px
rgba(0,0,0,0.06)), borde superior de 3px del color de acento de la slide.

Pie: fila de 10 puntos de paginación centrados, el de la slide activa en el color de acento y
los demás en gris claro.

Prohibido: fotos, personas, logos de marcas reales, capturas de pantalla, degradados llamativos,
iconografía genérica de stock.
```

### Paleta por bloque

| Bloque | Color | Hex |
|--------|-------|-----|
| Portada / núcleo | terracota | `#D9542B` |
| Backend C# / .NET | púrpura | `#7B5EA7` |
| Frontend Angular / TS | coral | `#E8746B` |
| Datos / seguridad | azul | `#5B8DD9` |
| Agentes / flujo SDD | verde azulado | `#4FA88B` |
| Hooks / enforcement | verde lima | `#7DBF4A` |
| Memoria / statusline | gris | `#8A8A8A` |

---

## Cuántas imágenes y por qué

**10 slides.** No una por "departamento" como la referencia que inspiró esto: esa agrupa por área
porque vende un workspace genérico. Acá el eje es **una historia** — de dónde venís, qué armaste,
y por qué se sostiene sin confiar en la buena voluntad del modelo.

| # | Slide | Pregunta que responde | Acento |
|---|-------|----------------------|--------|
| 1 | Portada | ¿Qué es esto? | terracota |
| 2 | Copilot → Claude Code | ¿Por qué me tomé el trabajo? | terracota |
| 3 | Anatomía de la carpeta | ¿Qué hay adentro? | terracota |
| 4 | Skills backend C# | ¿Qué sabe de mi stack? (1/3) | púrpura |
| 5 | Skills frontend Angular | ¿Qué sabe de mi stack? (2/3) | coral |
| 6 | Datos y seguridad | ¿Qué sabe de mi stack? (3/3) | azul |
| 7 | Flujo SDD | ¿Cómo encara un feature grande? | verde azulado |
| 8 | Judgment Day | ¿Quién revisa al que escribe? | verde azulado |
| 9 | Hooks | ¿Qué pasa cuando el modelo se olvida? | verde lima |
| 10 | Memoria + CTA | ¿Y entre sesiones? | gris / terracota |

**Recorte a 7 slides** (mejor retención en LinkedIn): fusioná 4+5+6 en una sola de skills, y 9+10
en una sola de cierre. Las que NO se tocan son la 2, la 7 y la 8 — son las que tienen la idea.

---

## SLIDE 1 — Portada

```
[SISTEMA VISUAL] — acento terracota #D9542B.

Arriba, centrada: una tarjeta blanca chica (aprox. 340x210px) con un space invader pixel art
terracota grande adentro, y debajo el texto "claude-code" en monoespaciada bold negra, y abajo
"MI CONFIGURACION" en kicker gris.

Centro, titular serif muy grande, cuatro líneas, números en terracota y palabras en negro:
"29 skills.
13 agentes.
15 hooks.
1 carpeta versionada."

Debajo, una línea en sans gris #6B6B6B, tamaño 22px:
"Todo enforced. Nada librado a la buena voluntad del modelo."

Debajo, una fila de 5 space invaders pixel art en colores planos distintos, con una etiqueta
kicker debajo de cada uno:
terracota "C#" · coral "ANGULAR" · azul "SQL" · verde azulado "SDD" · verde lima "HOOKS"

Pie: ".NET · Angular · SQL Server" en gris chico, y los puntos de paginación con el primero
activo en terracota.
```

---

## SLIDE 2 — De Copilot a Claude Code

```
[SISTEMA VISUAL] — acento terracota #D9542B.

Kicker: "01 / 10 · POR QUE"
Titular serif grande, dos líneas: "Venía de un autocompletado. / Ahora tengo un equipo con reglas."
(la segunda línea en terracota)

Cuerpo: dos columnas separadas por una línea vertical fina gris claro.

Columna izquierda — encabezado kicker gris apagado "ANTES", y cuatro filas en sans gris #8A8A8A,
cada una precedida por un guion largo gris:
"sugiere línea por línea"
"no conoce mis convenciones"
"olvida todo al cerrar la terminal"
"nadie revisa lo que escribe"

Columna derecha — encabezado kicker terracota "AHORA", y cuatro filas en sans negro, cada una
precedida por un cuadradito lleno terracota de 8px:
"29 skills con mis reglas de arquitectura"
"15 hooks que bloquean, no sugieren"
"memoria que sobrevive a la sesión"
"dos jueces adversariales e independientes"

Abajo, centrado, en serif itálica gris 26px: "No es la misma herramienta."

Puntos de paginación, el segundo activo.
```

---

## SLIDE 3 — Anatomía de la carpeta

```
[SISTEMA VISUAL] — acento terracota #D9542B.

Kicker: "02 / 10 · ESTRUCTURA"
Titular serif grande: "Todo vive en una sola carpeta."
Subtítulo sans gris: "Se clona, se versiona, se audita. Sin nada suelto en el home."

Centro: una tarjeta blanca grande y vertical que simula un árbol de directorios, en monoespaciada,
alineado a la izquierda, con dos columnas internas — el path en terracota bold, la descripción en
gris claro:

CLAUDE.md        reglas, persona, stack
memory/          protocolo de memoria persistente
agents/          13 agentes
skills/          29 skills + registry
hooks/           17 scripts en Node
mcp/             2 servers declarados
settings.json    modelo, permisos, hooks

Un space invader terracota chico en la esquina superior derecha de la tarjeta.

Debajo de la tarjeta, en sans gris centrado:
"git clone y estás igual en otra máquina."

Puntos de paginación, el tercero activo.
```

---

## SLIDE 4 — Skills backend C#

```
[SISTEMA VISUAL] — acento púrpura #7B5EA7.

Kicker: "03 / 10 · BACKEND"
Titular serif muy grande: "C# / .NET"
Subtítulo sans gris: "Clean Architecture, sin negociar."

Centro: grilla de 3 filas x 2 columnas, 6 tarjetas blancas idénticas con borde superior púrpura
de 3px. Cada tarjeta lleva, centrado: un círculo gris muy claro (72px) con un space invader pixel
art púrpura adentro, debajo el nombre en monoespaciada bold negra (20px), y debajo una descripción
de una línea en sans gris (15px):

cc-architecture      — Capas que no se cruzan
cc-solid             — SOLID aplicado, no citado
cc-complexity        — Máx. 10 de complejidad
cc-naming            — Convenciones y Allman
cc-domain-services   — Lógica pura, sin I/O
efcore-data-access   — Mata el N+1 antes de nacer

Abajo a la izquierda, serif itálica púrpura 28px: "Tu backend, con criterio"
Puntos de paginación, el cuarto activo en púrpura.
```

---

## SLIDE 5 — Skills frontend Angular

```
[SISTEMA VISUAL] — acento coral #E8746B.

Kicker: "04 / 10 · FRONTEND"
Titular serif muy grande: "Angular moderno"
Subtítulo sans gris: "Signals, standalone, zoneless. Nada de decoradores viejos."

Centro: misma grilla de 3x2 que la slide anterior, ahora con borde superior coral y los invaders
en coral:

angular-core           — Signals e inject(), no @Input
angular-performance    — @defer, lazy y NgOptimizedImage
typescript-advanced    — Tipos que atajan bugs
ux-forms               — Validación y accesibilidad
ux-forms-velocity      — Schema-first, un Field reusable
form-audit             — Audita el form contra la API real

Abajo a la izquierda, serif itálica coral 28px: "Tu frontend, en la versión de este año"
Puntos de paginación, el quinto activo en coral.
```

---

## SLIDE 6 — Datos y seguridad

```
[SISTEMA VISUAL] — acento azul #5B8DD9.

Kicker: "05 / 10 · DATOS Y SEGURIDAD"
Titular serif grande: "Lo que rompe en producción"
Subtítulo sans gris: "N+1, IDOR, secretos filtrados, NVARCHAR."

Centro-arriba: grilla de 2 filas x 2 columnas, 4 tarjetas blancas más anchas con borde superior
azul, cada una con círculo + invader azul, nombre en monoespaciada y descripción de una línea:

sql-standards                  — VARCHAR siempre, N'...' nunca
dotnet-api-security            — JWT, IDOR y mass assignment
efcore-data-access             — AsNoTracking, proyección, tope
frontend-security-performance  — XSS, CSRF, CSP, Core Web Vitals

Debajo de la grilla, una franja de tres reglas en monoespaciada chica sobre fondo blanco, cada una
con un cuadradito azul adelante:
"el dueño del recurso sale del token, nunca del request"
"recurso ajeno responde 404, nunca 403"
"un secreto que estuvo en git ya está comprometido"

Abajo a la izquierda, serif itálica azul 28px: "Reglas, no sugerencias"
Puntos de paginación, el sexto activo en azul.
```

---

## SLIDE 7 — Flujo SDD

```
[SISTEMA VISUAL] — acento verde azulado #4FA88B.

Kicker: "06 / 10 · FLUJO"
Titular serif grande: "Un feature grande no se escribe de una."
Subtítulo sans gris: "Ocho fases, ocho agentes, un artifact por fase en disco."

Centro: pipeline horizontal en dos filas que serpentean (fila 1 de izquierda a derecha, baja, fila
2 de izquierda a derecha), con 8 cápsulas blancas redondeadas conectadas por flechas finas verde
azulado. Cada cápsula tiene el nombre de la fase en monoespaciada negra y, arriba a la derecha,
una etiqueta pill minúscula con el modelo:

init [haiku] → explore [haiku] → spec [haiku] → design [opus] →
tasks [haiku] → apply [sonnet] → verify [sonnet] → archive [haiku]

La cápsula "design" va resaltada: borde verde azulado de 2px y fondo apenas teñido.
Las pills de modelo llevan color propio: haiku gris claro, sonnet gris medio, opus terracota.

Debajo, dos líneas en sans, la primera en negro bold y la segunda en gris:
"El modelo caro solo donde se decide."
"Design piensa la arquitectura. Init detecta el stack. No cuestan lo mismo."

Puntos de paginación, el séptimo activo en verde azulado.
```

---

## SLIDE 8 — Judgment Day

```
[SISTEMA VISUAL] — acento verde azulado #4FA88B.

Kicker: "07 / 10 · REVIEW ADVERSARIAL"
Titular serif grande: "Dos jueces ciegos."
Subtítulo sans gris: "No se conocen entre sí. Ninguno puede arreglar lo que encuentra."

Centro: diagrama vertical de árbol, conectores finos verde azulado.

Nivel 1 — una tarjeta blanca ancha centrada:
"judgment-day" en monoespaciada bold, debajo en gris "coordina · sin Edit ni Write"

Dos flechas simétricas bajan al Nivel 2 — dos tarjetas blancas idénticas lado a lado, cada una
con un space invader verde azulado, "jd-judge" en monoespaciada y debajo en gris "solo encuentra".
Entre las dos tarjetas, una línea punteada gris tachada con una X chica: no se comunican.

Del nivel 2 baja una flecha convergente al Nivel 3 — una tarjeta blanca con "jd-fixer" en
monoespaciada y debajo en gris "solo lo confirmado por los dos".

A la derecha del diagrama, dos etiquetas verticales apiladas, tipo pill:
Verde azulado con tilde: "MECANICO → lo arregla solo"
Terracota #D9542B con signo de admiración: "DISEÑO → decidís vos"

Abajo, serif itálica gris centrado 26px:
"El que escribe el código no se aprueba a sí mismo."

Puntos de paginación, el octavo activo en verde azulado.
```

---

## SLIDE 9 — Hooks

```
[SISTEMA VISUAL] — acento verde lima #7DBF4A.

Kicker: "08 / 10 · ENFORCEMENT"
Titular serif muy grande, dos líneas, la segunda en verde lima:
"La skill enseña.
El hook obliga."

Centro: cinco tarjetas blancas horizontales apiladas, angostas, con borde IZQUIERDO verde lima de
4px (no superior). Cada una con un icono lineal simple de escudo o candado en verde lima a la
izquierda, el nombre en monoespaciada negra al centro-izquierda, y a la derecha la consecuencia en
sans gris:

clean-arch-guard      bloquea EF Core en la capa Domain
git-guard             bloquea commit, push, merge y rebase
precommit-validate    la config no se commitea rota
atl-only-guard        verify no escribe fuera de .atl/
session-close-guard   no cerrás sesión sin guardar memoria

Debajo, una franja de fondo verde lima muy suave con texto negro centrado en serif 26px:
"Un hook no se puede olvidar. Un prompt sí."

Puntos de paginación, el noveno activo en verde lima.
```

---

## SLIDE 10 — Memoria y cierre

```
[SISTEMA VISUAL] — acento gris #8A8A8A arriba, terracota #D9542B en el CTA.

Kicker: "09 / 10 · MEMORIA"
Titular serif grande: "No arranca de cero."
Subtítulo sans gris: "Las decisiones sobreviven a la sesión, a la compactación y al proyecto."

Centro-arriba: una tarjeta blanca ancha que simula la statusline de la terminal, en monoespaciada
chica (14px), dos líneas:
"~/erp-facturacion  feat/alta-vales*  [sonnet]  SDD:alta-vales→design"
"ctx ████████░░ 78% libre  ·  5h 24% ↻3h10m"
Las barras de progreso en verde, el resto en gris oscuro.

Debajo, tres filas cortas en sans gris con un cuadradito gris adelante:
"decisiones guardadas al vuelo, sin pedirlo"
"contexto recuperado al abrir la sesión"
"cross-sesión y cross-proyecto"

Abajo del todo: un botón rectangular ancho terracota #D9542B con radio 16px, texto blanco
centrado en dos líneas — arriba "comentá" en sans 20px, abajo "CONFIG" en sans bold 52px con
tracking amplio.

Debajo del botón, en gris chico centrado: "y te paso el repo"

Puntos de paginación, el décimo activo en terracota.
```

---

## Texto de la publicación

El carrusel es el gancho, el texto es el que convierte. Corto y sin humo.

```
Vengo de años de GitHub Copilot.

Autocompletaba bien. Pero no conocía mis convenciones, se olvidaba de todo al cerrar la terminal,
y nadie revisaba lo que escribía.

Así que me armé una configuración de Claude Code para mi día a día en .NET + Angular + SQL Server,
y la versioné entera. Hoy tiene:

→ 29 skills con MIS reglas. Clean Architecture, SOLID, complejidad ciclomática acotada, Angular
  con signals, VARCHAR y nunca NVARCHAR.

→ 13 agentes. Un feature grande no se escribe de una: pasa por 8 fases y cada una corre con el
  modelo que le corresponde. Opus donde se decide arquitectura, Haiku donde solo se transforma.

→ 15 hooks que BLOQUEAN. Y acá está lo que más me cambió la cabeza: una skill enseña, un hook
  obliga. Si una regla tiene que cumplirse sí o sí, no alcanza con escribirla en un prompt.
  El agente no puede meter EF Core en la capa Domain — no porque se lo pedí amablemente, sino
  porque el hook le frena la escritura.

→ Review adversarial. Dos jueces independientes y ciegos revisan el código. Lo mecánico se arregla
  solo; lo que decide arquitectura vuelve a mí. El que escribe no se aprueba a sí mismo.

→ Memoria persistente. Cierro la terminal y el contexto sigue ahí.

La IA necesita las mismas barandas que le pondrías a un junior brillante: contexto, convenciones
y alguien que revise. Sin eso escribe código rápido que no querés mantener.

Comentá CONFIG y te paso el repo.

#ClaudeCode #dotnet #Angular #CleanArchitecture #IA
```

### Notas de publicación

- LinkedIn corta a ~3 líneas antes del "ver más": las primeras dos tienen que funcionar solas.
  Están escritas para eso.
- Las flechas `→` rinden bien; los bullets `•` a veces rompen el espaciado en mobile.
- Subilo como **PDF vertical 4:5**, no como imágenes sueltas: LinkedIn lo muestra como carrusel
  nativo y mide el swipe, que es la señal que empuja el alcance.
- Si prometés el repo en comentarios, tenelo público y con el README ordenado ANTES de publicar.
