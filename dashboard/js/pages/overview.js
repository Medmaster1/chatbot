/* ============================================================
   OVERVIEW PAGE
   ============================================================ */
async function render_overview(el) {
  const settings = typeof getSettings === 'function' ? getSettings() : {};

  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Dashboard Overview</div>
        <div class="page-subtitle" id="ov-last-update">Real-time market snapshot</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="render_overview(document.getElementById('app-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-3.36M20 15a9 9 0 01-15 3.36" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        Refresh
      </button>
    </div>
    <div id="ticker-zone" class="mb-16"></div>
    <div class="grid-4 mb-16" id="top-stats"></div>
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-title mb-12">Top Crypto by Market Cap</div>
        <div id="ov-top-crypto"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Fear &amp; Greed Index</div>
          <a href="#" onclick="App.navigate('feargreed');return false;" style="font-size:11px;color:var(--blue)">Details →</a>
        </div>
        <div id="ov-fg"></div>
        <div class="section-divider mt-12">24h Change Leaders</div>
        <div id="ov-movers"></div>
      </div>
    </div>
    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title">Latest Crypto News</div>
        <a href="#" onclick="App.navigate('news');return false;" style="font-size:11px;color:var(--blue)">All news →</a>
      </div>
      <div id="ov-news"></div>
    </div>
    <div class="card">
      <div class="card-title mb-12">Global Market Stats</div>
      <div id="ov-global"></div>
    </div>
  `;

  const [markets, fg, global, news] = await Promise.allSettled([
    API.getMarkets(1, 20),
    API.getFearGreed(1),
    API.getGlobal(),
    API.getCryptoNews(),
  ]);

  // Update last-refresh timestamp
  const upEl = document.getElementById('ov-last-update');
  if (upEl) upEl.textContent = 'Aggiornato: ' + new Date().toLocaleTimeString('it-IT');

  // Ticker: TradingView or CoinGecko
  if (settings.showTVTicker) {
    renderTVTicker();
  } else if (markets.status === 'fulfilled') {
    renderTicker(markets.value);
  }

  // Top stats
  if (markets.status === 'fulfilled') renderTopStats(markets.value, global.value);

  // Top crypto table
  if (markets.status === 'fulfilled') renderTopCrypto(markets.value.slice(0, 8));

  // Fear & Greed
  if (fg.status === 'fulfilled') renderFGMini(fg.value);

  // Movers
  if (markets.status === 'fulfilled') renderMovers(markets.value);

  // News
  const newsArr = news.status === 'fulfilled' && Array.isArray(news.value) ? news.value : [];
  if (newsArr.length) renderNewsSnippets(newsArr.slice(0, 4));
  else document.getElementById('ov-news').innerHTML = '<div class="empty">News temporaneamente non disponibili</div>';

  // Global stats
  if (global.status === 'fulfilled') renderGlobal(global.value.data);
}

function renderTicker(coins) {
  const items = coins.slice(0, 18).map(c => {
    const chg = c.price_change_percentage_24h;
    const cls = chg >= 0 ? 'positive' : 'negative';
    return `<div class="ticker-item">
      <span class="ticker-name">${c.symbol.toUpperCase()}</span>
      <span class="ticker-price">${API.formatPrice(c.current_price)}</span>
      <span class="ticker-chg ${cls}">${API.formatPct(chg)}</span>
    </div>`;
  }).join('');
  const doubled = items + items;
  document.getElementById('ticker-zone').innerHTML = `
    <div class="ticker-outer">
      <div class="ticker-inner">${doubled}</div>
    </div>`;
}

function renderTVTicker() {
  const zone = document.getElementById('ticker-zone');
  if (!zone) return;
  zone.innerHTML = `
    <div style="height:46px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
      </div>
    </div>`;
  const container = zone.querySelector('.tradingview-widget-container');
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: [
      { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
      { proName: 'BINANCE:ETHUSDT', title: 'ETH' },
      { proName: 'BINANCE:SOLUSDT', title: 'SOL' },
      { proName: 'SP:SPX',          title: 'S&P 500' },
      { proName: 'NASDAQ:NDX',      title: 'NASDAQ' },
      { proName: 'COMEX:GC1!',      title: 'Gold' },
      { proName: 'NYMEX:CL1!',      title: 'WTI Oil' },
      { proName: 'FX:EURUSD',       title: 'EUR/USD' },
      { proName: 'NASDAQ:AAPL',     title: 'AAPL' },
      { proName: 'NASDAQ:NVDA',     title: 'NVDA' },
    ],
    showSymbolLogo: false,
    isTransparent: true,
    displayMode: 'adaptive',
    colorTheme: 'dark',
    locale: 'it',
  });
  container.appendChild(script);
}

function renderTopStats(coins, globalData) {
  const btc  = coins.find(c => c.id === 'bitcoin') || coins[0];
  const eth  = coins.find(c => c.id === 'ethereum') || coins[1];
  const gdat = globalData?.data;

  const stats = [
    {
      label: 'Bitcoin (BTC)',
      value: API.formatPrice(btc?.current_price),
      change: API.formatPct(btc?.price_change_percentage_24h),
      changeClass: API.pctClass(btc?.price_change_percentage_24h),
    },
    {
      label: 'Ethereum (ETH)',
      value: API.formatPrice(eth?.current_price),
      change: API.formatPct(eth?.price_change_percentage_24h),
      changeClass: API.pctClass(eth?.price_change_percentage_24h),
    },
    {
      label: 'Total Market Cap',
      value: gdat ? API.formatNum(gdat.total_market_cap?.usd) : '—',
      change: gdat ? API.formatPct(gdat.market_cap_change_percentage_24h_usd) : '',
      changeClass: API.pctClass(gdat?.market_cap_change_percentage_24h_usd),
    },
    {
      label: 'BTC Dominance',
      value: gdat ? (gdat.market_cap_percentage?.btc?.toFixed(1) + '%') : '—',
      change: '',
      changeClass: 'neutral',
    },
  ];

  document.getElementById('top-stats').innerHTML = stats.map(s => `
    <div class="card card-sm">
      <div class="card-title">${s.label}</div>
      <div class="card-value">${s.value}</div>
      <div class="card-change ${s.changeClass}">${s.change}</div>
    </div>`).join('');
}

function renderTopCrypto(coins) {
  const rows = coins.map(c => {
    const chg24 = c.price_change_percentage_24h;
    return `<tr>
      <td class="muted mono" style="width:28px">${c.market_cap_rank}</td>
      <td>
        <div class="coin-cell">
          <img class="coin-img" src="${c.image}" alt="${c.symbol}" onerror="this.style.display='none'">
          <div><div class="coin-sym">${c.symbol.toUpperCase()}</div><div class="coin-name">${c.name}</div></div>
        </div>
      </td>
      <td class="r">${API.formatPrice(c.current_price)}</td>
      <td class="r ${API.pctClass(chg24)}">${API.formatPct(chg24)}</td>
      <td class="r muted" style="font-size:11px">${API.formatNum(c.market_cap)}</td>
    </tr>`;
  }).join('');

  document.getElementById('ov-top-crypto').innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Asset</th><th class="r">Price</th><th class="r">24h</th><th class="r">Mkt Cap</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderFGMini(fgData) {
  const val = parseInt(fgData.data[0].value);
  const { text, cls } = API.fgLabel(val);
  const color = API.fgColor(val);

  document.getElementById('ov-fg').innerHTML = `
    <div class="mini-fg">
      <svg class="mini-fg-svg" viewBox="0 0 100 56" width="110" height="62"></svg>
      <div class="mini-fg-info">
        <div class="val" style="color:${color}">${val}</div>
        <div class="lbl fg-label ${cls}">${text}</div>
        <div class="sub">Updated: ${API.timeAgo(fgData.data[0].timestamp)}</div>
      </div>
    </div>`;

  const svg = document.querySelector('#ov-fg .mini-fg-svg');
  API.drawGaugeSVG(svg, val, 100);
}

function renderMovers(coins) {
  const sorted = [...coins].sort((a, b) =>
    Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h)
  ).slice(0, 5);

  const rows = sorted.map(c => {
    const chg = c.price_change_percentage_24h;
    return `<div class="stat-row">
      <span class="stat-label flex gap-8" style="align-items:center">
        <img src="${c.image}" width="16" height="16" style="border-radius:50%" onerror="this.style.display='none'">
        ${c.symbol.toUpperCase()}
      </span>
      <span class="stat-val ${API.pctClass(chg)}">${API.formatPct(chg)}</span>
    </div>`;
  }).join('');

  document.getElementById('ov-movers').innerHTML = rows;
}

function renderNewsSnippets(items) {
  if (!items.length) {
    document.getElementById('ov-news').innerHTML = '<div class="empty">No news available</div>';
    return;
  }
  const cards = items.map(n => `
    <div class="news-card" onclick="window.open('${n.url}','_blank')">
      <img class="news-thumb" src="${n.imageurl || ''}" alt="" onerror="this.style.display='none'">
      <div>
        <div class="news-title">${n.title}</div>
        <div class="news-meta">
          <span class="news-source">${n.source_info?.name || n.source}</span>
          <span class="news-time">${API.timeAgo(n.published_on)}</span>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('ov-news').innerHTML = `<div class="news-list">${cards}</div>`;
}

function renderGlobal(g) {
  if (!g) return;
  const items = [
    ['Active Cryptocurrencies', g.active_cryptocurrencies?.toLocaleString()],
    ['Markets', g.markets?.toLocaleString()],
    ['24h Volume', API.formatNum(g.total_volume?.usd)],
    ['BTC Dominance', g.market_cap_percentage?.btc?.toFixed(1) + '%'],
    ['ETH Dominance', g.market_cap_percentage?.eth?.toFixed(1) + '%'],
    ['Market Cap Change 24h', API.formatPct(g.market_cap_change_percentage_24h_usd)],
  ];

  document.getElementById('ov-global').innerHTML = `
    <div class="grid-3">
      ${items.map(([label, val]) => `
        <div class="stat-row">
          <span class="stat-label">${label}</span>
          <span class="stat-val">${val || '—'}</span>
        </div>`).join('')}
    </div>`;
}
