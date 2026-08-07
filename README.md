# agro-score-admin

Panel de administración interno de AgroScore. App Angular 18 standalone, separada de `agro-score-web` (landing/app pública) y `agro-score-api` (backend). Consume la misma API NestJS de `agro-score-api`, bajo los endpoints `/admin/*` (ficha `ADMIN-1` + `ADMIN-2`, ver `agro-score-api/docs/admin-backend.md`).

**Estado:** el panel consume todas las capacidades de `ADMIN-2`/`ADMIN-3` (backend) — Solicitudes de acceso, Auditoría, Sistema, Usuarios (invitaciones + reset, ahora con envío real de email) y Diagnósticos (revisión + retry) — más un Dashboard con las métricas extendidas.

Stack: Angular 18 (standalone components + signals), TypeScript, CSS plano (sin Tailwind ni librerías de UI — panel interno, sobrio y liviano). Bundle inicial ~85kB comprimido.

## Requisitos

- Node 22+ (o cualquier versión compatible con Angular 18/`@angular/cli` 18.2).
- El backend `agro-score-api` corriendo (local en `http://localhost:3001` o el que configures en `src/environment/environment.ts`).
- Al menos un usuario con rol `owner` o `admin` en la base — ver "Cómo crear/promover el primer owner o admin" en `agro-score-api/docs/admin-backend.md` (`npm run promote:user-role` en ese repo). No hay ningún flujo dentro de este frontend para crear el primer admin: es intencional, coherente con que el backend tampoco expone un endpoint público para eso.

## Correr local

```bash
npm install
npm start          # alias de `ng serve`, sirve en http://localhost:4200
```

`agro-score-web` (el frontend público) también usa el puerto 4200 por default de Angular — no corras los dos al mismo tiempo con la config por default, o arrancá este con otro puerto:

```bash
npm start -- --port 4300
```

Si usás un puerto distinto de 4200, el backend local tiene que permitirlo en CORS. `agro-score-api/.env` ya trae `FRONTEND_URL=http://localhost:4200`; para sumar otro origin en dev, seteá `CORS_ORIGIN` (lista separada por comas) en ese `.env`, ej:

```
CORS_ORIGIN=http://localhost:4200,http://localhost:4300
```

## Environments

- `src/environment/environment.ts` — dev: `apiUrl: 'http://localhost:3001'`.
- `src/environment/environment.prod.ts` — producción: `apiUrl: 'https://api.agroscorelatam.com'`.
- El build de producción (`ng build`, configuración `production` por default) reemplaza automáticamente el primero por el segundo vía `fileReplacements` en `angular.json` — no hay que tocar nada a mano.
- No hay ninguna URL ni secreto hardcodeado fuera de estos dos archivos.

## Autenticación

El backend autentica con **JWT Bearer en el header `Authorization`**, no con cookies httpOnly (`JwtStrategy` usa `ExtractJwt.fromAuthHeaderAsBearerToken()`; `POST /auth/login` devuelve `{ user, accessToken }` en el body, no setea ningún `Set-Cookie`). Mismo mecanismo que ya usa `agro-score-web` contra este backend.

- `AuthService` (`src/app/core/services/auth.service.ts`) guarda el token en `localStorage` (`agroscore_admin_access_token`, clave distinta a la de `agro-score-web` para no pisarse si corren en el mismo navegador/origen de desarrollo) y valida sesión contra `GET /auth/me`.
- `authInterceptor` adjunta `Authorization: Bearer <token>` a cada request y además setea `withCredentials: true` (pedido explícito) — hoy es un no-op porque el backend no usa cookies, pero no rompe nada (el CORS del backend ya usa orígenes explícitos, no `*`, así que es compatible) y deja las requests listas si en el futuro se suma auth por cookie.
- `adminGuard` (`src/app/core/guards/admin.guard.ts`) protege todas las rutas del panel: sin sesión → `/login`; con sesión pero rol `user` → `/access-denied`; con rol `owner`/`admin` → deja pasar. El rol se valida contra lo que devuelve `/auth/me` en cada carga, no contra un valor cacheado del login.
- Si un usuario con rol `user` inicia sesión correctamente, no se lo bloquea con un simple mensaje: se lo redirige a la pantalla `/access-denied`, coherente con el resto del guard.
- `authInterceptor` también reacciona a un **403 en vivo** (no solo al navegar): si una acción devuelve 403 a media sesión — típicamente porque el rol cambió mientras la pestaña seguía abierta — redirige a `/access-denied` sin limpiar el token (sigue siendo una sesión válida, solo no autorizada para el panel). Un 401 sí limpia la sesión y manda a `/login`.

