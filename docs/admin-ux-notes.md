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

---

## Admin PR 3 — Programados end-to-end + estado de mail

Fecha: 2026-08-27.
Alcance: `agro-score-admin` (resumen agregado + columna "Estado del flujo" + estado de mail más
preciso + filtro `hasRuns` en Programados) + `agro-score-api` (filtro `hasRuns` real + resumen
agregado en `GET /admin/scheduled-analysis`). No se tocó `agro-score-web`, `agro-score-worker`,
`.env` ni deploy. Sin migraciones — el filtro y el resumen se calculan sobre columnas que ya
existían (`ScheduledAnalysisRun.status/failedAt/emailSentAt`, `FieldAnalysisSchedule.enabled`).

### Objetivo

La auditoría encontró que Programados modela bien el flujo de negocio pero no permite *confirmar*
si corrió, dónde se trabó, o qué pasó con los mails — con datos reales (3 schedules, la mayoría
"Sin corridas" en todas las columnas), la pantalla no respondía "¿está funcionando el pipeline
semanal?". Este PR resuelve la deuda de `hasRuns` que quedó pendiente desde Admin PR 1/PR 2,
agrega un resumen global, una columna compacta "Estado del flujo" por fila, y refina el estado de
mail para distinguir una falla real de mail de una falla de análisis que nunca llegó a esa etapa.

### Filtros implementados

`/scheduled-analysis` ahora soporta `fieldId`, `userId`, `enabled` (de Admin PR 2) y, nuevo en
este PR, `hasRuns`. `mailStatus` (sent/failed/pending) queda **fuera** — ver "Qué quedó fuera".

### Definición exacta de `hasRuns`

```txt
hasRuns=true  → EXISTS (SELECT 1 FROM scheduled_analysis_runs r WHERE r."scheduleId" = schedule.id)
hasRuns=false → NOT EXISTS (misma subquery)
```

Existencia **real** de filas en `scheduled_analysis_runs`, no `FieldAnalysisSchedule.lastRunAt`.
Hoy ambos coinciden siempre — `ScheduledAnalysisRunnerService.triggerRun` (agro-score-api) setea
`lastRunAt` en el mismo momento en que crea la primera corrida, en las dos ramas (éxito y error) —
pero el filtro usa la fuente real a propósito, no la copia cacheada, tal como pedía el ticket
("no confundir con lastRunAt IS NULL si existe historial de runs pero el campo no se pobló").
Mismo criterio para `summary.withoutRuns` (ver más abajo) y para
`AdminService.countActiveSchedulesWithoutRuns()` — ese último no se tocó (ver "Qué quedó fuera").

La alerta del Dashboard "Schedules activos sin corridas" (Admin PR 1) ahora linkea a
`/scheduled-analysis?enabled=true&hasRuns=false`, que filtra de verdad — antes iba a la pantalla
sin ningún filtro.

### Resumen superior agregado

Nuevo campo `summary` en la respuesta de `GET /admin/scheduled-analysis` (no un endpoint aparte —
una sola llamada HTTP sigue alcanzando). Es **global**: no cambia con los filtros de la página
actual (`fieldId`/`userId`/`enabled`/`hasRuns`) — responde "¿cómo está el flujo semanal en
general?", igual que las alertas del Dashboard, no "¿cómo está el subconjunto que estoy mirando?".
Se pidió así a propósito para no mostrar stats parciales con una lista paginada (preferencia
explícita del ticket).

| Campo | Qué cuenta |
|---|---|
| `total` / `active` / `inactive` | Schedules por `enabled` |
| `withoutRuns` | Schedules sin ninguna corrida (mismo criterio que `hasRuns=false`) |
| `lastRunOk` / `lastRunFailed` | Estado de la corrida **más reciente** de cada schedule (no de todo el historial) |
| `mailSentLast7Days` / `mailSentLast30Days` | Corridas (no schedules) con `emailSentAt` en la ventana — métrica de actividad, "cuántos reportes salieron" |
| `mailPendingOrFailed` | Schedules cuya corrida más reciente todavía no mandó el mail (ver la distinción exacta más abajo) |

Todas las queries son `count()`/`getCount()` simples o una única `DISTINCT ON` (para
`lastRunOk`/`lastRunFailed`/`mailPendingOrFailed` juntos, agregados en JS sobre esas filas) — sin
N+1, sin queries pesadas.

### Estados end-to-end agregados

