# Notas de UX del admin — PRs post-auditoría

Complementa a `docs/admin-audit.md` (auditoría UI/UX + Product Intelligence completa). Este doc
registra, PR por PR, qué se implementó de esa auditoría, qué datos usa y qué queda pendiente.

---

## Admin PR 1 — Vista de salud operativa

Fecha: 2026-08-26.
Alcance: `agro-score-admin` (franja de alertas) + `agro-score-api` (dos stats nuevas + un filtro
en `GET /admin/fields`). No se tocó `agro-score-web`, `agro-score-worker`, `.env` ni deploy.

### Objetivo

El Dashboard tenía métricas útiles pero sueltas — ningún elemento respondía "¿qué necesita
atención ahora?". Este PR agrega una franja **Alertas operativas** arriba de las cards existentes
(que siguen intactas), con alertas priorizadas, accionables y con link directo a la vista
filtrada correspondiente.

### Alertas implementadas

| # | Alerta | Severidad | Condición | Stat que usa | Link |
|---|---|---|---|---|---|
| 1 | Schedules activos sin corridas | `critical` (P0 según la auditoría) | `enabled=true AND lastRunAt IS NULL` | `activeSchedulesWithoutRuns` (**nueva**) | `/scheduled-analysis` (sin filtro, ver limitación) |
| 2 | Diagnósticos fallidos (30 días) | `critical` | `failedAnalysisLast30Days > 0` | `failedAnalysisLast30Days` (ya existía) | `/analysis?status=Error` |
| 3 | No revisados hace más de 7 días | `warning` | Análisis `status=Error`, `reviewedAt IS NULL`, `createdAt` > 7 días | `unreviewedFailedAnalysisOlderThan7Days` (**nueva**) | `/analysis?status=Error&onlyUnreviewed=true` |
| 4 | Campos sin diagnóstico | `warning` | `fieldsWithNoAnalysis > 0` | `fieldsWithNoAnalysis` (ya existía) | `/fields?hasAnalysis=false` |

Orden: por severidad (`critical` → `warning` → `opportunity` → `info`); dentro de la misma
severidad se conserva el orden de la lista de arriba — así "schedules sin corridas" (P0 según la
auditoría) queda antes que "diagnósticos fallidos" aunque ambas sean `critical`.

Cada alerta solo se muestra si su condición es `> 0` — nunca aparece una card "0 diagnósticos
fallidos". Sin ninguna condición activa se muestra: *"No hay alertas operativas relevantes en
este momento."*

La lógica vive en `src/app/shared/utils/operational-alerts.util.ts` (frontend) — decisión
explícita del ticket: el backend solo agrega stats crudas nuevas a `/admin/metrics`, el copy y la
severidad los arma el frontend (`buildOperationalAlerts()`), igual que ya hacía el resto del
Dashboard con esas mismas stats.

### Qué se tocó en `agro-score-api`

- `AdminService.getMetrics()`: dos stats nuevas (`activeSchedulesWithoutRuns`,
  `unreviewedFailedAnalysisOlderThan7Days`), ambas conteos directos vía `repository.count()`, sin
  N+1 y en paralelo con el resto (`Promise.all` existente).
- `AdminService.listFields()` + `ListFieldsQueryDto` (nuevo): filtro real `hasAnalysis`
  (`true`/`false`) vía `(NOT) EXISTS`, mismo criterio que ya usaba `countFieldsWithNoAnalysis()`
  para la métrica agregada — no se inventó un criterio nuevo.
- Ninguna migración: las dos stats nuevas son conteos sobre columnas que ya existían
  (`FieldAnalysisSchedule.enabled`/`lastRunAt`, `Analysis.status`/`reviewedAt`/`createdAt`).

### Links que filtran de verdad vs. limitaciones

- **`/analysis?status=Error`** y **`/analysis?status=Error&onlyUnreviewed=true`**: filtran de
  verdad. `AnalysisComponent` ahora lee `status`/`onlyFailed`/`onlyUnreviewed`/`fieldId`/`userId`/
  `from`/`to` de la URL una sola vez al entrar a la pantalla (`ActivatedRoute.snapshot`), y los
  usa como valor inicial de los filtros que ya existían — no se agregó re-sincronización con la
  URL mientras el usuario cambia los filtros a mano (eso sería un sistema de filtros avanzado,
  fuera de alcance de este PR).
- **`/fields?hasAnalysis=false`**: filtra de verdad (filtro nuevo, ver arriba). `FieldsComponent`
  muestra además un chip *"Filtro activo: campos sin diagnóstico"* con un botón para quitarlo.
