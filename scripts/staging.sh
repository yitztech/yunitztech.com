#!/usr/bin/env bash
# Entorno de validación local previo al despliegue (Staging / Pre-producción)
# Permite probar la aplicación en idénticas condiciones a producción (Astro SSR compilado,
# NestJS compilado, Postgres 18.6, Nginx con cabeceras de seguridad y límites de memoria).
# No interfiere con el entorno de desarrollo (puerto 8086) ni con producción.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="compose.staging.yml"
STAGING_PORT="${STAGING_PORT:-8088}"
IMAGE_PREFIX="${IMAGE_PREFIX:-ghcr.io/yitztech/yunitztech.com}"

usage() {
  cat <<EOF
Uso: $0 [comando] [opciones]

Comandos:
  up [opciones]     Construye y levanta el entorno de validación en http://localhost:${STAGING_PORT}
  down [opciones]   Detiene el entorno de validación
  status            Muestra el estado de los servicios y comprueba los endpoints
  logs [servicio]   Muestra y sigue los logs (web, api, gateway, db, mailpit)
  restart [srv]     Reinicia los servicios o uno en específico

Opciones para 'up':
  --prod            Apunta a las imágenes publicadas de la rama de producción (GHCR :main)
  --branch <ref>    Construye y levanta apuntando a una rama o commit de Git (ej: main, origin/main)
  --clean           Elimina volúmenes previos para arrancar con base de datos limpia

Ejemplos:
  $0 up             # Valida el código local actual con el stack de producción
  $0 up --prod      # Apunta a las imágenes oficiales publicadas de producción (:main)
  $0 up --branch origin/main  # Construye y valida directamente desde origin/main
  $0 logs web       # Sigue los logs del servidor SSR
  $0 status         # Comprueba la salud del entorno
  $0 down --clean   # Apaga y limpia la base de datos de pruebas
EOF
  exit 1
}

cmd="${1:-up}"
shift || true

