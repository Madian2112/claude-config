# Skill Registry — Stack C# / Angular

**Solo para el orquestador.** El `dev-orchestrator` (y cualquier subagente que a su vez delegue)
lee este registry para resolver compact rules e inyectarlas en el prompt de invocación.
Los sub-agentes `sdd-*` NO leen este registry — reciben las reglas pre-digeridas.

> Las skills específicas de un proyecto puntual (ej. un `angular-new-feature` propio de un repo
> Angular, o skills de dominio de una app concreta) no viven en este registry global — si se
> necesitan, van en `.claude/skills/` a nivel de ESE proyecto y se resuelven igual.

---

## User Skills — Coding Standards

| Trigger | Skill | Path |
|---------|-------|------|
| Web API, controllers, endpoints, minimal API, rutas HTTP, parámetros de ruta/query | cc-architecture | `~/.claude/skills/cc-architecture/SKILL.md` |
| Complejidad ciclomática, cognitive complexity, if/else anidados, métodos largos, refactor, crear método, modificar método, editar service/repository/controller C# | cc-complexity | `~/.claude/skills/cc-complexity/SKILL.md` |
| Nombres de clases, métodos, variables, interfaces, formato Allman, convenciones C# | cc-naming | `~/.claude/skills/cc-naming/SKILL.md` |
| SOLID, SRP, OCP, LSP, ISP, DIP, diseño de clases e interfaces, herencia vs composición | cc-solid | `~/.claude/skills/cc-solid/SKILL.md` |
| Performance, Span<T>, Memory<T>, record, value objects, nullable, C# moderno, APIs públicas | csharp-coding-standards | `~/.claude/skills/csharp-coding-standards/SKILL.md` |
| SQL, CREATE TABLE, ALTER TABLE, queries, INSERT, UPDATE, stored procedures, views, scripts de migración, seed data, tipos de datos SQL | sql-standards | `~/.claude/skills/sql-standards/SKILL.md` |
| async/await, Task, CancellationToken, deadlock, concurrencia, hilos, parallel, race condition | csharp-concurrency-patterns | `~/.claude/skills/csharp-concurrency-patterns/SKILL.md` |
| Angular standalone components, signals, inject(), control flow (@if/@for), zoneless, OnPush, DestroyRef, input/output functions, computed(), effect(), RxJS + toSignal() | angular-core | `~/.claude/skills/angular-core/SKILL.md` |
| NgOptimizedImage, @defer, lazy routes, loadComponent, loadChildren, SSR, hydration, Angular performance optimization | angular-performance | `~/.claude/skills/angular-performance/SKILL.md` |
| HttpInterceptorFn, interceptors funcionales, JWT auth, refresh token 401/403, PLATFORM_ID, SSR guard, AuthService | angular-interceptors-auth | `~/.claude/skills/angular-interceptors-auth/SKILL.md` |
| Revisión código existente, deuda técnica, code smells, Long Method, God Class, Primitive Obsession, refactorizar C# | csharp-refactoring | `~/.claude/skills/csharp-refactoring/SKILL.md` |
| Domain Service, DomainService, validar lógica de negocio, lógica pura sin I/O, coordinación entre entidades o DTOs, validación cruzada, cuándo crear un domain service | cc-domain-services | `~/.claude/skills/cc-domain-services/SKILL.md` |
| XSS, CSRF, CSP, OWASP, tokens JWT, cookies httpOnly, Core Web Vitals, skeleton screens, optimistic UI, seguridad frontend | frontend-security-performance | `~/.claude/skills/frontend-security-performance/SKILL.md` |
| Tipos complejos TypeScript, ReturnType, generics, utility types, as const, type guards, satisfies, discriminated unions | typescript-advanced | `~/.claude/skills/typescript-advanced/SKILL.md` |

## User Skills — Foundation (Workflow / Meta)

