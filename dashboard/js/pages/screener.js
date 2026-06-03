/* ============================================================
   SCREENER — Crypto + MSCI World Stocks + Commodities
   ============================================================ */
let _screenerCoins = [];
let _screenerFiltered = [];
let _screenerMarket = 'crypto';

const SCREENER_STOCKS = [
  // US Tech
  { sym:'AAPL',  name:'Apple',           sector:'Tech' },
  { sym:'MSFT',  name:'Microsoft',        sector:'Tech' },
  { sym:'NVDA',  name:'Nvidia',           sector:'Tech' },
  { sym:'AMZN',  name:'Amazon',           sector:'Tech' },
  { sym:'GOOGL', name:'Alphabet',         sector:'Tech' },
  { sym:'META',  name:'Meta',             sector:'Tech' },
  { sym:'TSLA',  name:'Tesla',            sector:'Auto' },
  { sym:'AVGO',  name:'Broadcom',         sector:'Tech' },
  { sym:'ORCL',  name:'Oracle',           sector:'Tech' },
  { sym:'AMD',   name:'AMD',              sector:'Tech' },
  { sym:'INTC',  name:'Intel',            sector:'Tech' },
  { sym:'QCOM',  name:'Qualcomm',         sector:'Tech' },
  { sym:'ADBE',  name:'Adobe',            sector:'Tech' },
  { sym:'CRM',   name:'Salesforce',       sector:'Tech' },
  // US Finance
  { sym:'JPM',   name:'JPMorgan Chase',   sector:'Finance' },
  { sym:'BAC',   name:'Bank of America',  sector:'Finance' },
  { sym:'GS',    name:'Goldman Sachs',    sector:'Finance' },
  { sym:'MS',    name:'Morgan Stanley',   sector:'Finance' },
  { sym:'V',     name:'Visa',             sector:'Finance' },
  { sym:'MA',    name:'Mastercard',       sector:'Finance' },
  { sym:'BRK-B', name:'Berkshire B',      sector:'Finance' },
  // US Healthcare
  { sym:'JNJ',   name:'Johnson & Johnson',sector:'Health' },
  { sym:'UNH',   name:'UnitedHealth',     sector:'Health' },
  { sym:'PFE',   name:'Pfizer',           sector:'Health' },
  { sym:'ABBV',  name:'AbbVie',           sector:'Health' },
  { sym:'LLY',   name:'Eli Lilly',        sector:'Health' },
  // US Energy & Consumer
  { sym:'XOM',   name:'ExxonMobil',       sector:'Energy' },
  { sym:'CVX',   name:'Chevron',          sector:'Energy' },
  { sym:'WMT',   name:'Walmart',          sector:'Consumer' },
  { sym:'HD',    name:'Home Depot',       sector:'Consumer' },
  { sym:'COST',  name:'Costco',           sector:'Consumer' },
  { sym:'NKE',   name:'Nike',             sector:'Consumer' },
  { sym:'MCD',   name:"McDonald's",       sector:'Consumer' },
  // European
  { sym:'ASML',  name:'ASML',             sector:'Tech' },
  { sym:'SAP',   name:'SAP',              sector:'Tech' },
  { sym:'TM',    name:'Toyota',           sector:'Auto' },
  { sym:'TSM',   name:'TSMC',             sector:'Tech' },
  { sym:'NVO',   name:'Novo Nordisk',     sector:'Health' },
  { sym:'SHEL',  name:'Shell',            sector:'Energy' },
  { sym:'RIO',   name:'Rio Tinto',        sector:'Materials' },
  { sym:'SONY',  name:'Sony',             sector:'Consumer' },
];

