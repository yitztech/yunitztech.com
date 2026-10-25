# Plan de pendientes para GPT-6 Luna

Fecha: 2026-10-24. Implementar por etapas pequeñas y comprobar cada una antes de continuar.

## 1. Confirmar el estado real — realizado localmente

- Comparar revisión local, GitHub y `/version.json` de producción; identificar qué cambios faltan por desplegar. Una diferencia de SHA por sí sola no demuestra un fallo.
- Verificar en Coolify versión real de PostgreSQL, volúmenes, variables obligatorias y estado de `POSTGRES18_MIGRATION_READY`. No habilitar esa variable sin evidencia de migración restaurada y validada.
- Confirmar los datos legales publicados y el acceso administrativo con las credenciales del servidor. No usar credenciales locales como prueba de producción ni imprimir secretos.
- Entregar una lista de hechos verificados y accesos o configuración pendientes. Continuar los cambios locales que no dependan de esos accesos.
- Estado actualizado el 25 de octubre: revisión `c5546ef` desplegada y saludable; el equipo responsable confirmó la validación operativa de PostgreSQL, correo, respaldos, alertas y datos legales (ver `docs/QA.md`).

## 2. Corregir migraciones — realizado y probado

- Sustituir el bloque `EXCEPTION WHEN OTHERS THEN NULL` de `apps/api/src/main.ts` por migraciones versionadas, transaccionales y con errores visibles.
- Evitar ejecuciones simultáneas y conservar datos existentes.
- Aceptación: base vacía, actualización de base existente, segunda ejecución sin cambios y fallo con rollback comprobados en una base aislada.
- Se agregó el registro versionado y bloqueo de migración; se probó actualización de restricciones antiguas, conservación de filas e idempotencia en PostgreSQL efímero.

## 3. Notificar nuevos contactos por correo — código y recepción operativa completados

- Incorporar SMTP configurable, destinatario interno y remitente autorizado mediante variables de entorno; documentar proveedor y configuración pendiente sin inventar credenciales.
- Guardar el contacto antes de notificar. Usar una cola persistente sencilla en PostgreSQL con reintentos limitados y estado de entrega; no añadir Redis.
- Configurar `Reply-To` con el correo validado del contacto y escapar el contenido. No registrar cuerpos ni credenciales en logs.
- Aceptación: envío correcto, caída SMTP sin perder contacto, reintento y prevención de duplicados evitables. Documentar que SMTP no garantiza entrega exactamente una vez.
- Verificar recepción real cuando exista configuración; separar esa evidencia de las pruebas con servidor SMTP de pruebas.
- Se agregó SMTP opcional y cola en PostgreSQL con backoff y pruebas de persistencia y deduplicación. La recepción real requiere configurar el proveedor en Coolify.

## 4. Mejorar el acceso administrativo — código y recuperación operativa completados

- Añadir cambio de contraseña desde una sesión autenticada, solicitando contraseña actual y revocando sesiones anteriores; conservar el comando de recuperación existente.
- Después de tener correo operativo, añadir recuperación por token aleatorio guardado como hash, de un solo uso y con caducidad; respuesta genérica y rate limiting para evitar enumeración y abuso.
- Aceptación: contraseña anterior rechazada, sesiones revocadas, token vencido o reutilizado rechazado y controles de origen conservados.
- Roles y doble factor quedan para una segunda entrega si se necesitan varios administradores o protección adicional. No son requisitos actuales confirmados.
- Se añadió cambio de contraseña con revocación de sesiones y recuperación por correo mediante token de un uso, guardado como hash y con vencimiento de una hora.

## 5. Operación y cierre — código, integración y despliegue completados

- Respaldo externo Restic: **activo y verificado en VPS2**. La ejecución diaria del 24 de octubre de 2026 terminó correctamente en Google Drive y la copia cruzada de VPS1; ambas incluyen el volumen `*_uploads` de YunitzTech y `/var/backups/postgres`. La restauración aislada se registra completada según confirmación del equipo responsable.
- Despliegue y salud de `/health`, `/api/health` y `/version.json`: **verificados** para la revisión actual de `main`.
- Documentación y traducciones ES/EN/FR/DE/PT: **completadas**; las superficies públicas y el idioma del panel se conservaron según lo validado localmente.
- `npm run check`, `npm test`, `npm run test:db`, los recorridos API/web y la verificación de contenedores: **correctos** según la evidencia local del 24 de octubre.
- PR #14 se integró en `main`. El 25 de octubre, GitHub Actions verificó, publicó y desplegó `c5546ef869044d3d290f9f2902171c017f740b2b`; `/version.json` y `/api/health` confirmaron la revisión y salud pública.
- Se actualizaron README, DEPLOYMENT y QA para documentar cinco idiomas, comandos actuales, configuración SMTP y límites de evidencia. La recepción SMTP real se registra completada según confirmación del equipo responsable.
- Validación local del 24 de octubre: `npm run check`, `npm test` (175), `npm run test:db` (101), `npm run test:api` (194), `npm run test:web` (47) y `CI_GATEWAY_PORT=8088 CI_HTTPS_PORT=18443 bash scripts/verify-production.sh` (249) correctos. El stack efímero no tuvo reinicios ni eventos OOM y se limpió al terminar.
- **Infraestructura: completada según confirmación del usuario con el equipo responsable:** SMTP y recepción real; restauración aislada desde Restic; alertas HTTPS/correo/respaldo; versión y volumen de PostgreSQL; datos legales publicados. Esta confirmación se registra como evidencia del equipo y no como inspección independiente de este entorno.

## Instrucción de ejecución

Lee este plan y las instrucciones del repositorio. Implementa las etapas en orden, con cambios pequeños y sin reescribir el sitio. Conserva arquitectura, diseño, contenido y datos. Usa pruebas de comportamiento para las funciones nuevas. Si faltan accesos, prepara la implementación local y documenta exactamente lo pendiente. No des por verificada producción con pruebas locales. No incluyas secretos en archivos, commits ni respuestas. Informa al terminar cada etapa qué cambió, qué pruebas pasaron y qué falta.
