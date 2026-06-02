/* ============================================================
   PATTERNS PAGE
   ============================================================ */
const PATTERN_LIST = [
  {
    name: 'Head & Shoulders',
    type: 'bearish',
    desc: 'Tre picchi con quello centrale più alto. Segnale di inversione ribassista dopo un trend rialzista.',
    reliability: 85,
    look: 'Cerca: spalla sx → testa alta → spalla dx → rottura della neckline',
  },
  {
    name: 'Inverse Head & Shoulders',
    type: 'bullish',
    desc: 'Tre minimi con quello centrale più basso. Segnale di inversione rialzista dopo un trend ribassista.',
    reliability: 83,
    look: 'Cerca: spalla sx → minimo → spalla dx → breakout sopra neckline',
  },
  {
    name: 'Double Top',
    type: 'bearish',
    desc: 'Due massimi allo stesso livello con un minimo tra loro. Forte segnale di resistenza.',
    reliability: 72,
    look: 'Conferma quando il prezzo rompe il supporto intermedio',
  },
  {
    name: 'Double Bottom',
    type: 'bullish',
    desc: 'Due minimi allo stesso livello con un massimo tra loro. Segnale di supporto forte.',
    reliability: 78,
    look: 'Conferma quando il prezzo rompe la resistenza intermedia con volume',
  },
  {
    name: 'Bull Flag',
    type: 'bullish',
    desc: 'Forte movimento rialzista seguito da consolidamento laterale/ribassista. Continuazione del trend.',
    reliability: 68,
    look: 'Asta → canale discendente stretto → breakout rialzista con volume',
  },
  {
    name: 'Bear Flag',
    type: 'bearish',
    desc: 'Forte movimento ribassista seguito da consolidamento rialzista. Continuazione del trend ribassista.',
    reliability: 65,
    look: 'Asta → canale ascendente stretto → breakout ribassista',
  },
  {
    name: 'Ascending Triangle',
    type: 'bullish',
    desc: 'Massimi orizzontali con minimi crescenti. Accumulo di pressione rialzista.',
    reliability: 72,
    look: 'Resistenza piatta + trend line rialzista sui minimi → breakout',
  },
  {
    name: 'Descending Triangle',
    type: 'bearish',
    desc: 'Minimi orizzontali con massimi decrescenti. Accumulo di pressione ribassista.',
    reliability: 70,
    look: 'Supporto piatto + trend line ribassista sui massimi → breakdown',
  },
  {
    name: 'Hammer / Hanging Man',
    type: 'reversal',
    desc: 'Candlestick con corpo piccolo in alto e lunga shadow inferiore. Hammer = bullish reversal; Hanging Man = bearish.',
    reliability: 60,
    look: 'Shadow inferiore almeno 2x il corpo. Conferma dalla candela successiva.',
  },
  {
    name: 'Doji',
    type: 'neutral',
    desc: 'Apertura e chiusura quasi identiche. Indecisione del mercato. Potenziale inversione.',
    reliability: 55,
    look: 'Corpo quasi nullo. Long-legged Doji = forte indecisione.',
  },
  {
    name: 'Engulfing Pattern',
    type: 'reversal',
    desc: 'Candela che ingloba completamente la precedente. Bullish o Bearish Engulfing.',
    reliability: 75,
    look: 'Corpo della seconda candela più grande che ingloba corpo prima candela',
  },
  {
    name: 'Cup & Handle',
    type: 'bullish',
    desc: 'Formazione a tazza con manico. Tipicamente rialzista con target = altezza tazza.',
    reliability: 65,
    look: 'Arrotondamento a U → consolidamento laterale → breakout',
  },
];

