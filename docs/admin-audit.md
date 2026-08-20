# Auditoría del panel admin — AgroScore

Fecha: 2026-08-20
Alcance: `agro-score-admin` (foco principal) + integración de solo lectura con `agro-score-api`.
No se modificó ningún archivo de `agro-score-worker`, `agro-score-web`, `.env`, deploy ni infraestructura. No se hizo deploy.

---

## 1. Resumen ejecutivo

**Estado actual.** El admin está bastante más maduro de lo que suele estar un primer panel interno: es Angular 18 standalone (sin NgRx, sin librería de UI, CSS plano), con guard de rol real (`owner`/`admin`), interceptor de auth real, y **no se encontró ningún dato mock, hardcodeado ni botón fake** en ninguna de las 8 pantallas (Dashboard, Usuarios, Campos, Lotes, Diagnósticos, Solicitudes de acceso, Auditoría, Sistema). Todas están conectadas a endpoints reales de `/admin/*`. El botón "Reintentar" de un análisis fallido es un caso ejemplar de honestidad: llama a un endpoint real, pero tanto el código como la UI aclaran explícitamente que el backend solo *registra* la solicitud y no re-ejecuta el pipeline — no hay funcionalidad fingida oculta.

**Principales problemas.** El admin no llega a cubrir el caso de uso de soporte/operación real:
- El **mensaje de error de un análisis fallido se corta con `text-overflow: ellipsis`** en la tabla, sin tooltip ni forma de expandirlo. Es el dato más pedido por soporte y hoy es ilegible.
- **No existe vista de detalle** de análisis, campo o lote — todo vive en filas de tabla o modales de edición.
- **No hay forma de ver ni descargar el PDF/reporte de un análisis** desde el admin. Y aunque se agregara el botón, **el backend hoy no lo permitiría**: las rutas de reporte (`/analysis/:id/report/pdf`, etc.) exigen que el usuario autenticado sea el dueño del campo — no existe bypass de admin.
- El dashboard **no muestra "análisis en proceso"**, pese a que el dato es derivable hoy mismo del payload existente de `/admin/metrics` (`total - completados - fallidos`), sin tocar backend.
- **Cero tests reales**: `npm test -- --watch=false` falla duro (`TS18003: No inputs were found`) en vez de reportar "0 passed" — no hay ni un `.spec.ts` en el repo.
- Los filtros de rol/estado en Usuarios son **solo client-side**, con un límite documentado de 100 registros (`CLIENT_FILTER_LIMIT`) — a partir de ese tamaño de tabla, filtrar deja de ser confiable en silencio.
- **Cero soporte responsive/mobile**: la única `@media query` de todo el proyecto es de dark-mode; el sidebar es fijo de 220px sin colapso.

**Riesgos.** El riesgo más importante no es visual, es operativo: frente a un ticket real ("¿por qué falló el análisis del usuario X?"), el admin hoy permite ver *que* falló pero no el motivo completo, y no permite abrir el reporte/PDF para inspeccionarlo. Eso es exactamente el caso de uso que el pedido prioriza.

**Mejoras de mayor impacto (en orden):**
1. Mostrar el mensaje de error completo en Diagnósticos (front-only).
2. Agregar KPI "Procesando" al dashboard (front-only, dato ya disponible).
3. Vista de detalle de análisis (front + backend chico: falta `GET /admin/analysis/:id`).
4. Endpoint admin para descargar el PDF/reporte de cualquier análisis (backend, Fase E).

---

## 2. Rutas actuales

Definidas en `src/app/app.routes.ts`. Todas las rutas privadas cuelgan de un único guard (`adminGuard`) aplicado al shell (`AdminLayoutComponent`), no hay resolvers.

