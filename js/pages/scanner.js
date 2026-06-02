/* ============================================================
   OVERBOUGHT / OVERSOLD SCANNER
   ============================================================ */
const SCANNER_COINS = [
  { id: 'bitcoin',       sym: 'BTC',  name: 'Bitcoin' },
  { id: 'ethereum',      sym: 'ETH',  name: 'Ethereum' },
  { id: 'solana',        sym: 'SOL',  name: 'Solana' },
  { id: 'binancecoin',   sym: 'BNB',  name: 'Binance Coin' },
  { id: 'ripple',        sym: 'XRP',  name: 'Ripple' },
  { id: 'cardano',       sym: 'ADA',  name: 'Cardano' },
  { id: 'avalanche-2',   sym: 'AVAX', name: 'Avalanche' },
  { id: 'dogecoin',      sym: 'DOGE', name: 'Dogecoin' },
  { id: 'polkadot',      sym: 'DOT',  name: 'Polkadot' },
  { id: 'chainlink',     sym: 'LINK', name: 'Chainlink' },
  { id: 'matic-network', sym: 'MATIC',name: 'Polygon' },
  { id: 'uniswap',       sym: 'UNI',  name: 'Uniswap' },
];

async function render_scanner(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">Overbought &amp; Oversold Scanner</div>
        <div class="page-subtitle">RSI(14) and Stochastic(14,3,3) across major crypto assets</div>
      </div>
      <button class="btn btn-green" onclick="refreshScanner()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Refresh
      </button>
    </div>

    <div class="grid-4 mb-16" id="scan-summary"></div>

    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title">RSI / Stochastic Scanner</div>
        <div class="flex gap-8">
          <div class="tabs" id="scan-period-tabs">
            <div class="tab active" data-period="30">30D</div>
            <div class="tab" data-period="14">14D</div>
            <div class="tab" data-period="90">90D</div>
          </div>
        </div>
      </div>
      <div id="scanner-table-wrap"><div class="loading"><div class="spinner"></div> Calculating RSI for ${SCANNER_COINS.length} assets…</div></div>
    </div>

    <div class="card">
      <div class="card-title mb-12">RSI Interpretation Guide</div>
      <div class="grid-2">
        <div>
          ${[
            ['> 80', 'Extreme Overbought', 'red', 'Strong sell signal. Price likely to reverse.'],
            ['70–80', 'Overbought', 'yellow', 'Consider reducing positions.'],
            ['50–70', 'Bullish Momentum', 'green', 'Trend is up, no action needed.'],
            ['30–50', 'Bearish Momentum', 'blue', 'Trend is down, caution advised.'],
            ['20–30', 'Oversold', 'yellow', 'Consider accumulating positions.'],
            ['< 20', 'Extreme Oversold', 'green', 'Strong buy signal. Price likely to bounce.'],
          ].map(([range, label, color, desc]) => `
            <div class="stat-row">
              <span class="stat-label">
                <span class="badge badge-${color === 'red' ? 'red' : color === 'yellow' ? 'yellow' : color === 'green' ? 'green' : 'blue'}" style="min-width:52px;text-align:center">${range}</span>
                <span style="margin-left:8px;font-size:12px;color:var(--text-primary)">${label}</span>
              </span>
              <span style="font-size:11px;color:var(--text-muted);max-width:200px;text-align:right">${desc}</span>
            </div>`).join('')}
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">
            <p style="margin-bottom:8px"><strong style="color:var(--text-primary)">RSI (Relative Strength Index)</strong> misura la velocità e la grandezza dei movimenti di prezzo recenti per valutare le condizioni di ipercomprato o ipervenduto su una scala da 0 a 100.</p>
            <p style="margin-bottom:8px"><strong style="color:var(--text-primary)">Stochastic</strong> confronta il prezzo di chiusura con il range di prezzo in un periodo definito. Valori &gt;80 = overbought, &lt;20 = oversold.</p>
            <p style="color:var(--text-muted);font-size:11px">⚠️ Questi indicatori non sono segnali di trading. Usali come riferimento insieme ad altre analisi.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('scan-period-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#scan-period-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadScannerData(parseInt(tab.dataset.period));
  });

  await loadScannerData(30);
}

window.refreshScanner = async () => {
  const active = document.querySelector('#scan-period-tabs .tab.active');
  await loadScannerData(active ? parseInt(active.dataset.period) : 30);
};

