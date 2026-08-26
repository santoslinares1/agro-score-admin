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
- **`/scheduled-analysis`**: **no filtra**. `GET /admin/scheduled-analysis` solo acepta paginación
  hoy (`AdminService.listScheduledAnalysis`); agregar un filtro `enabled=true&hasRuns=false` real
  implicaba tocar el join con `ScheduledAnalysisRun` (`getLatestRunsByScheduleId`, DISTINCT ON) y
  quedaba fuera del alcance acotado de este PR. El link va a la pantalla completa — con 3
  schedules totales hoy (según la auditoría), es navegable a mano. Queda como deuda explícita para
  un PR de admin futuro si el volumen de schedules crece.

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