const SCREENER_COMMODITIES = [
  { sym:'GC=F',  name:'Gold',          sector:'Precious Metals' },
  { sym:'SI=F',  name:'Silver',        sector:'Precious Metals' },
  { sym:'PL=F',  name:'Platinum',      sector:'Precious Metals' },
  { sym:'PA=F',  name:'Palladium',     sector:'Precious Metals' },
  { sym:'CL=F',  name:'Crude Oil WTI', sector:'Energy' },
  { sym:'BZ=F',  name:'Brent Oil',     sector:'Energy' },
  { sym:'NG=F',  name:'Natural Gas',   sector:'Energy' },
  { sym:'RB=F',  name:'Gasoline',      sector:'Energy' },
  { sym:'HO=F',  name:'Heating Oil',   sector:'Energy' },
  { sym:'HG=F',  name:'Copper',        sector:'Metals' },
  { sym:'ALI=F', name:'Aluminum',      sector:'Metals' },
  { sym:'ZW=F',  name:'Wheat',         sector:'Agriculture' },
  { sym:'ZC=F',  name:'Corn',          sector:'Agriculture' },
  { sym:'ZS=F',  name:'Soybeans',      sector:'Agriculture' },
  { sym:'KC=F',  name:'Coffee',        sector:'Agriculture' },
  { sym:'SB=F',  name:'Sugar',         sector:'Agriculture' },
  { sym:'CT=F',  name:'Cotton',        sector:'Agriculture' },
  { sym:'LBS=F', name:'Lumber',        sector:'Agriculture' },
];

async function render_screener(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Market Screener</div>
        <div class="page-subtitle" id="scr-info">Filtra asset con dati live</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="reloadScreener()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Ricarica
      </button>
    </div>

    <!-- MARKET TABS -->
    <div class="card mb-16">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <span class="form-label" style="margin:0">Mercato:</span>
        <div class="tabs" id="scr-market-tabs" style="margin:0">
          <div class="tab active" data-mkt="crypto">Crypto</div>
          <div class="tab" data-mkt="stocks">MSCI World Stocks</div>
          <div class="tab" data-mkt="commodities">Materie Prime</div>
        </div>
      </div>

      <!-- FILTER PANEL -->
      <div class="card-title mb-12" style="font-size:12px">🔍 Filtri</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">

        <div class="form-group" id="scr-mcap-group">
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
            <option value="pump">Forte Rialzo (&gt;+5%)</option>
            <option value="up">Rialzo (0% → +5%)</option>
            <option value="down">Ribasso (-5% → 0%)</option>
            <option value="dump">Forte Ribasso (&lt;-5%)</option>
          </select>
        </div>

        <div class="form-group" id="scr-chg7-group">
          <label class="form-label">Variazione 7d</label>
          <select id="scr-chg7" onchange="applyFilters()">
            <option value="all">Tutti</option>
            <option value="up">Positiva</option>
            <option value="down">Negativa</option>
          </select>
        </div>

        <div class="form-group" id="scr-sector-group" style="display:none">
          <label class="form-label">Settore</label>
          <select id="scr-sector" onchange="applyFilters()">
            <option value="all">Tutti</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Cerca</label>
          <input type="text" id="scr-search" placeholder="AAPL, Gold…" oninput="applyFilters()" style="width:100%">
        </div>

        <div class="form-group">
          <label class="form-label">Ordina per</label>
          <select id="scr-sort" onchange="applyFilters()">
            <option value="chg24_desc">24h % ↓ (Pump)</option>
            <option value="chg24_asc">24h % ↑ (Dump)</option>
            <option value="mcap">Market Cap ↓</option>
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

  document.getElementById('scr-market-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#scr-market-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _screenerMarket = tab.dataset.mkt;
    _screenerCoins = [];
    _screenerFiltered = [];
    updateScreenerUI();
    loadScreenerData();
  });

  await loadScreenerData();
}

