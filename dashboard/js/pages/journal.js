/* ============================================================
   TRADING JOURNAL — Log trades, track performance
   ============================================================ */
const JOURNAL_KEY = 'terminal_journal_v1';

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || []; }
  catch { return []; }
}

function saveJournal(data) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(data));
}

const SETUPS = ['Breakout','Support Bounce','Resistance Rejection','RSI Oversold','RSI Overbought',
  'Moving Average Cross','Trend Following','Counter-trend','News-driven','Pattern (H&S)','Altro'];

async function render_journal(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Trading Journal</div>
        <div class="page-subtitle">Registra e analizza i tuoi trade per migliorare la disciplina</div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="exportJournal()">⬇ CSV</button>
        <button class="btn btn-green btn-sm" onclick="showAddTrade()">+ Aggiungi Trade</button>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div class="grid-4 mb-16" id="journal-stats"></div>

    <!-- FILTER BAR -->
    <div class="card mb-16" style="padding:12px 16px">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div class="form-group" style="gap:4px">
          <label class="form-label">Asset</label>
          <input type="text" id="jrn-filter-asset" placeholder="BTC, ETH…" style="width:100px" oninput="renderJournalTable()">
        </div>
        <div class="form-group" style="gap:4px">
          <label class="form-label">Tipo</label>
          <select id="jrn-filter-type" style="width:110px" onchange="renderJournalTable()">
            <option value="all">Tutti</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
            <option value="spot">Spot</option>
          </select>
        </div>
        <div class="form-group" style="gap:4px">
          <label class="form-label">Risultato</label>
          <select id="jrn-filter-result" style="width:110px" onchange="renderJournalTable()">
            <option value="all">Tutti</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="open">Aperto</option>
          </select>
        </div>
        <div class="form-group" style="gap:4px">
          <label class="form-label">Setup</label>
          <select id="jrn-filter-setup" style="width:150px" onchange="renderJournalTable()">
            <option value="all">Tutti</option>
            ${SETUPS.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="resetJournalFilters()">↺ Reset</button>
        <span id="jrn-count" style="font-size:11px;color:var(--text-muted);margin-top:14px;margin-left:auto"></span>
      </div>
    </div>

    <!-- CHARTS ROW -->
    <div class="grid-2 mb-16" style="gap:20px">
      <div class="card">
        <div class="card-title mb-12">P&amp;L Cumulativo</div>
        <div style="height:160px;position:relative"><canvas id="jrn-pnl-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title mb-12">Distribuzione Risultati</div>
        <div style="height:160px;position:relative"><canvas id="jrn-dist-chart"></canvas></div>
      </div>
    </div>

    <!-- TRADE LOG -->
    <div class="card">
      <div class="card-title mb-12">Log Operazioni</div>
      <div id="jrn-table-wrap"></div>
    </div>

    <!-- MODAL PLACEHOLDER -->
    <div id="jrn-modal-wrap"></div>
  `;

  renderJournalStats();
  renderJournalTable();
  renderJournalCharts();
}

function getFilteredTrades() {
  const trades = loadJournal().slice().reverse();
  const asset  = (document.getElementById('jrn-filter-asset')?.value || '').toUpperCase();
  const type   = document.getElementById('jrn-filter-type')?.value  || 'all';
  const result = document.getElementById('jrn-filter-result')?.value || 'all';
  const setup  = document.getElementById('jrn-filter-setup')?.value  || 'all';

  return trades.filter(t => {
    if (asset && !t.asset.toUpperCase().includes(asset)) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (result !== 'all') {
      if (result === 'open'  && t.status !== 'open')    return false;
      if (result === 'win'   && t.result !== 'win')     return false;
      if (result === 'loss'  && t.result !== 'loss')    return false;
    }
    if (setup !== 'all' && t.setup !== setup) return false;
    return true;
  });
}

function renderJournalStats() {
  const el = document.getElementById('journal-stats');
  if (!el) return;
  const all = loadJournal();
  const closed = all.filter(t => t.status === 'closed');
  const wins = closed.filter(t => t.result === 'win');
  const losses = closed.filter(t => t.result === 'loss');
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length * 100) : 0;
  const avgWin  = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0;
  const profitFactor = losses.length && avgLoss !== 0
    ? Math.abs(wins.reduce((s, t) => s + (t.pnl || 0), 0) / losses.reduce((s, t) => s + (t.pnl || 0), 0))
    : null;

  el.innerHTML = `
    <div class="card card-sm">
      <div class="card-title">P&amp;L Totale</div>
      <div class="card-value ${API.pctClass(totalPnl)}">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</div>
      <div class="card-change neutral">${closed.length} trade chiusi</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Win Rate</div>
      <div class="card-value ${winRate >= 50 ? 'positive' : 'negative'}">${winRate.toFixed(1)}%</div>
      <div class="card-change neutral">${wins.length}W / ${losses.length}L</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Avg Win / Loss</div>
      <div class="card-value" style="font-size:16px;margin-top:4px">
        <span class="positive">+$${avgWin.toFixed(2)}</span> /
        <span class="negative">$${avgLoss.toFixed(2)}</span>
      </div>
      <div class="card-change neutral">per trade</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Profit Factor</div>
      <div class="card-value ${profitFactor !== null ? (profitFactor >= 1 ? 'positive' : 'negative') : 'neutral'}">
        ${profitFactor !== null ? profitFactor.toFixed(2) : '—'}
      </div>
      <div class="card-change neutral">${all.filter(t => t.status === 'open').length} aperti</div>
    </div>`;
}

function renderJournalTable() {
  const trades = getFilteredTrades();
  const wrap = document.getElementById('jrn-table-wrap');
  const countEl = document.getElementById('jrn-count');
  if (countEl) countEl.textContent = `${trades.length} trade`;
  if (!wrap) return;

  if (!trades.length) {
    wrap.innerHTML = `<div class="empty">Nessun trade. Clicca "+ Aggiungi Trade" per iniziare.</div>`;
    return;
  }

  const typeColors = { long: 'green', short: 'red', spot: 'blue' };
  const resultColors = { win: 'badge-green', loss: 'badge-red', open: 'badge-blue', 'break_even': 'badge-yellow' };

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Data</th><th>Asset</th><th>Tipo</th>
          <th class="r">Entry</th><th class="r">Exit</th><th class="r">Size</th>
          <th class="r">P&amp;L</th><th class="r">P&amp;L %</th>
          <th>Setup</th><th>Note</th><th class="c">Az.</th>
        </tr></thead>
        <tbody>
          ${trades.map(t => {
            const pnlPct = t.entryPrice && t.size
              ? (t.pnl || 0) / t.size * 100 : null;
            return `<tr>
              <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${t.date}</td>
              <td><strong style="font-family:var(--mono)">${t.asset}</strong></td>
              <td><span class="badge badge-${typeColors[t.type] || 'muted'}">${t.type}</span></td>
              <td class="r mono">${t.entryPrice ? API.formatPrice(t.entryPrice) : '—'}</td>
              <td class="r mono">${t.exitPrice ? API.formatPrice(t.exitPrice) : '—'}</td>
              <td class="r mono" style="font-size:11px">$${(t.size || 0).toFixed(2)}</td>
              <td class="r ${t.pnl !== null && t.pnl !== undefined ? API.pctClass(t.pnl) : 'neutral'}" style="font-weight:600">
                ${t.pnl !== null && t.pnl !== undefined ? (t.pnl >= 0 ? '+' : '') + '$' + t.pnl.toFixed(2) : '—'}
              </td>
              <td class="r ${pnlPct !== null ? API.pctClass(pnlPct) : 'neutral'}">
                ${pnlPct !== null ? API.formatPct(pnlPct) : '—'}
              </td>
              <td style="font-size:11px;color:var(--text-secondary)">${t.setup || '—'}</td>
              <td style="font-size:11px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis" title="${t.notes || ''}">${t.notes || '—'}</td>
              <td class="c" style="white-space:nowrap">
                ${t.status === 'open'
                  ? `<button class="btn btn-ghost btn-sm" onclick="closeTrade(${t.id})">Close</button>`
                  : ''}
                <button class="btn btn-red btn-sm" onclick="deleteTrade(${t.id})">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderJournalCharts() {
  const all = loadJournal().filter(t => t.status === 'closed' && t.pnl !== null);
  const sorted = [...all].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Cumulative P&L
  const pnlCanvas = document.getElementById('jrn-pnl-chart');
  if (pnlCanvas && typeof Chart !== 'undefined' && sorted.length) {
    let cumulative = 0;
    const labels = sorted.map(t => t.date);
    const values = sorted.map(t => { cumulative += (t.pnl || 0); return parseFloat(cumulative.toFixed(2)); });
    new Chart(pnlCanvas, {
      type: 'line',
      data: {
        labels, datasets: [{
          label: 'P&L Cumulativo',
          data: values,
          borderColor: cumulative >= 0 ? '#00e5b4' : '#ff3d6a',
          backgroundColor: cumulative >= 0 ? 'rgba(0,229,180,0.08)' : 'rgba(255,61,106,0.08)',
          fill: true, tension: 0.3, pointRadius: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '$' + ctx.raw } } },
        scales: {
          x: { ticks: { color: '#4a5a6a', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { ticks: { color: '#4a5a6a', font: { size: 9 }, callback: v => '$' + v }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  }

  // Distribution chart
  const distCanvas = document.getElementById('jrn-dist-chart');
  if (distCanvas && typeof Chart !== 'undefined' && all.length) {
    const wins   = all.filter(t => (t.pnl || 0) > 0).length;
    const losses = all.filter(t => (t.pnl || 0) < 0).length;
    const even   = all.filter(t => (t.pnl || 0) === 0).length;
    const open   = loadJournal().filter(t => t.status === 'open').length;

    new Chart(distCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Win', 'Loss', 'Break Even', 'Aperti'],
        datasets: [{
          data: [wins, losses, even, open],
          backgroundColor: ['rgba(0,229,180,0.8)','rgba(255,61,106,0.8)','rgba(245,196,0,0.8)','rgba(77,166,255,0.8)'],
          borderColor: ['#00e5b4','#ff3d6a','#f5c400','#4da6ff'],
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#8892a0', font: { size: 10 }, boxWidth: 10, padding: 6 } }
        },
        cutout: '55%',
      }
    });
  }
}

window.showAddTrade = function() {
  const today = new Date().toISOString().slice(0, 10);
  const wrap = document.getElementById('jrn-modal-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)this.innerHTML=''">
      <div class="modal" style="width:520px">
        <div class="modal-title">Aggiungi Trade</div>
        <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="gap:6px">
            <label class="form-label">Data *</label>
            <input type="date" id="jt-date" value="${today}" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Asset *</label>
            <input type="text" id="jt-asset" placeholder="BTC, ETH, AAPL…" style="width:100%" autofocus>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Tipo *</label>
            <select id="jt-type" style="width:100%">
              <option value="long">Long</option>
              <option value="short">Short</option>
              <option value="spot">Spot</option>
            </select>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Status</label>
            <select id="jt-status" style="width:100%" onchange="toggleExitFields()">
              <option value="open">Aperto</option>
              <option value="closed">Chiuso</option>
            </select>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Prezzo Entry *</label>
            <input type="number" id="jt-entry" placeholder="0.00" step="any" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px" id="jt-exit-group">
            <label class="form-label">Prezzo Exit</label>
            <input type="number" id="jt-exit" placeholder="0.00" step="any" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Size (USD) *</label>
            <input type="number" id="jt-size" placeholder="1000" step="any" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Commissioni (USD)</label>
            <input type="number" id="jt-fee" placeholder="0.00" step="any" value="0" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px" id="jt-pnl-group">
            <label class="form-label">P&amp;L (auto-calc o manuale)</label>
            <input type="number" id="jt-pnl" placeholder="auto" step="any" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Setup</label>
            <select id="jt-setup" style="width:100%">
              <option value="">— Nessuno —</option>
              ${SETUPS.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="gap:6px;grid-column:1/-1">
            <label class="form-label">Lezione imparata / Note</label>
            <input type="text" id="jt-notes" placeholder="Cosa hai imparato da questo trade?" style="width:100%">
          </div>
        </div>
        <div style="padding:10px 0 0;font-size:11px;color:var(--text-muted)">* Campi obbligatori</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('jrn-modal-wrap').innerHTML=''">Annulla</button>
          <button class="btn btn-green" onclick="saveTrade()">Salva Trade</button>
        </div>
      </div>
    </div>`;
};

window.toggleExitFields = function() {
  const status = document.getElementById('jt-status')?.value;
  const exitG = document.getElementById('jt-exit-group');
  const pnlG  = document.getElementById('jt-pnl-group');
  if (exitG) exitG.style.opacity = status === 'closed' ? '1' : '0.4';
  if (pnlG)  pnlG.style.opacity  = status === 'closed' ? '1' : '0.4';
};

window.saveTrade = function() {
  const date    = document.getElementById('jt-date')?.value;
  const asset   = document.getElementById('jt-asset')?.value.trim().toUpperCase();
  const type    = document.getElementById('jt-type')?.value;
  const status  = document.getElementById('jt-status')?.value;
  const entry   = parseFloat(document.getElementById('jt-entry')?.value);
  const exit    = parseFloat(document.getElementById('jt-exit')?.value);
  const size    = parseFloat(document.getElementById('jt-size')?.value);
  const fee     = parseFloat(document.getElementById('jt-fee')?.value) || 0;
  const manPnl  = parseFloat(document.getElementById('jt-pnl')?.value);
  const setup   = document.getElementById('jt-setup')?.value;
  const notes   = document.getElementById('jt-notes')?.value.trim();

  if (!date || !asset || isNaN(entry) || isNaN(size)) {
    alert('Compila i campi obbligatori: data, asset, prezzo entry, size'); return;
  }

  // Auto-calculate P&L if exit is provided
  let pnl = null;
  if (status === 'closed') {
    if (!isNaN(manPnl)) {
      pnl = manPnl;
    } else if (!isNaN(exit)) {
      const pct = type === 'short'
        ? (entry - exit) / entry
        : (exit - entry) / entry;
      pnl = pct * size - fee;
    }
  }

  const result = pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'break_even';

  const trades = loadJournal();
  trades.push({ id: Date.now(), date, asset, type, status, entryPrice: entry, exitPrice: isNaN(exit) ? null : exit, size, fee, pnl, setup, notes, result });
  saveJournal(trades);
  document.getElementById('jrn-modal-wrap').innerHTML = '';
  renderJournalStats();
  renderJournalTable();
  renderJournalCharts();
};

window.deleteTrade = function(id) {
  if (!confirm('Eliminare questo trade?')) return;
  saveJournal(loadJournal().filter(t => t.id !== id));
  renderJournalStats();
  renderJournalTable();
  renderJournalCharts();
};

window.closeTrade = function(id) {
  const trades = loadJournal();
  const t = trades.find(x => x.id === id);
  if (!t) return;
  const exitStr = prompt(`Inserisci il prezzo di uscita per ${t.asset}:`);
  const exitPrice = parseFloat(exitStr);
  if (isNaN(exitPrice) || exitPrice <= 0) return;
  const pct = t.type === 'short'
    ? (t.entryPrice - exitPrice) / t.entryPrice
    : (exitPrice - t.entryPrice) / t.entryPrice;
  const pnl = pct * t.size - (t.fee || 0);
  const result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'break_even';
  Object.assign(t, { exitPrice, pnl, result, status: 'closed' });
  saveJournal(trades);
  renderJournalStats();
  renderJournalTable();
  renderJournalCharts();
};

window.resetJournalFilters = function() {
  ['jrn-filter-asset'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['jrn-filter-type','jrn-filter-result','jrn-filter-setup'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
  renderJournalTable();
};

window.exportJournal = function() {
  const trades = loadJournal();
  if (!trades.length) return;
  const header = 'ID,Date,Asset,Type,Status,EntryPrice,ExitPrice,Size,Fee,PnL,PnL%,Setup,Notes,Result\n';
  const rows = trades.map(t => {
    const pnlPct = t.pnl !== null && t.size ? (t.pnl / t.size * 100).toFixed(2) : '';
    return `${t.id},"${t.date}","${t.asset}","${t.type}","${t.status}",${t.entryPrice || ''},${t.exitPrice || ''},${t.size || ''},${t.fee || ''},${t.pnl !== null ? t.pnl.toFixed(2) : ''},${pnlPct},"${t.setup || ''}","${(t.notes || '').replace(/"/g, '""')}","${t.result || ''}"`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