- **`/scheduled-analysis`**: **no filtra** *(actualizado en Admin PR 2 más abajo: ahora sí filtra
  por `fieldId`/`userId`/`enabled`; `hasRuns=false` sigue sin filtro real)*. `GET
  /admin/scheduled-analysis` solo aceptaba paginación al momento de este PR
  (`AdminService.listScheduledAnalysis`); agregar un filtro `enabled=true&hasRuns=false` real
  implicaba tocar el join con `ScheduledAnalysisRun` (`getLatestRunsByScheduleId`, DISTINCT ON) y
  quedaba fuera del alcance acotado de este PR. El link iba a la pantalla completa — con 3
  schedules totales en ese momento (según la auditoría), era navegable a mano.

### Qué quedó fuera de este PR

- **Alerta de mails fallidos/pendientes** (alerta 5 del ticket): no hay stats agregadas de mail en
  `/admin/metrics` hoy — lo que existe es `emailSentAt` por corrida individual en
  `/admin/scheduled-analysis`, no un conteo. Documentado como deuda para Admin PR 3, como sugería
  el propio ticket.
- **Filtro real en Programados**: ver limitación de arriba.
- **Por qué no un BI completo**: el pedido explícito era una vista de salud operativa mínima, no
  una plataforma de analítica — 4 alertas condicionales sobre stats ya calculadas (o triviales de
  calcular) resuelven la pregunta real ("¿qué miro primero?") sin agregar una capa nueva de
  agregación, gráficos ni dashboards configurables.

---

## Admin PR 2 — Trazabilidad usuario/campo/análisis

Fecha: 2026-08-27.
Alcance: `agro-score-admin` (links reales + query params + IDs copiables en las 6 pantallas de
listado) + `agro-score-api` (filtros nuevos en `GET /admin/users`, `/admin/fields`, `/admin/lots`,
`/admin/analysis`, `/admin/scheduled-analysis`). No se tocó `agro-score-web`,
`agro-score-worker`, `.env` ni deploy. Sin migraciones — todos los filtros nuevos son WHERE sobre
columnas que ya existían.

### Objetivo

La auditoría encontró que ninguna entidad del admin era navegable: Usuario, Campo, Lote,
Diagnóstico y Programado vivían como tablas aisladas, sin links entre ellas, obligando a copiar
UUIDs a mano entre pantallas para seguir una historia. Este PR convierte los nombres/dueños de
cada tabla en links reales con filtro, y agrega un patrón de "ID truncado + copiar" reusable
donde hacía falta. **No** agrega vistas de detalle consolidadas — eso queda para un PR futuro (ver
"Deuda futura" más abajo), tal como pedía el ticket.

### Links agregados por pantalla

| Pantalla | Link / acción | Destino |
|---|---|---|
| Usuarios | "Ver campos" (por fila) | `/fields?userId=<id>` |
| Usuarios | "Ver diagnósticos" (por fila) | `/analysis?userId=<id>` |
| Campos | Nombre del campo | `/analysis?fieldId=<id>` |
| Campos | Dueño | `/users?userId=<id>` |
| Campos | "Ver programados" (por fila) | `/scheduled-analysis?fieldId=<id>` |
| Lotes | Campo | `/fields?fieldId=<id>` |
| Lotes | Dueño | `/users?userId=<id>` |
| Diagnósticos | Campo | `/fields?fieldId=<id>` |
| Diagnósticos | Usuario | `/users?userId=<id>` |
| Programados | Campo | `/fields?fieldId=<id>` |
| Programados | Usuario | `/users?userId=<id>` |
| Programados | "Ver diagnóstico" (analysisId de latestRun, si existe) | `/analysis?analysisId=<id>` |

Los links usan una clase global nueva (`.entity-link` en `src/styles.css`) — sin subrayado
permanente para no saturar tablas ya densas, aparece en hover/focus (igual criterio que
`.link-button`, ya existente). Ningún link reemplaza una acción mutante existente (Editar/
Desactivar/Generar reset/Marcar revisado/Reintentar siguen intactas).

### Query params soportados por pantalla

