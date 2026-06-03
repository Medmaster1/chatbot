/* ============================================================
   NEWS PAGE
   ============================================================ */
const NEWS_CATEGORIES = [
  { id: '',           label: 'All' },
  { id: 'BTC',        label: 'Bitcoin' },
  { id: 'ETH',        label: 'Ethereum' },
  { id: 'Trading',    label: 'Trading' },
  { id: 'Technology', label: 'Technology' },
  { id: 'Regulation', label: 'Regulation' },
  { id: 'Macro',      label: 'Macro' },
  { id: 'NFT',        label: 'NFT' },
  { id: 'Mining',     label: 'Mining' },
];

async function render_news(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">News</div>
        <div class="page-subtitle">Latest crypto &amp; financial news from CryptoCompare</div>
      </div>
      <button class="btn btn-green btn-sm" onclick="refreshNews()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Refresh
      </button>
    </div>

    <div class="tabs mb-16" id="news-cat-tabs">
      ${NEWS_CATEGORIES.map((c, i) => `<div class="tab ${i===0?'active':''}" data-cat="${c.id}">${c.label}</div>`).join('')}
    </div>

    <div class="grid-2" style="gap:20px">
      <div>
        <div class="section-divider">Latest Articles</div>
        <div id="news-main-list"></div>
      </div>
      <div>
        <div class="section-divider">Market Pulse</div>
        <div id="news-side-panel"></div>
      </div>
    </div>
  `;

  document.getElementById('news-cat-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#news-cat-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadNews(tab.dataset.cat);
  });

  await Promise.all([loadNews(''), loadNewsSidePanel()]);
}

window.refreshNews = async () => {
  const active = document.querySelector('#news-cat-tabs .tab.active');
  await loadNews(active ? active.dataset.cat : '');
};

async function loadNews(category) {
  const el = document.getElementById('news-main-list');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Loading news…</div>`;

  try {
    const items = await API.getCryptoNews(category);
    const list = Array.isArray(items) ? items : [];
    if (list.length) renderNewsList(list.slice(0, 20), el);
    else el.innerHTML = `<div class="empty">Nessun articolo disponibile — riprova tra qualche secondo</div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">Errore caricamento news: ${e.message}</div>`;
  }
}

function renderNewsList(items, container) {
  if (!items.length) {
    container.innerHTML = `<div class="empty">No articles found</div>`;
    return;
  }

  container.innerHTML = `<div class="news-list">
    ${items.map(n => {
      const categories = (n.categories || '').split('|').slice(0,3).filter(Boolean);
      return `
        <div class="news-card" onclick="window.open('${n.url}','_blank')">
          <img class="news-thumb" src="${n.imageurl || ''}" alt="" onerror="this.style.display='none'">
          <div style="flex:1;min-width:0">
            <div class="news-title">${n.title}</div>
            <div class="news-meta">
              <span class="news-source">${n.source_info?.name || n.source}</span>
              <span class="news-time">${API.timeAgo(n.published_on)}</span>
            </div>
            ${categories.length ? `<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">
              ${categories.map(c => `<span class="badge badge-blue">${c}</span>`).join('')}
            </div>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

async function loadNewsSidePanel() {
  const el = document.getElementById('news-side-panel');
  if (!el) return;

  // Show trending coins and quick stats
  try {
    const [trending, global] = await Promise.all([
      API.getTrending(),
      API.getGlobal(),
    ]);

    const coins = trending.coins?.slice(0, 7) || [];
    const gd = global.data || {};

    el.innerHTML = `
      <div class="card mb-12">
        <div class="card-title mb-10">🔥 Trending Now</div>
        ${coins.map(({ item }) => `
          <div class="stat-row">
            <span class="stat-label flex gap-8">
              <img src="${item.small}" width="18" height="18" style="border-radius:50%" onerror="this.style.display='none'">
              <strong>${item.symbol}</strong>
              <span style="font-size:11px;color:var(--text-muted)">${item.name}</span>
            </span>
            <span class="stat-val" style="font-size:11px;color:var(--text-muted)">#${item.market_cap_rank || '?'}</span>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="card-title mb-10">🌐 Global Market</div>
        ${[
          ['Total Market Cap', API.formatNum(gd.total_market_cap?.usd)],
          ['24h Volume',       API.formatNum(gd.total_volume?.usd)],
          ['BTC Dominance',    (gd.market_cap_percentage?.btc || 0).toFixed(1) + '%'],
          ['ETH Dominance',    (gd.market_cap_percentage?.eth || 0).toFixed(1) + '%'],
          ['Active Coins',     (gd.active_cryptocurrencies || 0).toLocaleString()],
          ['Markets',          (gd.markets || 0).toLocaleString()],
        ].map(([label, val]) => `
          <div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-val">${val}</span>
          </div>`).join('')}
      </div>`;
  } catch {
    el.innerHTML = `<div class="empty">Side panel data unavailable</div>`;
  }
}
