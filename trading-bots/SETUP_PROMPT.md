# Setup prompt — 3 repo di AI trading (da trascinare in Claude Code)

Sei il mio assistente di setup. Installa e configura questi tre progetti open-source nella cartella
`trading-bots/vendor/` di questo repository, senza mai committare chiavi o segreti:

1. **Freqtrade** (https://github.com/freqtrade/freqtrade)
   - Esegui `trading-bots/setup.sh freqtrade` (venv + `pip install freqtrade` + Web UI).
   - Usa la strategia `BreakoutStrategy` e la config dry-run generata in `vendor/freqtrade/config.json`.
   - Scarica i dati 1h di BTC/USDT ed ETH/USDT dal 2024, esegui un backtest e riassumimi
     profitto, drawdown massimo, win rate e numero di trade.
   - Avvia il bot in **dry-run** con la Web UI su http://127.0.0.1:8080 e dimmi le credenziali.
   - Se ti do token e chat_id di Telegram, abilita il bot Telegram.

2. **Vibe-Trading** (https://github.com/HKUDS/Vibe-Trading)
   - Esegui `trading-bots/setup.sh vibe` (`pip install vibe-trading-ai`).
   - Chiedimi quale provider LLM usare e la relativa key, poi esegui `vibe-trading init`.
   - Registra il server MCP in Claude Code: `claude mcp add vibe-trading -- <venv>/bin/vibe-trading-mcp`.
   - Se ti do le paper key di Alpaca, configurale per il paper trading.

3. **NOFX** (https://github.com/NoFxAiOS/nofx)
   - Esegui `trading-bots/setup.sh nofx`, poi avvialo con Docker
     (`docker compose -f trading-bots/vendor/nofx/docker-compose.prod.yml up -d`)
     o da sorgente se Docker non c'è. UI su http://localhost:3000.

Regole:
- Tutto parte in **paper / dry-run**. Non passare mai al live senza mia conferma esplicita.
- Le API key degli exchange devono essere senza permesso di prelievo.
- Per backtest, dry-run e stato usa `trading-bots/run.sh` (`./run.sh help`); se Binance risponde 451 usa `EXCHANGE=kraken`.
- Alla fine dammi un riepilogo: cosa è installato, come avviarlo, URL e prossimi passi.
