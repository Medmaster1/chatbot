# Portfolio Backtest 10Y — Multi-Factor vs CSSPX / SWDA

Backtest riproducibile (lug 2016 → giu 2026) del portafoglio multi-factor
**senza Bitcoin** (Momentum 30%, Quality 20%, World ex-USA 15%, MSCI World Min Vol
18%, Oro 10%, China Internet 7%) contro CSSPX e SWDA, con PAC 500 €/mese indicizzato
+5%/anno, extra 500 € a marzo/dicembre, ribilanciamento annuale a gennaio e TER
ponderato **0,286%**.

Risultato chiave: senza Bitcoin il portafoglio rende **meno dei benchmark in assoluto**
(189.827 € vs 226.199 € di CSSPX, CAGR 11,5%) ma con la volatilità più bassa (10,2%),
il **miglior Sharpe (1,02)** e il drawdown più contenuto (−14,4%).

Include anche il **portafoglio rivisto** (Momentum 25, Quality 22, ex-USA 15,
Min Vol 16, Oro 10, China 4, Global Aggregate Bond EUR-hedged 8 — proxy Xtrackers
DBZB), simulato con le stesse regole.

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
