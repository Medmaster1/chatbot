/* ============================================================
   API MODULE — Free data sources, no keys required
   ============================================================ */
const API = (() => {
  const CACHE = new Map();
  const CACHE_TTL = { short: 60e3, medium: 5*60e3, long: 30*60e3 };

  async function fetchCached(key, ttl, fn) {
    const entry = CACHE.get(key);
    if (entry && Date.now() - entry.ts < ttl) return entry.data;
    try {
      const data = await fn();
      CACHE.set(key, { data, ts: Date.now() });
      return data;
    } catch (e) {
      if (entry) return entry.data; // return stale on error
      throw e;
    }
  }

  const CG_BASE = 'https://api.coingecko.com/api/v3';
  const ALLORIGINS = url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const PROXY = url => `https://corsproxy.io/?${encodeURIComponent(url)}`;

  /* ---- CoinGecko ---- */
  async function cgFetch(path) {
    const r = await fetch(CG_BASE + path, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('CoinGecko error ' + r.status);
    return r.json();
  }

  function getMarkets(page = 1, perPage = 50, currency = 'usd') {
    const key = `markets_${page}_${perPage}_${currency}`;
    return fetchCached(key, CACHE_TTL.short, () =>
      cgFetch(`/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`)
    );
  }

  function getCoinPrice(ids, currency = 'usd') {
    const key = `price_${ids}_${currency}`;
    return fetchCached(key, CACHE_TTL.short, () =>
      cgFetch(`/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`)
    );
  }

  function getGlobal() {
    return fetchCached('global', CACHE_TTL.short, () => cgFetch('/global'));
  }

  function getTrending() {
    return fetchCached('trending', CACHE_TTL.medium, () => cgFetch('/search/trending'));
  }

  function getCoinOHLC(id, days = 30, currency = 'usd') {
    const key = `ohlc_${id}_${days}`;
    return fetchCached(key, CACHE_TTL.medium, () =>
      cgFetch(`/coins/${id}/ohlc?vs_currency=${currency}&days=${days}`)
    );
  }

  function getCoinHistory(id, days = 365, currency = 'usd') {
    const key = `hist_${id}_${days}`;
    return fetchCached(key, CACHE_TTL.long, () =>
      cgFetch(`/coins/${id}/market_chart?vs_currency=${currency}&days=${days}&interval=daily`)
    );
  }

  function getCoinDetail(id) {
    const key = `detail_${id}`;
    return fetchCached(key, CACHE_TTL.medium, () =>
      cgFetch(`/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`)
    );
  }

  /* ---- Fear & Greed (Alternative.me) ---- */
  function getFearGreed(limit = 30) {
    return fetchCached(`fg_${limit}`, CACHE_TTL.short, async () => {
      const r = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`);
      if (!r.ok) throw new Error('F&G error');
      return r.json();
    });
  }

  /* ---- CryptoCompare News (no key needed for public) ---- */
  function getCryptoNews(categories = '') {
    const catParam = categories ? `&categories=${categories}` : '';
    return fetchCached(`news_${categories}`, CACHE_TTL.medium, async () => {
      const r = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest${catParam}`);
      if (!r.ok) throw new Error('News error');
      const j = await r.json();
      return j.Data || [];
    });
  }

  /* ---- RSS via allorigins proxy ---- */
  async function getRSS(url) {
    return fetchCached(`rss_${url}`, CACHE_TTL.medium, async () => {
      const proxy = ALLORIGINS(url);
      const r = await fetch(proxy);
      if (!r.ok) throw new Error('RSS proxy error');
      const j = await r.json();
      const parser = new DOMParser();
      const doc = parser.parseFromString(j.contents, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item')).slice(0, 20).map(item => ({
        title: item.querySelector('title')?.textContent || '',
        link:  item.querySelector('link')?.textContent || '',
        description: item.querySelector('description')?.textContent || '',
        pubDate: item.querySelector('pubDate')?.textContent || '',
        source: url.replace(/https?:\/\/(www\.)?/,'').split('/')[0],
      }));
      return items;
    });
  }

  /* ---- Yahoo Finance via proxy ---- */
  async function getYahooQuote(symbol) {
    return fetchCached(`yq_${symbol}`, CACHE_TTL.short, async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
      const r = await fetch(PROXY(url));
      if (!r.ok) throw new Error('Yahoo quote error');
      return r.json();
    });
  }

  async function getYahooSummary(symbol) {
    return fetchCached(`ys_${symbol}`, CACHE_TTL.long, async () => {
      const modules = 'financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,summaryDetail';
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
      const r = await fetch(PROXY(url));
      if (!r.ok) throw new Error('Yahoo summary error');
      const j = await r.json();
      return j.quoteSummary?.result?.[0] || null;
    });
  }

  async function getYahooSearch(query) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const r = await fetch(PROXY(url));
    if (!r.ok) throw new Error('Yahoo search error');
    const j = await r.json();
    return j.quotes || [];
  }

  /* ---- RSI Calculation ---- */
  function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      avgGain = ((avgGain * (period - 1)) + Math.max(d, 0)) / period;
      avgLoss = ((avgLoss * (period - 1)) + Math.max(-d, 0)) / period;
    }
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
  }

  /* ---- Stochastic ---- */
  function calculateStochastic(ohlcv, period = 14, smoothK = 3, smoothD = 3) {
    const results = [];
    for (let i = period - 1; i < ohlcv.length; i++) {
      const slice = ohlcv.slice(i - period + 1, i + 1);
      const high = Math.max(...slice.map(c => c[2]));
      const low  = Math.min(...slice.map(c => c[3]));
      const close = slice[slice.length - 1][4];
      const k = high === low ? 0 : ((close - low) / (high - low)) * 100;
      results.push(k);
    }
    const smoothedK = smooth(results, smoothK);
    const smoothedD = smooth(smoothedK, smoothD);
    return { k: smoothedK, d: smoothedD };
  }

  function smooth(arr, period) {
    const out = [];
    for (let i = period - 1; i < arr.length; i++) {
      const slice = arr.slice(i - period + 1, i + 1);
      out.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return out;
  }

  /* ---- Seasonality pre-computed data ---- */
  const SEASONALITY_DATA = {
    BTC: {
      avg: [-5.8, 18.9, 6.4, 15.2, -7.4, -7.8, 4.3, 22.1, 4.5, 21.3, 22.6, 4.2],
      years: {
        2020: [30.0, -8.0, -25.0, 34.0, 9.0, -3.5, 24.0, 63.0, -8.0, 28.0, 42.0, 47.0],
        2021: [14.0, 37.0, 30.0, -1.0, -35.0, -6.0, 14.0, 14.0, 26.0, 39.0, -7.0, -19.0],
        2022: [-17.0, 12.0, 5.0, -17.0, -16.0, -38.0, -7.0, -14.0, -3.0, 6.0, -16.0, -4.0],
        2023: [39.0, 0.4, 22.9, 2.9, -7.0, 11.9, -4.1, -11.0, -3.9, 28.8, 8.8, 12.7],
        2024: [-2.4, 44.3, 16.2, -14.7, 12.5, -9.3, 3.0, -8.7, 7.3, 10.8, 35.2, 12.0],
      }
    },
    ETH: {
      avg: [-4.6, 22.1, 10.3, 18.7, -6.0, -9.3, 6.1, 25.3, 5.8, 18.7, 24.3, 3.8],
      years: {
        2020: [34.0, -4.0, -35.0, 60.0, 22.0, 4.0, 55.0, 91.0, -9.0, 22.0, 57.0, 75.0],
        2021: [78.0, 94.0, 25.0, 37.0, -45.0, -18.0, 23.0, 60.0, 26.0, 42.0, -18.0, -23.0],
        2022: [-26.0, 9.0, 14.0, -18.0, -30.0, -46.0, 57.0, -23.0, 25.0, 18.0, -16.0, -10.0],
        2023: [29.0, 2.0, 10.0, 12.0, -6.5, 14.0, -1.0, -6.0, -11.0, 8.0, 11.0, 9.0],
        2024: [-5.0, 46.0, 10.0, -18.0, 25.0, -10.0, 8.0, -20.0, 5.0, 8.0, 42.0, 9.0],
      }
    },
    SP500: {
      avg: [1.2, 0.8, 1.5, 2.1, 0.2, 0.6, 1.7, 0.9, -0.8, 1.0, 1.9, 1.8],
      years: {
        2020: [0.6, -8.0, -12.5, 12.7, 4.5, 2.0, 5.5, 7.0, -3.9, -2.8, 10.8, 3.7],
        2021: [-1.1, 2.6, 4.2, 5.2, 0.5, 2.2, 2.3, 3.0, -4.8, 6.9, -0.8, 4.4],
        2022: [-5.3, -3.1, 3.6, -8.7, 0.0, -8.4, 9.1, -4.2, -9.3, 8.0, 5.4, -5.9],
        2023: [6.2, -2.4, 3.5, 1.5, 0.2, 6.5, 3.1, -1.8, -4.9, -2.2, 8.9, 4.5],
        2024: [1.6, 5.2, 3.1, -4.2, 4.8, 3.5, 1.1, 2.3, 1.7, -1.0, 5.7, 2.4],
      }
    },
    GOLD: {
      avg: [2.1, 0.6, -1.1, 1.4, 0.8, 1.3, 0.3, -0.4, 0.4, 1.2, -0.5, 0.7],
      years: {
        2020: [4.7, -0.7, -1.1, 6.0, 2.5, 2.9, 11.0, 0.3, -3.4, -0.5, 5.4, 6.8],
        2021: [-2.4, -6.2, -1.9, 3.6, 7.8, 0.5, 2.5, -0.1, -3.5, 1.6, -0.6, 3.2],
        2022: [1.7, 6.2, 1.8, 2.0, 0.2, -0.2, -2.3, -3.1, -3.2, 2.9, -5.5, 3.4],
        2023: [6.1, -5.2, 7.8, -1.0, -1.5, 2.4, 2.6, -1.4, -4.7, 6.9, 2.5, 2.3],
        2024: [-1.0, -0.5, 9.2, 2.4, -0.3, 4.0, 5.2, 2.2, 3.6, -3.4, 3.5, 1.2],
      }
    }
  };

  /* ---- Helpers ---- */
  function formatPrice(n, decimals = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
    if (n >= 1e3)  return '$' + n.toLocaleString('en', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
    if (n >= 1)    return '$' + n.toFixed(decimals);
    return '$' + n.toFixed(6);
  }

  function formatNum(n, decimals = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e12) return (n/1e12).toFixed(2) + 'T';
    if (Math.abs(n) >= 1e9)  return (n/1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6)  return (n/1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3)  return (n/1e3).toFixed(2) + 'K';
    return n.toFixed(decimals);
  }

  function formatPct(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const sign = n >= 0 ? '+' : '';
    return sign + n.toFixed(2) + '%';
  }

  function pctClass(n) {
    if (!n || isNaN(n)) return 'neutral';
    return n >= 0 ? 'positive' : 'negative';
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts * 1000) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  function fgLabel(v) {
    if (v <= 25) return { text: 'Extreme Fear', cls: 'extreme-fear' };
    if (v <= 40) return { text: 'Fear', cls: 'fear' };
    if (v <= 60) return { text: 'Neutral', cls: 'neutral' };
    if (v <= 75) return { text: 'Greed', cls: 'greed' };
    return { text: 'Extreme Greed', cls: 'extreme-greed' };
  }

  function fgColor(v) {
    if (v <= 25) return '#ff1a44';
    if (v <= 40) return '#ff6633';
    if (v <= 60) return '#f5c400';
    if (v <= 75) return '#88ee44';
    return '#00e5b4';
  }

  /* Draw SVG gauge arc */
  function drawGaugeSVG(svgEl, value, size = 200) {
    const W = size, H = size * 0.6;
    const cx = W / 2, cy = H * 0.92;
    const R = W * 0.44;
    const sw = W * 0.055;

    const segments = [
      { pct: 0.25, color: '#ff1a44' },
      { pct: 0.15, color: '#ff6633' },
      { pct: 0.20, color: '#f5c400' },
      { pct: 0.15, color: '#88ee44' },
      { pct: 0.25, color: '#00e5b4' },
    ];

    function polarToCart(angle, r) {
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }

    let paths = '';
    let startAngle = Math.PI;
    for (const seg of segments) {
      const sweep = seg.pct * Math.PI;
      const end = startAngle + sweep;
      const [x1, y1] = polarToCart(startAngle, R);
      const [x2, y2] = polarToCart(end, R);
      const large = sweep > Math.PI ? 1 : 0;
      paths += `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-linecap="butt" opacity="0.85"/>`;
      startAngle = end;
    }

    // Needle
    const needleAngle = Math.PI + (value / 100) * Math.PI;
    const nLen = R * 0.82;
    const [nx, ny] = polarToCart(needleAngle, nLen);
    paths += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="white" stroke-width="${sw * 0.45}" stroke-linecap="round"/>`;
    paths += `<circle cx="${cx}" cy="${cy}" r="${sw * 0.65}" fill="white"/>`;

    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = paths;
  }

  return {
    getMarkets, getCoinPrice, getGlobal, getTrending,
    getCoinOHLC, getCoinHistory, getCoinDetail,
    getFearGreed, getCryptoNews, getRSS,
    getYahooQuote, getYahooSummary, getYahooSearch,
    calculateRSI, calculateStochastic,
    SEASONALITY_DATA,
    formatPrice, formatNum, formatPct, pctClass,
    timeAgo, fgLabel, fgColor, drawGaugeSVG
  };
})();