async function render_patterns(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">Chart Patterns</div>
        <div class="page-subtitle">Pattern recognition guide + live chart analysis</div>
      </div>
      <div class="flex gap-8">
        <select id="pattern-symbol" style="min-width:140px">
          <option value="BINANCE:BTCUSDT">BTC/USDT</option>
          <option value="BINANCE:ETHUSDT">ETH/USDT</option>
          <option value="BINANCE:SOLUSDT">SOL/USDT</option>
          <option value="NASDAQ:AAPL">AAPL</option>
          <option value="NASDAQ:NVDA">NVDA</option>
          <option value="SP:SPX">S&amp;P 500</option>
          <option value="COMEX:GC1!">Gold</option>
        </select>
        <select id="pattern-interval" style="min-width:80px">
          <option value="D">Daily</option>
          <option value="W">Weekly</option>
          <option value="240">4H</option>
          <option value="60">1H</option>
          <option value="15">15m</option>
        </select>
        <button class="btn btn-green btn-sm" onclick="loadPatternChart()">Load Chart</button>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-title mb-12">Live Chart — Pattern Analysis</div>
      <div class="tradingview-wrap" id="pattern-tv-wrap"></div>
    </div>

    <div class="section-divider">Pattern Reference Library</div>

    <div class="flex gap-8 mb-16" id="pattern-type-filter">
      <div class="tab active" data-filter="all" style="cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;background:var(--bg-input);color:var(--text-primary)">All</div>
      <div class="tab" data-filter="bullish" style="cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;color:var(--text-secondary)">Bullish</div>
      <div class="tab" data-filter="bearish" style="cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;color:var(--text-secondary)">Bearish</div>
      <div class="tab" data-filter="reversal" style="cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;color:var(--text-secondary)">Reversal</div>
    </div>

    <div class="grid-3" id="pattern-grid"></div>
  `;

  loadPatternChart();
  renderPatternGrid('all');

  document.getElementById('pattern-type-filter').addEventListener('click', e => {
    const tab = e.target.closest('[data-filter]');
    if (!tab) return;
    document.querySelectorAll('#pattern-type-filter [data-filter]').forEach(t => {
      t.classList.remove('active');
      t.style.background = 'transparent';
      t.style.color = 'var(--text-secondary)';
    });
    tab.classList.add('active');
    tab.style.background = 'var(--bg-input)';
    tab.style.color = 'var(--text-primary)';
    renderPatternGrid(tab.dataset.filter);
  });
}

window.loadPatternChart = function() {
  const sym = document.getElementById('pattern-symbol')?.value || 'BINANCE:BTCUSDT';
  const interval = document.getElementById('pattern-interval')?.value || 'D';
  const wrap = document.getElementById('pattern-tv-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'tradingview-widget-container';
  container.style.cssText = 'height:100%;width:100%';
  container.innerHTML = `<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>`;
  wrap.appendChild(container);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.textContent = JSON.stringify({
    autosize: true, symbol: sym, interval,
    timezone: 'Europe/Rome', theme: 'dark', style: '1',
    locale: 'it', toolbar_bg: '#0d1626',
    enable_publishing: false, withdateranges: true,
    hide_side_toolbar: false, allow_symbol_change: true,
    studies: ['Volume@tv-basicstudies'],
    backgroundColor: '#060c18',
  });
  container.appendChild(script);
};

function renderPatternGrid(filter) {
  const patterns = filter === 'all' ? PATTERN_LIST : PATTERN_LIST.filter(p => p.type === filter);
  const grid = document.getElementById('pattern-grid');
  if (!grid) return;

  grid.innerHTML = patterns.map(p => {
    const typeColors = {
      bullish: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Bullish' },
      bearish: { bg: 'var(--red-dim)',   color: 'var(--red)',   label: 'Bearish' },
      reversal:{ bg: 'var(--blue-dim)',  color: 'var(--blue)',  label: 'Reversal' },
      neutral: { bg: 'var(--yellow-dim)',color: 'var(--yellow)',label: 'Neutral' },
    };
    const tc = typeColors[p.type] || typeColors.neutral;
    const reliabilityColor = p.reliability >= 75 ? 'var(--green)' : p.reliability >= 65 ? 'var(--yellow)' : 'var(--red)';

    return `
      <div class="card">
        <div class="flex-between mb-8">
          <span style="font-size:14px;font-weight:700">${p.name}</span>
          <span class="badge" style="background:${tc.bg};color:${tc.color}">${tc.label}</span>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.6">${p.desc}</p>
        <div style="background:var(--bg-input);border-radius:4px;padding:8px;margin-bottom:10px;font-size:11px;color:var(--text-muted)">
          💡 ${p.look}
        </div>
        <div class="flex-between">
          <span style="font-size:11px;color:var(--text-muted)">Reliability</span>
          <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${reliabilityColor}">${p.reliability}%</span>
        </div>
        <div style="margin-top:4px;height:4px;background:var(--bg-input);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${p.reliability}%;background:${reliabilityColor};border-radius:2px"></div>
        </div>
      </div>`;
  }).join('');
}