function updateScreenerUI() {
  const isCrypto = _screenerMarket === 'crypto';
  const isStocks = _screenerMarket === 'stocks';
  const isCommod = _screenerMarket === 'commodities';

  const mcapGroup = document.getElementById('scr-mcap-group');
  const chg7Group = document.getElementById('scr-chg7-group');
  const sectorGroup = document.getElementById('scr-sector-group');
  const sortEl = document.getElementById('scr-sort');

  if (mcapGroup) mcapGroup.style.display = isCrypto ? '' : 'none';
  if (chg7Group) chg7Group.style.display = isCrypto ? '' : 'none';
  if (sectorGroup) sectorGroup.style.display = (isStocks || isCommod) ? '' : 'none';

  if (sectorGroup && sortEl) {
    const sectors = isStocks
      ? ['Tech','Finance','Health','Energy','Consumer','Auto','Materials']
      : isCommod
        ? ['Precious Metals','Energy','Metals','Agriculture']
        : [];
    const sel = document.getElementById('scr-sector');
    if (sel) {
      sel.innerHTML = `<option value="all">Tutti</option>` +
        sectors.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }

  if (sortEl) {
    if (isCrypto) {
      sortEl.innerHTML = `
        <option value="mcap">Market Cap ↓</option>
        <option value="chg24_desc">24h % ↓ (Pump)</option>
        <option value="chg24_asc">24h % ↑ (Dump)</option>
        <option value="chg7_desc">7d % ↓</option>
        <option value="vol_desc">Volume ↓</option>
        <option value="price_desc">Prezzo ↓</option>`;
    } else {
      sortEl.innerHTML = `
        <option value="chg24_desc">24h % ↓ (Pump)</option>
        <option value="chg24_asc">24h % ↑ (Dump)</option>
        <option value="price_desc">Prezzo ↓</option>`;
    }
  }
}

window.reloadScreener = async () => {
  document.getElementById('scr-table-wrap').innerHTML = `<div class="loading"><div class="spinner"></div> Ricaricamento…</div>`;
  _screenerCoins = [];
  await loadScreenerData();
};

async function loadScreenerData() {
  const wrap = document.getElementById('scr-table-wrap');
  const infoEl = document.getElementById('scr-info');
  try {
    if (_screenerMarket === 'crypto') {
      const [page1, page2] = await Promise.all([API.getMarkets(1, 125), API.getMarkets(2, 125)]);
      _screenerCoins = [...(page1 || []), ...(page2 || [])].map(c => ({
        _type: 'crypto',
        id: c.id,
        sym: c.symbol.toUpperCase(),
        name: c.name,
        image: c.image,
        price: c.current_price,
        chg24: c.price_change_percentage_24h || 0,
        chg7: c.price_change_percentage_7d_in_currency || 0,
        chg1h: c.price_change_percentage_1h_in_currency || 0,
        mcap: c.market_cap || 0,
        volume: c.total_volume || 0,
        rank: c.market_cap_rank,
        sparkline: c.sparkline_in_7d?.price || [],
        sector: null,
      }));
      if (infoEl) infoEl.textContent = `${_screenerCoins.length} crypto — aggiornato ${new Date().toLocaleTimeString('it-IT')}`;
    } else {
      const list = _screenerMarket === 'stocks' ? SCREENER_STOCKS : SCREENER_COMMODITIES;
      const syms = list.map(s => s.sym);
      const quotes = await API.getYahooBatchQuote(syms);
      const qMap = {};
      quotes.forEach(q => { qMap[q.symbol] = q; });
      _screenerCoins = list.map(item => {
        const q = qMap[item.sym] || {};
        return {
          _type: _screenerMarket,
          id: item.sym,
          sym: item.sym,
          name: item.name,
          price: q.regularMarketPrice || null,
          chg24: q.regularMarketChangePercent || 0,
          chg7: null,
          chg1h: null,
          mcap: q.marketCap || null,
          volume: q.regularMarketVolume || null,
          rank: null,
          sparkline: [],
          sector: item.sector,
          high52: q.fiftyTwoWeekHigh || null,
          low52: q.fiftyTwoWeekLow || null,
          pe: q.trailingPE || null,
        };
      }).filter(c => c.price !== null);
      if (infoEl) infoEl.textContent = `${_screenerCoins.length} asset — aggiornato ${new Date().toLocaleTimeString('it-IT')}`;
    }
    updateScreenerUI();
    applyFilters();
  } catch (e) {
    if (wrap) wrap.innerHTML = `<div class="empty">Errore: ${e.message}</div>`;
  }
}

window.applyFilters = function() {
  const mcap   = document.getElementById('scr-mcap')?.value  || 'all';
  const chg24  = document.getElementById('scr-chg24')?.value || 'all';
  const chg7   = document.getElementById('scr-chg7')?.value  || 'all';
  const sector = document.getElementById('scr-sector')?.value || 'all';
  const search = (document.getElementById('scr-search')?.value || '').toLowerCase();
  const sort   = document.getElementById('scr-sort')?.value  || 'chg24_desc';

  let coins = [..._screenerCoins];

  // Market cap (crypto only)
  if (mcap !== 'all' && _screenerMarket === 'crypto') {
    coins = coins.filter(c => {
      const m = c.mcap || 0;
      if (mcap === 'large')  return m >= 10e9;
      if (mcap === 'mid')    return m >= 1e9 && m < 10e9;
      if (mcap === 'small')  return m >= 100e6 && m < 1e9;
      if (mcap === 'micro')  return m < 100e6;
      return true;
    });
  }

  // 24h change (threshold 5% for stocks/commodities, 10% for crypto)
  const threshold = _screenerMarket === 'crypto' ? 10 : 5;
  if (chg24 !== 'all') {
    coins = coins.filter(c => {
      const v = c.chg24 || 0;
      if (chg24 === 'pump') return v > threshold;
      if (chg24 === 'up')   return v >= 0 && v <= threshold;
      if (chg24 === 'down') return v < 0 && v >= -threshold;
      if (chg24 === 'dump') return v < -threshold;
      return true;
    });
  }

  // 7d change (crypto only)
  if (chg7 !== 'all' && _screenerMarket === 'crypto') {
    coins = coins.filter(c => chg7 === 'up' ? (c.chg7 || 0) >= 0 : (c.chg7 || 0) < 0);
  }

  // Sector (stocks / commodities)
  if (sector !== 'all') {
    coins = coins.filter(c => c.sector === sector);
  }

  // Search
  if (search) {
    coins = coins.filter(c =>
      c.name.toLowerCase().includes(search) || c.sym.toLowerCase().includes(search)
    );
  }

  // Sort
  const sorts = {
    mcap:       (a, b) => (b.mcap || 0) - (a.mcap || 0),
    chg24_desc: (a, b) => (b.chg24 || 0) - (a.chg24 || 0),
    chg24_asc:  (a, b) => (a.chg24 || 0) - (b.chg24 || 0),
    chg7_desc:  (a, b) => (b.chg7 || 0) - (a.chg7 || 0),
    vol_desc:   (a, b) => (b.volume || 0) - (a.volume || 0),
    price_desc: (a, b) => (b.price || 0) - (a.price || 0),
  };
  coins.sort(sorts[sort] || sorts.chg24_desc);

  _screenerFiltered = coins;
  const countEl = document.getElementById('scr-count');
  if (countEl) countEl.textContent = `${coins.length} risultati su ${_screenerCoins.length}`;
  renderScreenerTable(coins);
};

window.resetFilters = function() {
  ['scr-mcap','scr-chg24','scr-chg7','scr-sector','scr-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'scr-sort') el.value = _screenerMarket === 'crypto' ? 'mcap' : 'chg24_desc';
      else el.value = 'all';
    }
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

  if (_screenerMarket === 'crypto') {
    const rows = coins.slice(0, 150).map(c => {
      const volRatio = c.volume && c.mcap ? (c.volume / c.mcap * 100) : 0;
      const spkPts = (c.sparkline || []).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 20)) === 0);
      const spk = buildScrSparkline(spkPts, 60, 20, (c.chg7 || 0) >= 0 ? '#00e5b4' : '#ff3d6a');
      return `<tr>
        <td class="muted mono" style="width:30px">${c.rank || '—'}</td>
        <td>
          <div class="coin-cell">
            <img class="coin-img" src="${c.image || ''}" onerror="this.style.display='none'">
            <div><div class="coin-sym">${c.sym}</div><div class="coin-name">${c.name}</div></div>
          </div>
        </td>
        <td class="r mono">${API.formatPrice(c.price)}</td>
        <td class="r ${API.pctClass(c.chg1h)}">${API.formatPct(c.chg1h)}</td>
        <td class="r ${API.pctClass(c.chg24)}">${API.formatPct(c.chg24)}</td>
        <td class="r ${API.pctClass(c.chg7)}">${API.formatPct(c.chg7)}</td>
        <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.mcap)}</td>
        <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.volume)}</td>
        <td class="r" style="font-size:11px;color:${volRatio > 50 ? 'var(--yellow)' : 'var(--text-muted)'}">${volRatio.toFixed(1)}%</td>
        <td class="r">${spk}</td>
        <td class="c">
          <button class="btn btn-ghost btn-sm" title="Aggiungi a Watchlist"
            onclick="event.stopPropagation();addToWatchlistFromScreener('${c.id}','${c.sym}',this)">☆</button>
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
      ${coins.length > 150 ? `<p style="text-align:center;font-size:11px;color:var(--text-muted);padding:10px">Mostrando i primi 150 su ${coins.length}</p>` : ''}`;
    return;
  }

  // Stocks / Commodities table
  const rows = coins.map(c => {
    const chgColor = (c.chg24 || 0) >= 0 ? 'var(--green)' : 'var(--red)';
    const pricePct = c.high52 && c.low52
      ? ((c.price - c.low52) / (c.high52 - c.low52) * 100).toFixed(0)
      : null;
    return `<tr>
      <td>
        <div class="coin-cell">
          <div class="coin-sym">${c.sym}</div>
          <div class="coin-name">${c.name}</div>
        </div>
      </td>
      ${c.sector ? `<td style="font-size:10px;color:var(--text-muted)">${c.sector}</td>` : ''}
      <td class="r mono" style="font-weight:600">${API.formatPrice(c.price)}</td>
      <td class="r ${API.pctClass(c.chg24)}">${API.formatPct(c.chg24)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${c.mcap ? API.formatNum(c.mcap) : '—'}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${c.volume ? API.formatNum(c.volume) : '—'}</td>
      ${_screenerMarket === 'stocks' ? `<td class="r" style="font-size:11px;color:var(--text-muted)">${c.pe ? c.pe.toFixed(1) : '—'}</td>` : ''}
      <td class="r">
        ${pricePct !== null ? `
          <div style="display:flex;align-items:center;gap:4px">
            <div style="flex:1;background:var(--bg-input);border-radius:2px;height:4px;min-width:50px">
              <div style="width:${pricePct}%;background:${chgColor};height:4px;border-radius:2px"></div>
            </div>
            <span style="font-size:9px;color:var(--text-muted);min-width:24px">${pricePct}%</span>
          </div>` : '—'}
      </td>
    </tr>`;
  }).join('');

  const hasSector = coins.some(c => c.sector);
  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Asset</th>
          ${hasSector ? '<th>Settore</th>' : ''}
          <th class="r">Prezzo</th>
          <th class="r">24h %</th>
          <th class="r">Mkt Cap</th>
          <th class="r">Volume</th>
          ${_screenerMarket === 'stocks' ? '<th class="r">P/E</th>' : ''}
          <th class="r">52W Range</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
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
  const header = _screenerMarket === 'crypto'
    ? 'Rank,Symbol,Name,Price,1h%,24h%,7d%,MarketCap,Volume24h\n'
    : 'Symbol,Name,Sector,Price,24h%,MarketCap,Volume\n';
  const rows = coins.map(c => _screenerMarket === 'crypto'
    ? `${c.rank||''},${c.sym},${c.name},${c.price||''},${(c.chg1h||0).toFixed(2)},${(c.chg24||0).toFixed(2)},${(c.chg7||0).toFixed(2)},${c.mcap||''},${c.volume||''}`
    : `${c.sym},${c.name},${c.sector||''},${c.price||''},${(c.chg24||0).toFixed(2)},${c.mcap||''},${c.volume||''}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `screener_${_screenerMarket}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