Función nueva `resolveFlowState(item)` (`shared/utils/scheduled-analysis-status.util.ts`) — cinco
etapas normalizadas (`ok | pending | missing | failed | not_applicable`): Corrida → Análisis →
Veredicto técnico → Diagnóstico semanal → Mail. Se muestra en dos niveles:

- **Columna compacta "Estado del flujo"** en cada fila: un badge + una frase corta (el primer
  punto bloqueante).
- **Sección "Estado del flujo"** al tope del panel expandido: las 5 etapas con su badge, arriba
  del detalle técnico existente (Schedule/Última corrida/Veredicto/Mail) que no se tocó.

`resolveFlowState` camina la cadena en orden y devuelve el texto del primer eslabón que no está
"ok" — determinístico, sin IA, con las 7 frases que dio la auditoría como ejemplo (más 2-3
variantes "en proceso" para estados intermedios que la auditoría no listó explícitamente):

```txt
Este monitoreo todavía no registra corridas.
La corrida más reciente todavía se está ejecutando.          (nueva variante "en proceso")
La última corrida falló antes de generar análisis.
El análisis existe, pero el veredicto técnico no fue generado.
El análisis existe, pero el veredicto técnico falló.          (nueva variante "falló", no solo "no disponible")
El análisis existe; el veredicto técnico todavía se está generando.  (nueva variante "en proceso")
El diagnóstico semanal no está disponible.
El diagnóstico semanal no se pudo generar.                    (nueva variante "falló")
El mail fue enviado correctamente.
El mail todavía no fue enviado.
El mail falló: <errorMessage real si existe>.
```

### Estado de mail: qué datos usa y cómo interpreta cada caso

Auditados los campos reales en `ScheduledAnalysisRun` (agro-score-api): **solo existe
`emailSentAt`** — no hay `emailStatus`, `emailError` ni `recipient` como columnas dedicadas (el
`errorMessage` genérico del run es compartido con las fallas de análisis). No se inventó ningún
campo nuevo.

El hallazgo clave: `ScheduledAnalysisRunnerService.reconcileRun` (agro-score-api) tiene **dos**
caminos reales hacia `status='failed'`, distinguibles con las columnas que ya existen:

1. **El análisis falló** (`analysis.status === 'Error'`) → `run.failedAt` queda seteado. La
   corrida nunca llegó a la etapa de mail — no es una falla de mail.
2. **El schedule se desactivó mientras la corrida estaba en curso** → el análisis SÍ terminó bien,
   pero el mail se omite a propósito y el run pasa a `'failed'` **sin** tocar `failedAt`. Este es
   el único caso real de "el mail específicamente falló".

`resolveMailStatus()` (ya existía desde PR 13B, refinada en este PR) usa exactamente esa
distinción (`failedAt` seteado vs. `NULL`) para separar `analysis_failed` (tono neutral, el
problema está más arriba en la cadena) de `error` (tono error, el mail sí falló). Antes ambos
casos se mostraban igual ("Fallido", tono error) — auditoría real, no solo una limpieza cosmética.

Interpretación final (sin `emailSentAt` presente):

```txt
emailSentAt presente                              → "Enviado"
run completed, technicalVerdict aún no listo (<10 min) → "Esperando veredicto técnico"
run completed, sin emailSentAt, fuera de ventana  → "Pendiente / revisar"
run pending/processing                            → "No enviado"
run failed, failedAt NULL (mail omitido)          → "Fallido" + el errorMessage real
run failed, failedAt seteado (falló el análisis)  → "No aplica: el análisis falló"
sin corridas                                       → "Sin corridas"
```

### Links / IDs mantenidos o agregados

Ninguno nuevo — Admin PR 2 ya cubría campo/usuario/análisis navegables y `scheduleId`/`runId`/
`analysisId` copiables en el detalle expandido. Este PR los deja intactos (tests explícitos lo
confirman) y no duplica nada.

### Qué quedó fuera de este PR

- **`mailStatus` como filtro de listado** (`sent`/`failed`/`pending`): filtrar el LISTADO (no solo
  agregarlo en el resumen) por el mail de la corrida más reciente de cada schedule exige llevar el
  mismo `DISTINCT ON` de `getLatestRunsByScheduleId` al query PRINCIPAL (con paginación), no solo
  a un conteo aparte — bastante más invasivo que `hasRuns`. La info de mail por fila (columna Mail
  + "Estado del flujo") y en el resumen agregado (`mailSentLast7/30Days`/`mailPendingOrFailed`) ya
  cubre la necesidad operativa sin ese trabajo. Documentado en el DTO
  (`ListScheduledAnalysisQueryDto`) para quien retome esto.
