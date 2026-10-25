# Plan de pendientes para GPT-6 Luna

Fecha: 2026-10-24. Implementar por etapas pequeñas y comprobar cada una antes de continuar.

## 1. Confirmar el estado real — realizado localmente

- Comparar revisión local, GitHub y `/version.json` de producción; identificar qué cambios faltan por desplegar. Una diferencia de SHA por sí sola no demuestra un fallo.
- Verificar en Coolify versión real de PostgreSQL, volúmenes, variables obligatorias y estado de `POSTGRES18_MIGRATION_READY`. No habilitar esa variable sin evidencia de migración restaurada y validada.
- Confirmar los datos legales publicados y el acceso administrativo con las credenciales del servidor. No usar credenciales locales como prueba de producción ni imprimir secretos.
- Entregar una lista de hechos verificados y accesos o configuración pendientes. Continuar los cambios locales que no dependan de esos accesos.
- Se confirmó salud pública y diferencia de revisión. La plataforma verificó Coolify, volúmenes y base de producción el 2026-10-24: ver la sección 6.

## 2. Corregir migraciones — realizado y probado

- Sustituir el bloque `EXCEPTION WHEN OTHERS THEN NULL` de `apps/api/src/main.ts` por migraciones versionadas, transaccionales y con errores visibles.
- Evitar ejecuciones simultáneas y conservar datos existentes.
- Aceptación: base vacía, actualización de base existente, segunda ejecución sin cambios y fallo con rollback comprobados en una base aislada.
- Se agregó el registro versionado y bloqueo de migración; se probó actualización de restricciones antiguas, conservación de filas e idempotencia en PostgreSQL efímero.

## 3. Notificar nuevos contactos por correo — realizado y verificado en producción

- Incorporar SMTP configurable, destinatario interno y remitente autorizado mediante variables de entorno; documentar proveedor y configuración pendiente sin inventar credenciales.
- Guardar el contacto antes de notificar. Usar una cola persistente sencilla en PostgreSQL con reintentos limitados y estado de entrega; no añadir Redis.
- Configurar `Reply-To` con el correo validado del contacto y escapar el contenido. No registrar cuerpos ni credenciales en logs.
- Aceptación: envío correcto, caída SMTP sin perder contacto, reintento y prevención de duplicados evitables. Documentar que SMTP no garantiza entrega exactamente una vez.
- Verificar recepción real cuando exista configuración; separar esa evidencia de las pruebas con servidor SMTP de pruebas.
- Se agregó SMTP opcional y cola en PostgreSQL con backoff y pruebas de persistencia y deduplicación. La recepción real requiere configurar el proveedor en Coolify.

## 4. Mejorar el acceso administrativo — realizado; SMTP operativo en producción

- Añadir cambio de contraseña desde una sesión autenticada, solicitando contraseña actual y revocando sesiones anteriores; conservar el comando de recuperación existente.
- Después de tener correo operativo, añadir recuperación por token aleatorio guardado como hash, de un solo uso y con caducidad; respuesta genérica y rate limiting para evitar enumeración y abuso.
- Aceptación: contraseña anterior rechazada, sesiones revocadas, token vencido o reutilizado rechazado y controles de origen conservados.
- Roles y doble factor quedan para una segunda entrega si se necesitan varios administradores o protección adicional. No son requisitos actuales confirmados.
- Se añadió cambio de contraseña con revocación de sesiones y recuperación por correo mediante token de un uso, guardado como hash y con vencimiento de una hora.

## 5. Operación y cierre — realizado (ver la sección 6)

