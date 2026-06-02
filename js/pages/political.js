/* ============================================================
   POLITICAL NEWS PAGE
   ============================================================ */
const POLITICAL_FEEDS = [
  {
    name: 'Reuters Business',
    url: 'https://feeds.reuters.com/reuters/businessNews',
    icon: '📰',
  },
  {
    name: 'Reuters Economy',
    url: 'https://feeds.reuters.com/news/economy',
    icon: '📊',
  },
  {
    name: 'FT Markets',
    url: 'https://www.ft.com/markets?format=rss',
    icon: '🗞️',
  },
  {
    name: 'Politico Economy',
    url: 'https://rss.politico.com/economy.xml',
    icon: '🏛️',
  },
];

// Static news items as fallback (major political/macro events affecting markets)
const STATIC_POLITICAL = [
  {
    title: 'Fed mantiene tassi invariati, mercati reagiscono positivamente',
    source: 'Reuters', date: '2025-05-28',
    tags: ['Fed', 'Interest Rates', 'Markets'],
    impact: 'neutral',
    summary: 'La Federal Reserve ha deciso di mantenere i tassi di interesse nell\'intervallo 5.25-5.50%, come ampiamente atteso. Powell ha sottolineato la dipendenza dai dati futuri.',
  },
  {
    title: 'Nuove tariffe USA-Cina: impatto sulle catene di fornitura tech',
    source: 'Financial Times', date: '2025-05-27',
    tags: ['Trade War', 'China', 'Tech', 'Tariffs'],
    impact: 'bearish',
    summary: 'L\'amministrazione USA ha annunciato nuovi dazi sui prodotti tecnologici cinesi, con possibili ripercussioni su semiconduttori e supply chain globale.',
  },
  {
    title: 'BCE segnala possibile taglio tassi entro l\'estate',
    source: 'Bloomberg', date: '2025-05-26',
    tags: ['ECB', 'EUR', 'Rate Cut'],
    impact: 'bullish',
    summary: 'Christine Lagarde ha lasciato intendere che un primo taglio dei tassi potrebbe arrivare già a giugno 2025, se i dati sull\'inflazione continueranno a migliorare.',
  },
  {
    title: 'Elezioni europee: implicazioni per i mercati finanziari',
    source: 'Politico', date: '2025-05-25',
    tags: ['EU', 'Elections', 'Policy'],
    impact: 'neutral',
    summary: 'I risultati delle elezioni europee potrebbero influenzare le politiche fiscali dell\'UE, con implicazioni per i mercati obbligazionari europei.',
  },
  {
    title: 'Debito USA supera nuovi massimi: preoccupazioni per il deficit',
    source: 'Wall Street Journal', date: '2025-05-24',
    tags: ['US Debt', 'Fiscal Policy', 'Dollar'],
    impact: 'bearish',
    summary: 'Il debito pubblico americano ha raggiunto nuovi massimi storici, alimentando le preoccupazioni degli investitori sulla sostenibilità fiscale a lungo termine.',
  },
  {
    title: 'Accordo commerciale UE-Mercosur: opportunità per le esportazioni',
    source: 'Reuters', date: '2025-05-23',
    tags: ['Trade', 'EU', 'Agriculture'],
    impact: 'bullish',
    summary: 'L\'accordo commerciale tra UE e Mercosur, dopo anni di negoziati, potrebbe aprire nuovi mercati per le esportazioni europee e ridurre le tariffe sui beni.',
  },
  {
    title: 'Geopolitica Medio Oriente: petrolio in rialzo',
    source: 'Bloomberg', date: '2025-05-22',
    tags: ['Oil', 'Geopolitics', 'Energy'],
    impact: 'bearish',
    summary: 'Le tensioni in Medio Oriente hanno spinto il prezzo del petrolio Brent sopra gli 85 dollari al barile, alimentando timori inflazionistici.',
  },
  {
    title: 'Giappone interviene sul forex per sostenere lo yen',
    source: 'Nikkei', date: '2025-05-21',
    tags: ['Japan', 'JPY', 'Forex Intervention'],
    impact: 'bullish',
    summary: 'Il Ministero delle Finanze giapponese sarebbe intervenuto sul mercato valutario per sostenere lo yen, dopo che USD/JPY aveva superato quota 158.',
  },
];