| Ruta | Pantalla | Estado | Problemas | Recomendación |
|---|---|---|---|---|
| `login` | Login | Funcional | — | — |
| `access-denied` | Acceso denegado | Funcional | — | — |
| `` → redirect | Redirige a `dashboard` | Funcional | — | — |
| `dashboard` | Dashboard operativo | Funcional, 100% datos reales | Sin KPI "en proceso"; sin bloque "requiere atención" | Fase B |
| `users` | Usuarios (lista + modales) | Funcional | Filtros rol/estado client-side, límite 100; sin ruta de detalle | Fase D |
| `fields` | Campos (solo lectura) | Funcional, mínimo | Sin detalle, sin "último análisis"/"cant. análisis" | Fase D |
| `lots` | Lotes (solo lectura) | Funcional, mínimo | Igual que Campos | Fase D |
| `analysis` | Diagnósticos | Funcional, la pantalla más completa | Error truncado, sin ruta de detalle, sin PDF/"ver en app" | Fase C (la más prioritaria) |
| `access-requests` | Solicitudes de acceso | Funcional | Sin hallazgos relevantes | — |
| `audit-logs` | Auditoría | Funcional | Sin hallazgos relevantes | — |
| `system` | Estado del sistema | Funcional | `earthEngine.status` siempre `not_checked` (por diseño del backend, no bug) | Documentar en UI |
| `**` | Redirige a `dashboard` | Funcional | — | — |

No existen rutas de detalle (`/users/:id`, `/fields/:id`, `/lots/:id`, `/analysis/:id`) para ninguna entidad — es una ausencia consistente en las 4 pantallas de listado principales.

---

## 3. Componentes principales

| Componente | Uso | Problemas | Recomendación |
|---|---|---|---|
| `AdminLayoutComponent` (`layouts/admin-layout/`) | Shell: sidebar + topbar + `<router-outlet>` | Sidebar fija 220px, sin colapso; nav hardcodeada en el propio componente (no es grave, pero crece a mano) | Agregar colapso responsive si se prioriza mobile (Fase B, no urgente) |
| `DashboardComponent` | KPIs + últimas tablas | No expone "procesando"; no agrupa "requiere atención" | Fase B |
| `UsersComponent` | Listado + alta/edición + invitación + reset de password | Filtros client-side con límite 100; sin vista de detalle | Fase D |
| `FieldsComponent` / `LotsComponent` | Listados de solo lectura | Sin filtros más allá de búsqueda; sin detalle; casi idénticos entre sí (comparten `shared-list.component.css`) | Fase D |
| `AnalysisComponent` | La pantalla más importante: filtros (estado, fallidos, no revisados, campo, usuario, fecha), tabla, retry, marcar revisado | Error truncado sin expandir; sin detalle; sin PDF/"ver en app"; no muestra `startedAt` pese a tenerlo disponible | Fase C |
| `AccessRequestsComponent` | Listado + cambio de estado + alta de usuario desde solicitud | Sin hallazgos relevantes | — |
| `AuditLogsComponent` | Listado de auditoría | Sin hallazgos relevantes | — |
| `SystemComponent` | Health de API/DB/worker/Earth Engine | Ninguno propio del componente | — |
| `StatusBadgeComponent` (shared) | Badge de estado reutilizado en 4 pantallas | Bien factorizado, sin duplicación | Mantener el patrón |
| `PaginationControlsComponent` (shared) | Paginador reutilizado en 6 pantallas | Bien factorizado | Mantener |
| `DurationPipe` (shared) | Formato de duración | Bien factorizado | Mantener |

Duplicación real encontrada (no de badges/paginación, que están bien hechos):
- `apiErrorMessage()` reimplementada de forma casi idéntica en 5 archivos (`analysis`, `users`, `access-requests`, `audit-logs`, `system` components) en vez de vivir en `shared/utils/`.
- Resolución de "id de usuario → nombre (email)" reimplementada de forma independiente 3 veces (`analysis`, `audit-logs`, `access-requests`), cada una haciendo su propio `GET /admin/users?limit=100` — mismo patrón, tres servicios de red duplicados.
- Bloque CSS de modal duplicado entre `src/styles.css` (global) y `users.component.css` (local), con `max-width` distinto (480px vs 380px) — reconocido en un comentario del propio código.

---

## 4. Integración con API

