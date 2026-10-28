# Validación de la entrega y aseguramiento de calidad (QA)

## Comprobaciones locales — 24 de octubre de 2026

El 24 de octubre se validó el estado local con el stack de desarrollo en `http://localhost:8086`:

- `npm run check`: compilación de API y web y revisión de Astro correctas; 46 archivos, 0 errores, 0 advertencias y 0 sugerencias.
- `npm test`: 175 pruebas unitarias correctas.
- `npm run test:db`: 101 pruebas correctas en PostgreSQL 18.6 efímero, incluidas migraciones idempotentes, preservación de datos y deduplicación de avisos.
- `npm run test:api`: 194 escenarios correctos.
- `npm run test:web`: 47 escenarios correctos, incluidos contacto y portada en ES/EN/FR/DE/PT.
- `CI_GATEWAY_PORT=8088 CI_HTTPS_PORT=18443 bash scripts/verify-production.sh`: imágenes de producción construidas desde el árbol local; 249/249 pruebas correctas en stack Docker aislado. Sin reinicios ni eventos OOM. Pico cgroup: gateway 18.1 MiB, web 88.3 MiB, API 164.7 MiB y PostgreSQL 112.9 MiB.

Estas comprobaciones son locales. La suite Docker usó imágenes de producción construidas desde este árbol en un stack desechable; no desplegó cambios. No prueban la recepción en un buzón real, los respaldos externos, las alertas de monitoreo, el acceso a Coolify ni la migración de la base de producción. La sección histórica de abajo corresponde a la validación del 27 de septiembre y no sustituye una verificación actual de producción.

## Despliegue integrado y verificado — 25 de octubre de 2026

- PR #14 está integrado en `main` mediante el commit `65e535a`.
- GitHub Actions terminó correctamente `verify`, la publicación de las imágenes y `deploy` para `main` en `c5546ef869044d3d290f9f2902171c017f740b2b`.
- El endpoint público `/version.json` responde con esa misma revisión. El workflow también confirmó `/api/health` después de solicitar el despliegue a Coolify.
- Esto confirma el despliegue y la salud de la API en esa revisión; no sustituye una comprobación de versión/volumen de PostgreSQL, una restauración de respaldo ni una prueba de entrega SMTP.

## Cierre operativo — 25 de octubre de 2026

El usuario confirma que el equipo responsable validó la recepción SMTP real, una restauración aislada desde Restic, las alertas HTTPS/correo/respaldo, la versión y el volumen de PostgreSQL y los datos legales publicados. Se registran como completados por confirmación del equipo; no se inspeccionaron de forma independiente en este entorno.

## Comprobación de respaldos Restic en producción — 25 de octubre de 2026

- Acceso de solo lectura por SSH a VPS2: el temporizador diario `restic-backup.timer` está activo; `restic-backup.service` terminó con `Result=success` el 24 de octubre a las 04:00 UTC.
- El último snapshot de Google Drive era del 24 de octubre a las 04:00 UTC, con 23 snapshots conservados. El snapshot incluía `/var/backups/postgres` y el volumen de medios `nfgmxaqphc021p4jfxelqqj2_uploads`, que corresponde al UUID de la aplicación YunitzTech.
- La copia cruzada de VPS1 guardó el snapshot equivalente a las 04:00 UTC. La tarea del host confirmó ambos snapshots.
- En esa revisión, la restauración aislada no se había ejecutado. El equipo responsable confirmó después que la restauración y las demás validaciones operativas quedaron completadas; véase el cierre operativo anterior.

## Evidencia histórica de producción — 27 de septiembre de 2026

Commit base `0fdfe52` con mejoras de endurecimiento y verificación de producción.

## Resumen de resultados

- `npm run check`: Compilación de NestJS y comprobación de tipos estricta de Astro completadas con éxito; 24 archivos analizados, **0 errores, 0 advertencias, 0 sugerencias**.
- `npm test`: **2/2 pruebas unitarias correctas** (verificación de pares de traducción y aserciones de seguridad arquitectónica en `compose.prod.yml`).
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilidades de severidad alta o crítica** en dependencias de producción.
- `scripts/verify-production.sh`: **8/8 pruebas E2E de Playwright correctas** ejecutadas directamente sobre los contenedores reales de producción (`gateway`, `web`, `api`, `db`) con límites estrictos de memoria y CPU.
- **Prueba negativa de CSP (A04):** Se mutó deliberadamente `infra/nginx/default.conf` con `script-src 'none'`. La suite falló de inmediato identificando la discrepancia en la cabecera CSP y la detención de los scripts interactivos del cliente. Al restaurar `script-src 'self'` y reconstruir el gateway, el resultado volvió a verde al 100%.

## Recorridos verificados en producción (8/8)

