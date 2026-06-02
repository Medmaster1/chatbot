/* ============================================================
   MARKETS & CHARTS PAGE
   ============================================================ */
async function render_markets(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Markets & Charts</div>
      <div class="page-subtitle">Live prices, charts and market data</div>
    </div>

    <div class="card mb-16">
      <div class="flex-between mb-12">
        <div class="tabs" id="tv-tabs">
          <div class="tab active" data-tv="crypto">Crypto</div>
          <div class="tab" data-tv="stocks">Stocks</div>
          <div class="tab" data-tv="forex">Forex</div>
          <div class="tab" data-tv="commodities">Commodities</div>
          <div class="tab" data-tv="indices">Indices</div>
        </div>
        <div class="flex gap-8">
          <input type="text" id="tv-symbol-input" placeholder="BTCUSDT, AAPL…" style="width:160px">
          <button class="btn btn-green btn-sm" onclick="loadTVChart()">Load</button>
        </div>
      </div>
      <div class="tradingview-wrap" id="tv-chart-wrap"></div>
    </div>

    <div class="tabs mb-4" id="table-tabs">
      <div class="tab active" data-tab="crypto">Crypto</div>
      <div class="tab" data-tab="stocks">Stocks</div>
      <div class="tab" data-tab="forex">Forex</div>
      <div class="tab" data-tab="commodities">Commodities</div>
    </div>

    <div class="card">
      <div class="card-header">
        <div id="table-tab-title" class="card-title">Top Cryptocurrencies</div>
        <span id="table-last-update" style="font-size:10px;color:var(--text-muted)"></span>
      </div>
      <div id="market-table-wrap"></div>
    </div>
  `;

  // TradingView chart
  loadTVChartFor('BINANCE:BTCUSDT');

  // Tab switching for TradingView
  const tvPresets = {
    crypto: 'BINANCE:BTCUSDT',
    stocks: 'NASDAQ:AAPL',
    forex: 'FX:EURUSD',
    commodities: 'COMEX:GC1!',
    indices: 'SP:SPX',
  };

  document.getElementById('tv-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#tv-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadTVChartFor(tvPresets[tab.dataset.tv]);
  });

  // Table tabs
  document.getElementById('table-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#table-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadTable(tab.dataset.tab);
  });

  loadTable('crypto');
}

function loadTVChart() {
  const sym = document.getElementById('tv-symbol-input').value.trim().toUpperCase();
  if (sym) loadTVChartFor(sym);
}

function loadTVChartFor(symbol) {
  const wrap = document.getElementById('tv-chart-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="tradingview-widget-container" style="height:100%;width:100%">
      <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
      <div class="tradingview-widget-copyright" style="display:none"></div>
    </div>`;

  const container = wrap.querySelector('.tradingview-widget-container__widget');
  const config = {
    autosize: true,
    symbol,
    interval: 'D',
    timezone: 'Europe/Rome',
    theme: 'dark',
    style: '1',
    locale: 'it',
    toolbar_bg: '#0d1626',
    enable_publishing: false,
    withdateranges: true,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
    container_id: 'tv_chart_' + Date.now(),
    backgroundColor: '#060c18',
    gridColor: 'rgba(255,255,255,0.05)',
  };

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.innerHTML = JSON.stringify(config);
  wrap.querySelector('.tradingview-widget-container').appendChild(script);
}