case "$cmd" in
  up|start)
    USE_PROD_IMAGES=false
    GIT_REF=""
    CLEAN=false

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --prod|--production|--prod-images)
          USE_PROD_IMAGES=true
          shift
          ;;
        --branch|--ref)
          GIT_REF="$2"
          shift 2
          ;;
        --clean)
          CLEAN=true
          shift
          ;;
        -h|--help)
          usage
          ;;
        *)
          echo "Opción desconocida: $1"
          usage
          ;;
      esac
    done

    if [ "$CLEAN" = true ]; then
      echo "==> Limpiando volúmenes previos de staging..."
      docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans || true
    fi

    if [ "$USE_PROD_IMAGES" = true ]; then
      echo "==> Apuntando a imágenes publicadas de la rama de PRODUCCIÓN (GHCR: main)..."
      export IMAGE_PREFIX="$IMAGE_PREFIX"
      export IMAGE_TAG="main"

      # En macOS (Apple Silicon) se exige --platform linux/amd64 para las imágenes oficiales publicadas
      PLATFORM_FLAG=""
      if [ "$(uname -m)" = "arm64" ]; then
        PLATFORM_FLAG="--platform linux/amd64"
      fi

      echo "==> Descargando imágenes de producción..."
      docker pull $PLATFORM_FLAG "${IMAGE_PREFIX}-api:main"
      docker pull $PLATFORM_FLAG "${IMAGE_PREFIX}-web:main"
      docker pull $PLATFORM_FLAG "${IMAGE_PREFIX}-gateway:main"

      echo "==> Levantando servicios con imágenes de producción..."
      docker compose -f "$COMPOSE_FILE" up -d --wait --wait-timeout 180 db mailpit api web gateway
    elif [ -n "$GIT_REF" ]; then
      echo "==> Construyendo desde la rama de Git: $GIT_REF..."
      TEMP_WORKTREE="$(mktemp -d /tmp/yunitz-staging-worktree-XXXXXX)"
      git worktree add --detach "$TEMP_WORKTREE" "$GIT_REF"
      
      cleanup_worktree() {
        git worktree remove --force "$TEMP_WORKTREE" 2>/dev/null || true
        rm -rf "$TEMP_WORKTREE"
      }
      trap cleanup_worktree EXIT

      REF_SHA="$(git -C "$TEMP_WORKTREE" rev-parse --short HEAD)"
      echo "==> Commit a validar: $REF_SHA"

      docker build -t "${IMAGE_PREFIX}-api:staging-${REF_SHA}" --target api --build-arg "RELEASE_SHA=${REF_SHA}" "$TEMP_WORKTREE"
      docker build -t "${IMAGE_PREFIX}-web:staging-${REF_SHA}" --target web --build-arg "RELEASE_SHA=${REF_SHA}" "$TEMP_WORKTREE"
      docker build -t "${IMAGE_PREFIX}-gateway:staging-${REF_SHA}" --target gateway "$TEMP_WORKTREE"

      export IMAGE_PREFIX="$IMAGE_PREFIX"
      export IMAGE_TAG="staging-${REF_SHA}"

      docker compose -f "$COMPOSE_FILE" up -d --wait --wait-timeout 180
      cleanup_worktree
      trap - EXIT
    else
      echo "==> Construyendo imágenes de producción desde el código local..."
      LOCAL_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "local")"
      export RELEASE_SHA="${LOCAL_SHA}-staging"

      docker compose -f "$COMPOSE_FILE" build
      docker compose -f "$COMPOSE_FILE" up -d --wait --wait-timeout 180
    fi

    echo ""
    echo "=========================================================================="
    echo "  Entorno de Validación Local (Staging) ACTIVO"
    echo "=========================================================================="
    echo "  Sitio web:       http://localhost:${STAGING_PORT}/"
    echo "  Administración:  http://localhost:${STAGING_PORT}/admin"
    echo "  Versión:         http://localhost:${STAGING_PORT}/version.json"
    echo "  Salud API:       http://localhost:${STAGING_PORT}/api/health"
    echo "  Buzón Mailpit:   http://localhost:${STAGING_MAILPIT_PORT:-8027}/"
    echo ""
    echo "  Credenciales admin por defecto:"
    echo "    Usuario:       admin@staging.yunitztech.local"
    echo "    Contraseña:    staging_admin_password_16ch"
    echo ""
    echo "  Para ver logs:   $0 logs"
    echo "  Para detener:    $0 down"
    echo "=========================================================================="
    ;;

  down|stop)
    DOWN_ARGS=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --clean|-v|--volumes)
          DOWN_ARGS="--volumes"
          shift
          ;;
        *)
          shift
          ;;
      esac
    done
    echo "==> Deteniendo entorno de validación local (Staging)..."
    docker compose -f "$COMPOSE_FILE" down $DOWN_ARGS --remove-orphans
    echo "==> Entorno detenido."
    ;;

  status)
    echo "==> Estado de los contenedores de Staging:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "==> Comprobando endpoints locales:"
    if curl -s -f "http://localhost:${STAGING_PORT}/health" >/dev/null 2>&1; then
      echo "  [OK] Gateway /health (200)"
    else
      echo "  [FAIL] Gateway /health no responde en puerto ${STAGING_PORT}"
    fi

    if curl -s -f "http://localhost:${STAGING_PORT}/api/health" >/dev/null 2>&1; then
      echo "  [OK] API /api/health (200)"
    else
      echo "  [FAIL] API /api/health no responde"
    fi

    VERSION_OUTPUT=$(curl -s "http://localhost:${STAGING_PORT}/version.json" 2>/dev/null || echo "")
    if [ -n "$VERSION_OUTPUT" ]; then
      echo "  [OK] Web /version.json: $VERSION_OUTPUT"
    else
      echo "  [FAIL] Web /version.json no responde"
    fi
    ;;

  logs)
    docker compose -f "$COMPOSE_FILE" logs -f --tail 100 "$@"
    ;;

  restart)
    docker compose -f "$COMPOSE_FILE" restart "$@"
    ;;

  *)
    usage
    ;;
esac
