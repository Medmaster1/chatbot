/* ============================================================
   DERIVATIVES & FUNDING — Binance Perpetual Futures (free, no key)
   ============================================================ */
const BIN_F = 'https://fapi.binance.com';

async function binFetch(path) {
  const r = await fetch(BIN_F + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('Binance Futures ' + r.status);
  return r.json();
}

async function render_derivatives(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Derivatives & Funding</div>
      <div class="page-subtitle">Binance Perpetual Futures — dati pubblici in tempo reale</div>
    </div>
    <div class="loading"><div class="spinner"></div> Caricamento dati derivati…</div>
  `;

  try {
    const [premium, tickers] = await Promise.all([
      binFetch('/fapi/v1/premiumIndex'),
      binFetch('/fapi/v1/ticker/24hr'),
    ]);

    const contracts = premium.filter(p => p.symbol.endsWith('USDT'));
    const tickerMap = {};
    tickers.forEach(t => { tickerMap[t.symbol] = t; });

    const byFunding = [...contracts].sort(
      (a, b) => parseFloat(b.lastFundingRate) - parseFloat(a.lastFundingRate)
    );
    const topPos = byFunding.slice(0, 15);
    const topNeg = byFunding.slice(-15).reverse();

    const rates = contracts.map(p => parseFloat(p.lastFundingRate) * 100);
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const posCount = rates.filter(r => r > 0).length;
    const negCount = rates.filter(r => r < 0).length;

    const byVol = tickers
      .filter(t => t.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 20);

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-large">Derivatives & Funding</div>
        <div class="page-subtitle">Binance Perpetual Futures — ${contracts.length} contratti USDT — ${new Date().toLocaleTimeString('it-IT')}</div>
      </div>

      <!-- STATS -->
      <div class="grid-4 mb-16" id="deriv-stats"></div>

      <!-- SENTIMENT BAR -->
      <div class="card mb-16" id="deriv-sentiment"></div>

      <!-- FUNDING TABLES -->
      <div class="grid-2 mb-16" style="gap:20px">
        <div class="card">
          <div class="card-title mb-4" style="color:var(--red)">▲ Funding Più Alto — Long pagano Short</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px">Segnale: euforia, possibile controtendenza ribassista</div>
          <div id="deriv-pos"></div>
        </div>
        <div class="card">
          <div class="card-title mb-4" style="color:var(--green)">▼ Funding Più Basso — Short pagano Long</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px">Segnale: pessimismo, possibile rimbalzo tecnico</div>
          <div id="deriv-neg"></div>
        </div>
      </div>

      <!-- VOLUME TABLE -->
      <div class="card">
        <div class="card-title mb-12">Top 20 per Volume 24h (Perpetual USDT)</div>
        <div id="deriv-vol"></div>
      </div>
    `;

    derivRenderStats(avgRate, posCount, negCount, rates, contracts.length);
    derivRenderSentiment(posCount, negCount, contracts.length, avgRate);
    derivRenderFundingTable('deriv-pos', topPos, tickerMap);
    derivRenderFundingTable('deriv-neg', topNeg, tickerMap);
    derivRenderVolumeTable(byVol);

  } catch (e) {
    el.innerHTML = `<div class="empty">
      <p>Errore: ${e.message}</p>
      <p style="font-size:11px;color:var(--text-muted)">L'API Binance Futures potrebbe essere bloccata dalla tua rete o da un firewall.</p>
    </div>`;
  }
}

