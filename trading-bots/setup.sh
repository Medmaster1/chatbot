#!/usr/bin/env bash
# Installa i 3 repo di trading AI del video "3 free Github repos ... AI trading":
#   1) Freqtrade      — motore di esecuzione/backtest (crypto, Web UI + Telegram)
#   2) Vibe-Trading   — agente di ricerca: genera e backtesta strategie
#   3) NOFX           — terminal / middle-layer LLM -> exchange (Hyperliquid, CEX)
#
# Uso:  ./setup.sh [all|freqtrade|vibe|nofx]     (default: all)
# Tutto finisce in trading-bots/vendor/ (ignorato da git). Nessuna chiave viene scritta nel repo.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR="$HERE/vendor"
TARGET="${1:-all}"
mkdir -p "$VENDOR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ manca '$1' — installalo e riprova" >&2; exit 1; }; }
rand() { python3 -c 'import secrets; print(secrets.token_urlsafe(32))'; }

setup_freqtrade() {
  echo "==> [1/3] Freqtrade"
  need python3
  local venv="$VENDOR/freqtrade-venv" ud="$VENDOR/freqtrade/user_data"
  [ -d "$venv" ] || python3 -m venv "$venv"
  "$venv/bin/pip" install -q --upgrade pip
  "$venv/bin/pip" install -q freqtrade
  "$venv/bin/freqtrade" create-userdir --userdir "$ud" >/dev/null
  cp "$HERE/freqtrade/user_data/strategies/"*.py "$ud/strategies/"
  if [ ! -f "$VENDOR/freqtrade/config.json" ]; then
    # Config locale con segreti casuali per la Web UI (mai committata)
    python3 - "$HERE/freqtrade/config.dry-run.json" "$VENDOR/freqtrade/config.json" "$(rand)" "$(rand)" "$(rand)" <<'PY'
import json, sys
src, dst, jwt, ws, pwd = sys.argv[1:]
c = json.load(open(src))
c["api_server"].update(jwt_secret_key=jwt, ws_token=ws, password=pwd)
json.dump(c, open(dst, "w"), indent=4)
print(f"   Web UI: http://127.0.0.1:8080  user=freqtrader  password={pwd}")
PY
  fi
  "$venv/bin/freqtrade" install-ui >/dev/null || echo "   (install-ui fallito: riprova più tardi)"
  echo "   ✓ Freqtrade pronto — vedi README per backtest e dry-run"
}

setup_vibe() {
  echo "==> [2/3] Vibe-Trading"
  need python3
  local venv="$VENDOR/vibe-venv"
  [ -d "$venv" ] || python3 -m venv "$venv"
  "$venv/bin/pip" install -q --upgrade pip
  "$venv/bin/pip" install -q vibe-trading-ai
  echo "   ✓ Vibe-Trading installato — poi: $venv/bin/vibe-trading init (imposta la key LLM)"
}

setup_nofx() {
  echo "==> [3/3] NOFX"
  need git
  if [ -d "$VENDOR/nofx/.git" ]; then git -C "$VENDOR/nofx" pull -q --ff-only
  else git clone -q --depth 1 https://github.com/NoFxAiOS/nofx.git "$VENDOR/nofx"; fi
  if command -v docker >/dev/null 2>&1; then
    echo "   avvio con Docker: docker compose -f $VENDOR/nofx/docker-compose.prod.yml up -d"
  else
    echo "   Docker assente: build da sorgente (Go 1.25+, Node 18+) — vedi README"
  fi
  echo "   ✓ NOFX clonato — UI su http://localhost:3000 dopo l'avvio"
}

case "$TARGET" in
  all)       setup_freqtrade; setup_vibe; setup_nofx ;;
  freqtrade) setup_freqtrade ;;
  vibe)      setup_vibe ;;
  nofx)      setup_nofx ;;
  *) echo "uso: $0 [all|freqtrade|vibe|nofx]" >&2; exit 2 ;;
esac
