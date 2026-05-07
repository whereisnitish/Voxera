#!/usr/bin/env bash
# dev.sh — start the Voxera backend (Docker stack) and frontend (Vite) together.
# Usage:  ./dev.sh
# Stop:   Ctrl+C  (cleans up containers and the frontend process)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ----- colors --------------------------------------------------------------- #
if [[ -t 1 ]]; then
  RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; CYN=$'\e[36m'; DIM=$'\e[2m'; RST=$'\e[0m'
else
  RED=""; GRN=""; YLW=""; CYN=""; DIM=""; RST=""
fi

log()  { printf "%s>>%s %s\n" "$CYN" "$RST" "$*"; }
warn() { printf "%s!!%s %s\n" "$YLW" "$RST" "$*"; }
err()  { printf "%sxx%s %s\n" "$RED" "$RST" "$*" >&2; }

# ----- cleanup -------------------------------------------------------------- #
FRONTEND_PID=""
LOGS_PID=""

cleanup() {
  printf "\n"
  log "Shutting down…"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$LOGS_PID"     ]] && kill "$LOGS_PID"     2>/dev/null || true
  docker compose down --remove-orphans >/dev/null 2>&1 || true
  exit 0
}
trap cleanup INT TERM

# ----- prerequisites -------------------------------------------------------- #
command -v docker >/dev/null || { err "Docker is not installed."; exit 1; }
docker info >/dev/null 2>&1   || { err "Docker daemon is not running. Start Docker Desktop and retry."; exit 1; }
command -v node   >/dev/null || { err "Node.js is not installed."; exit 1; }
command -v npm    >/dev/null || { err "npm is not installed.";      exit 1; }

# ----- .env ----------------------------------------------------------------- #
if [[ ! -f .env ]]; then
  warn ".env not found — copying from .env.example."
  cp .env.example .env
  warn "Edit .env to fill in ENCRYPTION_KEY and SECRET_KEY before re-running."
  echo
  echo "    Generate ENCRYPTION_KEY:"
  echo "      python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
  echo "    Generate SECRET_KEY:"
  echo "      python3 -c 'import secrets; print(secrets.token_urlsafe(48))'"
  echo
  exit 1
fi

# Sanity-check that critical keys are filled
if grep -qE '^(ENCRYPTION_KEY|SECRET_KEY)=$|^(ENCRYPTION_KEY=replace-with-fernet-key|SECRET_KEY=change-me-to-a-long-random-string)' .env; then
  err "ENCRYPTION_KEY or SECRET_KEY in .env is empty or still the default placeholder."
  echo "    Fill them in, then re-run."
  exit 1
fi

# ----- initial alembic migration ------------------------------------------- #
mkdir -p alembic/versions
if ! ls alembic/versions/*.py >/dev/null 2>&1; then
  log "No Alembic revisions found — generating initial migration…"
  docker compose run --rm \
    -e DATABASE_URL="postgresql+asyncpg://voxera:voxera@db:5432/voxera" \
    api alembic revision --autogenerate -m "init"
fi

# ----- backend -------------------------------------------------------------- #
log "Starting backend stack (db, redis, api, worker)…"
docker compose up -d --build

log "Waiting for API health…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    printf "%s>>%s Backend ready at %shttp://localhost:8000%s\n" "$GRN" "$RST" "$CYN" "$RST"
    break
  fi
  sleep 1
  if [[ "$i" -eq 60 ]]; then
    err "Backend failed to come up in 60s."
    echo "    Logs:  docker compose logs api"
    cleanup
  fi
done

# Stream backend logs with a prefix
( docker compose logs -f --no-log-prefix api worker 2>&1 \
    | sed -u "s/^/${CYN}[backend]${RST} /" ) &
LOGS_PID=$!

# ----- frontend ------------------------------------------------------------- #
cd frontend
if [[ ! -d node_modules ]]; then
  log "Installing frontend dependencies…"
  npm install
fi

log "Starting frontend on ${CYN}http://localhost:5173${RST}"
echo "${DIM}   (proxies /api → http://localhost:8000)${RST}"
echo

# Run vite with a prefix; Ctrl+C triggers the trap above
npm run dev 2>&1 | sed -u "s/^/${GRN}[frontend]${RST} /" &
FRONTEND_PID=$!

# Poll until either side dies; portable across bash 3.2 (macOS) and 4+
while kill -0 "$FRONTEND_PID" 2>/dev/null && kill -0 "$LOGS_PID" 2>/dev/null; do
  sleep 1
done
cleanup
