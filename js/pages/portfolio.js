/* ============================================================
   PORTFOLIO TRACKER PAGE
   ============================================================ */
const PORTFOLIO_KEY = 'terminal_portfolio_v2';

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || []; }
  catch { return []; }
}

function savePortfolio(data) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
}

async function render_portfolio(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-20">
      <div>
        <div class="page-title-large">Portfolio Tracker</div>
        <div class="page-subtitle">Monitora le tue posizioni — dati salvati localmente nel browser</div>
      </div>
      <button class="btn btn-green" onclick="showAddPosition()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        Aggiungi Posizione
      </button>
    </div>

    <div id="portfolio-summary-bar" class="mb-16"></div>

    <div class="grid-2 mb-16" style="grid-template-columns:2fr 1fr">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Posizioni Aperte</div>
          <div id="portfolio-last-update" style="font-size:10px;color:var(--text-muted)"></div>
        </div>
        <div id="portfolio-table-wrap"></div>
      </div>
      <div class="card">
        <div class="card-title mb-12">Allocazione Portfolio</div>
        <div style="position:relative;width:200px;height:200px;margin:0 auto 16px">
          <canvas id="portfolio-pie-chart"></canvas>
        </div>
        <div id="portfolio-allocation-legend"></div>
      </div>
    </div>

    <div class="card" id="portfolio-closed-section" style="display:none">
      <div class="card-title mb-12">Posizioni Chiuse (Storico)</div>
      <div id="portfolio-closed-table"></div>
    </div>
  `;

  await refreshPortfolio();
}

window.showAddPosition = function() {
  const existing = loadPortfolio();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Aggiungi Posizione</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Asset (CoinGecko ID o Stock Symbol)</label>
          <input type="text" id="pos-asset" placeholder="bitcoin, ethereum, AAPL…" style="width:100%">
          <span style="font-size:10px;color:var(--text-muted);margin-top:2px">Per crypto usa l'ID CoinGecko: bitcoin, ethereum, solana…</span>
        </div>
        <div class="form-group">
          <label class="form-label">Ticker Display</label>
          <input type="text" id="pos-ticker" placeholder="BTC, ETH, AAPL…" style="width:100%">
        </div>
        <div class="form-group">
          <label class="form-label">Quantità</label>
          <input type="number" id="pos-qty" placeholder="0.00" step="any" style="width:100%">
        </div>
        <div class="form-group">
          <label class="form-label">Prezzo di Acquisto (USD)</label>
          <input type="number" id="pos-buy-price" placeholder="0.00" step="any" style="width:100%">
        </div>
        <div class="form-group">
          <label class="form-label">Data Acquisto</label>
          <input type="text" id="pos-date" placeholder="${new Date().toISOString().slice(0,10)}" style="width:100%">
        </div>
        <div class="form-group">
          <label class="form-label">Note (opzionale)</label>
          <input type="text" id="pos-notes" placeholder="Strategia, target…" style="width:100%">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annulla</button>
        <button class="btn btn-green" onclick="savePosition(this)">Salva</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

window.savePosition = async function(btn) {
  const asset    = document.getElementById('pos-asset')?.value.trim().toLowerCase();
  const ticker   = document.getElementById('pos-ticker')?.value.trim().toUpperCase();
  const qty      = parseFloat(document.getElementById('pos-qty')?.value);
  const buyPrice = parseFloat(document.getElementById('pos-buy-price')?.value);
  const date     = document.getElementById('pos-date')?.value || new Date().toISOString().slice(0,10);
  const notes    = document.getElementById('pos-notes')?.value.trim();

  if (!asset || !ticker || isNaN(qty) || isNaN(buyPrice)) {
    alert('Compila tutti i campi obbligatori'); return;
  }

  const portfolio = loadPortfolio();
  portfolio.push({
    id: Date.now(),
    asset, ticker, qty, buyPrice, date, notes,
    type: 'crypto', // default, will be determined on refresh
  });
  savePortfolio(portfolio);
  btn.closest('.modal-overlay').remove();
  await refreshPortfolio();
};

window.removePosition = async function(id) {
  if (!confirm('Rimuovere questa posizione?')) return;
  const portfolio = loadPortfolio().filter(p => p.id !== id);
  savePortfolio(portfolio);
  await refreshPortfolio();
};

window.refreshPortfolio = async function() {
  const portfolio = loadPortfolio();

  if (!portfolio.length) {
    document.getElementById('portfolio-summary-bar').innerHTML = `
      <div class="empty" style="flex-direction:column">
        <div style="font-size:40px;margin-bottom:8px">📊</div>
        <p>Nessuna posizione nel portfolio.</p>
        <p style="font-size:12px;color:var(--text-muted)">Clicca "Aggiungi Posizione" per iniziare.</p>
      </div>`;
    document.getElementById('portfolio-table-wrap').innerHTML = '';
    return;
  }

  // Fetch current prices for crypto assets
  const cryptoIds = [...new Set(portfolio.map(p => p.asset))].join(',');
  let prices = {};
  try {
    prices = await API.getCoinPrice(cryptoIds);
  } catch {}

  // Calculate P&L for each position
  const positions = portfolio.map(p => {
    const priceData = prices[p.asset];
    const currentPrice = priceData?.usd || null;
    const value = currentPrice ? currentPrice * p.qty : null;
    const cost = p.buyPrice * p.qty;
    const pnl = value !== null ? value - cost : null;
    const pnlPct = pnl !== null ? (pnl / cost * 100) : null;
    return { ...p, currentPrice, value, cost, pnl, pnlPct };
  });

  renderPortfolioSummary(positions);
  renderPortfolioTable(positions);
  renderPortfolioPie(positions);
  document.getElementById('portfolio-last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
};

function renderPortfolioSummary(positions) {
  const totalCost  = positions.reduce((s, p) => s + p.cost, 0);
  const totalValue = positions.reduce((s, p) => s + (p.value ?? p.cost), 0);
  const totalPnL   = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost * 100) : 0;

  const el = document.getElementById('portfolio-summary-bar');
  el.innerHTML = `
    <div class="grid-4">
      <div class="card card-sm">
        <div class="card-title">Valore Totale</div>
        <div class="card-value">${API.formatPrice(totalValue)}</div>
      </div>
      <div class="card card-sm">
        <div class="card-title">Costo Totale</div>
        <div class="card-value neutral">${API.formatPrice(totalCost)}</div>
      </div>
      <div class="card card-sm">
        <div class="card-title">P&amp;L Totale</div>
        <div class="card-value ${API.pctClass(totalPnL)}">${totalPnL >= 0 ? '+' : ''}${API.formatPrice(totalPnL)}</div>
      </div>
      <div class="card card-sm">
        <div class="card-title">P&amp;L %</div>
        <div class="card-value ${API.pctClass(totalPnLPct)}">${API.formatPct(totalPnLPct)}</div>
      </div>
    </div>`;
}

function renderPortfolioTable(positions) {
  const el = document.getElementById('portfolio-table-wrap');
  if (!el) return;

  if (!positions.length) {
    el.innerHTML = `<div class="empty">Aggiungi posizioni per vederle qui</div>`;
    return;
  }

  const rows = positions.map(p => {
    const pnlClass = p.pnl !== null ? API.pctClass(p.pnl) : 'neutral';
    return `<tr>
      <td>
        <div style="font-family:var(--mono);font-weight:700">${p.ticker}</div>
        <div style="font-size:10px;color:var(--text-muted)">${p.date}</div>
      </td>
      <td class="r">${p.qty.toLocaleString('it', {maximumFractionDigits:8})}</td>
      <td class="r">${API.formatPrice(p.buyPrice)}</td>
      <td class="r">${p.currentPrice !== null ? API.formatPrice(p.currentPrice) : '<span class="muted">—</span>'}</td>
      <td class="r">${API.formatPrice(p.cost)}</td>
      <td class="r">${p.value !== null ? API.formatPrice(p.value) : '<span class="muted">—</span>'}</td>
      <td class="r ${pnlClass}">${p.pnl !== null ? (p.pnl >= 0 ? '+' : '') + API.formatPrice(p.pnl) : '—'}</td>
      <td class="r ${pnlClass}">${p.pnlPct !== null ? API.formatPct(p.pnlPct) : '—'}</td>
      <td class="c">
        <button class="btn btn-red btn-sm" onclick="removePosition(${p.id})">✕</button>
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th class="r">Qty</th>
            <th class="r">Buy Price</th>
            <th class="r">Current</th>
            <th class="r">Cost</th>
            <th class="r">Value</th>
            <th class="r">P&amp;L $</th>
            <th class="r">P&amp;L %</th>
            <th class="c">Del</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderPortfolioPie(positions) {
  const canvas = document.getElementById('portfolio-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chartInstance) { canvas._chartInstance.destroy(); }

  const valid = positions.filter(p => p.value !== null && p.value > 0);
  if (!valid.length) return;

  const total = valid.reduce((s, p) => s + p.value, 0);
  const COLORS = ['#00e5b4','#4da6ff','#f5c400','#ff3d6a','#a78bfa','#fb923c','#34d399','#60a5fa'];

  const data = valid.map((p, i) => ({
    label: p.ticker,
    value: p.value,
    pct: (p.value / total * 100).toFixed(1),
    color: COLORS[i % COLORS.length],
  }));

  canvas._chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color + 'cc'),
        borderColor: data.map(d => d.color),
        borderWidth: 1.5,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${API.formatPrice(ctx.raw)} (${data[ctx.dataIndex].pct}%)`
          }
        }
      },
      cutout: '65%',
    }
  });

  const legend = document.getElementById('portfolio-allocation-legend');
  if (legend) {
    legend.innerHTML = data.map(d => `
      <div class="stat-row">
        <span class="stat-label flex gap-8">
          <span style="width:10px;height:10px;border-radius:2px;background:${d.color};flex-shrink:0;margin-top:2px"></span>
          ${d.label}
        </span>
        <span class="stat-val">${d.pct}%</span>
      </div>`).join('');
  }
}
