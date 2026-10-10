#!/usr/bin/env bash
# Pannello di controllo dei 3 bot installati da setup.sh.
#
#   ./run.sh backtest [timerange]   scarica i dati e backtesta BreakoutStrategy (default 20240101-)
#   ./run.sh hyperopt [epoche]      ottimizza i parametri della strategia (default 200)
#   ./run.sh dryrun                 avvia Freqtrade in dry-run in background (API/Web UI :8080)
#   ./run.sh status                 stato del bot (profitto, trade aperti) via REST API
#   ./run.sh stop                   ferma il bot Freqtrade
#   ./run.sh logs                   segue il log del bot
#   ./run.sh vibe [prompt]          Vibe-Trading: CLI interattiva o singolo prompt
#   ./run.sh vibe-web               Vibe-Trading Web UI su :8899
#   ./run.sh alpha [list|bench|...] libreria alpha di Vibe-Trading (462 strategie, senza key LLM)
#   ./run.sh nofx-up | nofx-down    avvia/ferma NOFX con Docker (UI su :3000)
#
# Variabili: EXCHANGE=binance|kraken|kucoin|gate|... (default: quello della config)
#            STRATEGY=BreakoutStrategy
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR="$HERE/vendor"
FT="$VENDOR/freqtrade-venv/bin/freqtrade"
UD="$VENDOR/freqtrade/user_data"
BASE_CFG="$VENDOR/freqtrade/config.json"
STRATEGY="${STRATEGY:-BreakoutStrategy}"
PIDFILE="$VENDOR/freqtrade/bot.pid"
LOGFILE="$UD/logs/freqtrade.log"

die() { echo "✗ $*" >&2; exit 1; }
need_ft() { [ -x "$FT" ] && [ -f "$BASE_CFG" ] || die "Freqtrade non installato: esegui ./setup.sh freqtrade"; }

# Config effettiva: base + eventuale override dell'exchange
cfg_args() {
  local args=(--config "$BASE_CFG" --userdir "$UD")
  if [ -n "${EXCHANGE:-}" ]; then
    local ov="$VENDOR/freqtrade/exchange-override.json"
    printf '{"exchange": {"name": "%s"}}\n' "$EXCHANGE" > "$ov"
    args+=(--config "$ov")
  fi
  printf '%s\n' "${args[@]}"
}

api() {  # api <endpoint>  -> GET autenticato sulla REST API di Freqtrade
  python3 - "$BASE_CFG" "$1" <<'PY'
import base64, json, sys, urllib.request
c = json.load(open(sys.argv[1]))["api_server"]
req = urllib.request.Request(f"http://{c['listen_ip_address']}:{c['listen_port']}/api/v1/{sys.argv[2]}")
tok = base64.b64encode(f"{c['username']}:{c['password']}".encode()).decode()
req.add_header("Authorization", f"Basic {tok}")
print(json.dumps(json.load(urllib.request.urlopen(req, timeout=10)), indent=2))
PY
}

running() { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

cmd="${1:-help}"; shift || true
case "$cmd" in
  backtest)
    need_ft; mapfile -t A < <(cfg_args); tr="${1:-20240101-}"
    "$FT" download-data "${A[@]}" --timerange "$tr" -t 1h
    "$FT" backtesting "${A[@]}" --strategy "$STRATEGY" --timerange "$tr" ;;
  hyperopt)
    need_ft; mapfile -t A < <(cfg_args)
    "$FT" hyperopt "${A[@]}" --strategy "$STRATEGY" --hyperopt-loss SharpeHyperOptLoss \
      --spaces buy sell -e "${1:-200}" ;;
  dryrun)
    need_ft; running && die "bot già attivo (pid $(cat "$PIDFILE"))"
    mapfile -t A < <(cfg_args)
    python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1]))["dry_run"] else 1)' "$BASE_CFG" \
      || die "dry_run è false in $BASE_CFG: per il live avvia freqtrade a mano, consapevolmente"
    mkdir -p "$(dirname "$LOGFILE")"
    nohup "$FT" trade "${A[@]}" --strategy "$STRATEGY" --logfile "$LOGFILE" \
      --db-url "sqlite:///$VENDOR/freqtrade/tradesv3.dryrun.sqlite" >/dev/null 2>&1 &
    echo $! > "$PIDFILE"
    echo "✓ dry-run avviato (pid $!) — API/Web UI: http://127.0.0.1:8080 — log: $LOGFILE" ;;
  status)
    running || die "bot non attivo"
    echo "--- profitto";     api profit
    echo "--- trade aperti"; api status ;;
  stop)
    running || die "bot non attivo"
    kill "$(cat "$PIDFILE")" && rm -f "$PIDFILE" && echo "✓ bot fermato" ;;
  logs) tail -f "$LOGFILE" ;;
  vibe)
    VT="$VENDOR/vibe-venv/bin/vibe-trading"; [ -x "$VT" ] || die "esegui ./setup.sh vibe"
    if [ $# -gt 0 ]; then "$VT" run -p "$*"; else "$VT"; fi ;;
  vibe-web)
    VT="$VENDOR/vibe-venv/bin/vibe-trading"; [ -x "$VT" ] || die "esegui ./setup.sh vibe"
    "$VT" serve --port 8899 ;;
  alpha)
    VT="$VENDOR/vibe-venv/bin/vibe-trading"; [ -x "$VT" ] || die "esegui ./setup.sh vibe"
    "$VT" alpha "${@:-list}" ;;
  nofx-up|nofx-down)
    [ -d "$VENDOR/nofx" ] || die "esegui ./setup.sh nofx"
    command -v docker >/dev/null || die "serve Docker (oppure build da sorgente, vedi README)"
    f="$VENDOR/nofx/docker-compose.prod.yml"
    if [ "$cmd" = nofx-up ]; then docker compose -f "$f" up -d && echo "✓ NOFX su http://localhost:3000"
    else docker compose -f "$f" down; fi ;;
  help|*) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
