# agro-score-admin

Panel de administración interno de AgroScore. App Angular 18 standalone, separada de `agro-score-web` (landing/app pública) y `agro-score-api` (backend). Consume la misma API NestJS de `agro-score-api`, bajo los endpoints `/admin/*` agregados en la ficha `ADMIN-1` (ver `agro-score-api/docs/admin-backend.md`).

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

## Rutas

`/login`, `/dashboard`, `/users`, `/fields`, `/lots`, `/analysis`, `/access-requests` (todas menos `/login` protegidas por `adminGuard`), más `/access-denied`.

## Pantallas

- **Dashboard**: `GET /admin/metrics` — cards de usuarios/campos/lotes/diagnósticos/duración promedio, listas cortas de últimos diagnósticos y últimas solicitudes de acceso.
- **Usuarios**: `GET/POST/PATCH/DELETE /admin/users` — listar (paginado, búsqueda por email/nombre), crear, editar (nombre/email/rol/estado), desactivar (soft delete, con confirmación). Nunca se muestra ni se pide `password`/hash fuera del alta.
- **Campos**, **Lotes**: solo lectura, paginado + búsqueda.
- **Diagnósticos**: solo lectura, paginado + filtro por estado (`Procesando`/`Finalizado`/`Error` — se mantienen los valores en español del backend, no se tradujeron). Muestra duración humana (ms/s/min) y el error resumido si falló.
- **Solicitudes de acceso**: solo lectura, paginado + filtro por estado (`new`/`contacted`/`discarded`).

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

## Qué no incluye esta fase

- Reseteo de contraseña desde el admin.
- Cambiar el `status` de una solicitud de acceso (solo lectura por ahora).
- Tests automatizados de frontend (el criterio de cierre de esta ficha fue build + verificación manual en navegador, no suite de tests).