- **`AdminService.countActiveSchedulesWithoutRuns()` (Admin PR 1) sin tocar**: sigue usando
  `lastRunAt IS NULL` en vez del `EXISTS` real que usa este PR. Ambos coinciden siempre hoy (ver
  "Definición exacta de hasRuns" arriba) — se documenta la inconsistencia de implementación en vez
  de tocar código de un PR anterior ya probado, para mantener el diff de este PR acotado a
  Programados.
- **BI/dashboard de mails separado**: explícitamente fuera de alcance del ticket — el resumen de
  Programados ya responde "¿cómo está el flujo semanal?" sin agregar una pantalla nueva.

## Admin PR 4 — Product analytics básico

### Objetivo

Responder "de los usuarios/campos creados, ¿cuántos llegan a generar valor real?" con un funnel
simple de 9 etapas + lecturas rápidas determinísticas, dentro del Dashboard (sección "Embudo de
uso"), sin crear una plataforma BI ni depender de analytics externo (Mixpanel/PostHog/GA).

### Endpoint

`GET /admin/product-analytics` — nuevo, no extiende `/admin/metrics` (que ya es grande y responde
una pregunta distinta: salud operativa actual, no adopción). Mismos guards de controller
(`JwtAuthGuard` + `RolesGuard` + `@Roles(owner, admin)`) que el resto de `/admin/*`, automático por
estar declarados a nivel de clase. Solo lectura — ninguna query dispara cron, mail, análisis ni
veredictos, y no crea migraciones (ver `AdminService.getProductAnalytics`).

### Etapas del funnel (orden fijo)

| # | Etapa                                        | Cálculo                                                                                  | Link                                         |
|---|-----------------------------------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------|
| 1 | Usuarios totales                             | `UsersService.count()`                                                                    | `/users`                                      |
| 2 | Usuarios con al menos un campo               | `COUNT(DISTINCT field."userId")`                                                          | — (sin filtro exacto en Usuarios todavía)     |
| 3 | Campos totales                               | `Field.count()`                                                                            | `/fields`                                     |
| 4 | Campos con al menos un lote                  | `COUNT(DISTINCT lot."fieldId")`                                                            | — (sin filtro exacto en Campos todavía)       |
| 5 | Campos con al menos un análisis finalizado   | join manual `analysis.status='Finalizado'` (mismo criterio scope/lotId que PR1)           | — (ver nota abajo)                            |
| 6 | Campos con veredicto técnico generado        | join `analysis` → `analysis_technical_verdicts.status='generated'`                        | — (sin filtro exacto todavía)                 |
| 7 | Campos con monitoreo semanal activo          | `FieldAnalysisSchedule.count({enabled:true})` (fieldId es `unique`, ya es "campos")       | `/scheduled-analysis?enabled=true`            |
| 8 | Campos con al menos una corrida semanal      | `COUNT(DISTINCT run."fieldId")` — existencia real, mismo criterio que `hasRuns` (PR3)     | `/scheduled-analysis?enabled=true&hasRuns=true` |
| 9 | Campos con mail semanal enviado              | `COUNT(DISTINCT run."fieldId") WHERE run."emailSentAt" IS NOT NULL`                       | — (sin filtro `mailStatus` en el listado, deuda de PR3) |

**Nota sobre la etapa 5 (link deliberadamente omitido):** `/fields?hasAnalysis=true` existe (Admin
PR 1) pero incluye análisis en *cualquier* estado (también Procesando/Error), no solo Finalizado —
no se linkeó desde el embudo para no insinuar una precisión que el filtro no tiene. Mismo criterio
para las etapas 2, 4 y 6: no existe todavía una vista filtrada exacta para esas preguntas en
ninguna pantalla admin — se documenta la ausencia en vez de forzar un link aproximado.

**Advertencia explícita en el copy de la sección:** "Se calcula sobre entidades actuales, no sobre
cohortes por fecha de alta" — nunca se llama "conversión real" en ningún lado del producto. Varias
transiciones del funnel cambian de tipo de entidad (usuarios → campos), así que
`dropoffFromPrevious` puede ser **negativo** (la etapa siguiente creció respecto de la anterior) —
el frontend lo pinta como "+N vs. etapa anterior", nunca como una caída fija.
`conversionFromPrevious` queda `undefined` (no `0`) cuando `previousCount` es 0, para no leerse
como "0% de conversión".

### Cálculo de conversión/dropoff

`AdminService.buildFunnelStage()`: `conversionFromPrevious = previousCount > 0 ? count/previousCount
: undefined`; `dropoffFromPrevious = previousCount - count` (siempre definido una vez que existe
`previousCount`, nunca `NaN`/`Infinity`). Cubierto en `admin.service.spec.ts` con
`previousCount=0`.

### Insights determinísticos ("Qué mirar")

Reglas simples sobre los mismos números — sin IA, cada uno solo aparece si su condición es
verdadera (nunca "0 campos sin diagnóstico" a modo de card vacía):

1. **Campos sin diagnóstico** (warning) — `fieldsWithNoAnalysis > 0` → `/fields?hasAnalysis=false`.
2. **Adopción de monitoreo baja** (opportunity) — `activeSchedules/totalFields < 0.5` → `/scheduled-analysis?enabled=true`.
3. **Schedules activos sin corridas** (critical) — mismo criterio `EXISTS` que PR3, no `lastRunAt`
   → `/scheduled-analysis?enabled=true&hasRuns=false`.
4. **Diagnósticos fallidos (30 días)** (critical) → `/analysis?status=Error`.
5. **Mail pendiente/fallido** (warning) — reusa `mailPendingOrFailed` del resumen de Programados
   (PR3, distingue mail omitido de falla real de pipeline vía `failedAt`) → `/scheduled-analysis?enabled=true`.

### Monitoreo semanal (bloque chico, linkea a Programados)

`weeklyMonitoring` trae `totalFields`/`activeSchedules`/`activeSchedulesWithoutRuns`/
`schedulesWithRuns`/`sentEmails`. **A propósito NO reusa** `activeSchedulesWithoutRuns` de
`/admin/metrics` (ese usa `lastRunAt IS NULL`, PR1) — acá se recalcula con el criterio real de PR3
(`EXISTS`/`NOT EXISTS`). `sentEmails` es histórico completo (corridas con `emailSentAt` seteado,
sin ventana de días) — distinto de `mailSentLast7/30Days` del resumen de Programados, que sí están
acotados a una ventana. El bloque no repite la tabla de Programados, solo dos CTAs reales:
`/scheduled-analysis?enabled=true` y `/scheduled-analysis?enabled=true&hasRuns=false`.

### Top errores (30 días)

`topAnalysisErrorsLast30Days`: agrupa `Analysis.errorMessage` tal cual (ya viene truncado/resumido
desde `AnalysisService`, nunca stack trace completo — mismo campo que usa la tabla de
Diagnósticos), `status='Error'`, últimos 30 días, top 3 por cantidad. CTA único a
`/analysis?status=Error` (no hay forma de filtrar por mensaje exacto en el listado, así que no se
linkea por fila individual).

### Qué se tocó en `agro-score-api`

`admin.controller.ts` (ruta nueva), `admin.service.ts` (`getProductAnalytics` +
`buildFunnelStage`/`pluralize`), `admin.service.spec.ts` (16 tests nuevos),
`admin.guards.spec.ts` (1 test nuevo), `dto/admin-product-analytics.dto.ts` (nuevo). Sin
migraciones — todas las queries son agregados de solo lectura sobre columnas ya indexadas.

### Qué se tocó en `agro-score-admin`

`core/models/product-analytics.model.ts` y `core/services/product-analytics.service.ts` (nuevos,
mismo shape que la API), `features/dashboard/product-analytics/` (componente nuevo,
autocontenido — carga su propio `/admin/product-analytics`, no recibe datos por `@Input()` del
Dashboard, así que un error acá nunca tumba el resto del Dashboard), `dashboard.component.ts/html`
(agrega `<app-product-analytics />` debajo de las secciones de KPIs existentes, antes de "Últimos
diagnósticos"), `dashboard.component.spec.ts` (mock de `ProductAnalyticsService` agregado a todos
los tests existentes + 1 test nuevo de integración).

### Decisión de responsabilidades (distinta de PR1, a propósito)

En PR1, el copy de las alertas vive en el frontend (`operational-alerts.util.ts`) y la API solo
agrega números crudos. Acá el copy básico (`label`/`description` de cada etapa, `title`/
`description` de cada insight) vive en la API, porque el shape que pidió la ficha ya lo incluye a
nivel de DTO — el frontend de este PR solo pinta lo que recibe, no arma texto. Documentado acá para
quien note la inconsistencia entre PRs: es deliberada, no un descuido.

### Qué quedó fuera de este PR

- **Links exactos para las etapas 2, 4, 5 y 6 del funnel** ("usuarios con campo", "campos con
  lote", "campos con análisis finalizado", "campos con veredicto"): no existe todavía un filtro
  dedicado en ninguna pantalla admin para esas preguntas puntuales. Mejor sin link que uno
  impreciso — ver nota en la tabla de etapas arriba.
- **Ruta `/product-analytics` separada**: el Dashboard no quedó sobrecargado (el bundle del chunk
  `dashboard-component` pasó de ~20 kB a ~24.5 kB, sin ninguna librería de charts nueva), así que
  se mantuvo la preferencia del ticket de integrarlo ahí en vez de una ruta aparte.
- **Cohortes por fecha de alta**: el funnel es sobre entidades actuales, no "de los usuarios que se
  registraron esta semana, cuántos...". Documentado explícitamente en el copy de la sección para no
  sobre-prometer precisión estadística que este PR no construye.
- **Normalización de mensajes de error**: se agrupan por mensaje exacto (`GROUP BY
  "errorMessage"`), no por patrón/categoría — no existe todavía una función de normalización segura
  en el repo, y el ticket explícitamente permite este fallback ("agrupar por mensaje exacto" si no
  hay función segura).

## Admin PR 5 — Campos y Lotes con estado real

### Objetivo

Campos y Lotes eran tablas planas: nombre, dueño, cantidad/fecha, sin ningún estado de uso real.
Este PR agrega, por campo, todo lo necesario para responder "¿qué campos están activos, cuáles
generan valor, cuáles están abandonados, cuáles requieren atención?" sin saltar a Diagnósticos o
Programados — y en Lotes, contexto mínimo del campo (sin convertir Lotes en una copia de Campos).

### Campos nuevos en `/admin/fields`

Por cada campo, además de lo que ya existía (`id/name/ownerId/ownerEmail/ownerFullName/lotsCount/
createdAt/updatedAt`):

- `analysisStatus`: `without_analysis | processing | completed | error | attention` — ver
  definición exacta más abajo.
- `requiresAttention`: booleano, señal operativa independiente de `analysisStatus`.
- `latestAnalysis`: `{ id, status, createdAt, completedAt, durationMs, score }` del análisis MÁS
  RECIENTE del campo, o `null` si no tiene ninguno. `score` (`Analysis.globalScore`, real, nunca
  recalculado) solo viaja cuando `status === 'Finalizado'` — mientras procesa o si terminó en
  error, `globalScore` sigue en su valor default (`0`) y mostrarlo sería un score falso, no
  "ausente".
- `technicalVerdict`: reusa `AdminAnalysisTechnicalVerdict` tal cual (PR 13A) — mismo shape que ya
  viaja en Diagnósticos/Programados, la tabla de Campos solo pinta un subconjunto compacto
  (`verdict` + `confidence`); `generator`/`promptVersion`/`errorMessage` quedan para Diagnósticos.
- `weeklyMonitoring`: `{ active, scheduleId, nextRunAt, lastRunAt, hasRuns }` — `hasRuns` usa
  existencia REAL de `ScheduledAnalysisRun` (mismo criterio que PR3), nunca `lastRunAt`.

Todo resuelto en lote por los `fieldId`/`scheduleId` de la página actual (nunca una consulta por
fila): 5 consultas totales para Campos sin importar cuántos campos traiga la página (verificado con
un test dedicado de conteo de llamadas).

### Campos nuevos en `/admin/lots`

Contexto MÍNIMO, a propósito (prioridad mínima del ticket, "no convertir Lotes en una copia de
Campos"): `fieldHasAnalysis` y `fieldHasActiveMonitoring` (booleanos), no el `analysisStatus`
completo — evita resolver veredicto técnico por campo en una pantalla que no lo pidió. 2 consultas
en lote por los `fieldId` distintos de la página.

### Definición exacta de los 5 estados de `analysisStatus`

| Estado             | Condición                                                                 |
|---------------------|----------------------------------------------------------------------------|
| `without_analysis`  | No existe ningún `Analysis` asociado al campo (mismo criterio que `hasAnalysis=false`, PR1). |
| `processing`         | El análisis más reciente del campo está en `Procesando`.                  |
| `error`              | El análisis más reciente del campo está en `Error`.                       |
| `attention`          | El análisis más reciente está `Finalizado`, pero su veredicto técnico es `attention` o `critical`. |
| `completed`          | El análisis más reciente está `Finalizado` y no requiere atención según el veredicto (o no hay veredicto todavía). |

Es un estado **administrativo/producto**, nunca un diagnóstico agronómico nuevo — deriva
exclusivamente de `Analysis.status` + `AnalysisTechnicalVerdict.verdict`, dos columnas que ya
existían.

### Definición exacta de `requiresAttention`

```
requiresAttention =
  latestAnalysis?.status === 'Error'
  OR technicalVerdict?.verdict IN ('attention', 'critical')
  OR (weeklyMonitoring.active AND NOT weeklyMonitoring.hasRuns)
```

Es independiente de `analysisStatus`: puede ser `true` incluso con `analysisStatus='completed'`
(ej. un campo con análisis Finalizado y veredicto favorable, pero cuyo monitoreo semanal está
activo y todavía no registró ninguna corrida). **A propósito no usa umbrales de score** — se
confirmó antes de escribir código que el admin no tiene ninguna banda de score propia (a diferencia
de `agro-score-web/src/app/shared/utils/score-band.ts`), y el ticket pide explícitamente no
inventar una acá si no existe: "si no hay score bands admin, usar veredicto/error/schedule".

### Banda visual del score (solo presentación, no en `requiresAttention`)

El admin no tenía ninguna banda de score. En vez de inventar una escala nueva, el frontend
(`shared/utils/score-band.util.ts`) reusa los mismos umbrales que ya usa `scoreInterpretation` en
`agro-score-web/src/app/features/app/analysis-result/analysis-result.component.ts` (score ≥ 70 →
favorable, ≥ 40 → variabilidad interna, debajo → menor desempeño) — citados y adaptados a un label
de tabla compacto (Favorable / Variable / Bajo desempeño), `agro-score-web` no se tocó. Es solo un
acento visual sobre el número que ya trae el backend; nunca decide `analysisStatus` ni
`requiresAttention`.

### Filtros nuevos

`/fields?status=without_analysis|processing|completed|error|attention` y
`/fields?monitoring=active|inactive` — los 5 valores de `status` completos (no solo los 3 que el
ticket marcaba como prioridad mínima: la maquinaria de subquery correlacionada ya la necesitaba
`attention`, así que sumar `processing`/`error`/`completed` fue una extensión barata del mismo
mecanismo, no un esfuerzo aparte). `status=without_analysis` reusa el mismo `NOT EXISTS` que
`hasAnalysis=false` (misma pregunta, dos nombres por compatibilidad con PR1).

### Compatibilidad con PR1/PR2

`hasAnalysis`, `userId`, `fieldId` (Campos) y `fieldId`, `userId` (Lotes) siguen intactos — cubierto
con tests explícitos que combinan los filtros viejos y los nuevos en la misma llamada. Todos los
campos nuevos son opcionales en los modelos del frontend (`AdminField`/`AdminLot`), mismo criterio
de compatibilidad hacia atrás que `AdminMetrics` desde PR1.

### Links / IDs mantenidos o agregados

- Mantenidos: nombre → `/analysis?fieldId=`, dueño → `/users?userId=`, "Ver programados" →
  `/scheduled-analysis?fieldId=`, `app-copyable-id` del `fieldId` (todos de PR2).
- Nuevos: "Último análisis" → `/analysis?analysisId=<id>` (filtro real, ya soportado por
  `ListAnalysisQueryDto` desde PR2 y ya leído por `AnalysisComponent`), badge de Monitoreo →
  `/scheduled-analysis?fieldId=<id>`.

### Qué quedó fuera de este PR

- **Vista de detalle de campo**: el ticket lo excluye explícitamente ("No crear una vista detalle
  grande todavía") — este PR es estado resumido en tabla, no una pantalla nueva.
- **`/fields?hasAnalysis=true` como link de la etapa "análisis finalizado"**: ese filtro existe
  pero incluye cualquier estado de análisis (también Procesando/Error), no solo Finalizado — no se
  usó como link de "Último análisis" por la misma razón que en PR4 (Product Analytics): mejor sin
  link que uno que insinúe más precisión de la que tiene.
- **Columna "Creado"**: se sacó de ambas tablas (Campos y Lotes) para hacerle lugar a las columnas
  nuevas sin saturar — "Actualizado" se mantiene, que es la fecha más relevante para "¿qué campos
  están activos?".
- **`analysisStatus` completo en Lotes**: se limitó a dos booleanos (prioridad mínima del ticket),
  ver "Campos nuevos en `/admin/lots`" arriba.
