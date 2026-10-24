# Plan de pendientes para GPT-6 Luna

Fecha: 2026-10-24. Implementar por etapas pequeñas y comprobar cada una antes de continuar.

## 1. Confirmar el estado real — realizado localmente

- Comparar revisión local, GitHub y `/version.json` de producción; identificar qué cambios faltan por desplegar. Una diferencia de SHA por sí sola no demuestra un fallo.
- Verificar en Coolify versión real de PostgreSQL, volúmenes, variables obligatorias y estado de `POSTGRES18_MIGRATION_READY`. No habilitar esa variable sin evidencia de migración restaurada y validada.
- Confirmar los datos legales publicados y el acceso administrativo con las credenciales del servidor. No usar credenciales locales como prueba de producción ni imprimir secretos.
- Entregar una lista de hechos verificados y accesos o configuración pendientes. Continuar los cambios locales que no dependan de esos accesos.
- Se confirmó salud pública y diferencia de revisión; inspección de Coolify, volúmenes, secretos y base de producción sigue pendiente por falta de acceso.

## 2. Corregir migraciones — realizado y probado

- Sustituir el bloque `EXCEPTION WHEN OTHERS THEN NULL` de `apps/api/src/main.ts` por migraciones versionadas, transaccionales y con errores visibles.
- Evitar ejecuciones simultáneas y conservar datos existentes.
- Aceptación: base vacía, actualización de base existente, segunda ejecución sin cambios y fallo con rollback comprobados en una base aislada.
- Se agregó el registro versionado y bloqueo de migración; se probó actualización de restricciones antiguas, conservación de filas e idempotencia en PostgreSQL efímero.

## 3. Notificar nuevos contactos por correo — código listo; falta proveedor

- Incorporar SMTP configurable, destinatario interno y remitente autorizado mediante variables de entorno; documentar proveedor y configuración pendiente sin inventar credenciales.
- Guardar el contacto antes de notificar. Usar una cola persistente sencilla en PostgreSQL con reintentos limitados y estado de entrega; no añadir Redis.
- Configurar `Reply-To` con el correo validado del contacto y escapar el contenido. No registrar cuerpos ni credenciales en logs.
- Aceptación: envío correcto, caída SMTP sin perder contacto, reintento y prevención de duplicados evitables. Documentar que SMTP no garantiza entrega exactamente una vez.
- Verificar recepción real cuando exista configuración; separar esa evidencia de las pruebas con servidor SMTP de pruebas.
- Se agregó SMTP opcional y cola en PostgreSQL con backoff y pruebas de persistencia y deduplicación. La recepción real requiere configurar el proveedor en Coolify.

## 4. Mejorar el acceso administrativo — código listo; falta recepción SMTP real

- Añadir cambio de contraseña desde una sesión autenticada, solicitando contraseña actual y revocando sesiones anteriores; conservar el comando de recuperación existente.
- Después de tener correo operativo, añadir recuperación por token aleatorio guardado como hash, de un solo uso y con caducidad; respuesta genérica y rate limiting para evitar enumeración y abuso.
- Aceptación: contraseña anterior rechazada, sesiones revocadas, token vencido o reutilizado rechazado y controles de origen conservados.
- Roles y doble factor quedan para una segunda entrega si se necesitan varios administradores o protección adicional. No son requisitos actuales confirmados.
- Se añadió cambio de contraseña con revocación de sesiones y recuperación por correo mediante token de un uso, guardado como hash y con vencimiento de una hora.

## 5. Operación y cierre — preparación local completada; infraestructura pendiente

- Preparar respaldos programados de PostgreSQL y uploads a destino externo, con retención, cifrado y prueba de restauración aislada. No afirmar que están activos sin verificarlos en infraestructura.
- Preparar monitoreo HTTPS de `/health` y `/api/health`, revisión desplegada y alertas por fallos de correo o respaldos.
- Actualizar README, DEPLOYMENT y QA para reflejar los cinco idiomas, los comandos actuales y los resultados realmente ejecutados.
- Traducir los nuevos textos de las superficies públicas en sus cinco idiomas y conservar el idioma actual del panel.
- Ejecutar `npm run check`, `npm test`, `npm run test:db` y los recorridos API/web pertinentes. Ejecutar la verificación de contenedores de producción en entorno aislado antes de publicar.
- Entregar cambios, pruebas y pendientes externos; preparar un despliegue revisable. Este plan no autoriza cambios en el servidor, envíos reales, rotación de credenciales ni migraciones de producción.
- Se actualizaron README, DEPLOYMENT y QA para documentar cinco idiomas, comandos actuales, configuración SMTP y límites de evidencia. No se confirmó la recepción SMTP ni se operó infraestructura.
- Validación local del 24 de octubre: `npm run check`, `npm test` (175), `npm run test:db` (101), `npm run test:api` (194), `npm run test:web` (47) y `CI_GATEWAY_PORT=8088 CI_HTTPS_PORT=18443 bash scripts/verify-production.sh` (249) correctos. El stack efímero no tuvo reinicios ni eventos OOM y se limpió al terminar.
- Siguen pendientes en infraestructura: configurar SMTP y verificar recepción, activar respaldo externo con restauración probada, configurar alertas HTTPS/correo/respaldo, validar acceso administrativo y estado real de Coolify/PostgreSQL antes de preparar el despliegue.

## Instrucción de ejecución

Lee este plan y las instrucciones del repositorio. Implementa las etapas en orden, con cambios pequeños y sin reescribir el sitio. Conserva arquitectura, diseño, contenido y datos. Usa pruebas de comportamiento para las funciones nuevas. Si faltan accesos, prepara la implementación local y documenta exactamente lo pendiente. No des por verificada producción con pruebas locales. No incluyas secretos en archivos, commits ni respuestas. Informa al terminar cada etapa qué cambió, qué pruebas pasaron y qué falta.
