/* ============================================================
   FUNDAMENTALS PAGE
   ============================================================ */
async function render_fundamentals(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Fundamentals</div>
      <div class="page-subtitle">Key financial metrics for stocks and crypto</div>
    </div>

    <div class="card mb-16">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Search Stock Symbol</label>
          <input type="text" id="fund-search" placeholder="AAPL, MSFT, TSLA…" style="min-width:200px">
        </div>
        <button class="btn btn-green" onclick="loadFundamentals()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><circle cx="11" cy="11" r="8" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/></svg>
          Analyze
        </button>
      </div>
      <div id="fund-suggestions" class="flex gap-8" style="flex-wrap:wrap">
        ${['AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','JPM','V','BRK-B'].map(s =>
          `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('fund-search').value='${s}';loadFundamentals()">${s}</button>`
        ).join('')}
      </div>
    </div>

    <div id="fund-result"></div>
    <div id="fund-crypto-section"></div>
  `;

  document.getElementById('fund-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadFundamentals();
  });

  // Load crypto fundamentals on initial render
  loadCryptoFundamentals();
}

window.loadFundamentals = async function() {
  const symbol = (document.getElementById('fund-search')?.value || '').trim().toUpperCase();
  if (!symbol) return;

  const el = document.getElementById('fund-result');
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Fetching data for ${symbol}…</div>`;

  try {
    const data = await API.getYahooSummary(symbol);
    if (!data) throw new Error('No data returned. Check the symbol.');
    renderFundamentals(symbol, data, el);
  } catch (err) {
    el.innerHTML = `
      <div class="card">
        <div class="alert alert-warning">Unable to load data for ${symbol}: ${err.message}</div>
        <p style="font-size:12px;color:var(--text-muted)">Yahoo Finance may be rate-limiting. Try again in a few seconds, or try a different symbol.</p>
      </div>`;
  }
};