## Rutas

`/login`, `/dashboard`, `/users`, `/access-requests`, `/fields`, `/lots`, `/analysis`, `/audit-logs`, `/system` (todas menos `/login` protegidas por `adminGuard`), más `/access-denied`.

## Pantallas

- **Dashboard**: `GET /admin/metrics` — métricas agrupadas en 5 secciones (Usuarios, Campos, Diagnósticos, Salud operativa, Solicitudes de acceso): totales + activos/completados/fallidos de siempre, más altas de usuarios/campos/diagnósticos a 7 y 30 días, fallos a 7/30 días, tasa de fallo a 7 días (%), duración promedio (histórica y a 7 días), usuarios/campos sin ningún diagnóstico, y solicitudes de acceso por estado (badges). Todo campo nuevo es opcional en el modelo — si el backend no lo manda, se muestra `0` (conteos) o "No disponible" (tasa de fallo, para no confundir "no calculada" con "0% de fallos"). `averageAnalysisDurationMs*` usa el mismo `DurationPipe` que ya mostraba "—" para `null`. Listas cortas de últimos diagnósticos y últimas solicitudes de acceso, sin cambios.
- **Usuarios**: `GET/POST/PATCH/DELETE /admin/users` — listar, crear, editar (nombre/email/rol/estado), desactivar (con confirmación), sin exponer nunca `password`/hash. Suma: filtro por rol y por activo/inactivo (**client-side** — ver nota de "Deuda" abajo, el backend no filtra estos dos campos), columna "Actualizado", **Crear invitación** (email + rol, default `user`) y **Generar reset** de contraseña por usuario — ambos con confirmación, nunca password temporal, y con el mismo patrón de "token solo en dev / mensaje honesto en producción" ya usado en Solicitudes de acceso.
- **Solicitudes de acceso**: `GET/PATCH /admin/access-requests`, `POST /admin/access-requests/:id/create-user` — listar (paginado, búsqueda, filtro por los 5 estados), ver detalle completo (fechas de contacto/conversión/descarte, notas internas, responsable asignado), editar estado/notas/responsable, y **crear usuario desde la solicitud** (invitación, no password temporal), con manejo de email duplicado (409).
- **Diagnósticos**: `GET /admin/analysis` con filtro por estado, `onlyFailed`, `onlyUnreviewed`, `fieldId`, `userId`, rango de fechas (`from`/`to`) — todos aplicados con un botón "Filtrar" explícito (son varios campos, no tiene sentido re-pedir en cada tecla). Muestra id resumido, campo, usuario, estado, creado, completado, duración humana, revisión (quién y cuándo, resolviendo el `reviewedByUserId` a nombre/email igual que Auditoría resuelve el actor), reintentos (`retryCount`/`lastRetriedAt`), y error resumido. Acciones **Marcar revisado** y **Reintentar** (ambas con confirmación, solo visibles cuando `status='Error'` — evita un 400 garantizado si se muestran fuera de ese caso — y refrescan la tabla al terminar). El copy de "reintentar" es el texto exacto pedido, visible tanto en el diálogo de confirmación como de forma permanente arriba de la tabla: *"El backend registra la solicitud de reintento. La re-ejecución automática del pipeline todavía no está habilitada."*
- **Auditoría**: `GET /admin/audit-logs` — tabla de acciones admin (fecha, actor resuelto a nombre/email cuando es posible, acción, target, resumen legible), filtros por acción/target type/actorUserId/targetId, detalle con `before`/`after` en JSON legible. Redacción de campos sensibles (`password`, `*Hash`, `*token*`, `secret`, `apiKey`) del lado del cliente además de la sanitización que ya hace el backend — defensa en profundidad, nunca depende de una sola capa.
- **Sistema**: `GET /admin/system/health` — estado de API/DB/worker/Earth Engine (este último siempre se muestra como "No verificado", nunca como error — es una decisión de diseño del backend, no una falla), último diagnóstico exitoso/fallido, uptime, commit, timestamp. Refresh manual únicamente, sin polling.
- **Campos**, **Lotes**: solo lectura, paginado + búsqueda (sin cambios esta ficha).

