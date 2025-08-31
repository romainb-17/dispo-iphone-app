#!/usr/bin/env bash
set -euo pipefail
ACTION="${1:-start}"
if ! command -v docker >/dev/null 2>&1; then echo "❌ Docker est requis pour ce script. Lance plutôt: npm install && npm run dev"; exit 1; fi
[ -f ".env" ] || { cp .env.example .env && echo "ℹ️  .env créé — édite DEV_TOKEN/SMTP si besoin"; }
case "$ACTION" in
  start) docker compose up -d && echo "✅ http://localhost:3000";;
  stop) docker compose down;;
  logs) docker compose logs -f;;
  status) docker compose ps;;
  *) echo "Usage: $0 [start|stop|logs|status]"; exit 1;;
esac
