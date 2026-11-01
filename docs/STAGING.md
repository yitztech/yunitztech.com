# Entorno de Staging Local (Pre-despliegue)

Entorno de validación local basado en Docker Compose (`compose.staging.yml` y `scripts/staging.sh`) que reproduce con exactitud la topología, los límites de seguridad y las tecnologías de producción, garantizando un aislamiento total respecto a la base de datos y servicios reales.

Permite validar cambios y diagnosticar errores antes de desplegar, así como alternar rápidamente entre el código local y la rama de producción (`main`).

---

## 1. Características y Garantías de Aislamiento

| Aspecto | Producción (Coolify / Traefik) | Desarrollo Local (`compose.dev.yml`) | Staging Local (`compose.staging.yml`) |
| :--- | :--- | :--- | :--- |
| **Proyecto Docker** | Según despliegue | `yunitztech-dev` | `yunitztech-staging` (aislado) |
| **Puerto anfitrión** | 80 / 443 (detrás de Traefik) | `127.0.0.1:8086` | `127.0.0.1:8088` (sin colisiones) |
| **Base de datos** | PostgreSQL producción | `pgdata18_dev` / `yunitz_dev` | `pgdata18_staging` / `yunitz_staging` |
| **Bandeja de correos** | SMTP producción real | Logs / opcional | Mailpit integrado (`http://localhost:8027`) |
| **Modo de ejecución** | Contenedores inmutables | Bind mount / recarga en vivo | Contenedores inmutables multi-stage idénticos a prod |
| **Seguridad de contenedores**| Read-only, no-root, cap drop | Permisivo para desarrollo | Read-only, no-root (`1000:1000`), cap drop, tmpfs |

### Seguridad y no confusión con producción:
1. **Sin puertos expuestos hacia el exterior:** Los puertos solo se enlazan en la interfaz de bucle invertido `127.0.0.1` (`127.0.0.1:8088` para la web/API y `127.0.0.1:8027` para Mailpit).
2. **Volumen de datos dedicado:** La base de datos corre en `pgdata18_staging`. Nunca toca `pgdata18` ni bases externas.
3. **Identificador visual y de entorno:** `SENTRY_ENVIRONMENT` se configura como `staging` y `LEGAL_NAME` añade el sufijo `(Staging Local)`.
4. **Sin envío de correos reales:** Todas las notificaciones generadas por el formulario de contacto se capturan localmente en Mailpit.

---

## 2. Paridad Tecnológica con Producción

El entorno corre los mismos componentes que la infraestructura en vivo:

- **Nginx Gateway (`gateway`):** Mismas directivas de seguridad (`security-headers.conf`, CSP, HSTS, X-Content-Type-Options, límites de tasa y tamaño de cuerpo), con resolución DNS interna dinámica hacia `web` y `api`.
- **Frontend Astro SSR (`web`):** Servidor compilado standalone con `@astrojs/node`, renderizado SSR idéntico a producción y límite de memoria de 256MB.
- **Backend Fastify/NestJS (`api`):** Compilado en modo producción (`dist/main.js`), autenticación por cookies firmadas seguras, Argon2id, colas de correo asíncronas y límite de 512MB.
- **PostgreSQL 18.6 (`db`):** Esquema relacional completo, migraciones automáticas en arranque y límites de conexión.
- **Mailpit (`mailpit`):** Servidor SMTP para capturar correos en `127.0.0.1:1025` y panel de inspección en `http://localhost:8027`.

---

## 3. Comandos de Uso Rápido

Puedes usar los comandos a través de `npm` o invocando el script directamente:

### 3.1 Arrancar con el código local actual
Compila las imágenes Docker a partir de los archivos de tu espacio de trabajo local (incluyendo cualquier cambio sin confirmar):
```sh
npm run staging:up
# O directamente:
bash scripts/staging.sh up
```

### 3.2 Probar apuntando a la rama de producción (`main`)
Si encuentras un error o quieres comparar el comportamiento contra la versión en producción, dispones de dos opciones:

#### Opción A: Descargar las imágenes oficiales publicadas de producción (`GHCR`)
Descarga las imágenes oficiales generadas por el pipeline de integración continua para la rama `main`:
```sh
npm run staging:prod
# O directamente:
bash scripts/staging.sh up --prod
```
> En macOS Apple Silicon (arm64), el script añade automáticamente `--platform linux/amd64` para garantizar compatibilidad con las imágenes oficiales de GHCR.

#### Opción B: Compilar desde un commit, tag o rama git específico
Crea un `git worktree` temporal, compila el código de esa referencia git y lo arranca en el entorno staging:
```sh
bash scripts/staging.sh up --branch main
# O cualquier otra rama / tag / hash:
bash scripts/staging.sh up --branch origin/main
bash scripts/staging.sh up --branch v1.0.0
```

### 3.3 Ver estado y healthchecks
Muestra el estado de salud de todos los contenedores y prueba las rutas `/health`, `/api/health` y `/version.json`:
```sh
npm run staging:status
```

### 3.4 Consultar logs en tiempo real
Inspecciona los registros consolidados de todos los servicios o filtra por uno en concreto:
```sh
npm run staging:logs
# O para un servicio específico:
bash scripts/staging.sh logs api
bash scripts/staging.sh logs web
bash scripts/staging.sh logs gateway
```

### 3.5 Detener el entorno
Detiene los contenedores preservando la base de datos de pruebas:
```sh
npm run staging:down
```

Para detener y **limpiar** por completo la base de datos y empezar desde cero:
```sh
bash scripts/staging.sh up --clean
```

---

## 4. Direcciones de Acceso en Local

Una vez levantado el entorno (`scripts/staging.sh up`):

| Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **Sitio Web** | [http://localhost:8088/](http://localhost:8088/) | Portada y páginas públicas bilingües |
| **Panel Editorial** | [http://localhost:8088/admin](http://localhost:8088/admin) | Panel de administración y gestión |
| **API Healthcheck** | [http://localhost:8088/api/health](http://localhost:8088/api/health) | Estado y conectividad con PostgreSQL |
| **Versión / Build** | [http://localhost:8088/version.json](http://localhost:8088/version.json) | Hash de commit y timestamp de compilación |
| **Mailpit (Web UI)** | [http://localhost:8027/](http://localhost:8027/) | Inspección de correos enviados por contacto |

---

## 5. Validación Típica de Pre-despliegue

Antes de abrir una PR o desplegar a producción:

1. **Compilar y validar tipos:**
   ```sh
   npm run check
   npm test
   ```
2. **Levantar staging con tus cambios:**
   ```sh
   npm run staging:up
   npm run staging:status
   ```
3. **Validar flujos críticos en `http://localhost:8088`:**
   - Enviar un mensaje por el formulario de contacto y comprobar en `http://localhost:8027` que el correo llega formateado correctamente.
   - Iniciar sesión en el panel `/admin` con las credenciales de `.env`.
   - Crear o modificar un artículo borrador.
4. **Comparar contra producción si algo falla:**
   ```sh
   npm run staging:prod
   ```
   Compara la respuesta en `http://localhost:8088` para determinar si el fallo es una regresión del código nuevo o ya existía en la rama principal.
5. **Apagar staging al finalizar:**
   ```sh
   npm run staging:down
   ```
