# Portfolio Backtest 10Y — Multi-Factor vs CSSPX / SWDA

Backtest riproducibile (lug 2016 → giu 2026). Allocazione **target bilanciata**
a 4 sleeve (Momentum 30%, Quality 30%, World ex-USA 25%, Oro 15% — 85% azionario
+ 15% oro) contro CSSPX e SWDA, con PAC 500 €/mese indicizzato +5%/anno, extra
500 € a marzo/dicembre, ribilanciamento annuale a gennaio e TER ponderato **0,236%**
(il più basso di tutte le versioni testate).

Risultato chiave: è l'allocazione meglio bilanciata testata — **eguaglia il CAGR
di SWDA (12,93%)** con 2,5 punti di volatilità in meno (10,8%), ha il **miglior
Sharpe di tutte le versioni (1,10)**, drawdown −14,9%, ed è 2ª sul montante
(213.582 €) sopra SWDA. Diversificazione geografica reale (azionario ~50% USA)
e oro al 15% come vero contrappeso.

Include una **versione rivista** (Momentum 28, Quality 27, ex-USA 25, Oro 12,
+8% Global Aggregate Bond EUR-hedged — proxy Xtrackers DBZB, TER 0,224%): nel
backtest *abbassa* lo Sharpe a 1,06 (spostare peso dall'oro ai bond costa in
questo decennio), valore solo forward-looking.

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
