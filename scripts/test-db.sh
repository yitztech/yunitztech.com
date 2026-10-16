#!/usr/bin/env bash
# Levanta un Postgres efímero, ejecuta las pruebas de base de datos y lo elimina.
# Si DB_TEST_URL ya está definida, usa esa base (debe ser desechable).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${DB_TEST_URL:-}" ]; then
  exec node --import tsx --test "tests/db/*.test.ts"
fi

port="${DB_TEST_PORT:-55432}"
compose=(docker compose -f compose.test.yml)
trap '"${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true' EXIT
"${compose[@]}" up -d --wait --wait-timeout 120
export DB_TEST_URL="postgresql://yunitz_test:yunitz_test_only@127.0.0.1:$port/yunitz_test"
node --import tsx --test "tests/db/*.test.ts"