## Servicios y modelos (ADMIN-2)

- `core/services/access-requests.service.ts` — `list`, `update`, `createUserFromRequest`.
- `core/services/audit-logs.service.ts` (nuevo) — `list` con filtros `actorUserId`/`action`/`targetType`/`targetId`.
- `core/services/system.service.ts` (nuevo) — `getHealth`.
- `core/services/users.service.ts` — suma `createInvitation`, `requestPasswordReset`.
- `core/services/analysis.service.ts` — suma filtros nuevos en `AnalysisQuery` y `markReviewed`/`retry` (tipados `Observable<unknown>` a propósito: la respuesta de esos dos endpoints es la entidad `Analysis` completa, no el DTO liviano de `list()`, y no se usa — cada acción refresca la tabla con `list()`).
- `core/models/access-request.model.ts` — `AccessRequestStatus` ampliado a 5 valores, `internalNotes`/`assignedToUserId`/`contactedAt`/`convertedAt`/`discardedAt`, payloads de update y creación de usuario, `IssuedInvitationSummary` (reutilizado también por Usuarios; ADMIN-3: suma `emailSent`/`dryRun`/`provider`, `message` queda deprecated).
- `core/models/user.model.ts` — suma `CreateInvitationPayload`, `PasswordResetResult` (ADMIN-3: suma `emailSent`/`dryRun`/`provider`, `message` queda deprecated).
- `core/models/analysis.model.ts` — suma `reviewedAt`/`reviewedByUserId`/`retryCount`/`lastRetriedAt`.
- `core/models/metrics.model.ts` — todos los campos de ADMIN-2 como opcionales (compatibilidad hacia atrás si el backend no los manda).
- `core/models/audit-log.model.ts` (nuevo) — `AdminAuditAction` (unión de acciones conocidas + `string` como fallback, para no romper si el backend agrega una acción nueva).
- `core/models/system-health.model.ts` (nuevo).
- `shared/utils/redact-sensitive.util.ts` (nuevo) — redacción recursiva de `before`/`after` en Auditoría.
- `shared/utils/audit-action.util.ts`, `health-status.util.ts`, `uptime.util.ts` (nuevos) — labels/tonos/formato humano.

## Build productivo

```bash
npm run build
```

Salida en `dist/agro-score-admin/browser/` (el builder `application` de Angular siempre anida el output ahí, con o sin SSR — mismo comportamiento que `agro-score-web`).

## Deploy futuro (solo documentado, no ejecutado)

- Bucket S3 nuevo para este build (separado del de `agro-score-web`).
- Distribución CloudFront nueva, alias `admin.agroscorelatam.com`, apuntando a ese bucket.
- CNAME en Cloudflare: `admin` → dominio de esa distribución CloudFront.
- **CORS en el backend productivo**: `agro-score-api` necesita agregar el origin del admin a `CORS_ORIGIN` (variable ya existente, ver `agro-score-api/.env.example` y `docs/admin-backend.md`). El valor productivo final debe quedar:

  ```
  CORS_ORIGIN=https://agroscorelatam.com,https://www.agroscorelatam.com,https://admin.agroscorelatam.com
  ```

  Esto **no se aplicó** en esta ficha — no se tocó ningún `.env` real ni de producción. Es un paso manual pendiente para cuando se despliegue `admin.agroscorelatam.com` de verdad.