| Trigger | Skill | Path |
|---------|-------|------|
| Crear PR, abrir pull request, preparar branch para review, naming de branches, conventional commits | branch-pr | `~/.claude/skills/branch-pr/SKILL.md` |
| Crear issue de GitHub, reportar bug, feature request, triage de issues | issue-creation | `~/.claude/skills/issue-creation/SKILL.md` |
| "judgment day", "review adversarial", "doble review", "que lo juzguen" — review paralelo con dos jueces independientes | judgment-day | `~/.claude/skills/judgment-day/SKILL.md` |
| Crear nueva skill de agente, documentar patrones para AI, agregar instrucciones de agente | skill-creator | `~/.claude/skills/skill-creator/SKILL.md` |
| ALWAYS at session start, delegación a sub-agentes, recovery de outputs, compactación de sesión | agent-output-persistence | `~/.claude/skills/agent-output-persistence/SKILL.md` |
| Pregunta sobre el codebase/arquitectura/relación entre archivos, entender un proyecto nuevo, mapear dependencias, `/graphify` | graphify | `~/.claude/skills/graphify/SKILL.md` |

---

## Compact Rules

Reglas pre-digeridas. El orquestador copia los bloques relevantes en el prompt de cada
sub-agente como `## Project Standards (auto-resolved)`.

### agent-output-persistence
- Al finalizar trabajo, guardar output completo en `~/.claude/session-state/agent-outputs/{agent-id}__{yyyyMMdd-HHmmss}.md`
- Formato: header con metadata (agent type, timestamp, task summary, status) + sección `## Output` con contenido completo
- Usar herramienta `Write` para escribir el archivo — si falla, incluir todo en la respuesta igualmente
- El archivo es un backup — el output normal de la respuesta sigue siendo el canal principal

### cc-architecture
- Nunca lógica de negocio en controllers — solo coordinación: HTTP → Application → Response
- Parámetros de query/body en objetos tipados (class con sufijo `Dto`), no como parámetros sueltos
- Sin números mágicos — siempre constantes con nombre o enums descriptivos
- Web API devuelve `ActionResult<T>` o `IActionResult`, nunca tipos concretos directamente
- Separación estricta: Presentation → Application → Domain → Infrastructure
- Handlers de Application NO dependen de `HttpContext`, `HttpRequest` ni nada de HTTP
- Validaciones de entrada en capa Application (FluentValidation o DataAnnotations), no en controllers
- Parámetros opcionales con valor por defecto explícito en los objetos de request
- Los endpoints deben ser delgados: máximo 3-5 líneas antes de delegar al handler
- Métodos con más de 4 parámetros → crear un `public class` con sufijo `Dto` y propiedades `{ get; set; }`; ubicarlo en `Features/{Feature}/{SubFeature}/Dtos/`; un archivo individual por cada clase; NUNCA en el mismo archivo del service; NUNCA usar `record` para DTOs
- NUNCA strings literales hardcodeados en services — todos los mensajes van en `Common/Mensajes.cs` (static class `public const string`); si no existe en la API, crearla; usar `string.Format(Mensajes.Constante, param1)` para mensajes con parámetros; naming PascalCase agrupado por feature: `BonosSinDatos`, `ValesErrorCrear`
- Todo AppService DEBE tener su interfaz `I{NombreService}` declarada en el mismo folder del service; la interfaz expone solo los métodos públicos
- NUNCA exponer nombres de columnas, tablas o vistas de la base de datos como valores de parámetros en la API pública (query strings, body, headers) — esto es information disclosure del esquema interno; aplica especialmente a parámetros de ordenamiento (`orderBy`, `ordenCampo`, `sortBy`), filtrado y proyección
- Para conjuntos cerrados de opciones (sort fields, filter fields, status): usar `enum` con nombres semánticos PascalCase (`Descripcion`, `Precio`), NUNCA naming de DB (`prod_Desc`, `prd_precio`); si se detecta un string con prefijos estilo DB (`prod_`, `usr_`, `tbl_`) o underscores SQL, refactorizar inmediatamente a enum

### cc-complexity
- Complejidad ciclomática máxima de 10 por método; refactorizar si supera ese umbral
- Nunca más de 3 niveles de indentación — extraer método o usar guard clauses
- Reemplazar cadenas if/else if por switch expressions o diccionarios de estrategia
- Un método hace UNA sola cosa — si necesitás "y" para describirlo, dividirlo
- Early return (guard clauses) para validaciones: validar, retornar o lanzar, no continuar
- Complejidad cognitiva máxima de 15 por método (SonarQube)
- Preferir composición de funciones pequeñas sobre un método monolítico
- NUNCA ifs anidados que puedan mergearse con `&&` — SonarQube los detecta como "Merge this if statement with the enclosing one"
- Constructores con >7 parámetros → crear `{ServiceName}Options` class con propiedades `required init`; registrar en DI con factory lambda `services.AddTransient(sp => new XOptions { ... })`; el service recibe UN solo parámetro Options