| Pantalla | Endpoint(s) usado(s) | Datos reales/mock | Problemas |
|---|---|---|---|
| Dashboard | `GET /admin/metrics` | **Real**, sin mocks | No expone `procesando`; el dato es derivable del payload actual sin tocar backend |
| Usuarios | `GET/POST/PATCH/DELETE /admin/users`, `POST /admin/invitations`, `POST /admin/users/:id/password-reset` | **Real** | Filtro rol/estado no soportado server-side → se resuelve client-side con límite de 100 registros |
| Campos | `GET /admin/fields` | **Real** | No incluye "cantidad de análisis" ni "último análisis" por campo |
| Lotes | `GET /admin/lots` | **Real** | Igual que Campos |
| Diagnósticos | `GET /admin/analysis`, `PATCH /admin/analysis/:id/mark-reviewed`, `POST /admin/analysis/:id/retry` | **Real** | Retry es intencionalmente no-funcional en backend (documentado); no existe `GET /admin/analysis/:id` para detalle; no existe endpoint admin de PDF/reporte |
| Solicitudes de acceso | `GET/PATCH /admin/access-requests`, `POST /admin/access-requests/:id/create-user` | **Real** | Sin problemas relevantes |
| Auditoría | `GET /admin/audit-logs` | **Real** | Sin problemas relevantes |
| Sistema | `GET /admin/system/health` | **Real** (incluye ping real a DB y al worker) | `earthEngine.status` siempre `not_checked`, por diseño explícito del backend (no consulta Earth Engine directamente) |
| Login | `POST /auth/login`, `GET /auth/me` | **Real** | — |

Ningún servicio HTTP del admin (excepto `AuthService`) usa `catchError`/`tap` — el manejo de error queda 100% en cada componente vía `.subscribe({ error })`, con la función `apiErrorMessage()` duplicada 5 veces (ver §3). Funciona, pero es la clase de duplicación que conviene centralizar antes de agregar más pantallas.

---

## 5. UX/UI

**Layout.** Sidebar fija + topbar + contenido, sin animaciones ni exceso de color — ya cumple con el tono "técnico/operativo" pedido, no parece landing page.

**Navegación.** Simple, ítems hardcodeados (Dashboard, Usuarios, Solicitudes, Campos, Lotes, Diagnósticos, Auditoría, Sistema). Correcta pero sin jerarquía visual entre secciones "de datos" (Usuarios/Campos/Lotes/Diagnósticos) y "operativas" (Auditoría/Sistema) — todo al mismo nivel.

**Dashboard.** Bien poblado y 100% real: usuarios, campos/lotes, diagnósticos, salud operativa (fallidos 7/30 días, tasa de fallo, duración promedio, usuarios/campos sin análisis), solicitudes de acceso por estado, y dos mini-tablas (últimos análisis, últimas solicitudes). Le falta justamente lo que pide el brief: un bloque explícito de "requiere atención" que agrupe fallidos-no-revisados + tasa de fallo alta + análisis estancados, en vez de dejar que el operador cruce mentalmente varios números sueltos.

**Tablas.** Consistentes en estructura (mismo patrón de filtros → tabla → paginación) en las 6 pantallas de listado. La tabla de Diagnósticos es la más rica (9 columnas) pero sufre el problema del error truncado, y no tiene columna de `startedAt` pese a tenerla disponible en el modelo.

**Estados vacíos / carga / error.** Este es un punto fuerte: las 8 pantallas implementan las 3 variantes de forma consistente, reutilizando las mismas clases CSS globales (`.loading-state`, `.error-banner`, `.empty-state`). No hay ninguna pantalla "pelada" sin manejo de estos casos. El único hueco es cosmético: no hay skeletons, todo es texto plano ("Cargando...").

**Responsive.** Ausente. Única `@media` de todo el proyecto es `prefers-color-scheme: dark`. El sidebar de 220px nunca colapsa; el único paliativo es `overflow-x: auto` en el contenido, que permite scroll horizontal en tablas anchas pero no resuelve la usabilidad en mobile. Dado que es una herramienta interna de operación, es razonable no priorizarlo, pero vale documentarlo como deuda consciente.

**Consistencia visual.** Buena: badges, paginación, tarjetas, botones y modales usan clases globales compartidas (`src/styles.css`) en vez de reinventarse por pantalla — con la única excepción del bloque de modal duplicado en Usuarios.

---

## 6. Operación y soporte