- **Custom error responses (SPA routing) en CloudFront**: como cualquier Angular con `Router` en modo `PathLocationStrategy`, una recarga en `/audit-logs` o `/system` (o cualquier ruta que no sea `/`) le pide al bucket S3 un objeto que no existe → S3 devuelve 403/404 nativo. CloudFront tiene que reescribir esas dos respuestas a `/index.html` con status **200** (no 403/404 — un 404 real haría que el Router de Angular nunca llegue a cargar y el usuario vea la página de error de S3, no la app):

  ```
  403 → /index.html → 200
  404 → /index.html → 200
  ```

  Mismo mecanismo que necesitaría cualquier SPA en S3/CloudFront (`agro-score-web` ya lo tiene configurado — replicar esa misma config de "Custom Error Response" para la distribución nueva de `admin.agroscorelatam.com`). No ejecutado, solo documentado acá para cuando se arme el deploy real.

## Qué no incluye esta fase / deuda conocida

**El panel ya consume todo `ADMIN-2`/`ADMIN-3`.** Deuda que queda, explícita:

- **Resuelto en ADMIN-3**: invitaciones y reset de contraseña ya mandan email real (Resend, vía `EmailService` en `agro-score-api` — ver `docs/invitation-password-reset-email.md` en ese repo). Los modales de "Crear invitación"/"Generar reset" ahora muestran "Invitación enviada por email" / "Reset generado en modo dry-run" / un error claro según `emailSent`/`dryRun`, en vez del viejo mensaje "el envío por email todavía no está integrado". El token/link crudo se sigue mostrando solo fuera de producción (sin cambios en ese criterio). Las páginas públicas donde el usuario final completa el flujo (`/accept-invitation`, `/reset-password`) viven en `agro-score-web`, no acá — coherente con que el login real de usuarios `user` tampoco vive en este panel.
- **Retry no re-ejecuta el pipeline**: `POST /admin/analysis/:id/retry` es "retry requested" — incrementa `retryCount`, no vuelve a llamar al worker. Comunicado explícitamente en la UI (ver copy obligatorio arriba), no es una limitación oculta.
- **Filtro de rol/estado en Usuarios es client-side**: `GET /admin/users` no soporta `role`/`isActive` como query params server-side (solo `page`/`limit`/`search` — confirmado contra `docs/admin-backend.md` y el DTO real). En vez de tocar el backend sin autorización previa, cuando alguno de esos dos filtros está activo el frontend trae un lote de hasta 100 usuarios y filtra ahí, mostrando el conteo filtrado real y ocultando la paginación server-side en ese modo. Correcto para el volumen actual (~10-90 usuarios en esta instancia), no escala a miles. Si hace falta que escale, es un cambio chico en el backend (agregar `role`/`isActive` a `PaginationQueryDto`/`AdminService.listUsers`) — no se hizo sin confirmación.
- **No se puede desasignar un responsable ya asignado** en una solicitud de acceso — el backend valida `assignedToUserId` como UUID si viene, pero no acepta `null` para vaciarlo. El frontend omite el campo del `PATCH` cuando el select queda en "Sin asignar", así que un responsable ya asignado solo se puede reemplazar por otro. Mismo criterio: cambio de backend no hecho sin confirmación previa.
- **Tests automatizados de frontend**: `ng test` (Karma) existe como script pero no hay specs reales — el criterio de cierre de todas las fichas de este panel fue build limpio + verificación manual en navegador real (Chrome headless vía Playwright, backend local, sin mocks), no una suite de tests. Sigue igual que en ADMIN-1.