### cc-naming
- Interfaces con prefijo `I`: `IUserRepository`, `IOrderService`
- Clases abstractas con sufijo `Base`: `RepositoryBase<T>`, `HandlerBase`
- Métodos async con sufijo `Async`: `GetUserAsync`, `SaveOrderAsync`
- Variables booleanas con prefijo `is`/`has`/`can`: `isActive`, `hasPermission`, `canDelete`
- Formato Allman: llaves SIEMPRE en línea nueva (también en if/for de una sola línea en C#)
- PascalCase: clases, métodos, propiedades, eventos; camelCase: variables locales y parámetros
- Sin abreviaciones crípticas — nombres completos y descriptivos (`userId`, no `uid`)
- Constantes en PascalCase en C# moderno; evitar UPPER_SNAKE_CASE salvo enum flags
- Sufijo `*Dto` OBLIGATORIO para objetos de transferencia; NUNCA `*Request`, `*Response`, `*Params`, `*Model`, `*Input`
- DTOs son PUROS: solo propiedades `{ get; set; }` — NUNCA métodos, NUNCA lógica en setters/getters, NUNCA propiedades calculadas condicionales

### cc-solid
- SRP: cada clase tiene UNA razón para cambiar — si usás "y" en la descripción, dividir
- OCP: extender con herencia o composición, nunca modificar código ya testeado
- LSP: los subtipos DEBEN sustituir al tipo base sin cambiar el comportamiento observable
- ISP: interfaces pequeñas y específicas — sin `NotImplementedException` ni métodos vacíos
- DIP: depender de abstracciones (interfaces), inyectar vía constructor (no service locator)
- Preferir composición sobre herencia para comportamiento compartido
- Repositorios siempre detrás de interfaces — nunca `DbContext` directo desde Application

### csharp-coding-standards
- Usar `record` para value objects y DTOs inmutables: `record UserId(Guid Value)`
- `Span<T>` y `Memory<T>` para operaciones sobre buffers sin allocations heap
- Preferir pattern matching moderno: switch expressions, property patterns, positional patterns
- `sealed` en clases cuando no hay herencia planeada — elimina overhead de vtable
- Nullable reference types HABILITADO — nunca operador `!` sin justificación en comentario
- `required` modifier para propiedades obligatorias en records/classes (C# 11+)
- Expresiones de colección (C# 12): `[item1, item2]` en vez de `new List<T> { ... }`
- Evitar LINQ en hot paths — preferir bucles con Span o List directo para performance crítica
- NUNCA usar query syntax LINQ (`from ... in`), SIEMPRE lambda syntax (`.Where()`, `.Select()`)
- Todo AppService DEBE inyectar `ILogger<T>` vía constructor (`ILogger<NombreDelService> logger`); en el catch llamar `_logger.LogError(ex, "Descripción corta {Param}", valorParam)`; NUNCA `LogInformation`/`LogWarning`/`LogDebug` en catches — solo `LogError`; NUNCA retornar `ex.Message` al cliente — usar constante genérica de `Mensajes.cs`; verificar primero si otros services del proyecto ya usan `ILogger` para respetar el mismo patrón
- NUNCA instanciar `new JsonSerializerOptions` por cada llamada — cachear como `private static readonly` field; reusar la misma instancia en toda la clase
- Usar `[GeneratedRegex("pattern")]` con clase `partial` en vez de `new Regex(pattern, RegexOptions.Compiled)` — compile-time regex genera código optimizado sin allocations en runtime
- Preferir métodos estáticos de criptografía (`SHA256.HashData(data)`) sobre instanciar `SHA256.Create()` + `.ComputeHash()` — elimina `using`/`Dispose` y es más performante
- NUNCA usar `.First()`, `.Last()`, `.ElementAt()` en colecciones indexables (List, Array, IReadOnlyList) — usar indexador directo `[0]`, `[^1]`, o `ToDictionary` + `TryGetValue` para lookups repetidos; Roslyn analyzer CA1826

### sql-standards
- NUNCA `NVARCHAR` ni `NCHAR` ni `NTEXT` — SIEMPRE `VARCHAR`, `CHAR`, `VARCHAR(MAX)`
- NUNCA prefijo `N` en literales de texto: `'Bronce'` no `N'Bronce'`
- `DECIMAL(p,s)` para montos y porcentajes — nunca `FLOAT` ni `REAL`
- `BIT` para booleanos — nunca `TINYINT` como sustituto
- Columnas `Activo BIT NOT NULL` siempre con `CONSTRAINT [DF_Tabla_Activo] DEFAULT 1`
- PKs: `[NombreTablaEnSingular]Id`, constraints con nombre explícito siempre
- Keywords SQL en UPPERCASE; nunca `SELECT *`; alias explícito en JOINs

### csharp-concurrency-patterns
- SIEMPRE propagar `CancellationToken` hasta el fondo de la cadena async
- NUNCA `.Result` ni `.Wait()` — siempre `await`; provoca deadlock en contextos sincronizados
- `ConfigureAwait(false)` en código de librería/infraestructura, NO en controllers ni application
- NUNCA `async void` — siempre `async Task` o `async Task<T>` (salvo event handlers UI)
- `SemaphoreSlim` para mutual exclusion en async, nunca `lock {}` con await adentro
- `Task.WhenAll` para operaciones paralelas independientes, no loops de `await` secuencial
- `IAsyncEnumerable<T>` para streaming de colecciones grandes, no cargar todo en memoria

### angular-core
- Components are standalone by default — do NOT set `standalone: true` explicitly
- Input/Output MUST use function-based API: `input()`, `input.required()`, `output()`, `model()` — NEVER `@Input()`/`@Output()` decorators
- State MUST use signals: `signal()`, `computed()`, `effect()` — NO `ngOnInit`/`ngOnChanges`/`ngOnDestroy`
- Dependency injection via `inject()` — NEVER constructor injection
- Template control flow via `@if`/`@for`/`@switch` — NEVER `*ngIf`/`*ngFor`
- App MUST be zoneless: `provideZonelessChangeDetection()` — remove zone.js
- Cleanup via `DestroyRef` + `inject()`, NOT `ngOnDestroy`
- RxJS only for complex async (debounce, streams, race conditions) — signals for everything else
- Convert observables to signals with `toSignal()` for template use

### angular-performance
- Images MUST use `NgOptimizedImage` with `ngSrc`, explicit `width`+`height` (or `fill`), `priority` on LCP image
- Heavy/below-fold components MUST use `@defer` with appropriate trigger (on viewport, on interaction, on idle)
- Routes MUST use `loadComponent` (single) or `loadChildren` (feature) for lazy loading — NEVER eagerly import feature components
- SEO-critical pages require SSR + `provideClientHydration()`
- NEVER trigger reflows/repaints in lifecycle hooks
- Heavy computations → `computed()` signals or pure pipes for memoization

### angular-interceptors-auth
- Usar `HttpInterceptorFn` funcional — NUNCA clase con `implements HttpInterceptor` (deprecado)
- SIEMPRE verificar `isPlatformServer(platformId)` antes de acceder a `localStorage`/`window`/`document`
- El interceptor accede al token VÍA `authService.getToken()` — NUNCA `localStorage` directo
- `AuthService` centraliza `getToken()` (public), `setToken()` (private), `getRefreshToken()` (private)
- Refresh en 401/403: `authService.refreshToken()` ya persiste el token — el interceptor solo reintenta la request
- Un interceptor = una responsabilidad — no mezclar auth + logging + error handling en el mismo
- Registrar en `app.config.ts` con `withFetch()` + `withInterceptors([...])`

### csharp-refactoring
- Long Method (>30-40 líneas o comentarios que dividen secciones): Extract Method
- God Class (>5 inyecciones, nombre genérico `Manager`/`Helper`, >500 líneas): Extract Class
- Primitive Obsession: encapsular en Value Objects con `record` — `CustomerId`, `Money`, etc.
- Feature Envy: mover la lógica a la clase donde viven los datos
- Magic Numbers/Strings: extraer a `const` o `enum` con nombre descriptivo
- Refactoring seguro: tests primero → pasos pequeños → correr tests → revertir si falla
- Boy Scout Rule: dejar el código un poco mejor de como lo encontraste
- `object`/`dynamic` sin tipo concreto → tipado fuerte

### frontend-security-performance
- XSS: NUNCA `element.innerHTML = userInput` — usar `textContent` o `DomPurify.sanitize()`
- Angular escapa `{{ userInput }}` automáticamente; `[innerHTML]` requiere `DomSanitizer`
- CSRF: cookies con `sameSite: 'strict'`, `httpOnly: true`, `secure: true`
- JWT storage: decisión centralizada en `AuthService` — ver `angular-interceptors-auth`
- Skeleton Screen: `toSignal()` + `computed()` — NUNCA `effect()+subscribe` (anti-pattern, leak garantizado)
- Optimistic UI: actualizar UI antes de confirmar con servidor, revertir en `catch` — solo acciones no críticas
- LCP: atributo `priority` en imagen principal; reservar espacio con `aspect-ratio` para evitar CLS

### typescript-advanced
- `as const` para constantes literales e inmutables — preferir sobre enums para strings de configuración
- `ReturnType<typeof fn>` para inferir tipos de retorno — evita duplicar interfaces
- Discriminated unions (`status: 'success' | 'error' | 'loading'`) para estados de API en templates
- `satisfies` (TS 4.9+): valida la forma del objeto SIN perder el tipo literal más específico
- Generics con `extends` para restringir los tipos aceptados por funciones/servicios genéricos
- `Partial<T>` para PATCH/updates, `Pick`/`Omit` para DTOs y ViewModels, `NonNullable<T>` con datos de API
- NUNCA `any` — `unknown` + type guard cuando el tipo es genuinamente desconocido

### branch-pr
- TODO PR DEBE linkear un issue aprobado (`status:approved`) — sin excepciones
- TODO PR DEBE tener exactamente UN label `type:*` (feat, fix, chore, docs, etc.)
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`
- Conventional commits obligatorio: `type(scope): subject` — sin AI attribution / Co-Authored-By
- El usuario hace el push y abre el PR — el agente NO ejecuta `git commit/push/PR create`
- Antes del PR: validar que los checks automatizados (lint, tests, format) pasan localmente

### issue-creation
- Issues en blanco DESHABILITADOS — usar template (Bug Report o Feature Request)
- Buscar duplicados antes de abrir un issue nuevo
- Cada issue arranca con `status:needs-review` automático
- Maintainer DEBE aprobar (`status:approved`) antes de que se pueda abrir un PR linkeado
- Preguntas → Discussions, NO issues
- Llenar TODOS los campos requeridos del template + checkboxes pre-flight

### judgment-day
- SIEMPRE lanzar DOS jueces en PARALELO (nunca secuencial) — vía el tool `Agent`
- Los jueces NO se conocen entre sí (review ciego e independiente)
- El orquestador NO hace el review — solo coordina y sintetiza veredictos
- Inyectar las mismas Project Standards en ambos jueces + en el Fix Agent
- Máximo 2 iteraciones (review → fix → re-review) — escalá si no convergen
- Útil cuando el costo de un bug en prod > costo de dos rondas de review

### cc-domain-services
- Crear DomainService cuando la lógica de validación/coordinación no pertenece naturalmente a ninguna entidad y no requiere I/O
- NUNCA inyectar dependencias en DomainService — sin constructor, sin IRepository, sin IService — ninguna abstracción inyectable
- NUNCA hacer I/O en el DomainService — si necesitás data de un repo o servicio externo: el AppService hace la consulta primero y le pasa el resultado ya resuelto como parámetro al DomainService
- Aceptar DTOs, Entidades o primitivos como parámetros — lo que ya esté disponible en el call site del AppService
- Retornar `Respuesta<T>` o `Respuesta<bool>` para validaciones; `Respuesta<TDto>` para enriquecimiento/transformación
- Puede ser `static class` si todos los métodos son puros e independientes; clase instancia si los métodos se coordinan entre sí
- Naming: `{Feature}DomainService` — SIEMPRE buscar otros `*DomainService.cs` en el proyecto antes de decidir la ubicación
- Ubicación: mismo folder que el AppService (`Application/Features/{Feature}/`) o en `Services/` subfolder — seguir el patrón existente
- Mensajes de error: SIEMPRE usar constantes de `ApplicationMessage` / `Mensajes.cs` — nunca strings literales hardcodeados
- Señales para crear uno: validación cruzada entre 2+ conceptos, orquestar resultados de múltiples queries ya ejecutadas, transformar/enriquecer datos sin I/O

### skill-creator
- Una skill = un patrón repetible que el AI necesita reglas explícitas para aplicar
- NO crear skill si ya hay documentación que sirva como referencia
- Estructura: `skills/{name}/SKILL.md` (+ opcional `assets/`, `references/`)
- Frontmatter obligatorio: `name`, `description` con `Trigger:` claro, `license`, `metadata.version`
- Compact rules de la skill van DESPUÉS en el SKILL-REGISTRY (no en SKILL.md)
- Si la skill referencia archivos del proyecto, usar paths relativos al proyecto, no absolutos

### graphify
- Invocar con `/graphify <path>` para construir un knowledge graph navegable del codebase/corpus (HTML + JSON + reporte)
- Usar cuando el usuario pregunta sobre arquitectura, relaciones entre archivos, o está entrando a un codebase nuevo — especialmente si ya existe `graphify-out/`
- `/graphify query "<pregunta>"` para recorrer el grafo ya construido en vez de releer todo el código
- Cada edge está etiquetado EXTRACTED/INFERRED/AMBIGUOUS — nunca inventar relaciones no soportadas por el grafo

---

## Tabla de Resolución por Fase SDD

El orquestador usa esta tabla para decidir qué compact rules inyectar en cada sub-agente.

| Fase / Tipo de tarea | Skills a inyectar |
|----------------------|-------------------|
| `sdd-init` | _(ninguna — solo detección de stack)_ |
| `sdd-explore` | _(ninguna — solo análisis, no implementación)_ |
| `sdd-propose` (backend C#) | `cc-architecture` + `cc-solid` |
| `sdd-propose` (frontend Angular) | `angular-core` + `angular-performance` |
| `sdd-spec` (backend C#) | `cc-architecture` + `cc-solid` |
| `sdd-spec` (frontend Angular) | `angular-core` + `typescript-advanced` |
| `sdd-design` (backend C#) | `cc-architecture` + `cc-solid` + `cc-complexity` + `cc-domain-services` |
| `sdd-design` (frontend Angular) | `angular-core` + `angular-performance` + `typescript-advanced` |
| `sdd-tasks` | _(ninguna — agregador organizativo)_ |
| `sdd-apply` (backend C#) | `cc-architecture` + `cc-solid` + `cc-complexity` + `csharp-coding-standards` + `csharp-concurrency-patterns` + `cc-domain-services` |
| `sdd-apply` (frontend Angular) | `angular-core` + `angular-performance` + `typescript-advanced` |
| `sdd-apply` (frontend Angular con auth) | `angular-core` + `angular-performance` + `angular-interceptors-auth` + `typescript-advanced` |
| `sdd-verify` (backend C#) | `cc-complexity` + `cc-naming` |
| `sdd-verify` (frontend Angular) | `angular-core` + `typescript-advanced` |
| `sdd-archive` | _(ninguna — solo lectura y guardado)_ |
| Naming review | `cc-naming` |
| Code review general C# | `cc-architecture` + `cc-solid` + `cc-complexity` + `cc-naming` |
| Refactor | `cc-complexity` + `cc-solid` + `csharp-coding-standards` + `csharp-refactoring` |
| Refactor / deuda técnica C# | `csharp-refactoring` + `cc-complexity` + `cc-solid` + `cc-naming` |
| Angular auth / interceptors | `angular-interceptors-auth` + `angular-core` + `frontend-security-performance` |
| Seguridad frontend / performance Angular | `frontend-security-performance` + `angular-core` + `angular-performance` |
| TypeScript avanzado / tipado | `typescript-advanced` + `angular-core` |
| New API endpoint | `cc-architecture` + `cc-solid` + `cc-naming` + `cc-domain-services` |
| Async code review | `csharp-concurrency-patterns` |
| Crear PR / preparar branch | `branch-pr` |
| Crear issue / reportar bug | `issue-creation` |
| Review adversarial / "judgment day" | `judgment-day` (+ las skills del stack del target) |
| Crear nueva skill | `skill-creator` |
| Pregunta de arquitectura / codebase nuevo / relaciones entre archivos | `graphify` |

> Skills de proyecto (ej. un `angular-new-feature` propio de un repo Angular puntual) se agregan
> acá como filas nuevas cuando corresponda — viven en `.claude/skills/` a nivel de ESE proyecto,
> no en este registry global.

---

## Project Conventions

| Archivo | Path | Notas |
|---------|------|-------|
| CLAUDE.md (proyecto) | `(workspace-root)/CLAUDE.md` | Convenciones específicas del proyecto activo — leer primero si existe |

---

_Para regenerar este registry con los SKILL.md reales: pedirle al orquestador "actualizá el skill registry"._
