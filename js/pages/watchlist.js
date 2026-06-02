/* ============================================================
   WATCHLIST PAGE — Track favorite assets with live prices
   ============================================================ */
const WATCHLIST_KEY = 'terminal_watchlist_v1';

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; }
  catch { return []; }
}

function saveWatchlist(data) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data));
}

const DEFAULT_WATCHLIST = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'avalanche-2', 'chainlink', 'uniswap', 'dogecoin',
];

async function render_watchlist(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Watchlist</div>
        <div class="page-subtitle" id="wl-update-time">Assets preferiti con prezzi in tempo reale</div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="refreshWatchlist()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
          Refresh
        </button>
        <button class="btn btn-green btn-sm" onclick="showAddToWatchlist()">+ Aggiungi</button>
      </div>
    </div>

    <!-- Sort + Filter -->
    <div class="flex gap-8 mb-16" style="align-items:center">
      <span style="font-size:11px;color:var(--text-muted)">Ordina per:</span>
      <div class="tabs" id="wl-sort-tabs">
        <div class="tab active" data-sort="default">Default</div>
        <div class="tab" data-sort="price_asc">Prezzo ↑</div>
        <div class="tab" data-sort="change_desc">Variaz. ↓</div>
        <div class="tab" data-sort="mcap_desc">Mkt Cap</div>
      </div>
      <span id="wl-count" style="font-size:11px;color:var(--text-muted);margin-left:auto"></span>
    </div>

    <div id="wl-grid" class="grid-auto"></div>

    <!-- Add modal placeholder -->
    <div id="wl-add-modal-wrap"></div>
  `;

  // Init watchlist if empty
  let wl = loadWatchlist();
  if (!wl.length) {
    saveWatchlist(DEFAULT_WATCHLIST);
    wl = DEFAULT_WATCHLIST;
  }

  document.getElementById('wl-sort-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#wl-sort-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    sortAndRenderWL(tab.dataset.sort);
  });

  await refreshWatchlist();
}

let _wlCoinsCache = [];

window.refreshWatchlist = async function() {
  const wl = loadWatchlist();
  if (!wl.length) {
    document.getElementById('wl-grid').innerHTML = `<div class="empty" style="grid-column:1/-1">Nessun asset nella watchlist. Clicca "+ Aggiungi".</div>`;
    document.getElementById('wl-count').textContent = '0 assets';
    return;
  }

  const grid = document.getElementById('wl-grid');
  if (grid) grid.innerHTML = `<div style="grid-column:1/-1" class="loading"><div class="spinner"></div> Caricamento prezzi…</div>`;

  try {
    // Fetch in pages of 50 (CoinGecko limit)
    const chunks = [];
    for (let i = 0; i < wl.length; i += 50) chunks.push(wl.slice(i, i + 50));
    let coins = [];
    for (const chunk of chunks) {
      const data = await API.getMarkets(1, 250);
      const filtered = data.filter(c => chunk.includes(c.id));
      coins.push(...filtered);
    }
    // Fallback: fetch directly
    if (!coins.length) {
      coins = await API.getMarkets(1, 250);
      coins = coins.filter(c => wl.includes(c.id));
    }
    _wlCoinsCache = coins;
    const upEl = document.getElementById('wl-update-time');
    if (upEl) upEl.textContent = 'Aggiornato: ' + new Date().toLocaleTimeString('it-IT');
    sortAndRenderWL('default');
  } catch (e) {
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1" class="empty">Errore nel caricamento: ${e.message}</div>`;
  }
};

