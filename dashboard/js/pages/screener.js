/* ============================================================
   CRYPTO SCREENER — Filter top 250 assets with live data
   ============================================================ */
let _screenerCoins = [];
let _screenerFiltered = [];

async function render_screener(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Crypto Screener</div>
        <div class="page-subtitle" id="scr-info">Filtra top 250 crypto con dati live CoinGecko</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="reloadScreener()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Ricarica
      </button>
    </div>

    <!-- FILTER PANEL -->
    <div class="card mb-16">
      <div class="card-title mb-12">🔍 Filtri</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">

        <div class="form-group">
          <label class="form-label">Market Cap</label>
          <select id="scr-mcap" onchange="applyFilters()">
            <option value="all">Tutti</option>
            <option value="large">Large (&gt;$10B)</option>
            <option value="mid">Mid ($1B–$10B)</option>
            <option value="small">Small ($100M–$1B)</option>
            <option value="micro">Micro (&lt;$100M)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Variazione 24h</label>
          <select id="scr-chg24" onchange="applyFilters()">
            <option value="all">Tutti</option>
            <option value="pump">Forte Rialzo (&gt;+10%)</option>
            <option value="up">Rialzo (0% → +10%)</option>
            <option value="down">Ribasso (-10% → 0%)</option>
            <option value="dump">Forte Ribasso (&lt;-10%)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Variazione 7d</label>
          <select id="scr-chg7" onchange="applyFilters()">
            <option value="all">Tutti</option>
            <option value="up">Positiva</option>
            <option value="down">Negativa</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Volume 24h</label>
          <select id="scr-vol" onchange="applyFilters()">
            <option value="all">Tutti</option>
            <option value="high">&gt;$500M</option>
            <option value="med">$50M–$500M</option>
            <option value="low">$1M–$50M</option>
            <option value="micro">&lt;$1M</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Cerca per nome/ticker</label>
          <input type="text" id="scr-search" placeholder="BTC, Ethereum…" oninput="applyFilters()" style="width:100%">
        </div>

        <div class="form-group">
          <label class="form-label">Ordina per</label>
          <select id="scr-sort" onchange="applyFilters()">
            <option value="mcap">Market Cap ↓</option>
            <option value="chg24_desc">24h % ↓ (Pump)</option>
            <option value="chg24_asc">24h % ↑ (Dump)</option>
            <option value="chg7_desc">7d % ↓</option>
            <option value="vol_desc">Volume ↓</option>
            <option value="price_desc">Prezzo ↓</option>
          </select>
        </div>

      </div>

      <div style="display:flex;align-items:center;gap:12px;margin-top:12px">
        <button class="btn btn-ghost btn-sm" onclick="resetFilters()">↺ Reset</button>
        <span id="scr-count" style="font-size:12px;color:var(--text-muted)"></span>
        <button class="btn btn-green btn-sm" style="margin-left:auto" onclick="exportScreener()">⬇ CSV</button>
      </div>
    </div>

    <!-- RESULTS TABLE -->
    <div class="card">
      <div id="scr-table-wrap">
        <div class="loading"><div class="spinner"></div> Caricamento dati…</div>
      </div>
    </div>
  `;

  await loadScreenerData();
}

window.reloadScreener = async () => {
  document.getElementById('scr-table-wrap').innerHTML = `<div class="loading"><div class="spinner"></div> Ricaricamento…</div>`;
  await loadScreenerData();
};

async function loadScreenerData() {
  try {
    // Fetch top 250 in two pages
    const [page1, page2] = await Promise.all([
      API.getMarkets(1, 125),
      API.getMarkets(2, 125),
    ]);
    _screenerCoins = [...(page1 || []), ...(page2 || [])];
    const infoEl = document.getElementById('scr-info');
    if (infoEl) infoEl.textContent = `${_screenerCoins.length} asset caricati — aggiornato ${new Date().toLocaleTimeString('it-IT')}`;
    applyFilters();
  } catch (e) {
    document.getElementById('scr-table-wrap').innerHTML = `<div class="empty">Errore: ${e.message}</div>`;
  }
}

window.applyFilters = function() {
  const mcap   = document.getElementById('scr-mcap')?.value  || 'all';
  const chg24  = document.getElementById('scr-chg24')?.value || 'all';
  const chg7   = document.getElementById('scr-chg7')?.value  || 'all';
  const vol    = document.getElementById('scr-vol')?.value   || 'all';
  const search = (document.getElementById('scr-search')?.value || '').toLowerCase();
  const sort   = document.getElementById('scr-sort')?.value  || 'mcap';

  let coins = [..._screenerCoins];

  // Market cap
  if (mcap !== 'all') coins = coins.filter(c => {
    const m = c.market_cap || 0;
    if (mcap === 'large')  return m >= 10e9;
    if (mcap === 'mid')    return m >= 1e9 && m < 10e9;
    if (mcap === 'small')  return m >= 100e6 && m < 1e9;
    if (mcap === 'micro')  return m < 100e6;
  });

  // 24h change
  if (chg24 !== 'all') coins = coins.filter(c => {
    const v = c.price_change_percentage_24h || 0;
    if (chg24 === 'pump') return v > 10;
    if (chg24 === 'up')   return v >= 0 && v <= 10;
    if (chg24 === 'down') return v < 0 && v >= -10;
    if (chg24 === 'dump') return v < -10;
  });

  // 7d change
  if (chg7 !== 'all') coins = coins.filter(c => {
    const v = c.price_change_percentage_7d_in_currency || 0;
    return chg7 === 'up' ? v >= 0 : v < 0;
  });

  // Volume
  if (vol !== 'all') coins = coins.filter(c => {
    const v = c.total_volume || 0;
    if (vol === 'high')  return v >= 500e6;
    if (vol === 'med')   return v >= 50e6 && v < 500e6;
    if (vol === 'low')   return v >= 1e6 && v < 50e6;
    if (vol === 'micro') return v < 1e6;
  });

  // Search
  if (search) coins = coins.filter(c =>
    c.name.toLowerCase().includes(search) || c.symbol.toLowerCase().includes(search)
  );

  // Sort
  const sorts = {
    mcap:      (a, b) => (b.market_cap || 0) - (a.market_cap || 0),
    chg24_desc:(a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0),
    chg24_asc: (a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0),
    chg7_desc: (a, b) => (b.price_change_percentage_7d_in_currency || 0) - (a.price_change_percentage_7d_in_currency || 0),
    vol_desc:  (a, b) => (b.total_volume || 0) - (a.total_volume || 0),
    price_desc:(a, b) => (b.current_price || 0) - (a.current_price || 0),
  };
  coins.sort(sorts[sort] || sorts.mcap);

  _screenerFiltered = coins;
  const countEl = document.getElementById('scr-count');
  if (countEl) countEl.textContent = `${coins.length} risultati su ${_screenerCoins.length}`;
  renderScreenerTable(coins);
};

window.resetFilters = function() {
  ['scr-mcap','scr-chg24','scr-chg7','scr-vol','scr-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'scr-sort' ? 'mcap' : 'all';
  });
  const search = document.getElementById('scr-search');
  if (search) search.value = '';
  applyFilters();
};

function renderScreenerTable(coins) {
  const wrap = document.getElementById('scr-table-wrap');
  if (!wrap) return;

  if (!coins.length) {
    wrap.innerHTML = `<div class="empty">Nessun asset corrisponde ai filtri</div>`;
    return;
  }

  const rows = coins.slice(0, 150).map(c => {
    const chg24  = c.price_change_percentage_24h || 0;
    const chg7d  = c.price_change_percentage_7d_in_currency || 0;
    const chg1h  = c.price_change_percentage_1h_in_currency || 0;
    const volRatio = c.total_volume && c.market_cap ? (c.total_volume / c.market_cap * 100) : 0;

    const spkPts = (c.sparkline_in_7d?.price || []).filter((_, i, a) => i % Math.floor(a.length / 20) === 0);
    const spk = buildScrSparkline(spkPts, 60, 20, chg7d >= 0 ? '#00e5b4' : '#ff3d6a');

    return `<tr>
      <td class="muted mono" style="width:30px">${c.market_cap_rank}</td>
      <td>
        <div class="coin-cell">
          <img class="coin-img" src="${c.image}" onerror="this.style.display='none'">
          <div>
            <div class="coin-sym">${c.symbol.toUpperCase()}</div>
            <div class="coin-name">${c.name}</div>
          </div>
        </div>
      </td>
      <td class="r mono">${API.formatPrice(c.current_price)}</td>
      <td class="r ${API.pctClass(chg1h)}">${API.formatPct(chg1h)}</td>
      <td class="r ${API.pctClass(chg24)}">${API.formatPct(chg24)}</td>
      <td class="r ${API.pctClass(chg7d)}">${API.formatPct(chg7d)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.market_cap)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.total_volume)}</td>
      <td class="r" style="font-size:11px;color:${volRatio > 50 ? 'var(--yellow)' : 'var(--text-muted)'}">${volRatio.toFixed(1)}%</td>
      <td class="r">${spk}</td>
      <td class="c">
        <button class="btn btn-ghost btn-sm" title="Aggiungi a Watchlist"
          onclick="event.stopPropagation();addToWatchlistFromScreener('${c.id}','${c.symbol.toUpperCase()}',this)">☆</button>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>Asset</th>
          <th class="r">Prezzo</th>
          <th class="r">1h %</th><th class="r">24h %</th><th class="r">7d %</th>
          <th class="r">Mkt Cap</th><th class="r">Volume 24h</th>
          <th class="r" title="Volume/Market Cap Ratio">V/MC</th>
          <th class="r">7d</th><th class="c">WL</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${coins.length > 150 ? `<p style="text-align:center;font-size:11px;color:var(--text-muted);padding:10px">Mostrando i primi 150 risultati su ${coins.length}</p>` : ''}`;
}

function buildScrSparkline(prices, w, h, color) {
  if (!prices || prices.length < 2) return '';
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="vertical-align:middle">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

window.addToWatchlistFromScreener = function(id, sym, btn) {
  const wl = JSON.parse(localStorage.getItem('terminal_watchlist_v1') || '[]');
  if (wl.includes(id)) { btn.textContent = '✓'; btn.style.color = 'var(--green)'; return; }
  wl.push(id);
  localStorage.setItem('terminal_watchlist_v1', JSON.stringify(wl));
  btn.textContent = '★';
  btn.style.color = 'var(--yellow)';
};

window.exportScreener = function() {
  const coins = _screenerFiltered;
  if (!coins.length) return;
  const header = 'Rank,Symbol,Name,Price,1h%,24h%,7d%,MarketCap,Volume24h\n';
  const rows = coins.map(c =>
    `${c.market_cap_rank},${c.symbol.toUpperCase()},${c.name},${c.current_price || ''},${(c.price_change_percentage_1h_in_currency||0).toFixed(2)},${(c.price_change_percentage_24h||0).toFixed(2)},${(c.price_change_percentage_7d_in_currency||0).toFixed(2)},${c.market_cap||''},${c.total_volume||''}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `screener_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
