/* ============================================================
   PRICE ALERTS PAGE — Browser notifications when price is hit
   ============================================================ */
const ALERTS_KEY = 'terminal_price_alerts_v1';
const ALERTS_HISTORY_KEY = 'terminal_alerts_history_v1';

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY)) || []; }
  catch { return []; }
}

function saveAlerts(data) { localStorage.setItem(ALERTS_KEY, JSON.stringify(data)); }

function loadAlertHistory() {
  try { return JSON.parse(localStorage.getItem(ALERTS_HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveAlertHistory(data) {
  const trimmed = data.slice(-50); // keep last 50
  localStorage.setItem(ALERTS_HISTORY_KEY, JSON.stringify(trimmed));
}

/* ---- Alert Engine (runs globally, not tied to page) ---- */
const AlertEngine = (() => {
  let timer = null;
  let notifGranted = false;

  async function requestNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { notifGranted = true; return true; }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      notifGranted = perm === 'granted';
      return notifGranted;
    }
    return false;
  }

  async function checkAlerts() {
    const alerts = loadAlerts().filter(a => a.active);
    if (!alerts.length) return;

    const ids = [...new Set(alerts.map(a => a.coinId))].join(',');
    let prices = {};
    try { prices = await API.getCoinPrice(ids); } catch { return; }

    const now = Date.now();
    let triggered = false;
    const updatedAlerts = loadAlerts().map(alert => {
      if (!alert.active) return alert;
      const priceData = prices[alert.coinId];
      if (!priceData) return alert;
      const current = priceData.usd;
      const hit = (alert.direction === 'above' && current >= alert.target)
               || (alert.direction === 'below' && current <= alert.target);
      if (hit) {
        triggered = true;
        notify(alert, current);
        const history = loadAlertHistory();
        history.push({ ...alert, triggeredAt: now, triggeredPrice: current, active: false });
        saveAlertHistory(history);
        return { ...alert, active: false, triggeredAt: now, triggeredPrice: current };
      }
      return { ...alert, currentPrice: current, checkedAt: now };
    });

    saveAlerts(updatedAlerts);
    if (triggered) refreshAlertUI();
  }

  function notify(alert, price) {
    const dir = alert.direction === 'above' ? '↑ sopra' : '↓ sotto';
    const msg = `${alert.symbol} è ${dir} ${API.formatPrice(alert.target)} — Prezzo attuale: ${API.formatPrice(price)}`;

    // Browser notification
    if (notifGranted) {
      try {
        new Notification(`🔔 Alert: ${alert.symbol}`, { body: msg, icon: '' });
      } catch {}
    }

    // In-page toast
    showToast(msg, alert.direction === 'above' ? 'green' : 'red');
  }

  function showToast(msg, color = 'green') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:var(--bg-card);border:1px solid var(--${color === 'green' ? 'green' : 'red'});
      border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text-primary);
      box-shadow:var(--shadow);max-width:340px;animation:fadeIn 0.3s ease;
    `;
    toast.innerHTML = `<strong style="color:var(--${color === 'green' ? 'green' : 'red'})">🔔 Alert Scattato!</strong><br>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  }

  function start(intervalMs = 30000) {
    if (timer) clearInterval(timer);
    requestNotifPermission();
    timer = setInterval(checkAlerts, intervalMs);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  return { start, stop, checkAlerts, requestNotifPermission, isGranted: () => notifGranted };
})();

// Start the alert engine globally
AlertEngine.start(30000);

/* ---- Refresh alert page UI (if visible) ---- */
function refreshAlertUI() {
  const wrap = document.getElementById('alerts-active-wrap');
  const histWrap = document.getElementById('alerts-history-wrap');
  if (wrap) renderActiveAlerts(wrap);
  if (histWrap) renderAlertHistory(histWrap);
}

/* ---- PAGE ---- */
async function render_alerts(el) {
  el.innerHTML = `
    <div class="page-header flex-between mb-16">
      <div>
        <div class="page-title-large">Price Alerts</div>
        <div class="page-subtitle">Ricevi notifiche quando un asset raggiunge il tuo target</div>
      </div>
      <div class="flex gap-8">
        <span id="alert-engine-status" style="font-size:11px;color:var(--text-muted);align-self:center"></span>
        <button class="btn btn-ghost btn-sm" onclick="AlertEngine.checkAlerts();refreshAlertUI()">
          Verifica ora
        </button>
        <button class="btn btn-green btn-sm" onclick="showAddAlertModal()">+ Nuovo Alert</button>
      </div>
    </div>

    <div id="alert-notif-banner" class="mb-16"></div>

    <div class="grid-2 mb-16" style="gap:20px">
      <div class="card">
        <div class="card-header mb-0">
          <div class="card-title">Alert Attivi</div>
          <button class="btn btn-ghost btn-sm" onclick="refreshAlertUI()">↻</button>
        </div>
        <div id="alerts-active-wrap" style="margin-top:12px"></div>
      </div>
      <div class="card">
        <div class="card-title mb-12">Come Funziona</div>
        ${[
          ['1', 'Clicca "+ Nuovo Alert"', 'Inserisci l\'ID CoinGecko e il prezzo target'],
          ['2', 'Concedi i permessi', 'Il browser chiede il permesso per le notifiche'],
          ['3', 'Aspetta', 'Il sistema controlla i prezzi ogni 30 secondi'],
          ['4', 'Ricevi la notifica', 'Quando il prezzo viene raggiunto, appare un avviso'],
        ].map(([n, title, desc]) => `
          <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:22px;height:22px;border-radius:50%;background:var(--green-dim);color:var(--green);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${n}</div>
            <div>
              <div style="font-size:12px;font-weight:600">${title}</div>
              <div style="font-size:11px;color:var(--text-muted)">${desc}</div>
            </div>
          </div>`).join('')}
        <div style="padding-top:10px">
          <button class="btn btn-ghost btn-sm" onclick="AlertEngine.requestNotifPermission().then(g=>{document.getElementById('alert-engine-status').textContent=g?'✓ Notifiche abilitate':'⚠ Notifiche negate';})">
            🔔 Abilita Notifiche Browser
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title mb-12">Storico Alert Scattati</div>
      <div id="alerts-history-wrap"></div>
    </div>

    <div id="alert-modal-wrap"></div>
  `;

  // Check notification permission
  const permStatus = Notification?.permission;
  const banner = document.getElementById('alert-notif-banner');
  if (permStatus === 'denied') {
    banner.innerHTML = `<div class="alert alert-warning">⚠️ Le notifiche browser sono bloccate. Abilitalele nelle impostazioni del browser per questo sito.</div>`;
  } else if (permStatus !== 'granted') {
    banner.innerHTML = `<div class="alert alert-info">ℹ️ Le notifiche browser non sono ancora abilitate. <button onclick="AlertEngine.requestNotifPermission()" style="color:var(--blue);font-size:12px;text-decoration:underline;background:none;border:none;cursor:pointer">Abilita ora</button></div>`;
  }

  const statusEl = document.getElementById('alert-engine-status');
  if (statusEl) statusEl.textContent = `Engine attivo — check ogni 30s`;

  renderActiveAlerts(document.getElementById('alerts-active-wrap'));
  renderAlertHistory(document.getElementById('alerts-history-wrap'));
}

function renderActiveAlerts(wrap) {
  if (!wrap) return;
  const alerts = loadAlerts();
  const active = alerts.filter(a => a.active);
  const inactive = alerts.filter(a => !a.active && !a.triggeredAt);

  if (!active.length) {
    wrap.innerHTML = `<div class="empty" style="padding:24px">Nessun alert attivo.<br><span style="font-size:11px">Clicca "+ Nuovo Alert" per aggiungerne uno.</span></div>`;
    return;
  }

  wrap.innerHTML = active.map(a => {
    const dirColor = a.direction === 'above' ? 'var(--green)' : 'var(--red)';
    const dirIcon = a.direction === 'above' ? '▲' : '▼';
    const progress = a.currentPrice && a.target
      ? Math.min((a.currentPrice / a.target) * 100, 200)
      : null;
    const distPct = a.currentPrice && a.target
      ? ((a.target - a.currentPrice) / a.currentPrice * 100)
      : null;

    return `
      <div style="padding:12px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <span style="font-family:var(--mono);font-weight:700;font-size:14px">${a.symbol}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:6px">${a.coinId}</span>
          </div>
          <button onclick="deleteAlert(${a.id})" style="font-size:11px;color:var(--text-muted);background:none;border:none;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:12px;color:${dirColor};font-weight:600">${dirIcon} ${a.direction === 'above' ? 'Sopra' : 'Sotto'}</span>
          <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:${dirColor}">${API.formatPrice(a.target)}</span>
          ${a.note ? `<span style="font-size:11px;color:var(--text-muted);margin-left:4px">— ${a.note}</span>` : ''}
        </div>
        ${a.currentPrice ? `
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">
            Prezzo attuale: <strong style="font-family:var(--mono)">${API.formatPrice(a.currentPrice)}</strong>
            ${distPct !== null ? ` — Distanza: <strong style="color:${Math.abs(distPct) < 5 ? 'var(--yellow)' : 'var(--text-secondary)'}">${distPct >= 0 ? '+' : ''}${distPct.toFixed(1)}%</strong>` : ''}
          </div>
          <div style="height:4px;background:var(--bg-card);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${Math.min(progress, 100)}%;background:${a.direction === 'above' ? 'var(--green)' : 'var(--red)'};border-radius:2px;transition:width 0.5s"></div>
          </div>` : ''}
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px">
          Creato: ${new Date(a.createdAt).toLocaleString('it-IT')}
          ${a.checkedAt ? ` • Controllato: ${API.timeAgo(a.checkedAt/1000)}` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderAlertHistory(wrap) {
  if (!wrap) return;
  const history = loadAlertHistory().slice().reverse();
  if (!history.length) {
    wrap.innerHTML = `<div class="empty" style="padding:20px">Nessun alert scattato finora</div>`;
    return;
  }
  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Asset</th><th>Tipo</th><th>Target</th><th>Prezzo Attuale</th><th>Note</th><th>Scattato</th></tr></thead>
        <tbody>
          ${history.map(a => `
            <tr>
              <td style="font-family:var(--mono);font-weight:700">${a.symbol}</td>
              <td>${a.direction === 'above'
                ? '<span class="badge badge-green">▲ Sopra</span>'
                : '<span class="badge badge-red">▼ Sotto</span>'}</td>
              <td class="r">${API.formatPrice(a.target)}</td>
              <td class="r ${a.direction === 'above' ? 'positive' : 'negative'}">${API.formatPrice(a.triggeredPrice)}</td>
              <td style="color:var(--text-muted);font-size:11px">${a.note || '—'}</td>
              <td style="font-size:11px;color:var(--text-muted)">${new Date(a.triggeredAt).toLocaleString('it-IT')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button class="btn btn-red btn-sm mt-12" onclick="clearAlertHistory()">🗑 Cancella Storico</button>`;
}

window.deleteAlert = function(id) {
  saveAlerts(loadAlerts().filter(a => a.id !== id));
  refreshAlertUI();
};

window.clearAlertHistory = function() {
  if (!confirm('Cancellare tutto lo storico degli alert?')) return;
  localStorage.removeItem(ALERTS_HISTORY_KEY);
  renderAlertHistory(document.getElementById('alerts-history-wrap'));
};

window.showAddAlertModal = function() {
  const wrap = document.getElementById('alert-modal-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)this.innerHTML=''">
      <div class="modal">
        <div class="modal-title">Nuovo Price Alert</div>
        <div class="modal-body">
          <div class="form-group" style="gap:6px">
            <label class="form-label">Asset (CoinGecko ID)</label>
            <input type="text" id="al-coin" placeholder="bitcoin, ethereum, solana…" style="width:100%">
            <span style="font-size:10px;color:var(--text-muted)">Usa l'ID CoinGecko: bitcoin, ethereum, solana…</span>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Ticker Display</label>
            <input type="text" id="al-sym" placeholder="BTC, ETH, SOL…" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Direzione</label>
            <select id="al-dir" style="width:100%">
              <option value="above">▲ Sopra (prezzo sale oltre il target)</option>
              <option value="below">▼ Sotto (prezzo scende sotto il target)</option>
            </select>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Prezzo Target (USD)</label>
            <input type="number" id="al-price" placeholder="0.00" step="any" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Note (opzionale)</label>
            <input type="text" id="al-note" placeholder="Es. Take profit, Stop loss…" style="width:100%">
          </div>
        </div>

        <div style="padding:10px;background:var(--bg-input);border-radius:var(--radius-sm);margin-top:12px;font-size:11px;color:var(--text-muted)">
          <strong style="color:var(--text-secondary)">Quick add:</strong>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${[['bitcoin','BTC'],['ethereum','ETH'],['solana','SOL'],['binancecoin','BNB'],['ripple','XRP']].map(
              ([id, sym]) => `<button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="document.getElementById('al-coin').value='${id}';document.getElementById('al-sym').value='${sym}'">${sym}</button>`
            ).join('')}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('alert-modal-wrap').innerHTML=''">Annulla</button>
          <button class="btn btn-green" onclick="saveNewAlert()">Salva Alert</button>
        </div>
      </div>
    </div>`;
};

window.saveNewAlert = async function() {
  const coinId    = document.getElementById('al-coin')?.value.trim().toLowerCase();
  const symbol    = document.getElementById('al-sym')?.value.trim().toUpperCase() || coinId?.toUpperCase();
  const direction = document.getElementById('al-dir')?.value;
  const target    = parseFloat(document.getElementById('al-price')?.value);
  const note      = document.getElementById('al-note')?.value.trim();

  if (!coinId || !symbol || isNaN(target) || target <= 0) {
    alert('Compila tutti i campi obbligatori'); return;
  }

  const alerts = loadAlerts();
  alerts.push({
    id: Date.now(),
    coinId, symbol, direction, target, note,
    active: true,
    createdAt: Date.now(),
    currentPrice: null,
    checkedAt: null,
  });
  saveAlerts(alerts);
  document.getElementById('alert-modal-wrap').innerHTML = '';
  renderActiveAlerts(document.getElementById('alerts-active-wrap'));

  // Immediately check this alert
  AlertEngine.checkAlerts();
};
