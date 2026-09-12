#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/server"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
exec .venv/bin/uvicorn app:app --reload --host 127.0.0.1 --port 8443 \
  --ssl-certfile "$ROOT/certs/localhost.pem" \
  --ssl-keyfile "$ROOT/certs/localhost-key.pem"