function sortAndRenderWL(sort) {
  const wl = loadWatchlist();
  let coins = [..._wlCoinsCache];

  switch (sort) {
    case 'price_asc':    coins.sort((a, b) => a.current_price - b.current_price); break;
    case 'change_desc':  coins.sort((a, b) => (b.price_change_percentage_24h||0) - (a.price_change_percentage_24h||0)); break;
    case 'mcap_desc':    coins.sort((a, b) => (b.market_cap||0) - (a.market_cap||0)); break;
    default:             coins.sort((a, b) => wl.indexOf(a.id) - wl.indexOf(b.id)); break;
  }

  const grid = document.getElementById('wl-grid');
  const countEl = document.getElementById('wl-count');
  if (!grid) return;
  if (countEl) countEl.textContent = `${wl.length} asset${wl.length !== 1 ? 's' : ''}`;

  if (!coins.length) {
    grid.innerHTML = `<div style="grid-column:1/-1" class="empty">Nessun dato trovato. I tuoi coin potrebbero non essere nella top 250 di CoinGecko.</div>`;
    return;
  }

  grid.innerHTML = coins.map(c => {
    const chg24 = c.price_change_percentage_24h || 0;
    const chg7d = c.price_change_percentage_7d_in_currency || 0;
    const chgColor = chg24 >= 0 ? 'var(--green)' : 'var(--red)';

    const sparkPoints = (c.sparkline_in_7d?.price || []).filter((_, i, a) => i % Math.floor(a.length / 28) === 0);
    const sparkSvg = buildWLSparkline(sparkPoints, 100, 36, chg7d >= 0 ? '#00e5b4' : '#ff3d6a');

    return `
      <div class="card" style="position:relative;padding:14px">
        <button onclick="removeFromWatchlist('${c.id}')"
          style="position:absolute;top:8px;right:8px;font-size:12px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:2px 5px;border-radius:3px"
          title="Rimuovi">✕</button>

        <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
          <img src="${c.image}" width="28" height="28" style="border-radius:50%;" onerror="this.style.display='none'">
          <div>
            <div style="font-family:var(--mono);font-weight:700;font-size:13px">${c.symbol.toUpperCase()}</div>
            <div style="font-size:10px;color:var(--text-muted)">#${c.market_cap_rank || '?'}</div>
          </div>
        </div>

        <div style="font-family:var(--mono);font-size:18px;font-weight:700;margin-bottom:4px">${API.formatPrice(c.current_price)}</div>

        <div style="display:flex;gap:10px;margin-bottom:10px">
          <span style="font-size:11px;font-family:var(--mono);font-weight:600;color:${chgColor}">${API.formatPct(chg24)} 24h</span>
          <span style="font-size:11px;font-family:var(--mono);color:${chg7d >= 0 ? 'var(--green)' : 'var(--red)'}">${API.formatPct(chg7d)} 7d</span>
        </div>

        <div style="margin-bottom:8px">${sparkSvg}</div>

        <div class="stat-row" style="border:none;padding:2px 0">
          <span style="font-size:10px;color:var(--text-muted)">Mkt Cap</span>
          <span style="font-size:10px;font-family:var(--mono);color:var(--text-secondary)">${API.formatNum(c.market_cap)}</span>
        </div>
        <div class="stat-row" style="border:none;padding:2px 0">
          <span style="font-size:10px;color:var(--text-muted)">Volume 24h</span>
          <span style="font-size:10px;font-family:var(--mono);color:var(--text-secondary)">${API.formatNum(c.total_volume)}</span>
        </div>
        <div class="stat-row" style="border:none;padding:2px 0">
          <span style="font-size:10px;color:var(--text-muted)">ATH</span>
          <span style="font-size:10px;font-family:var(--mono);color:var(--text-secondary)">${API.formatPrice(c.ath)}</span>
        </div>

        <button onclick="App.navigate('markets');setTimeout(()=>{const i=document.getElementById('tv-symbol-input');if(i){i.value='BINANCE:${c.symbol.toUpperCase()}USDT';loadTVChart();}},400)"
          style="margin-top:10px;width:100%;padding:5px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:11px;color:var(--text-secondary);cursor:pointer;transition:all 0.15s"
          onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
          📈 Apri Grafico
        </button>
      </div>`;
  }).join('');
}

