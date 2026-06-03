/* ============================================================
   POLITICAL NEWS PAGE
   ============================================================ */
const POLITICAL_FEEDS = [
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews',      icon: '📰', tag: 'Business' },
  { name: 'Reuters Economy',  url: 'https://feeds.reuters.com/news/economy',               icon: '📊', tag: 'Economy' },
  { name: 'Reuters Politics', url: 'https://feeds.reuters.com/Reuters/PoliticsNews',       icon: '🏛️', tag: 'Politics' },
  { name: 'Reuters World',    url: 'https://feeds.reuters.com/reuters/worldNews',           icon: '🌍', tag: 'World' },
  { name: 'Politico Economy', url: 'https://rss.politico.com/economy.xml',                 icon: '🏛️', tag: 'Politics' },
  { name: 'CNBC Economy',     url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', icon: '📺', tag: 'Economy' },
  { name: 'CNBC Finance',     url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135', icon: '💰', tag: 'Finance' },
  { name: 'The Guardian Econ',url: 'https://www.theguardian.com/business/economics/rss',   icon: '🗞️', tag: 'Economy' },
];


async function render_political(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">Political &amp; Macro</div>
        <div class="page-subtitle" id="pol-subtitle">News geopolitiche e macroeconomiche da fonti live</div>
      </div>
      <button class="btn btn-green btn-sm" onclick="refreshPolitical()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Aggiorna
      </button>
    </div>

    <!-- Source filter tabs -->
    <div class="card mb-16">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span class="form-label" style="margin:0">Fonte:</span>
        <div class="tabs" id="pol-source-tabs" style="margin:0;flex-wrap:wrap">
          <div class="tab active" data-tag="all">Tutte</div>
          <div class="tab" data-tag="Economy">Economy</div>
          <div class="tab" data-tag="Politics">Politics</div>
          <div class="tab" data-tag="Business">Business</div>
          <div class="tab" data-tag="Finance">Finance</div>
          <div class="tab" data-tag="World">World</div>
        </div>
        <span id="pol-count" style="font-size:11px;color:var(--text-muted);margin-left:auto"></span>
      </div>
    </div>

    <div class="grid-2" style="gap:20px">
      <div>
        <div class="section-divider">Live News Feed</div>
        <div id="pol-live-list"><div class="loading"><div class="spinner"></div> Caricamento notizie live…</div></div>
      </div>
      <div>
        <div class="section-divider">Calendario Economico</div>
        <div id="pol-calendar"></div>
      </div>
    </div>
  `;

  document.getElementById('pol-source-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#pol-source-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filterPoliticalNews(tab.dataset.tag);
  });

  renderEconomicCalendar();
  await loadPoliticalRSS();
}

window.refreshPolitical = async () => {
  const el = document.getElementById('pol-live-list');
  if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div> Aggiornamento…</div>`;
  await loadPoliticalRSS();
};

let _polAllItems = [];

function filterPoliticalNews(tag) {
  const items = tag === 'all' ? _polAllItems : _polAllItems.filter(i => i.feedTag === tag);
  renderPolNewsList(items.slice(0, 25));
  const cnt = document.getElementById('pol-count');
  if (cnt) cnt.textContent = `${items.length} articoli`;
}

function renderEconomicCalendar() {
  const el = document.getElementById('pol-calendar');
  if (!el) return;

  // Embed TradingView Economic Calendar widget
  el.innerHTML = `
    <div style="height:400px;overflow:hidden;border-radius:8px;border:1px solid var(--border)">
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <iframe
          src="https://s.tradingview.com/embed-widget/events/?locale=it#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%22-1%2C0%2C1%22%2C%22currencyFilter%22%3A%22USD%2CEUR%2CGBP%2CJPY%2CCHF%2CCAD%2CAUD%22%7D"
          style="width:100%;height:100%;border:none"
          frameborder="0"
          allowtransparency="true"
          scrolling="no">
        </iframe>
      </div>
    </div>`;
}

async function loadPoliticalRSS() {
  const el = document.getElementById('pol-live-list');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Caricamento news live…</div>`;

  let allItems = [];
  for (const feed of POLITICAL_FEEDS) {
    try {
      const items = await API.getRSS(feed.url);
      allItems.push(...items.map(i => ({ ...i, feedName: feed.name, feedIcon: feed.icon, feedTag: feed.tag })));
    } catch {
      // Skip failed feeds silently
    }
  }

  if (!allItems.length) {
    el.innerHTML = `
      <div class="card">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">RSS feeds non disponibili. Accedi direttamente alle fonti:</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${POLITICAL_FEEDS.map(f => `
            <a href="${f.url}" target="_blank" style="font-size:12px;color:var(--blue);text-decoration:underline">
              ${f.icon} ${f.name}
            </a>`).join('')}
        </div>
      </div>`;
    _polAllItems = [];
    const cnt = document.getElementById('pol-count');
    if (cnt) cnt.textContent = '0 articoli';
    return;
  }

  // Sort by date descending
  allItems.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  _polAllItems = allItems;

  const cnt = document.getElementById('pol-count');
  if (cnt) cnt.textContent = `${allItems.length} articoli`;

  const subtitle = document.getElementById('pol-subtitle');
  if (subtitle) subtitle.textContent = `${allItems.length} articoli da ${POLITICAL_FEEDS.length} fonti — aggiornato ${new Date().toLocaleTimeString('it-IT')}`;

  filterPoliticalNews('all');
}

function renderPolNewsList(items) {
  const el = document.getElementById('pol-live-list');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<div class="empty">Nessun articolo per questa categoria</div>`;
    return;
  }

  el.innerHTML = `<div class="news-list">
    ${items.map(n => {
      const dateStr = n.pubDate ? new Date(n.pubDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const safeLink = n.link ? n.link.replace(/'/g, '%27') : '#';
      return `
        <div class="news-card" onclick="window.open('${safeLink}','_blank')" style="cursor:pointer">
          <div style="flex:1;min-width:0">
            <div class="news-title">${n.title || 'No title'}</div>
            ${n.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${n.description.replace(/<[^>]+>/g,'').slice(0,160)}</div>` : ''}
            <div class="news-meta" style="margin-top:4px">
              <span class="news-source">${n.feedIcon} ${n.feedName}</span>
              <span class="badge badge-muted" style="font-size:9px;padding:1px 5px">${n.feedTag}</span>
              <span class="news-time">${dateStr}</span>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12" style="flex-shrink:0;margin-left:8px;color:var(--text-muted)"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        </div>`;
    }).join('')}
  </div>`;
}