| Pantalla | Query params | Filtra de verdad |
|---|---|---|
| Usuarios | `userId`, `email` | Sí — `userId` es un filtro nuevo (`ListUsersQueryDto`); `email` reusa el buscador de texto existente (`search` ya matchea email vía ILIKE) |
| Campos | `userId`, `fieldId`, `hasAnalysis` (PR 1) | Sí — `userId`/`fieldId` nuevos en `ListFieldsQueryDto` |
| Lotes | `fieldId`, `userId` | Sí — nuevos en `ListLotsQueryDto` (no existía antes) |
| Diagnósticos | `status`, `onlyFailed`, `onlyUnreviewed`, `fieldId`, `userId`, `from`, `to` (PR 1), `analysisId` (nuevo) | Sí |
| Programados | `fieldId`, `userId`, `enabled` | Sí — nuevos en `ListScheduledAnalysisQueryDto` (antes solo paginaba). `hasRuns=false` queda fuera (ver "Deuda futura") |

Cada pantalla lee sus query params **una sola vez**, en `ngOnInit` vía
`ActivatedRoute.snapshot.queryParamMap` — no hay re-sincronización con la URL mientras el usuario
cambia filtros a mano (mismo alcance definido en Admin PR 1, evita convertir esto en un router de
estado). Un filtro llegado por URL se muestra como chip *"Filtro activo: …"* con botón para
quitarlo, reusando `.filter-chip` (movido a `src/styles.css` en este PR porque Usuarios tiene su
propio stylesheet y necesitaba el mismo patrón que Campos).

### IDs copiables

Componente nuevo `CopyableIdComponent` (`shared/components/copyable-id/`) — muestra los primeros
8 caracteres + "…" (con el UUID completo en el `title`, visible al hover) y un botón "Copiar" que
usa `navigator.clipboard.writeText()`, con feedback "Copiado" por 1.5s. Falla en silencio si el
Clipboard API no está disponible o rechaza (sin permisos/foco) — nunca rompe la fila.

Aplicado a:

- **Usuarios**: `userId` bajo el email.
- **Campos**: `fieldId` bajo el nombre.
- **Diagnósticos**: `analysisId` bajo el nombre del campo (reemplaza el `#{{ shortId }}` sin
  copiar que ya existía).
- **Programados**: `scheduleId` y `runId` (de latestRun) dentro del detalle expandido existente —
  siguiendo la preferencia del ticket ("ID truncado + copiar en detalle expandido", no en la fila
  densa).

Lotes no tiene un ID propio en la lista mínima del ticket (`userId`, `fieldId`, `analysisId`,
`scheduleId`, `runId`) — su trazabilidad se resuelve enteramente con los links a Campos/Usuarios.

### Qué se tocó en `agro-score-api`

- `UsersService.findAllPaginated()` + `ListUsersQueryDto` (nuevo): filtro `userId` (`user.id = :userId`).
- `AdminService.listFields()` + `ListFieldsQueryDto` (extendido): filtros `userId`
  (`field."userId"`) y `fieldId` (`field.id`).
- `AdminService.listLots()` + `ListLotsQueryDto` (nuevo): filtros `fieldId` (`lot."fieldId"`) y
  `userId` (vía el join existente a `field`).
- `AdminService.listAnalysis()` + `ListAnalysisQueryDto` (extendido): filtro `analysisId`
  (`analysis.id`).
- `AdminService.listScheduledAnalysis()` + `ListScheduledAnalysisQueryDto` (nuevo): filtros
  `fieldId`, `userId`, `enabled` — antes este endpoint solo paginaba, no filtraba nada.
- Los guards existentes (`JwtAuthGuard` + `RolesGuard` a nivel de `AdminController`) no se
  tocaron — se aplican automáticamente a los endpoints nuevos/modificados igual que a los demás.

### Qué quedó fuera de este PR

- **`hasRuns=false` en Programados**: la auditoría lo pedía como filtro de listado
  (`?enabled=true&hasRuns=false`), pero el criterio "sin corridas" vive hoy como agregado
  (`AdminService.countActiveSchedulesWithoutRuns`, Admin PR 1), no como condición de listado —
  llevarlo a un filtro real implica tocar el join `DISTINCT ON` contra `ScheduledAnalysisRun`
  (`getLatestRunsByScheduleId`). Documentado explícitamente como deuda para Admin PR 3, tal como
  permitía el propio ticket.
- **Link "Diagnóstico → Programados" cuando el análisis viene de una corrida semanal**: el shape
  de `GET /admin/analysis` no incluye `scheduleId`/`scheduledRunId` — agregarlo implica un join
  adicional en `AdminService.listAnalysis` que no estaba claramente acotado en este PR. No se
  inventó el link.
- **Vista de detalle consolidada** (Usuario/Campo con toda su historia en una sola pantalla): es
  la preferencia explícita del ticket — "primero links + query params + IDs copiables, después,
  en otro PR, vistas de detalle consolidadas". Con la trazabilidad de este PR, construir esa vista
  después es mecánico (los filtros ya existen).