function buildWLSparkline(prices, w, h, color) {
  if (!prices || prices.length < 2) return `<div style="height:${h}px;background:var(--bg-input);border-radius:3px"></div>`;
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">
    <defs><linearGradient id="spkgrad_${w}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

window.removeFromWatchlist = async function(id) {
  const wl = loadWatchlist().filter(x => x !== id);
  saveWatchlist(wl);
  _wlCoinsCache = _wlCoinsCache.filter(c => c.id !== id);
  sortAndRenderWL(document.querySelector('#wl-sort-tabs .tab.active')?.dataset.sort || 'default');
  const countEl = document.getElementById('wl-count');
  if (countEl) countEl.textContent = `${wl.length} assets`;
};

window.showAddToWatchlist = function() {
  const wrap = document.getElementById('wl-add-modal-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)this.innerHTML=''">
      <div class="modal">
        <div class="modal-title">Aggiungi alla Watchlist</div>

        <div class="form-group mb-12" style="gap:6px">
          <label class="form-label">Cerca coin (CoinGecko ID o nome)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="wl-search-input" placeholder="bitcoin, ethereum, solana…" style="flex:1" autofocus>
            <button class="btn btn-green btn-sm" onclick="searchCoinForWL()">Cerca</button>
          </div>
        </div>

        <div id="wl-search-results" style="max-height:260px;overflow-y:auto"></div>

        <div class="section-divider mt-12">Aggiungi rapidamente</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          ${[
            ['bitcoin','BTC'],['ethereum','ETH'],['solana','SOL'],['binancecoin','BNB'],
            ['ripple','XRP'],['cardano','ADA'],['avalanche-2','AVAX'],['dogecoin','DOGE'],
            ['chainlink','LINK'],['uniswap','UNI'],['polkadot','DOT'],['matic-network','MATIC'],
            ['sui','SUI'],['near','NEAR'],['arbitrum','ARB'],['optimism','OP'],
          ].map(([id, sym]) =>
            `<button class="btn btn-ghost btn-sm" onclick="addCoinToWatchlist('${id}','${sym}')">${sym}</button>`
          ).join('')}
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('wl-add-modal-wrap').innerHTML=''">Chiudi</button>
        </div>
      </div>
    </div>`;

  document.getElementById('wl-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchCoinForWL();
  });
};

window.searchCoinForWL = async function() {
  const q = document.getElementById('wl-search-input')?.value.trim();
  if (!q) return;
  const resultEl = document.getElementById('wl-search-results');
  if (!resultEl) return;
  resultEl.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
    const j = await r.json();
    const coins = j.coins?.slice(0, 10) || [];
    if (!coins.length) { resultEl.innerHTML = `<div class="empty" style="padding:20px">Nessun risultato</div>`; return; }
    resultEl.innerHTML = coins.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer"
           onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background=''"
           onclick="addCoinToWatchlist('${c.id}','${c.symbol.toUpperCase()}')">
        <img src="${c.thumb}" width="20" height="20" style="border-radius:50%" onerror="this.style.display='none'">
        <span style="font-family:var(--mono);font-weight:600;font-size:13px">${c.symbol.toUpperCase()}</span>
        <span style="font-size:12px;color:var(--text-secondary)">${c.name}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">#${c.market_cap_rank || '?'}</span>
      </div>`).join('');
  } catch {
    resultEl.innerHTML = `<div class="empty">Ricerca fallita</div>`;
  }
};

window.addCoinToWatchlist = async function(id, sym) {
  const wl = loadWatchlist();
  if (wl.includes(id)) {
    // Show feedback
    const btn = [...document.querySelectorAll('#wl-add-modal-wrap button')].find(b => b.textContent === sym);
    if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = sym; }, 1500); }
    return;
  }
  wl.push(id);
  saveWatchlist(wl);
  await refreshWatchlist();
  document.getElementById('wl-add-modal-wrap').innerHTML = '';
};
