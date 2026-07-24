# Portfolio Backtest 10Y — Multi-Factor vs CSSPX / SWDA

Backtest riproducibile (lug 2016 → giu 2026). Allocazione **con le modifiche eseguite**
(Momentum 25%, Quality 22%, World ex-USA 15%, MSCI World Min Vol 16%, Oro 10%, China
Internet 4%, Global Aggregate Bond EUR-hedged 8% — proxy Xtrackers DBZB) contro CSSPX
e SWDA, con PAC 500 €/mese indicizzato +5%/anno, extra 500 € a marzo/dicembre,
ribilanciamento annuale a gennaio e TER ponderato **0,260%**.

Risultato chiave: il portafoglio rende **meno dei benchmark in assoluto**
(182.102 € vs 226.199 € di CSSPX, CAGR 10,7%) ma con la volatilità più bassa (9,5%),
il **miglior Sharpe (1,01)** e il drawdown più contenuto (−13,4%).

Include come riferimento l'**allocazione precedente** (Momentum 30, Quality 20,
ex-USA 15, Min Vol 18, Oro 10, China 7, senza bond — TER 0,286%), simulata con le
stesse regole per mostrare l'effetto delle modifiche.

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