**¿Sirve hoy para operar AgroScore?** Parcialmente. El dashboard da una foto general razonable (usuarios, campos, análisis, tasa de fallo, tendencias 7/30 días) y es 100% dato real.

**¿Permite detectar análisis fallidos?** Sí — hay filtro "solo fallidos" y "solo no revisados" en Diagnósticos, y contadores de fallidos en el dashboard. Falta el conteo de "en proceso" para detectar análisis colgados/lentos.

**¿Permite entender errores?** Parcialmente y de forma limitada. Se ve *que* falló y un mensaje de error truncado. No se ve la causa estructurada (Earth Engine / datos insuficientes / nubosidad / timeout) porque **el backend no la persiste** — sí la calcula internamente (`reason: timeout | http {status} | network/unreachable` en `PythonWorkerService`) pero solo la loguea, nunca la guarda en la fila de `Analysis` ni la expone por API. Esto es un gap de backend, no solo de frontend.

**¿Permite ayudar a un usuario?** Limitado. El admin puede confirmar que un usuario existe, cuántos campos/lotes tiene, y el estado de sus análisis — pero no puede abrir el reporte ni el PDF de ese usuario para ver lo mismo que él ve, porque no existe ese endpoint con bypass de ownership.

**¿Qué falta?** En orden de impacto para soporte: (1) error completo visible, (2) endpoint + botón de PDF/reporte con bypass de admin, (3) vista de detalle de análisis, (4) clasificación de causa de error persistida.

---

## 7. Problemas críticos

**Crítico**
- El admin no puede ver ni descargar el PDF/reporte de análisis de otros usuarios — bloquea el caso de uso de soporte más pedido en el brief. Requiere cambio de backend (nuevo endpoint admin), no es solucionable solo en frontend.
- Mensaje de error truncado sin expansión en la tabla de Diagnósticos — el dato más consultado para diagnosticar un fallo es hoy ilegible.
- Cero tests reales y el test runner falla en vez de reportar "0 tests" (`TS18003`) — cualquier regresión futura pasa desapercibida hasta producción.

**Alto**
- No existe vista de detalle para análisis, campo, lote ni usuario (solo hay modales de edición para usuarios).
- Filtros de rol/estado en Usuarios son client-side con límite de 100 registros — comportamiento incorrecto y silencioso a medida que la base de usuarios crezca.
- El dashboard no muestra "análisis en proceso" pese a que el dato ya está disponible sin tocar backend.
- Sin responsive/mobile en absoluto.

**Medio**
- `/admin/fields` y `/admin/lots` no incluyen "cantidad de análisis" ni "último análisis" — hay que cruzar manualmente con `/admin/analysis?fieldId=`.
- No hay clasificación de tipo de error (Earth Engine, datos insuficientes, nubosidad, timeout) pese a que el backend calcula una versión simplificada (`reason`) y la descarta sin persistir.
- `/admin/metrics` no reporta análisis "en proceso" ni un conteo de análisis potencialmente colgados (mucho tiempo en `Procesando`).
- Duplicación de `apiErrorMessage()` (5 archivos) y de resolución de user-labels (3 componentes, 3 llamadas de red independientes al mismo `GET /admin/users?limit=100`).

**Bajo**
- Bloque CSS de modal duplicado (global vs. local) con `max-width` distinto.
- No hay script de lint ni configuración de ESLint/Prettier en el repo.
- No hay endpoint para reenviar invitación o link de reset si el email no llegó — hay que emitir uno nuevo desde cero.

---

## 8. Plan de mejora por fases

**Fase A — Limpieza y verdad operativa**
No hay mocks que quitar (ya está limpio). El trabajo real de esta fase es: mostrar el mensaje de error completo en Diagnósticos; si se agrega un botón de PDF antes de que exista el endpoint de backend, marcarlo explícitamente como "no disponible" en vez de mostrarlo roto o simularlo; encarrilar el test runner (agregar al menos specs reales mínimos para que `npm test` deje de fallar duro).

**Fase B — Dashboard operativo**
Agregar KPI "Procesando" (derivado de `total - completados - fallidos`, sin backend). Agregar bloque "Requiere atención" que agrupe: fallidos no revisados, tasa de fallo alta, análisis con antigüedad sospechosa en estado `Procesando`.

