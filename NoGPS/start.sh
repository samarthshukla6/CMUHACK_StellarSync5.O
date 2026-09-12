#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$ROOT/certs"
WEB="$ROOT/web"
SERVER="$ROOT/server"

mkdir -p "$CERT_DIR"

if [[ ! -f "$CERT_DIR/localhost.pem" || ! -f "$CERT_DIR/localhost-key.pem" ]]; then
  if command -v mkcert >/dev/null 2>&1; then
    echo "Issuing local HTTPS certs with mkcert…"
    (
      cd "$CERT_DIR"
      mkcert -install
      IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 127.0.0.1)"
      mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1 "$IP"
    )
  else
    echo "mkcert not found — generating a self-signed cert. iPhone will warn once."
    openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
      -keyout "$CERT_DIR/localhost-key.pem" \
      -out "$CERT_DIR/localhost.pem" \
      -subj "/CN=localhost"
  fi
fi

if [[ ! -d "$WEB/node_modules" ]]; then
  (cd "$WEB" && npm install)
fi

(cd "$WEB" && npm run build)

if [[ ! -d "$SERVER/.venv" ]]; then
  python3 -m venv "$SERVER/.venv"
  "$SERVER/.venv/bin/pip" install -r "$SERVER/requirements.txt"
fi

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 127.0.0.1)"
echo
echo "Mac preview:     http://127.0.0.1:8080/dashboard.html"
echo "Phone command:   https://$IP:8443/dashboard.html"
echo "Phone HUD:       https://$IP:8443/track.html"
echo

cd "$SERVER"
exec .venv/bin/python run.py
