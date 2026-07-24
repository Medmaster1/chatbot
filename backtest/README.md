# Portfolio Backtest 10Y — Multi-Factor vs CSSPX / SWDA

Backtest riproducibile (lug 2016 → giu 2026). Allocazione **target aggressiva**
a 4 sleeve (Momentum 40%, Quality 30%, World ex-USA 20%, Oro 10% — 90% azionario
+ 10% oro, nessun asset difensivo) contro CSSPX e SWDA, con PAC 500 €/mese
indicizzato +5%/anno, extra 500 € a marzo/dicembre, ribilanciamento annuale a
gennaio e TER ponderato **0,247%**.

Risultato chiave: è il miglior target testato — **quasi aggancia CSSPX** sul
montante (217.593 € vs 226.199 €, CAGR 13,4%) e batte SWDA, con volatilità più
bassa (11,5%), il **miglior Sharpe (1,07)** e drawdown −15,4%. La spinta arriva
dal 40% di Momentum, il fattore vincente del decennio: è concentrazione, non
diversificazione.

Include una **versione rivista** (Momentum 30, Quality 28, ex-USA 20, Oro 12,
+10% Global Aggregate Bond EUR-hedged — proxy Xtrackers DBZB, TER 0,227%): cede
~20.000 € di montante per uno Sharpe quasi identico (1,06), assicurazione
forward-looking contro un crash del Momentum.

- `portfolio_backtest.py` — motore di simulazione (richiede `numpy`, `scipy`).
  Legge gli snapshot in `data/` e scrive `results.json` + `results.js`.
- `data/*.json` — snapshot Yahoo Finance (barre mensili adjusted close,
  scaricate il 2026-07-12).
- `results.json` / `results.js` — output: equity line, metriche (CAGR, IRR,
  Sharpe, Max DD, volatilità), rendimenti annuali, GARCH(1,1).
- `equity_line.png` — grafico statico (fallback della pagina report).

Report completo: [`../portfolio-backtest.html`](../portfolio-backtest.html).

Per rigenerare con dati aggiornati: riscaricare gli snapshot (stesso formato
`{"timestamp": [...], "adjclose": [...]}`) e rilanciare
`python3 portfolio_backtest.py`.