**Fase C — Análisis y soporte**
Vista de detalle de análisis (ruta o modal ampliado): error completo, scores, fechas completas incl. `startedAt`. Botón "ver PDF" y "ver en app" — condicionados a que el endpoint de backend exista (ver Fase E); si no existe, no se agregan como botones activos.

**Fase D — Usuarios/campos**
Filtro de rol/estado server-side en `GET /admin/users` (elimina el límite de 100). Vista de detalle de usuario/campo/lote con contadores reales (cantidad de análisis, último análisis). Requiere endpoints nuevos de detalle (ver §9).

**Fase E — Backend faltante**
`GET /admin/analysis/:id` (detalle admin, sin ownership check). `GET /admin/analysis/:id/report/pdf` con bypass de admin. Persistir la clasificación de error (`reason`) que ya se calcula pero se descarta. Endpoints de detalle para usuario/campo/lote. Todo esto requiere tocar `agro-score-api`, fuera del alcance actual salvo confirmación explícita.

---

## 9. Endpoints faltantes sugeridos

**Ya existen (no crear de nuevo):**
- `GET /admin/metrics`
- `GET /admin/system/health`
- `GET /admin/audit-logs`
- `GET/POST/PATCH/DELETE /admin/users`, `POST /admin/users/:id/password-reset`, `POST /admin/invitations`
- `GET /admin/fields`, `GET /admin/lots`
- `GET /admin/analysis` (con filtros: estado, fallidos, no revisados, campo, usuario, rango de fechas)
- `PATCH /admin/analysis/:id/mark-reviewed`
- `POST /admin/analysis/:id/retry` (real como llamada HTTP, pero por diseño solo registra el intento — no re-ejecuta el pipeline, decisión deliberada del equipo por riesgo/costo de Earth Engine)
- `GET/PATCH /admin/access-requests`, `POST /admin/access-requests/:id/create-user`

**Habría que crear (no existen hoy):**
- `GET /admin/users/:id` — detalle de usuario con contadores (campos, análisis).
- `GET /admin/fields/:id` — detalle de campo con lotes y análisis asociados.
- `GET /admin/lots/:id` — detalle de lote con análisis asociados.
- `GET /admin/analysis/:id` — detalle de análisis sin restricción de ownership (hoy `GET /analysis/:id` existe pero exige que el análisis pertenezca al usuario autenticado).
- `GET /admin/analysis/:id/report/pdf` — descarga de PDF con bypass de admin (el generador de PDF ya existe y es real, `ReportPdfService`; falta la ruta que lo exponga sin exigir ownership).
- Opcional: agregar `processingAnalysis` (o equivalente) a `GET /admin/metrics` — hoy es derivable en frontend sin cambios de backend, así que no es bloqueante.
- Opcional / a futuro, fuera de este alcance: persistir la clasificación de error (`reason`) que `PythonWorkerService` ya calcula y hoy solo loguea.

---

## 10. Primera implementación recomendada

La primera mejora propuesta es **frontend-only, sin tocar `agro-score-api`, sin backend nuevo, sin deploy**:

1. **Mostrar el mensaje de error completo** en la tabla de Diagnósticos (reemplazar el truncado por ellipsis por un elemento expandible o `title` con el texto completo).
2. **Agregar el KPI "Procesando"** al dashboard, calculado en el propio componente a partir de campos que `/admin/metrics` ya devuelve (`totalAnalysis - completedAnalysis - failedAnalysis`) — cero cambios de backend.

Es chico, testeable por build limpio, y ataca directamente las dos prioridades más altas del brief ("mejorar dashboard operativo" y "mejorar tabla de análisis") sin depender de ningún endpoint que no exista todavía.

**No se implementó nada todavía** — queda pendiente de confirmación antes de tocar código, según lo pedido.

---

## Verificación técnica

```
cd agro-score-admin
npm run build        # OK — build de producción limpio, ~6.4s, bundle bien por debajo de los presupuestos configurados
npm test -- --watch=false   # FALLA: TS18003 — no hay ningún *.spec.ts en el repo, el runner (Karma) sí está configurado
```

No se hizo `git commit`, `git push` ni deploy en ningún repositorio durante esta auditoría.