- Preparar respaldos programados de PostgreSQL y uploads a destino externo, con retención, cifrado y prueba de restauración aislada. No afirmar que están activos sin verificarlos en infraestructura.
- Preparar monitoreo HTTPS de `/health` y `/api/health`, revisión desplegada y alertas por fallos de correo o respaldos.
- Actualizar README, DEPLOYMENT y QA para reflejar los cinco idiomas, los comandos actuales y los resultados realmente ejecutados.
- Traducir los nuevos textos de las superficies públicas en sus cinco idiomas y conservar el idioma actual del panel.
- Ejecutar `npm run check`, `npm test`, `npm run test:db` y los recorridos API/web pertinentes. Ejecutar la verificación de contenedores de producción en entorno aislado antes de publicar.
- Entregar cambios, pruebas y pendientes externos; preparar un despliegue revisable. Este plan no autoriza cambios en el servidor, envíos reales, rotación de credenciales ni migraciones de producción.
- Se actualizaron README, DEPLOYMENT y QA para documentar cinco idiomas, comandos actuales, configuración SMTP y límites de evidencia. No se confirmó la recepción SMTP ni se operó infraestructura.
- Validación local del 24 de octubre: `npm run check`, `npm test` (175), `npm run test:db` (101), `npm run test:api` (194), `npm run test:web` (47) y `CI_GATEWAY_PORT=8088 CI_HTTPS_PORT=18443 bash scripts/verify-production.sh` (249) correctos. El stack efímero no tuvo reinicios ni eventos OOM y se limpió al terminar.
- Los pendientes de infraestructura de esta etapa quedaron cerrados el 2026-10-24 (sección 6).

## 6. Evidencia de producción — verificada por la plataforma el 2026-10-24

Comprobado en VPS2 y Coolify por el agente de infraestructura (repo `infra-ionos-vps`). Sin secretos.

- **Despliegue.** `/version.json` y `main` coinciden (`65e535a`). El pipeline del 24 de octubre terminó bien. `POSTGRES18_MIGRATION_READY=true` desde el 2026-09-28, así que el despliegue es automático en cada merge a `main`. Los 4 contenedores están sanos.
- **PostgreSQL.** `postgres:18.6-alpine` sobre el volumen `pgdata18`. Hay 25 posts (5 por idioma, servidos por la API), 2 contactos, 1 admin, 5 settings y 53 page_views. `schema_migrations` tiene la versión 1, aplicada en el despliegue del 24 de octubre.
- **SMTP.** Coolify tenía las `SMTP_*` de la plataforma (`mail.yunitztech.com`, 465 con TLS, usuario `no-reply@`), pero faltaban `SMTP_FROM` y `CONTACT_NOTIFICATION_TO`, y sin ellas `mailConfig()` no enviaba nada. Ahora son `Yunitz Tech <no-reply@yunitztech.com>` y `contacto@yunitztech.com`, gestionadas por la ficha de infra.
  - Prueba real: un contacto enviado a `/api/contact` quedó en la cola con `sent_at` a los 1 s y 0 reintentos. El aviso llegó al buzón `contacto@` firmado con DKIM. Después se borró el contacto de prueba desde el panel.
  - La recuperación de contraseña usa la misma configuración, pero no se envió un correo real de recuperación.
- **Respaldos.** Restic diario a Google Drive y copia cruzada append-only en VPS1. Incluye el volcado de PostgreSQL (`/var/backups/postgres`) y el volumen `*_uploads`.
  - Restauración aislada probada: el snapshot `33237e0b` se cargó en `postgres:18.6-alpine` con `--network none`. Los recuentos de las 6 tablas son iguales a producción, y el volumen `uploads` es idéntico (hoy está vacío).
  - Se repite cada 3 meses (`docs/OPERACION.md` §8 de infra).
- **Alertas.**
  - Uptime Kuma, con notificación: `https://yunitztech.com`, `/api/health`, el certificado de `mail.yunitztech.com` y los puertos SMTP, envío e IMAP.
  - healthchecks.io, con aviso a Slack: `vps2-backup`, al que el script de respaldo hace ping en `/start`, `/fail` y al terminar, y `vps2-heartbeat`, cada 5 minutos.
- **Nota.** `docs/DEPLOYMENT.md` todavía dice que `POSTGRES18_MIGRATION_READY` debe quedar sin definir. Eso describía la migración, ya terminada.

## Instrucción de ejecución

Lee este plan y las instrucciones del repositorio. Implementa las etapas en orden, con cambios pequeños y sin reescribir el sitio. Conserva arquitectura, diseño, contenido y datos. Usa pruebas de comportamiento para las funciones nuevas. Si faltan accesos, prepara la implementación local y documenta exactamente lo pendiente. No des por verificada producción con pruebas locales. No incluyas secretos en archivos, commits ni respuestas. Informa al terminar cada etapa qué cambió, qué pruebas pasaron y qué falta.