1. **Gateway de producción, health, revisión, CSP y assets compilados:**
   - Comprobación HTTP en `/health` (gateway 8080), `/api/health` y `/version.json` (revisión de Git).
   - Verificación de cabeceras CSP completas: `default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `object-src 'none'`.
   - Escucha de eventos `securitypolicyviolation` en el navegador (0 violaciones).
2. **SSR bilingüe (ES/EN), SEO, páginas legales y artículos sembrados:**
   - Portadas en español e inglés, blog bilingüe, páginas de términos y privacidad.
   - Presencia de canonicals únicos, metaetiquetas y schema JSON-LD `BlogPosting`.
   - Sitemap XML y respuesta 404 adecuada ante slugs inexistentes.
3. **Diseño responsivo, navegación por teclado y accesibilidad WCAG:**
   - Viewports testeados: Desktop (1440x1000), Móvil (390x844) y Pantalla pequeña (320x740).
   - Ausencia total de desbordamiento horizontal (`scrollWidth <= innerWidth`).
   - Cero infracciones detectadas con Axe Core contra estándares WCAG 2.0 A/AA y WCAG 2.1 AA.
   - Enlace de salto al contenido principal accesible y funcional por teclado.
4. **Buzón de contacto, panel administrativo, cambio de estado y eliminación:**
   - Envío de formulario de contacto con validación de consentimiento.
   - Acceso al panel administrativo con sesión autenticada, filtrado de contactos, actualización de estado y eliminación con confirmación modal.
5. **CMS, subida pesada de 5 MB con concurrencia Argon2, publicación y sanitización:**
   - Subida de imagen JPEG sintética de **5 023 217 bytes** y **20 megapíxeles** (4000x5000 px).
   - Ejecución concurrente: el navegador sube y procesa la imagen en libvips (`sharp.concurrency(1)`) mientras un segundo contexto de navegador inicia sesión mediante hash intensivo de Argon2.
   - Conversión a WebP y almacenamiento en `/app/uploads` bajo filesystem raíz de solo lectura.
   - Sanitización de HTML malicioso en el cuerpo del artículo (escape de `<script>`).
   - Despublicación instantánea comprobando código 404 sin necesidad de reconstruir la aplicación.
   - Edición en caliente de la portada y servicios.
6. **Autenticación, CSRF, validación de inputs y restricciones de subida:**
   - Rechazo de mutaciones no autenticadas (HTTP 401) y sin cabecera `Origin` válida (HTTP 403).
   - Rechazo de archivos maliciosos (SVG con JavaScript) y archivos no válidos (HTTP 400).
   - Rechazo de archivos que superan el límite de 5 MB (**5 MB + 1024 bytes -> HTTP 400/413**).
7. **Analítica propia respetuosa con la privacidad:**
   - Registro de visualizaciones agregadas en base de datos.
   - Respeto estricto a la cabecera / preferencia `navigator.doNotTrack === "1"` (cero peticiones emitidas a `/api/view`).
8. **Protección contra ataques de fuerza bruta (Rate limiting):**
   - Límite de 5 intentos fallidos consecutivos de inicio de sesión disparando HTTP 429.

## Evidencia de recursos y límites — W1

Medición bajo carga real realizada con 60 segundos de reposo previo y ejecución de subida de 5 MB:

| Servicio | Memoria Límite | CPU Límite | Reposo medio (MiB) | Pico observado (MiB) | Pico CPU (%) | Pico cgroup (`memory.peak`) | Eventos OOM | Reinicios |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **gateway** | 64 MiB | 0.25 | 5.1 | 11.7 | 1.1% | 15.9 MiB | 0 | 0 |
| **web** | 256 MiB | 0.50 | 26.3 | 51.1 | 12.9% | 69.1 MiB | 0 | 0 |
| **api** | 512 MiB | 1.00 | 36.4 | 41.5 | 19.2% | 159.0 MiB | 0 | 0 |
| **db** | 256 MiB | 0.50 | 25.7 | 35.0 | 2.5% | 113.5 MiB | 0 | 0 |

### Características de la imagen de prueba de carga
- **Ruta generada:** `qa-artifacts/<run-id>/load-input.jpg`
- **Tamaño:** 5 023 217 bytes (entre 5 000 000 y 5 242 880 bytes permitidos)
- **Dimensiones:** 4000 × 5000 píxeles (20 megapíxeles, techo máximo permitido por la API)
- **Formato y calidad:** JPEG, calidad 29, píxeles pseudoaleatorios incompresibles para forzar la decodificación completa de la matriz
- **SHA256:** `db7c403a771b6a40d3a14ddf2a57e801dea7d869795d96a26fa51838797f40ff`

## Comandos para reproducir la verificación localmente

Para ejecutar la verificación completa sin entrar en conflicto con otro proyecto que ya ocupe el puerto 8080:

```bash
# Ejecutar verificación de producción en puertos alternativos
CI_GATEWAY_PORT=8088 CI_HTTPS_PORT=18443 MEASURE_IDLE_SECONDS=60 bash scripts/verify-production.sh
```

En el entorno de integración continua (GitHub Actions), el script se ejecuta directamente sin variables de puerto añadidas, utilizando `127.0.0.1:8080` para el gateway y `127.0.0.1:18443` para el proxy TLS de pruebas.

## Límites de la evidencia

- Las mediciones anteriores corresponden a arquitectura ARM64 (Apple Silicon / máquina virtual de Docker). En el servidor de producción (x86_64 / AMD64), los consumos de memoria nativa de libvips y Node pueden diferir ligeramente pero se mantendrán holgadamente bajo los techos establecidos.
- El pipeline de CI en GitHub Actions compila y prueba imágenes para la arquitectura del runner.
- No se han modificado credenciales ni configuraciones del servidor remoto de Coolify desde este repositorio.
