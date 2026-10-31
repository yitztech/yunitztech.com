# Pruebas automatizadas

Cuatro capas, ejecutables por separado o todas juntas.

| Capa | Herramienta | Comando | En GitHub Actions |
| --- | --- | --- | --- |
| Unitarias (validación Zod, contenido, legal) | `node:test` + `tsx` | `npm run test:unit` (`npm test`) | Sí |
| Base de datos (restricciones CHECK, FK, únicos, retención) | `node:test` + Postgres 18 efímero | `npm run test:db` | **No** |
| Backend (API) | Gherkin + Playwright (`playwright-bdd`) | `npm run test:api` | Sí |
| Frontend (navegador, panel admin) | Gherkin + Playwright | `npm run test:web` | Sí |
| Humo/seguridad (existente) | Playwright | `npm run test:smoke` | Sí |

Todo junto: `npm run test:all` (unitarias + BD + e2e). Lo que corre en CI: `npm run test:ci`.

## Requisitos

- `test:db` necesita Docker: `scripts/test-db.sh` levanta `compose.test.yml` (Postgres sin volumen, puerto `55432`) y lo elimina al terminar. Con `DB_TEST_URL` apunta a una base **desechable** ya existente (el esquema `public` se borra).
- `test:api`, `test:web` y `test:smoke` necesitan el stack en marcha (`TEST_URL`, por defecto `http://localhost:8086`) y `ADMIN_EMAIL`/`ADMIN_PASSWORD` (o `.env`). En CI las ejecuta `scripts/verify-production.sh` sobre las imágenes de producción.
- Los escenarios Gherkin (`tests/bdd/features/{api,web}/*.feature`, en español) usan una IP simulada por escenario vía `X-Forwarded-For` para no agotar los límites de tasa (5 contactos/hora, 5 logins/15 min). Funciona cuando el gateway confía en el proxy (`TRUSTED_PROXY_CIDR`, como en CI); contra el stack de desarrollo (`compose.dev.yml`) todas las peticiones comparten IP y los escenarios de contacto/login pueden recibir 429: espera o reinicia la API.
- Las pruebas crean contactos y artículos QA. Los artículos se despublican al terminar (no hay borrado por API); no las ejecutes contra producción.

## Validación de datos

Reglas en un único módulo, `apps/api/src/validation.ts` (Zod), con `LIMITS` compartido:

| Campo | Reglas |
| --- | --- |
| Nombre | 2–100, recortado; letras Unicode, marcas, espacio, `'`, `’`, `.`, `-`; empieza por letra (sin dígitos ni símbolos) |
| Correo | ≤ 254, recortado, minúsculas, formato Zod |
| Empresa | ≤ 150; letras, números y `& . , ' ’ ( ) / + -` |
| Servicio | 2–100, sin `<` `>` ni controles |
| Mensaje | 20–5000, sin controles salvo `\t \n \r` (el NUL de Postgres daría un 500) |
| Artículo / portada | longitudes y formatos de `postSchema` / `settingsSchema` |

Los mismos límites se replican en:

- **Frontend:** atributos `minlength`/`maxlength` (formulario de contacto y editores del panel). Los escenarios `declara los mismos límites que el backend` comparan esos atributos con `LIMITS`, así que un desajuste rompe la prueba.
- **Base de datos:** restricciones `CHECK` en `apps/api/src/schema.sql` (se añaden `NOT VALID`: no bloquean despliegues con filas antiguas pero validan toda escritura nueva). Un `CHECK` fallido responde 400.

## Alcance y límites

- **Apps móviles (iOS/Android):** este repositorio no contiene ninguna app móvil (solo `apps/api` y `apps/web`), así que no hay pruebas ni entorno de certificados para móvil. Si se añade una app, se debe crear su capa propia.
- **Citas, reservas y cancelaciones:** el sistema no tiene un módulo de citas. El flujo de negocio real es: solicitud de contacto → seguimiento (`new` → `in-progress` → `closed`) → eliminación (ciclo cubierto en `ciclo-contactos.feature` y `panel-admin.feature`), más la gestión de artículos, portada, imágenes y analítica.
- No existe campo de apellidos separado: el formulario tiene un único campo `name`.

### Sustitución temporal de glob

El `overrides.glob` del `package.json` fija glob 14 para corregir GHSA-3g3m-2fjr-6pw4 y la vulnerabilidad de minimatch GHSA-g3hv-75wg-m249. `@vercel/nft` y `@sentry/bundler-plugins` declaran glob 13; esta sustitución cruza su rango declarado y debe retirarse cuando ambos admitan una versión corregida. Además de `npm audit`, comprueba el build de las imágenes, el rastreo de dependencias y las pruebas integradas antes de actualizar o eliminar esta excepción.