function renderFundamentals(symbol, data, el) {
  const fd = data.financialData || {};
  const ks = data.defaultKeyStatistics || {};
  const sd = data.summaryDetail || {};

  const fmtPct = v => v?.raw !== undefined ? (v.raw * 100).toFixed(2) + '%' : (typeof v === 'number' ? (v*100).toFixed(2)+'%' : '—');
  const fmtVal = v => v?.fmt || (v?.raw !== undefined ? API.formatNum(v.raw) : '—');
  const fmtPrice = v => v?.fmt || (v?.raw !== undefined ? '$'+v.raw.toFixed(2) : '—');
  const fmtRaw = v => v?.fmt || (v?.raw !== undefined ? v.raw.toFixed(2) : '—');

  const metrics = [
    ['Current Price',       fmtPrice(fd.currentPrice)],
    ['Target Mean Price',   fmtPrice(fd.targetMeanPrice)],
    ['Analyst Recommendation', fd.recommendationKey?.toUpperCase() || '—'],
    ['Revenue (TTM)',       fmtVal(fd.totalRevenue)],
    ['Gross Profit',        fmtVal(fd.grossProfits)],
    ['EBITDA',              fmtVal(fd.ebitda)],
    ['Net Income',          '—'],
    ['Profit Margin',       fmtPct(fd.profitMargins)],
    ['Operating Margin',    fmtPct(fd.operatingMargins)],
    ['Return on Equity',    fmtPct(fd.returnOnEquity)],
    ['Return on Assets',    fmtPct(fd.returnOnAssets)],
    ['Revenue Growth',      fmtPct(fd.revenueGrowth)],
    ['EPS (Trailing)',      fmtRaw(ks.trailingEps)],
    ['EPS (Forward)',       fmtRaw(ks.forwardEps)],
    ['P/E (Trailing)',      fmtRaw(ks.trailingPE || sd.trailingPE)],
    ['P/E (Forward)',       fmtRaw(ks.forwardPE || sd.forwardPE)],
    ['Price/Book',          fmtRaw(ks.priceToBook)],
    ['Price/Sales (TTM)',   fmtRaw(ks.priceToSalesTrailing12Months)],
    ['Beta',                fmtRaw(ks.beta || sd.beta)],
    ['Market Cap',          fmtVal(sd.marketCap || ks.marketCap)],
    ['Enterprise Value',    fmtVal(ks.enterpriseValue)],
    ['EV/EBITDA',          fmtRaw(ks.enterpriseToEbitda)],
    ['52W High',            fmtPrice(sd.fiftyTwoWeekHigh)],
    ['52W Low',             fmtPrice(sd.fiftyTwoWeekLow)],
    ['Shares Outstanding',  fmtVal(ks.sharesOutstanding)],
    ['Short Ratio',         fmtRaw(ks.shortRatio)],
    ['Dividend Yield',      fmtPct(sd.dividendYield || sd.trailingAnnualDividendYield)],
    ['Payout Ratio',        fmtPct(sd.payoutRatio)],
    ['Total Cash',          fmtVal(fd.totalCash)],
    ['Total Debt',          fmtVal(fd.totalDebt)],
    ['Debt/Equity',         fmtRaw(fd.debtToEquity)],
    ['Current Ratio',       fmtRaw(fd.currentRatio)],
    ['Quick Ratio',         fmtRaw(fd.quickRatio)],
    ['Free Cash Flow',      fmtVal(fd.freeCashflow)],
    ['Operating Cash Flow', fmtVal(fd.operatingCashflow)],
  ];

  // Rec color
  const recColors = {
    'BUY': 'green', 'STRONG_BUY': 'green',
    'HOLD': 'yellow', 'NEUTRAL': 'yellow',
    'SELL': 'red', 'STRONG_SELL': 'red',
  };
  const recKey = (fd.recommendationKey || '').toUpperCase();
  const recBadge = recKey ? `<span class="badge badge-${recColors[recKey] || 'muted'}" style="margin-left:8px">${recKey.replace('_', ' ')}</span>` : '';

  // Split metrics into 3 columns
  const third = Math.ceil(metrics.length / 3);
  const cols = [metrics.slice(0, third), metrics.slice(third, third*2), metrics.slice(third*2)];

  el.innerHTML = `
    <div class="card mb-16">
      <div class="card-header mb-0">
        <div style="font-size:18px;font-weight:700">${symbol} ${recBadge}</div>
        <span style="font-size:11px;color:var(--text-muted)">Yahoo Finance data</span>
      </div>
    </div>
    <div class="grid-3 mb-16">
      ${cols.map(col => `
        <div class="card card-sm">
          ${col.map(([label, val]) => `
            <div class="stat-row">
              <span class="stat-label">${label}</span>
              <span class="stat-val ${val === '—' ? 'muted' : ''}">${val}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
}

async function loadCryptoFundamentals() {
  const el = document.getElementById('fund-crypto-section');
  el.innerHTML = `
    <div class="section-divider">Crypto Fundamentals (CoinGecko)</div>
    <div class="flex gap-8 mb-12" id="crypto-fund-tabs">
      ${['bitcoin','ethereum','solana','bnb'].map((id, i) => `
        <button class="btn btn-${i===0?'green':'ghost'} btn-sm" data-coin="${id}" onclick="loadCoinFund('${id}')">${id.toUpperCase().slice(0,3)}</button>
      `).join('')}
    </div>
    <div id="coin-fund-data"><div class="loading"><div class="spinner"></div></div></div>
  `;

  await loadCoinFund('bitcoin');
}

window.loadCoinFund = async function(id) {
  // Update button styles
  document.querySelectorAll('#crypto-fund-tabs button').forEach(b => {
    b.className = b.dataset.coin === id ? 'btn btn-green btn-sm' : 'btn btn-ghost btn-sm';
  });

  const el = document.getElementById('coin-fund-data');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  try {
    const coin = await API.getCoinDetail(id);
    const d = coin.market_data;
    const metrics = [
      ['Price (USD)',           API.formatPrice(d.current_price?.usd)],
      ['Market Cap',            API.formatNum(d.market_cap?.usd)],
      ['Market Cap Rank',       '#' + coin.market_cap_rank],
      ['Fully Diluted Value',   d.fully_diluted_valuation?.usd ? API.formatNum(d.fully_diluted_valuation.usd) : '—'],
      ['24h Volume',            API.formatNum(d.total_volume?.usd)],
      ['24h Change',            API.formatPct(d.price_change_percentage_24h)],
      ['7d Change',             API.formatPct(d.price_change_percentage_7d)],
      ['30d Change',            API.formatPct(d.price_change_percentage_30d)],
      ['1y Change',             API.formatPct(d.price_change_percentage_1y)],
      ['ATH',                   API.formatPrice(d.ath?.usd)],
      ['ATH Date',              d.ath_date?.usd ? new Date(d.ath_date.usd).toLocaleDateString('it-IT') : '—'],
      ['ATH Change %',          API.formatPct(d.ath_change_percentage?.usd)],
      ['ATL',                   API.formatPrice(d.atl?.usd)],
      ['Circulating Supply',    d.circulating_supply ? API.formatNum(d.circulating_supply) + ' ' + coin.symbol.toUpperCase() : '—'],
      ['Max Supply',            d.max_supply ? API.formatNum(d.max_supply) + ' ' + coin.symbol.toUpperCase() : '∞'],
    ];

    const half = Math.ceil(metrics.length / 2);
    const cols = [metrics.slice(0, half), metrics.slice(half)];

    el.innerHTML = `
      <div class="card mb-12" style="display:flex;align-items:center;gap:14px;padding:14px">
        <img src="${coin.image?.large}" width="44" height="44" style="border-radius:50%">
        <div>
          <div style="font-size:17px;font-weight:700">${coin.name} (${coin.symbol.toUpperCase()})</div>
          <div style="font-size:12px;color:var(--text-secondary)">${coin.categories?.slice(0,3).join(' • ') || ''}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-family:var(--mono);font-size:22px;font-weight:700">${API.formatPrice(d.current_price?.usd)}</div>
          <div class="${API.pctClass(d.price_change_percentage_24h)}" style="font-family:var(--mono);font-size:13px">${API.formatPct(d.price_change_percentage_24h)}</div>
        </div>
      </div>
      <div class="grid-2">
        ${cols.map(col => `
          <div class="card card-sm">
            ${col.map(([label, val]) => `
              <div class="stat-row">
                <span class="stat-label">${label}</span>
                <span class="stat-val ${val === '—' ? 'muted' : ''}">${val}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">Failed to load coin data</div>`;
  }
};
