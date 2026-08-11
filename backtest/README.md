# Portfolio Backtest 5Y — 7 ETF per battere CSSPX / SWDA

Backtest riproducibile (lug 2021 → giu 2026) di un'allocazione costruita con i
7 ETF richiesti (Momentum, Quality, World ex-USA, **S&P 500 Min Vol**, Oro,
**Bitcoin**, China Internet) con l'obiettivo di **battere un benchmark**, contro
CSSPX e SWDA. PAC 500 €/mese indicizzato +5%/anno (base 2021), extra 500 € a
marzo/dicembre, ribilanciamento annuale a gennaio, TER ponderato **0,264%**.

Due varianti, entrambe battono **CSSPX e SWDA**:

| | Montante | CAGR | Vol | Sharpe | Max DD |
|---|---|---|---|---|---|
| **Aggressivo** (Oro 20, BTC 15) | 81.229 € | 15,6% | 14,5% | 1,01 | −18,8% |
| **Difensivo** (più Min Vol/Quality) | 78.966 € | 14,6% | 13,1% | 1,03 | −16,1% |
| CSSPX | 76.875 € | 13,9% | 14,8% | 0,89 | −17,1% |
| SWDA | 74.471 € | 12,3% | 13,2% | 0,87 | −14,4% |

**Attribuzione onesta:** la sovraperformance viene dal 35% non-azionario
(oro 20% + Bitcoin 15%), non dalla parte factor. La finestra 2021-2026 è stata
particolarmente favorevole a oro/BTC; i pesi sono ottimizzati a posteriori →
overfitting, non indicativo del futuro.

Report completo: [`../portfolio-backtest.html`](../portfolio-backtest.html).
Motore: `portfolio_backtest.py` (finestra e allocazioni in cima al file).
