# Trading bots — i 3 repo GitHub del video

Kit di setup che segue il video **"3 free Github repos to print $$$ AI trading"**
([youtu.be/Z3CUdMYXZm8](https://youtu.be/Z3CUdMYXZm8)). Il video presenta tre progetti open-source
complementari e mostra come installarli e usarli tramite Claude Code:

| # | Repo | Ruolo | Mercati | Esecuzione |
|---|---|---|---|---|
| 1 | [freqtrade/freqtrade](https://github.com/freqtrade/freqtrade) | **Motore di esecuzione**: tu dai la strategia, lui backtesta, fa dry-run e trada. Web UI + Telegram (`/start`, `/stop`, `/performance`) | Crypto (Binance, Bybit, Hyperliquid, …) — molti exchange hanno ormai anche stock perps, commodities, FX | Locale (serve PC/VPS acceso 24/7) |
| 2 | [HKUDS/Vibe-Trading](https://github.com/HKUDS/Vibe-Trading) | **Agente di ricerca**: trasforma domande di mercato in ricerca eseguibile, backtesta idee, rivede i tuoi trade, libreria di 450+ alpha | Azioni, crypto, futures, FX | Paper/live via Alpaca e altri broker |
| 3 | [NoFxAiOS/nofx](https://github.com/NoFxAiOS/nofx) | **Terminal / middle-layer LLM → exchange**: strategie in linguaggio naturale, signal board, autopilot | Crypto, azioni USA, commodities, FX | Hyperliquid (autopilot) e CEX — solo live |

Flusso suggerito nel video: **Vibe-Trading genera e valida la strategia → Freqtrade (o NOFX) la esegue**,
prima in **paper/dry-run** per settimane, solo dopo con soldi veri.

> ⚠️ Solo a scopo didattico, non è consulenza finanziaria. Un backtest bello non prova nulla:
> conta il forward test fuori campione (dry-run). Non mettere mai chiavi API nel repo.

---

## Installazione rapida

```bash
cd trading-bots
./setup.sh            # tutti e tre  (oppure: ./setup.sh freqtrade | vibe | nofx)
```

Tutto viene installato in `trading-bots/vendor/` (ignorato da git). In alternativa trascina
[`SETUP_PROMPT.md`](./SETUP_PROMPT.md) in una sessione di Claude Code: è il "prompt di setup" del
video, fa fare tutto all'agente.

Requisiti: Python 3.11+, git; Docker consigliato per NOFX (oppure Go 1.25+ e Node 18+).

## Il programma: `run.sh`

Dopo il setup, tutto si comanda da un unico pannello:

```bash
./run.sh backtest 20240101-          # scarica i dati 1h e backtesta BreakoutStrategy
./run.sh hyperopt 200                # ottimizza i parametri (attenzione all'overfitting)
./run.sh dryrun                      # bot in dry-run in background, Web UI/API su :8080
./run.sh status                      # profitto e trade aperti (REST API)
./run.sh logs | ./run.sh stop
./run.sh alpha list                  # libreria di 462 alpha di Vibe-Trading (senza key LLM)
./run.sh vibe "Backtesta un momentum su NVDA e MSFT negli ultimi 2 anni"   # richiede key LLM
./run.sh vibe-web                    # Web UI Vibe-Trading su :8899
./run.sh nofx-up | ./run.sh nofx-down  # NOFX via Docker, UI su :3000
```

L'exchange si cambia al volo con `EXCHANGE=kraken ./run.sh backtest` (default: quello della config,
`binance`). Binance blocca alcune aree geografiche (errore 451): in quel caso usa `kraken`,
`kucoin`, `gate`, `okx`, … La strategia si cambia con `STRATEGY=NomeStrategia`.

### Risultato di riferimento della strategia d'esempio

Backtest `BreakoutStrategy` su KuCoin, BTC/USDT + ETH/USDT, 1h, 2024 (wallet 10.000 USDT):
**228 trade, win rate 43%, −11,9%, drawdown max 26%**. In un anno in cui BTC è più che
raddoppiato, la strategia ha perso: è la dimostrazione pratica del consiglio del video. La
strategia d'esempio serve a provare il flusso, non a fare soldi: va migliorata (con Vibe-Trading o
hyperopt) e validata fuori campione in dry-run prima di qualunque uso reale.

---

## 1 · Freqtrade — backtest → dry-run → (live)

Nel repo trovi una strategia d'esempio come quella del video (breakout BTC/ETH):
[`freqtrade/user_data/strategies/BreakoutStrategy.py`](./freqtrade/user_data/strategies/BreakoutStrategy.py)
e una config in dry-run [`freqtrade/config.dry-run.json`](./freqtrade/config.dry-run.json).
`setup.sh` la copia in `vendor/freqtrade/config.json` generando password e segreti casuali.

```bash
FT=vendor/freqtrade-venv/bin/freqtrade
CFG=vendor/freqtrade/config.json
UD=vendor/freqtrade/user_data

# dati storici + backtest
$FT download-data --config $CFG --userdir $UD --timerange 20240101- -t 1h
$FT backtesting   --config $CFG --userdir $UD --strategy BreakoutStrategy --timerange 20240101-

# (facoltativo) ottimizzazione parametri
$FT hyperopt --config $CFG --userdir $UD --strategy BreakoutStrategy \
             --hyperopt-loss SharpeHyperOptLoss --spaces buy sell -e 200

# dry-run (soldi finti, dati reali) con Web UI su http://127.0.0.1:8080
$FT trade --config $CFG --userdir $UD --strategy BreakoutStrategy
```

**Telegram**: crea un bot con @BotFather, metti `token` e `chat_id` in `vendor/freqtrade/config.json`
e `"enabled": true`. Comandi utili: `/status`, `/profit`, `/performance`, `/start`, `/stop`.

**Passare al live** (solo dopo settimane di dry-run): API key dell'exchange (senza permessi di
prelievo, con whitelist IP) in `exchange.key/secret`, poi `"dry_run": false`.
Il bot deve girare 24/7 → VPS o macchina sempre accesa (`tmux`, `systemd` o Docker).

## 2 · Vibe-Trading — generare e validare strategie

```bash
VT=vendor/vibe-venv/bin
$VT/vibe-trading init                 # imposta provider LLM e key (es. Anthropic / OpenRouter)
$VT/vibe-trading                      # CLI interattiva
$VT/vibe-trading serve --port 8899    # Web UI
$VT/vibe-trading-mcp                  # server MCP da collegare a Claude Code
```

Collegarlo a Claude Code come MCP: `claude mcp add vibe-trading -- $PWD/vendor/vibe-venv/bin/vibe-trading-mcp`

Prompt d'esempio dal video:

> Trova la migliore strategia momentum su NVDA, META, AAPL, MSFT e AMZN negli ultimi 2 anni.
> Backtesta con commissioni realistiche, mostrami l'equity curve e impostala in paper trading sul
> mio account Alpaca con 100.000 $; esegui il primo ciclo e mostrami gli ordini.

> Qual è la migliore strategia della libreria alpha per costruire un trading bot? Confrontale con
> l'S&P 500 e tieni solo quelle che passano il test out-of-sample.

Per il paper trading crea un account gratuito su [Alpaca](https://alpaca.markets) (paper keys).

## 3 · NOFX — terminal AI trading

```bash
docker compose -f vendor/nofx/docker-compose.prod.yml up -d     # UI su http://localhost:3000
# senza Docker (Go 1.25+):  cd vendor/nofx && go build -o nofx && ./nofx   +   cd web && npm i && npm run dev
```

Dalla UI: collega l'exchange (Hyperliquid per l'autopilot, oppure un CEX), scegli il modello AI,
esplora la *signal board* e le strategie pre-costruite, poi crea/deploya la tua.
Attenzione: NOFX lavora **solo live**, niente modalità paper → inizia con importi minimi.

---

## DIY o pronto all'uso?

Questi repo danno "idraulica" già pronta: parametri di rischio, connessioni agli exchange, loop
*leggi mercato → decidi → esegui → registra il ragionamento*. Costruirsi il bot da zero con Claude
dà invece controllo totale (es. paper mode ovunque). Il consiglio del video: installali tutti e tre,
sperimenta in paper e sviluppa le strategie nel tempo prima di usare capitale reale.