async function loadScannerData(days) {
  const wrap = document.getElementById('scanner-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="loading"><div class="spinner"></div> Fetching OHLC data…</div>`;

  const results = [];
  for (const coin of SCANNER_COINS) {
    try {
      const ohlc = await API.getCoinOHLC(coin.id, days);
      if (!ohlc || ohlc.length < 15) { results.push({ ...coin, rsi: null, stochK: null, stochD: null }); continue; }
      const closes = ohlc.map(c => c[4]);
      const rsi = API.calculateRSI(closes, 14);
      const stoch = API.calculateStochastic(ohlc, 14);
      const stochK = stoch.k[stoch.k.length - 1] ?? null;
      const stochD = stoch.d[stoch.d.length - 1] ?? null;
      results.push({ ...coin, rsi, stochK, stochD, ohlc });
    } catch {
      results.push({ ...coin, rsi: null, stochK: null, stochD: null });
    }
  }

  renderScannerSummary(results);
  renderScannerTable(results);
}

function rsiStatus(rsi) {
  if (rsi === null) return { label: 'N/A', color: 'var(--text-muted)', bg: 'var(--bg-input)' };
  if (rsi > 80) return { label: 'Extreme OB', color: '#ff1a44', bg: 'rgba(255,26,68,0.15)' };
  if (rsi > 70) return { label: 'Overbought', color: 'var(--yellow)', bg: 'var(--yellow-dim)' };
  if (rsi > 50) return { label: 'Bullish', color: 'var(--green)', bg: 'var(--green-dim)' };
  if (rsi > 30) return { label: 'Bearish', color: 'var(--blue)', bg: 'var(--blue-dim)' };
  if (rsi > 20) return { label: 'Oversold', color: 'var(--orange)', bg: 'rgba(251,146,60,0.15)' };
  return { label: 'Extreme OS', color: '#00e5b4', bg: 'rgba(0,229,180,0.15)' };
}

function renderScannerSummary(results) {
  const valid = results.filter(r => r.rsi !== null);
  const ob = valid.filter(r => r.rsi > 70).length;
  const os = valid.filter(r => r.rsi < 30).length;
  const neutral = valid.length - ob - os;
  const avgRsi = valid.length ? (valid.reduce((s, r) => s + r.rsi, 0) / valid.length) : 0;

  const summaryEl = document.getElementById('scan-summary');
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Overbought (RSI &gt;70)</div>
      <div class="card-value" style="color:var(--yellow)">${ob}</div>
      <div class="card-change neutral">of ${valid.length} assets</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Oversold (RSI &lt;30)</div>
      <div class="card-value" style="color:var(--green)">${os}</div>
      <div class="card-change neutral">of ${valid.length} assets</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Neutral Zone</div>
      <div class="card-value" style="color:var(--blue)">${neutral}</div>
      <div class="card-change neutral">RSI 30–70</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Avg RSI</div>
      <div class="card-value" style="color:${API.fgColor(avgRsi)}">${avgRsi.toFixed(1)}</div>
      <div class="card-change neutral">${API.fgLabel(avgRsi).text}</div>
    </div>`;
}

function renderScannerTable(results) {
  const wrap = document.getElementById('scanner-table-wrap');
  if (!wrap) return;

  const rows = results.map(r => {
    const rsiSt = rsiStatus(r.rsi);
    const rsiPct = r.rsi !== null ? Math.min(r.rsi, 100) : 0;
    const rsiColor = r.rsi !== null ? (r.rsi > 70 ? 'var(--yellow)' : r.rsi < 30 ? '#00e5b4' : 'var(--blue)') : 'var(--text-muted)';

    const stochKVal = r.stochK !== null ? r.stochK.toFixed(1) : '—';
    const stochDVal = r.stochD !== null ? r.stochD.toFixed(1) : '—';
    const stochColor = r.stochK !== null ? (r.stochK > 80 ? 'var(--yellow)' : r.stochK < 20 ? 'var(--green)' : 'var(--text-secondary)') : 'var(--text-muted)';

    return `<tr>
      <td>
        <div class="coin-cell">
          <div class="coin-sym">${r.sym}</div>
          <div class="coin-name">${r.name}</div>
        </div>
      </td>
      <td>
        <div class="rsi-wrap">
          <div class="rsi-track">
            <div class="rsi-fill" style="width:${rsiPct}%;background:${rsiColor}"></div>
          </div>
          <span class="rsi-num" style="color:${rsiColor}">${r.rsi !== null ? r.rsi.toFixed(1) : '—'}</span>
        </div>
      </td>
      <td>
        <span class="badge" style="background:${rsiSt.bg};color:${rsiSt.color}">${rsiSt.label}</span>
      </td>
      <td class="r mono" style="color:${stochColor}">${stochKVal}</td>
      <td class="r mono" style="color:var(--text-secondary)">${stochDVal}</td>
      <td class="r">
        ${r.stochK !== null ? (r.stochK > 80 ? '<span class="badge badge-yellow">OB</span>' : r.stochK < 20 ? '<span class="badge badge-green">OS</span>' : '<span class="badge badge-muted">—</span>') : '<span class="badge badge-muted">N/A</span>'}
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Asset</th>
          <th>RSI(14)</th>
          <th>Signal</th>
          <th class="r">Stoch %K</th>
          <th class="r">Stoch %D</th>
          <th class="r">Stoch Signal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