async function loadTable(type) {
  const wrap = document.getElementById('market-table-wrap');
  const title = document.getElementById('table-tab-title');
  if (!wrap) return;

  wrap.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;

  if (type === 'crypto') {
    title.textContent = 'Top Cryptocurrencies';
    try {
      const coins = await API.getMarkets(1, 50);
      renderCryptoTable(coins);
    } catch (e) {
      wrap.innerHTML = `<div class="empty">Failed to load crypto data</div>`;
    }
  } else {
    title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    renderStaticTable(type);
  }

  document.getElementById('table-last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

function renderCryptoTable(coins) {
  const wrap = document.getElementById('market-table-wrap');
  const rows = coins.map(c => {
    const c24 = c.price_change_percentage_24h;
    const c7d = c.price_change_percentage_7d_in_currency;
    const c1h = c.price_change_percentage_1h_in_currency;

    const sparkPoints = (c.sparkline_in_7d?.price || []).filter((_, i, a) => i % Math.floor(a.length/24) === 0);
    const sparkSvg = buildSparkline(sparkPoints, 70, 24, c7d >= 0 ? '#00e5b4' : '#ff3d6a');

    return `<tr>
      <td><span class="rank-num">${c.market_cap_rank}</span></td>
      <td>
        <div class="coin-cell">
          <img class="coin-img" src="${c.image}" alt="${c.symbol}" onerror="this.style.display='none'">
          <div>
            <div class="coin-sym">${c.symbol.toUpperCase()}</div>
            <div class="coin-name">${c.name}</div>
          </div>
        </div>
      </td>
      <td class="r mono">${API.formatPrice(c.current_price)}</td>
      <td class="r ${API.pctClass(c1h)}">${API.formatPct(c1h)}</td>
      <td class="r ${API.pctClass(c24)}">${API.formatPct(c24)}</td>
      <td class="r ${API.pctClass(c7d)}">${API.formatPct(c7d)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.market_cap)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(c.total_volume)}</td>
      <td class="r">${sparkSvg}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>Asset</th>
          <th class="r">Price</th><th class="r">1h</th><th class="r">24h</th><th class="r">7d</th>
          <th class="r">Mkt Cap</th><th class="r">Volume</th><th class="r">7d Chart</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildSparkline(prices, w, h, color) {
  if (!prices || prices.length < 2) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="vertical-align:middle">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function renderStaticTable(type) {
  const wrap = document.getElementById('market-table-wrap');

  const DATA = {
    stocks: [
      ['AAPL',  'Apple Inc',      'NASDAQ:AAPL'],
      ['MSFT',  'Microsoft',      'NASDAQ:MSFT'],
      ['NVDA',  'NVIDIA',         'NASDAQ:NVDA'],
      ['GOOGL', 'Alphabet',       'NASDAQ:GOOGL'],
      ['META',  'Meta Platforms', 'NASDAQ:META'],
      ['AMZN',  'Amazon',         'NASDAQ:AMZN'],
      ['TSLA',  'Tesla',          'NASDAQ:TSLA'],
      ['JPM',   'JPMorgan Chase', 'NYSE:JPM'],
    ],
    forex: [
      ['EUR/USD', 'Euro / US Dollar',       'FX:EURUSD'],
      ['GBP/USD', 'Pound / US Dollar',      'FX:GBPUSD'],
      ['USD/JPY', 'US Dollar / Yen',        'FX:USDJPY'],
      ['USD/CHF', 'US Dollar / Swiss Franc','FX:USDCHF'],
      ['AUD/USD', 'Aussie / US Dollar',     'FX:AUDUSD'],
      ['USD/CAD', 'US Dollar / CAD',        'FX:USDCAD'],
      ['EUR/GBP', 'Euro / Pound',           'FX:EURGBP'],
    ],
    commodities: [
      ['GOLD',  'Gold Futures',    'COMEX:GC1!'],
      ['SILVER','Silver Futures',  'COMEX:SI1!'],
      ['OIL',   'Crude Oil WTI',   'NYMEX:CL1!'],
      ['BRENT', 'Brent Crude',     'NYMEX:BB1!'],
      ['NAT GAS','Natural Gas',    'NYMEX:NG1!'],
      ['WHEAT', 'Wheat Futures',   'CBOT:ZW1!'],
      ['CORN',  'Corn Futures',    'CBOT:ZC1!'],
    ],
  };

  const items = DATA[type] || [];
  const rows = items.map(([sym, name, tvSym]) => `
    <tr style="cursor:pointer" onclick="document.getElementById('tv-symbol-input').value='${tvSym}';loadTVChart()">
      <td><div class="coin-cell"><div class="coin-sym">${sym}</div><div class="coin-name">${name}</div></div></td>
      <td class="r muted" style="font-size:11px">Click to chart →</td>
    </tr>`).join('');

  wrap.innerHTML = `
    <div class="alert alert-info">Click any row to load the chart above. Prices are shown in the TradingView widget.</div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Asset</th><th class="r">Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
