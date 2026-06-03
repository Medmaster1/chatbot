/* ============================================================
   MARKET HEATMAP — Top 100 coins, sized by market cap, colored by % change
   ============================================================ */
let _hmCoins = [];
let _hmPeriod = '24h';
let _hmFilter = 'all';

async function render_heatmap(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Market Heatmap</div>
        <div class="page-subtitle" id="hm-info">Top 100 crypto per capitalizzazione di mercato</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="reloadHeatmap()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Ricarica
      </button>
    </div>

    <!-- Controls -->
    <div class="card mb-16">
      <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <div class="form-label mb-6">Periodo</div>
          <div class="tabs" id="hm-period-tabs" style="margin:0">
            <div class="tab" data-p="1h">1h</div>
            <div class="tab active" data-p="24h">24h</div>
            <div class="tab" data-p="7d">7d</div>
          </div>
        </div>
        <div>
          <div class="form-label mb-6">Market Cap</div>
          <div class="tabs" id="hm-filter-tabs" style="margin:0">
            <div class="tab active" data-f="all">Tutti</div>
            <div class="tab" data-f="large">Large (&gt;$10B)</div>
            <div class="tab" data-f="mid">Mid ($1B–$10B)</div>
            <div class="tab" data-f="small">Small (&lt;$1B)</div>
          </div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">
          <div style="width:14px;height:14px;background:hsl(0,80%,20%);border-radius:2px"></div>&lt;-10%
          <div style="width:14px;height:14px;background:hsl(0,60%,28%);border-radius:2px;margin-left:6px"></div>-5%
          <div style="width:14px;height:14px;background:hsl(220,15%,13%);border-radius:2px;margin-left:6px"></div>0%
          <div style="width:14px;height:14px;background:hsl(142,55%,22%);border-radius:2px;margin-left:6px"></div>+5%
          <div style="width:14px;height:14px;background:hsl(142,70%,28%);border-radius:2px;margin-left:6px"></div>&gt;+10%
        </div>
      </div>
    </div>

    <!-- Heatmap grid -->
    <div class="card" style="padding:10px">
      <div id="hm-grid" style="display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start">
        <div class="loading"><div class="spinner"></div> Caricamento…</div>
      </div>
    </div>
  `;

  document.getElementById('hm-period-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#hm-period-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _hmPeriod = tab.dataset.p;
    renderHeatmapGrid();
  });

  document.getElementById('hm-filter-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#hm-filter-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _hmFilter = tab.dataset.f;
    renderHeatmapGrid();
  });

  await loadHeatmapData();
}

window.reloadHeatmap = async () => {
  const grid = document.getElementById('hm-grid');
  if (grid) grid.innerHTML = `<div class="loading"><div class="spinner"></div> Ricaricamento…</div>`;
  await loadHeatmapData();
};

async function loadHeatmapData() {
  try {
    const [p1, p2] = await Promise.all([
      API.getMarkets(1, 50),
      API.getMarkets(2, 50),
    ]);
    _hmCoins = [...(p1 || []), ...(p2 || [])];
    const infoEl = document.getElementById('hm-info');
    if (infoEl) infoEl.textContent = `${_hmCoins.length} asset — aggiornato ${new Date().toLocaleTimeString('it-IT')}`;
    renderHeatmapGrid();
  } catch (e) {
    const grid = document.getElementById('hm-grid');
    if (grid) grid.innerHTML = `<div class="empty">Errore caricamento: ${e.message}</div>`;
  }
}

function hmChgToColor(pct) {
  const c = Math.max(-12, Math.min(12, pct));
  if (c === 0) return 'hsl(220,15%,13%)';
  if (c < 0) {
    const t = Math.abs(c) / 12;
    return `hsl(0,${Math.round(50 + t*35)}%,${Math.round(14 + t*18)}%)`;
  }
  const t = c / 12;
  return `hsl(142,${Math.round(45 + t*30)}%,${Math.round(14 + t*18)}%)`;
}

function renderHeatmapGrid() {
  const grid = document.getElementById('hm-grid');
  if (!grid || !_hmCoins.length) return;

  const periodMap = {
    '1h':  'price_change_percentage_1h_in_currency',
    '24h': 'price_change_percentage_24h',
    '7d':  'price_change_percentage_7d_in_currency',
  };
  const key = periodMap[_hmPeriod];

  let coins = [..._hmCoins];
  if (_hmFilter !== 'all') {
    coins = coins.filter(c => {
      const m = c.market_cap || 0;
      if (_hmFilter === 'large') return m >= 10e9;
      if (_hmFilter === 'mid')   return m >= 1e9 && m < 10e9;
      if (_hmFilter === 'small') return m < 1e9;
      return true;
    });
  }

  if (!coins.length) {
    grid.innerHTML = `<div class="empty" style="width:100%">Nessun asset per questo filtro</div>`;
    return;
  }

  const totalMcap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);

  grid.innerHTML = coins.map(c => {
    const chg = c[key] || 0;
    const share = totalMcap > 0 ? (c.market_cap || 0) / totalMcap * 100 : 1;
    const w = Math.max(3.2, Math.min(22, share * 2.8));
    const h = w > 12 ? 72 : w > 7 ? 56 : 44;
    const bg = hmChgToColor(chg);
    const textAlpha = Math.abs(chg) > 2 ? '1' : '0.7';
    const fontSize = w > 10 ? 12 : 10;
    const showPrice = w > 11;

    return `<div style="
        background:${bg};
        width:calc(${w}% - 3px);
        min-width:42px;
        height:${h}px;
        border-radius:5px;
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        cursor:default;overflow:hidden;
        transition:filter 0.12s;
        "
      title="${c.name}&#10;${_hmPeriod}: ${API.formatPct(chg)}&#10;Prezzo: ${API.formatPrice(c.current_price)}&#10;Market Cap: ${API.formatNum(c.market_cap)}"
      onmouseenter="this.style.filter='brightness(1.3)'"
      onmouseleave="this.style.filter=''"
    >
      <div style="font-size:${fontSize}px;font-weight:700;color:rgba(255,255,255,${textAlpha});line-height:1.2">${c.symbol.toUpperCase()}</div>
      <div style="font-size:${Math.max(9, fontSize - 1)}px;color:rgba(255,255,255,${textAlpha});margin-top:1px">${API.formatPct(chg)}</div>
      ${showPrice ? `<div style="font-size:9px;color:rgba(255,255,255,0.55);margin-top:1px">${API.formatPrice(c.current_price)}</div>` : ''}
    </div>`;
  }).join('');
}
