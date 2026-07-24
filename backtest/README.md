# Portfolio Backtest 10Y — Multi-Factor vs CSSPX / SWDA

Backtest riproducibile (lug 2016 → giu 2026). Allocazione **target quality-tilt**
a 5 sleeve (Momentum 25%, Quality 30%, World ex-USA 15%, MSCI World Min Vol 20%,
Oro 10% — 90% azionario + 10% oro, no China/BTC/bond) contro CSSPX e SWDA, con PAC
500 €/mese indicizzato +5%/anno, extra 500 € a marzo/dicembre, ribilanciamento
annuale a gennaio e TER ponderato **0,262%**.

Risultato chiave: il portafoglio rende **meno dei benchmark in assoluto**
(196.735 € vs 226.199 € di CSSPX, CAGR 11,8%) ma con la volatilità più bassa (10,5%),
il **miglior Sharpe (1,03)** e il drawdown più contenuto (−15,3%).

Include una **versione rivista** (Quality 25, Min Vol 17, Oro 8, +10% Global
Aggregate Bond EUR-hedged — proxy Xtrackers DBZB, TER 0,243%): nel backtest
*peggiora* lo Sharpe a 0,99 (i bond frenano in un decennio rialzista), ha valore
solo forward-looking.

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
