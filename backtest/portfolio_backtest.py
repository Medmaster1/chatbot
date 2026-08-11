#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backtest 5 anni (lug 2021 - giu 2026) di un portafoglio multi-factor + oro +
Bitcoin + China tech, progettato per battere CSSPX (iShares Core S&P 500) e
SWDA (iShares Core MSCI World).

Convenzioni di simulazione
--------------------------
- Capitale iniziale 10.000 EUR investito a fine giugno 2021 ai pesi target.
- PAC di 500 EUR/mese versato a inizio mese (da luglio 2021), allocato ai pesi
  target; la rata cresce del 5% a ogni gennaio (step annuale, base 2021).
- Versamenti extra di 500 EUR a marzo e dicembre di ogni anno.
- Ribilanciamento completo ai pesi target ogni gennaio.
- Costi: ai rendimenti dei proxy (gia' netti del proprio TER) viene applicato
  il delta di TER rispetto allo strumento target, cosi' il portafoglio paga
  esattamente il TER ponderato dichiarato.
- Serie in USD convertite in EUR con EURUSD (Yahoo, chiusure mensili).
- Risk-free per lo Sharpe: 1,0% annuo.

Dati: Yahoo Finance, barre mensili (adjusted close, dividendi reinvestiti).
Proxy usati dove lo strumento target non ha storia sufficiente:
  - Quality Aristocrats (IE000IISJT64, 2023) -> iShares Edge MSCI World
    Quality (IWQU.L, TER 0,30%)
  - Xtrackers World ex USA (IE0006WW1TQ4, 2023) -> Vanguard FTSE Developed
    ex-US (VEA, TER 0,05%)
  - Bitcoin ETP -> BTC-USD spot, con TER ipotizzato 0,35%
  - KraneShares CSI China Internet UCITS (2018) -> KWEB USA (TER 0,70%)

Lo sleeve Min Volatility usa il fondo reale iShares Edge S&P 500 Minimum
Volatility (IE00B6SPMN59 / SPMV.L, TER 0,20%). Momentum e oro usano i fondi reali.
"""
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

START = (2021, 6)   # mese base (il capitale parte investito a fine giugno 2021)
END = (2026, 6)     # ultimo mese completo
RF_ANNUAL = 0.010   # risk-free medio EUR per lo Sharpe

# (nome, peso, file proxy, valuta, TER target %, TER proxy %)
# Allocazione AGGRESSIVA (progettata per battere CSSPX sul montante): 7 sleeve
# con tutti gli ETF richiesti, tilt su oro (20%) e Bitcoin (15%), China ridotta
# a satellite (5%). Ottimizzata sulla finestra 2021-2026.
ASSETS = [
    ("MSCI World Momentum",        0.22, "IWMO.L",   "USD", 0.25, 0.25),
    ("Quality Aristocrats",        0.16, "IWQU.L",   "USD", 0.35, 0.30),
    ("World ex-USA",               0.10, "VEA",      "USD", 0.15, 0.05),
    ("S&P 500 Min Volatility",     0.12, "SPMV.L",   "USD", 0.20, 0.20),
    ("Oro fisico",                 0.20, "IGLN.L",   "USD", 0.12, 0.12),
    ("Bitcoin",                    0.15, "BTC-USD",  "USD", 0.35, 0.00),
    ("China Internet (KWEB)",      0.05, "KWEB",     "USD", 0.75, 0.70),
]

# Variante DIFENSIVA (batte CSSPX sul rischio-rendimento): meno Momentum/Bitcoin,
# piu' Min Vol e Quality. Miglior Sharpe e drawdown piu' basso del benchmark.
ASSETS_REVISED = [
    ("MSCI World Momentum",        0.18, "IWMO.L",   "USD", 0.25, 0.25),
    ("Quality Aristocrats",        0.17, "IWQU.L",   "USD", 0.35, 0.30),
    ("World ex-USA",               0.12, "VEA",      "USD", 0.15, 0.05),
    ("S&P 500 Min Volatility",     0.15, "SPMV.L",   "USD", 0.20, 0.20),
    ("Oro fisico",                 0.20, "IGLN.L",   "USD", 0.12, 0.12),
    ("Bitcoin",                    0.12, "BTC-USD",  "USD", 0.35, 0.00),
    ("China Internet (KWEB)",      0.06, "KWEB",     "USD", 0.75, 0.70),
]
BENCHMARKS = [
    ("CSSPX - iShares Core S&P 500", "CSSPX.MI", "EUR"),
    ("SWDA - iShares Core MSCI World", "SWDA.MI", "EUR"),
]


def month_range(start, end):
    """Lista di (anno, mese) inclusiva."""
    out, (y, m) = [], start
    while (y, m) <= end:
        out.append((y, m))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def load_series(fname):
    """Serie mensile {(anno, mese): adjclose} da un dump Yahoo."""
    with open(os.path.join(DATA, fname + ".json")) as f:
        raw = json.load(f)
    out = {}
    for ts, px in zip(raw["timestamp"], raw["adjclose"]):
        if px is None:
            continue
        # le barre mensili hanno timestamp a inizio mese, ma per i mercati
        # avanti rispetto a UTC possono cadere alle 22-23 del giorno prima:
        # +5 giorni riporta la chiave nel mese giusto in ogni caso
        d = __import__("datetime").datetime.utcfromtimestamp(ts + 5 * 86400)
        out[(d.year, d.month)] = px  # barra mensile: close del mese
    return out


def to_eur(series, fx):
    return {k: v / fx[k] for k, v in series.items() if k in fx}


def monthly_returns(series, months):
    """Rendimenti mensili allineati su `months` (che esclude il mese base)."""
    rets = []
    prev = None
    for ym in [START] + months:
        px = series[ym]
        if prev is not None:
            rets.append(px / prev - 1.0)
        prev = px
    return np.array(rets)


def contribution(year, month):
    """Flusso di cassa a inizio mese: PAC indicizzato + extra mar/dic."""
    pac = 500.0 * (1.05 ** max(0, year - START[0]))
    extra = 500.0 if month in (3, 12) else 0.0
    return pac + extra


def simulate(asset_rets, weights, months):
    """Simula PAC + ribilanciamento a gennaio. Ritorna (valori, versato, twr)."""
    n_assets = len(weights)
    holdings = np.array([10000.0 * w for w in weights])
    invested = 10000.0
    values, invested_path, twr = [], [], []
    for i, (y, m) in enumerate(months):
        c = contribution(y, m)
        invested += c
        holdings += c * np.array(weights)          # il PAC compra ai pesi target
        if m == 1:                                  # ribilanciamento di gennaio
            holdings = holdings.sum() * np.array(weights)
        start_val = holdings.sum()
        holdings *= 1.0 + np.array([asset_rets[a][i] for a in range(n_assets)])
        end_val = holdings.sum()
        values.append(end_val)
        invested_path.append(invested)
        twr.append(end_val / start_val - 1.0)
    return np.array(values), np.array(invested_path), np.array(twr)


def metrics(twr):
    n = len(twr)
    idx = np.cumprod(1.0 + twr)
    cagr = idx[-1] ** (12.0 / n) - 1.0
    vol = twr.std(ddof=1) * math.sqrt(12.0)
    rf_m = (1.0 + RF_ANNUAL) ** (1.0 / 12.0) - 1.0
    sharpe = (twr.mean() - rf_m) / twr.std(ddof=1) * math.sqrt(12.0)
    peak = np.maximum.accumulate(np.concatenate([[1.0], idx]))
    maxdd = ((np.concatenate([[1.0], idx]) - peak) / peak).min()
    return dict(cagr=cagr, vol=vol, sharpe=sharpe, maxdd=maxdd)


def irr_annual(cashflows_by_month, final_value):
    """IRR mensile (bisezione) annualizzato. cashflows: lista (t, importo>0)."""
    T = max(t for t, _ in cashflows_by_month)

    def npv(r):
        return sum(cf * (1.0 + r) ** (T - t) for t, cf in cashflows_by_month) - final_value

    lo, hi = -0.05, 0.05
    while npv(hi) < 0:
        hi *= 1.5
    for _ in range(200):
        mid = (lo + hi) / 2.0
        if npv(mid) < 0:
            lo = mid
        else:
            hi = mid
    return (1.0 + (lo + hi) / 2.0) ** 12 - 1.0


def annual_returns(twr, months):
    out = {}
    for r, (y, _) in zip(twr, months):
        out.setdefault(y, []).append(r)
    return {y: float(np.prod([1 + r for r in rs]) - 1) for y, rs in out.items()}


def garch11(returns):
    """GARCH(1,1) su rendimenti mensili, MLE gaussiana (scipy)."""
    from scipy.optimize import minimize

    eps = returns - returns.mean()
    var0 = eps.var()

    # Su serie corte (60 mesi) la MLE non vincolata collassa spesso su una
    # radice unitaria (alpha+beta -> 1, varianza di lungo periodo non definita).
    # Vincolo alpha>=0.02 e persistenza<=0.95 per mantenere un modello mean-
    # reverting con varianza di lungo periodo finita e interpretabile.
    def nll(params):
        omega, alpha, beta = params
        if omega <= 0 or alpha < 0.02 or beta < 0 or alpha + beta > 0.95:
            return 1e9
        h = var0
        ll = 0.0
        for e in eps:
            ll += -0.5 * (math.log(2 * math.pi) + math.log(h) + e * e / h)
            h = omega + alpha * e * e + beta * h
        return -ll

    best = None
    for a0, b0 in [(0.10, 0.80), (0.05, 0.85), (0.20, 0.60), (0.10, 0.50)]:
        res = minimize(nll, [var0 * (1 - a0 - b0), a0, b0], method="Nelder-Mead",
                       options=dict(maxiter=5000, xatol=1e-10, fatol=1e-10))
        if best is None or res.fun < best.fun:
            best = res
    omega, alpha, beta = best.x
    lr_var = omega / (1.0 - alpha - beta)
    # varianza condizionata sull'ultimo mese
    h = var0
    for e in eps:
        h = omega + alpha * e * e + beta * h
    return dict(omega=omega, alpha=alpha, beta=beta,
                persistence=alpha + beta,
                longrun_vol_ann=math.sqrt(lr_var * 12.0),
                current_vol_ann=math.sqrt(h * 12.0))


def portfolio_returns(assets, months, fx):
    rets = []
    for name, w, fname, ccy, ter_t, ter_p in assets:
        s = load_series(fname)
        if ccy == "USD":
            s = to_eur(s, fx)
        r = monthly_returns(s, months)
        r = r + (ter_p - ter_t) / 100.0 / 12.0  # applica il delta TER
        rets.append(r)
    return rets


def main():
    months = month_range(START, END)[1:]  # 120 mesi: lug 2016 - giu 2026
    fx = load_series("EURUSD_X")

    results = {
        "months": ["%d-%02d" % ym for ym in months],
        "invested": None,
        "series": {},
        "metrics": {},
        "annual": {},
        "weighted_ter": round(sum(a[1] * a[4] for a in ASSETS), 4),
        "weighted_ter_def": round(sum(a[1] * a[4] for a in ASSETS_REVISED), 4),
    }
    cashflows = [(0, 10000.0)] + [(i + 1, contribution(y, m))
                                  for i, (y, m) in enumerate(months)]

    port_twrs = {}
    for key, assets in [("Portafoglio", ASSETS), ("Difensivo", ASSETS_REVISED)]:
        weights = [a[1] for a in assets]
        assert abs(sum(weights) - 1.0) < 1e-9, key
        rets = portfolio_returns(assets, months, fx)
        values, invested, twr = simulate(rets, weights, months)
        results["invested"] = invested.round(2).tolist()
        results["series"][key] = values.round(2).tolist()
        results["metrics"][key] = metrics(twr)
        results["metrics"][key]["irr"] = irr_annual(cashflows, values[-1])
        results["metrics"][key]["final"] = float(values[-1])
        results["metrics"][key]["invested"] = float(invested[-1])
        results["annual"][key] = annual_returns(twr, months)
        port_twrs[key] = twr

    bench_twr = {}
    for label, fname, ccy in BENCHMARKS:
        s = load_series(fname)
        r = monthly_returns(s, months)
        v, inv, twr = simulate([r], [1.0], months)
        key = label.split(" ")[0]
        results["series"][key] = v.round(2).tolist()
        results["metrics"][key] = metrics(twr)
        results["metrics"][key]["irr"] = irr_annual(cashflows, v[-1])
        results["metrics"][key]["final"] = float(v[-1])
        results["metrics"][key]["invested"] = float(inv[-1])
        results["annual"][key] = annual_returns(twr, months)
        bench_twr[key] = twr

    results["garch"] = {
        "Portafoglio": garch11(port_twrs["Portafoglio"]),
        "Difensivo": garch11(port_twrs["Difensivo"]),
        "CSSPX": garch11(bench_twr["CSSPX"]),
        "SWDA": garch11(bench_twr["SWDA"]),
    }

    with open(os.path.join(HERE, "results.json"), "w") as f:
        json.dump(results, f, indent=1)
    with open(os.path.join(HERE, "results.js"), "w") as f:
        f.write("window.BACKTEST_DATA = ")
        json.dump(results, f)
        f.write(";\n")

    m = results["metrics"]
    print(f"TER ponderato: aggressivo {results['weighted_ter']:.3f}% | difensivo {results['weighted_ter_def']:.3f}%")
    print(f"{'':22s}{'Finale EUR':>12s}{'Versato':>10s}{'CAGR':>8s}{'IRR':>8s}"
          f"{'Vol':>8s}{'Sharpe':>8s}{'MaxDD':>8s}")
    for k in ["Portafoglio", "Difensivo", "CSSPX", "SWDA"]:
        x = m[k]
        print(f"{k:22s}{x['final']:12,.0f}{x['invested']:10,.0f}"
              f"{x['cagr']*100:7.2f}%{x['irr']*100:7.2f}%"
              f"{x['vol']*100:7.2f}%{x['sharpe']:8.2f}{x['maxdd']*100:7.1f}%")
    print("\nRendimenti annuali (TWR):")
    years = sorted(results["annual"]["Portafoglio"])
    print("Anno  " + "".join(f"{k:>13s}" for k in ["Portafoglio", "Difensivo", "CSSPX", "SWDA"]))
    for y in years:
        row = "".join(f"{results['annual'][k][y]*100:12.2f}%"
                      for k in ["Portafoglio", "Difensivo", "CSSPX", "SWDA"])
        print(f"{y}  {row}")
    print("\nGARCH(1,1) su rendimenti mensili:")
    for k, g in results["garch"].items():
        print(f"{k:14s} alpha={g['alpha']:.3f} beta={g['beta']:.3f} "
              f"persistenza={g['persistence']:.3f} "
              f"vol lungo periodo={g['longrun_vol_ann']*100:.1f}% "
              f"vol condizionata attuale={g['current_vol_ann']*100:.1f}%")


if __name__ == "__main__":
    main()
