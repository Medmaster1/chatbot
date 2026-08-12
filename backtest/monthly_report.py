#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Alert mensile: resoconto dei rendimenti della variante DIFENSIVA SENZA China
(6 ETF) contro i benchmark CSSPX e SWDA, con baseline fine gennaio 2021.

Scarica dati freschi da Yahoo Finance a ogni esecuzione (barre mensili, total
return), converte in EUR, e stampa:
  - rendimento dell'ultimo mese completo (portafoglio vs CSSPX vs SWDA)
  - tabella mese per mese da feb-2021 in poi
  - rendimento cumulato da fine gennaio 2021
Convenzione: portafoglio ai pesi target con RIBILANCIAMENTO ANNUALE (gennaio).
I pesi driftano durante l'anno e vengono riportati a target ogni gennaio; il
rendimento mensile e' quello del portafoglio con i pesi correnti (drifted).
Serie proxy dove lo strumento UCITS non ha storia (vedi note in fondo).
"""
import json
import sys
import time
import urllib.request

# Variante difensiva SENZA China Internet (6 ETF, pesi renormalizzati /0.94).
# Batte CSSPX e SWDA su montante/CAGR/Sharpe piu' nettamente della versione con
# China, con TER piu' basso (KWEB era il piu' caro, 0,75%).
WEIGHTS = {
    "IWMO.L":  0.191,   # MSCI World Momentum
    "IWQU.L":  0.181,   # Quality (proxy World Quality)
    "SPMV.L":  0.160,   # S&P 500 Min Volatility
    "VEA":     0.128,   # World ex-USA (proxy VEA)
    "IGLN.L":  0.212,   # Oro fisico
    "BTC-USD": 0.128,   # Bitcoin (proxy spot)
}
USD = {"IWMO.L", "IWQU.L", "SPMV.L", "VEA", "IGLN.L", "BTC-USD"}
BENCH = {"CSSPX.MI": "CSSPX", "SWDA.MI": "SWDA"}
BASE = (2021, 1)   # fine gennaio 2021 = baseline

MESI = ["", "gen", "feb", "mar", "apr", "mag", "giu",
        "lug", "ago", "set", "ott", "nov", "dic"]


def fetch(ticker):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(ticker)
           + "?range=6y&interval=1mo")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
            res = data["chart"]["result"][0]
            ts = res["timestamp"]
            q = res["indicators"]["quote"][0]["close"]
            adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose", q)
            out = {}
            import datetime
            for t, px in zip(ts, adj):
                if px is None:
                    continue
                d = datetime.datetime.utcfromtimestamp(t + 5 * 86400)
                out[(d.year, d.month)] = px
            return out
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def month_seq(start, end):
    out, (y, m) = [], start
    while (y, m) <= end:
        out.append((y, m))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def main():
    series = {t: fetch(t) for t in list(WEIGHTS) + list(BENCH)}
    fx = fetch("EURUSD=X")

    # ultimo mese COMPLETO comune a tutte le serie (escludo il mese in corso)
    import datetime
    now = datetime.datetime.utcnow()
    current = (now.year, now.month)
    common = set.intersection(*[set(s) for s in series.values()], set(fx))
    last = max(m for m in common if BASE <= m < current)
    months = month_seq((BASE[0], BASE[1] + 1) if BASE[1] < 12 else (BASE[0] + 1, 1), last)

    def eur(t, ym):
        v = series[t][ym]
        return v / fx[ym] if t in USD else v

    def mret(t, ym, prev):
        return eur(t, ym) / eur(t, prev) - 1.0

    rows = []
    prev = BASE
    holdings = dict(WEIGHTS)          # valore totale = 1.0 a fine gen-2021
    cum_c, cum_s = 1.0, 1.0
    for ym in months:
        if ym[1] == 1:               # gennaio: ribilanciamento annuale ai pesi target
            tot = sum(holdings.values())
            holdings = {t: tot * w for t, w in WEIGHTS.items()}
        start_val = sum(holdings.values())
        for t in holdings:
            holdings[t] *= 1 + mret(t, ym, prev)
        end_val = sum(holdings.values())
        pr = end_val / start_val - 1
        cr = mret("CSSPX.MI", ym, prev)
        sr = mret("SWDA.MI", ym, prev)
        cum_c *= 1 + cr
        cum_s *= 1 + sr
        rows.append((ym, pr, cr, sr, end_val - 1, cum_c - 1, cum_s - 1))
        prev = ym

    def pc(x):
        return f"{x * 100:+6.2f}%"

    ly, lm = last
    lab = f"{MESI[lm]} {ly}"
    lr = rows[-1]
    print("=" * 66)
    print(f"  ALERT · RESOCONTO RENDIMENTI MENSILI — difensiva senza China (6 ETF)")
    print(f"  baseline: fine gennaio 2021   ·   ultimo mese: {lab}")
    print("=" * 66)
    print(f"\n  ULTIMO MESE ({lab}):")
    print(f"    Portafoglio  {pc(lr[1])}     CSSPX {pc(lr[2])}     SWDA {pc(lr[3])}")
    diff_c = lr[1] - lr[2]
    diff_s = lr[1] - lr[3]
    print(f"    vs CSSPX {diff_c * 100:+.2f} pp   ·   vs SWDA {diff_s * 100:+.2f} pp")
    print(f"\n  CUMULATO da fine gen-2021:")
    print(f"    Portafoglio {pc(lr[4])}   CSSPX {pc(lr[5])}   SWDA {pc(lr[6])}")
    win_c = "AVANTI" if lr[4] > lr[5] else "INDIETRO"
    win_s = "AVANTI" if lr[4] > lr[6] else "INDIETRO"
    print(f"    -> {win_c} su CSSPX ({(lr[4]-lr[5])*100:+.1f} pp) · "
          f"{win_s} su SWDA ({(lr[4]-lr[6])*100:+.1f} pp)")

    print(f"\n  {'Mese':>9} | {'Port.':>8} {'CSSPX':>8} {'SWDA':>8} | "
          f"{'cumP':>8} {'cumC':>8} {'cumS':>8}")
    print("  " + "-" * 62)
    for ym, pr, cr, sr, cp, cc, cs in rows:
        lab_m = f"{MESI[ym[1]]} {str(ym[0])[2:]}"
        print(f"  {lab_m:>9} | {pc(pr):>8} {pc(cr):>8} {pc(sr):>8} | "
              f"{pc(cp):>8} {pc(cc):>8} {pc(cs):>8}")
    print("\n  Pesi (senza China): MOM 19.1 · QUAL 18.1 · MinVol 16.0 · exUSA 12.8 · ORO 21.2 · BTC 12.8")
    print("  Proxy: IWQU(Qual) VEA(exUSA) BTC-USD(spot). TER ~0,232%.")
    print("  Ribilanciamento ANNUALE (gennaio); pesi drifted infra-anno. Total return, EUR.")
    print("  Non e' consulenza finanziaria. Dati: Yahoo Finance.\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERRORE nel generare l'alert: {e}", file=sys.stderr)
        sys.exit(1)