async function render_political(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">Political &amp; Macro</div>
        <div class="page-subtitle">News geopolitiche e macroeconomiche che impattano i mercati</div>
      </div>
      <button class="btn btn-green btn-sm" onclick="refreshPolitical()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Aggiorna
      </button>
    </div>

    <div class="grid-4 mb-16" id="pol-impact-stats"></div>

    <div class="grid-2" style="gap:20px">
      <div>
        <div class="section-divider">Headlines &amp; Analisi</div>
        <div id="pol-news-list"></div>
      </div>
      <div>
        <div class="section-divider">Economic Calendar</div>
        <div id="pol-calendar"></div>
        <div class="section-divider mt-16">RSS Live Feed</div>
        <div id="pol-rss-list"></div>
      </div>
    </div>
  `;

  renderPoliticalStats();
  renderPoliticalNews();
  renderEconomicCalendar();
  loadPoliticalRSS();
}

window.refreshPolitical = () => {
  loadPoliticalRSS();
};

function renderPoliticalStats() {
  const bullish = STATIC_POLITICAL.filter(n => n.impact === 'bullish').length;
  const bearish = STATIC_POLITICAL.filter(n => n.impact === 'bearish').length;
  const neutral = STATIC_POLITICAL.filter(n => n.impact === 'neutral').length;
  const total = STATIC_POLITICAL.length;

  document.getElementById('pol-impact-stats').innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Rialziste</div>
      <div class="card-value positive">${bullish}</div>
      <div class="card-change neutral">di ${total} notizie</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Ribassiste</div>
      <div class="card-value negative">${bearish}</div>
      <div class="card-change neutral">di ${total} notizie</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Neutrali</div>
      <div class="card-value">${neutral}</div>
      <div class="card-change neutral">di ${total} notizie</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Bias di Mercato</div>
      <div class="card-value ${bullish > bearish ? 'positive' : bullish < bearish ? 'negative' : ''}">
        ${bullish > bearish ? '↑ Rialzista' : bullish < bearish ? '↓ Ribassista' : '→ Neutro'}
      </div>
      <div class="card-change neutral">basato sui titoli</div>
    </div>`;
}

function renderPoliticalNews() {
  const el = document.getElementById('pol-news-list');
  if (!el) return;

  const impactColors = {
    bullish: { color: 'var(--green)', bg: 'var(--green-dim)', label: '▲ Bullish' },
    bearish: { color: 'var(--red)',   bg: 'var(--red-dim)',   label: '▼ Bearish' },
    neutral: { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', label: '→ Neutral' },
  };

  el.innerHTML = `<div class="news-list">
    ${STATIC_POLITICAL.map(n => {
      const ic = impactColors[n.impact];
      return `
        <div class="news-card" style="flex-direction:column">
          <div class="flex-between mb-6">
            <span class="news-source">${n.source}</span>
            <div class="flex gap-6">
              <span class="badge" style="background:${ic.bg};color:${ic.color}">${ic.label}</span>
              <span style="font-size:10px;color:var(--text-muted)">${n.date}</span>
            </div>
          </div>
          <div class="news-title" style="-webkit-line-clamp:unset">${n.title}</div>
          <p style="font-size:11.5px;color:var(--text-secondary);margin:8px 0;line-height:1.6">${n.summary}</p>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${n.tags.map(t => `<span class="badge badge-muted">${t}</span>`).join('')}
          </div>
        </div>`;
    }).join('')}
  </div>`;
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
  const el = document.getElementById('pol-rss-list');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Loading RSS feeds…</div>`;

  let allItems = [];
  for (const feed of POLITICAL_FEEDS) {
    try {
      const items = await API.getRSS(feed.url);
      allItems.push(...items.map(i => ({ ...i, feedName: feed.name, feedIcon: feed.icon })));
    } catch {
      // Skip failed feeds silently
    }
  }

  if (!allItems.length) {
    el.innerHTML = `
      <div class="card">
        <div style="font-size:12px;color:var(--text-muted)">RSS feeds non disponibili (possibile blocco CORS). Usa i link diretti:</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
          ${POLITICAL_FEEDS.map(f => `
            <a href="${f.url}" target="_blank" style="font-size:12px;color:var(--blue);text-decoration:underline">
              ${f.icon} ${f.name}
            </a>`).join('')}
        </div>
      </div>`;
    return;
  }

  // Sort by date
  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  el.innerHTML = `<div class="news-list">
    ${allItems.slice(0, 10).map(n => `
      <div class="news-card" onclick="window.open('${n.link}','_blank')">
        <div style="flex:1;min-width:0">
          <div class="news-title">${n.title}</div>
          <div class="news-meta">
            <span class="news-source">${n.feedIcon} ${n.feedName}</span>
            <span class="news-time">${n.pubDate ? new Date(n.pubDate).toLocaleDateString('it-IT') : ''}</span>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}