function derivRenderStats(avg, pos, neg, rates, total) {
  const el = document.getElementById('deriv-stats');
  if (!el) return;
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  el.innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Funding Rate Medio</div>
      <div class="card-value ${avg > 0.02 ? 'red' : avg < -0.01 ? 'green' : ''}">${(avg).toFixed(4)}%</div>
      <div class="card-change neutral">su ${total} contratti USDT</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Positivi / Negativi</div>
      <div class="card-value">${pos} / ${neg}</div>
      <div class="card-change neutral">${((pos/total)*100).toFixed(0)}% mercato long-biased</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Funding Massimo</div>
      <div class="card-value red">${max.toFixed(4)}%</div>
      <div class="card-change neutral">Long pagano di più</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Funding Minimo</div>
      <div class="card-value green">${min.toFixed(4)}%</div>
      <div class="card-change neutral">Short pagano di più</div>
    </div>`;
}

function derivRenderSentiment(pos, neg, total, avgRate) {
  const el = document.getElementById('deriv-sentiment');
  if (!el) return;

  let label, color, desc;
  if (avgRate > 0.05) {
    label = 'Mercato Fortemente Bullish (Attenzione)';
    color = 'var(--red)';
    desc = 'Funding molto alto: i long pagano premi elevati. Storicamente signal contrarian di possibile correzione.';
  } else if (avgRate > 0.015) {
    label = 'Mercato Moderatamente Bullish';
    color = 'var(--yellow)';
    desc = 'Funding positivo: pressione rialzista presente, non ancora eccessiva.';
  } else if (avgRate < -0.01) {
    label = 'Mercato Bearish (Possibile Rimbalzo)';
    color = 'var(--green)';
    desc = 'Funding negativo: i short dominano. Può anticipare short squeeze e rimbalzi tecnici.';
  } else {
    label = 'Mercato Neutro / Bilanciato';
    color = 'var(--text-secondary)';
    desc = 'Funding vicino a zero: nessuna direzione prevalente, mercato indeciso.';
  }

  const posPct = (pos / total * 100).toFixed(1);
  const negPct = (neg / total * 100).toFixed(1);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div>
        <div class="card-title">Sentiment Derivati</div>
        <div style="font-size:15px;font-weight:700;color:${color};margin:4px 0">${label}</div>
        <div style="font-size:12px;color:var(--text-muted);max-width:480px">${desc}</div>
      </div>
      <div style="min-width:260px;flex:1;max-width:400px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">
          <span style="color:var(--green)">Short bias (${negPct}%)</span>
          <span style="color:var(--red)">Long bias (${posPct}%)</span>
        </div>
        <div style="height:14px;background:var(--bg-input);border-radius:7px;overflow:hidden;display:flex">
          <div style="width:${negPct}%;background:var(--green);opacity:0.65;border-radius:7px 0 0 7px"></div>
          <div style="width:${posPct}%;background:var(--red);opacity:0.65;border-radius:0 7px 7px 0"></div>
        </div>
      </div>
    </div>`;
}

function derivRenderFundingTable(id, contracts, tickerMap) {
  const el = document.getElementById(id);
  if (!el) return;

  const rows = contracts.map(p => {
    const rate = parseFloat(p.lastFundingRate) * 100;
    const annualized = rate * 3 * 365;
    const ticker = tickerMap[p.symbol] || {};
    const price = parseFloat(p.markPrice) || 0;
    const chg = parseFloat(ticker.priceChangePercent) || 0;
    const nextT = p.nextFundingTime
      ? new Date(parseInt(p.nextFundingTime)).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const sym = p.symbol.replace('USDT', '');
    return `<tr>
      <td style="font-weight:600;font-size:12px">${sym}</td>
      <td class="r mono ${rate > 0 ? 'negative' : 'positive'}" style="font-weight:700">${rate > 0 ? '+' : ''}${rate.toFixed(4)}%</td>
      <td class="r" style="font-size:10px;color:var(--text-muted)">${annualized > 0 ? '+' : ''}${annualized.toFixed(1)}%/yr</td>
      <td class="r mono" style="font-size:11px">${API.formatPrice(price)}</td>
      <td class="r ${API.pctClass(chg)}" style="font-size:11px">${API.formatPct(chg)}</td>
      <td class="r" style="font-size:10px;color:var(--text-muted)">${nextT}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Simbolo</th><th class="r">Funding</th><th class="r">Annualiz.</th><th class="r">Mark Price</th><th class="r">24h%</th><th class="r">Prossimo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function derivRenderVolumeTable(tickers) {
  const el = document.getElementById('deriv-vol');
  if (!el) return;

  const rows = tickers.map((t, i) => {
    const vol = parseFloat(t.quoteVolume) || 0;
    const chg = parseFloat(t.priceChangePercent) || 0;
    const price = parseFloat(t.lastPrice) || 0;
    const high = parseFloat(t.highPrice) || 0;
    const low = parseFloat(t.lowPrice) || 0;
    const count = parseInt(t.count) || 0;
    const sym = t.symbol.replace('USDT', '');
    return `<tr>
      <td class="muted mono" style="width:24px">${i + 1}</td>
      <td style="font-weight:600">${sym}</td>
      <td class="r mono">${API.formatPrice(price)}</td>
      <td class="r ${API.pctClass(chg)}">${API.formatPct(chg)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(vol)}</td>
      <td class="r" style="font-size:10px;color:var(--text-muted)">${count.toLocaleString()}</td>
      <td class="r" style="font-size:10px;color:var(--text-muted)">${API.formatPrice(low)} / ${API.formatPrice(high)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Simbolo</th><th class="r">Prezzo</th><th class="r">24h%</th><th class="r">Volume 24h</th><th class="r">N° Trade</th><th class="r">Range 24h</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
