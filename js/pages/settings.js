/* ============================================================
   SETTINGS PAGE
   ============================================================ */
const SETTINGS_KEY = 'terminal_settings_v1';

function loadSettings() {
  const defaults = {
    userName: '',
    currency: 'usd',
    autoRefresh: true,
    refreshInterval: 60,
    defaultPage: 'overview',
    theme: 'dark',
    showTVTicker: true,
  };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; }
  catch { return defaults; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

window.getSettings = loadSettings;

async function render_settings(el) {
  const s = loadSettings();

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Impostazioni</div>
      <div class="page-subtitle">Configura il tuo dashboard personale</div>
    </div>

    <div class="grid-2" style="gap:20px">

      <!-- Profilo -->
      <div class="card">
        <div class="card-title mb-16">👤 Profilo</div>
        <div class="modal-body">
          <div class="form-group" style="gap:6px">
            <label class="form-label">Il tuo nome (mostrato nella sidebar)</label>
            <input type="text" id="s-name" value="${s.userName}" placeholder="Es. Mario Rossi" style="width:100%">
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Valuta di default</label>
            <select id="s-currency" style="width:100%">
              <option value="usd" ${s.currency==='usd'?'selected':''}>USD — Dollaro US</option>
              <option value="eur" ${s.currency==='eur'?'selected':''}>EUR — Euro</option>
              <option value="gbp" ${s.currency==='gbp'?'selected':''}>GBP — Sterlina</option>
              <option value="btc" ${s.currency==='btc'?'selected':''}>BTC — Bitcoin</option>
            </select>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Pagina di default all'apertura</label>
            <select id="s-default-page" style="width:100%">
              <option value="overview"    ${s.defaultPage==='overview'?'selected':''}>Overview</option>
              <option value="markets"     ${s.defaultPage==='markets'?'selected':''}>Markets & Charts</option>
              <option value="feargreed"   ${s.defaultPage==='feargreed'?'selected':''}>Fear & Greed</option>
              <option value="portfolio"   ${s.defaultPage==='portfolio'?'selected':''}>Portfolio</option>
              <option value="news"        ${s.defaultPage==='news'?'selected':''}>News</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Comportamento -->
      <div class="card">
        <div class="card-title mb-16">⚙️ Comportamento</div>
        <div class="modal-body">
          <div class="form-group" style="gap:6px">
            <label class="form-label">Auto-refresh Overview</label>
            <select id="s-autorefresh" style="width:100%">
              <option value="0"   ${s.refreshInterval===0?'selected':''}>Disabilitato</option>
              <option value="30"  ${s.refreshInterval===30?'selected':''}>Ogni 30 secondi</option>
              <option value="60"  ${s.refreshInterval===60?'selected':''}>Ogni minuto (default)</option>
              <option value="300" ${s.refreshInterval===300?'selected':''}>Ogni 5 minuti</option>
            </select>
          </div>
          <div class="form-group" style="gap:6px">
            <label class="form-label">Ticker Tape in Overview</label>
            <select id="s-tv-ticker" style="width:100%">
              <option value="coingecko" ${!s.showTVTicker?'selected':''}>CoinGecko (crypto only)</option>
              <option value="tradingview" ${s.showTVTicker?'selected':''}>TradingView (crypto + stocks)</option>
            </select>
          </div>
        </div>

        <div class="mt-20">
          <button class="btn btn-green" onclick="applySettings()" style="width:100%">
            ✓ Salva Impostazioni
          </button>
        </div>
      </div>

      <!-- Portfolio Backup -->
      <div class="card">
        <div class="card-title mb-16">💾 Backup Portfolio</div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7">
          Il portfolio è salvato nel localStorage del browser. Esporta per fare un backup o per trasferirlo su un altro dispositivo.
        </p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-green" onclick="exportPortfolio()" style="width:100%">
            ⬇️ Esporta Portfolio (JSON)
          </button>
          <label class="btn btn-ghost" style="width:100%;justify-content:center;cursor:pointer">
            ⬆️ Importa Portfolio (JSON)
            <input type="file" accept=".json" id="import-file" style="display:none" onchange="importPortfolio(this)">
          </label>
          <button class="btn btn-red btn-sm" onclick="clearPortfolio()" style="width:100%">
            🗑️ Cancella Tutto il Portfolio
          </button>
        </div>
        <div id="backup-status" style="margin-top:10px;font-size:12px;color:var(--text-muted)"></div>
      </div>

      <!-- Informazioni Sito -->
      <div class="card">
        <div class="card-title mb-16">ℹ️ Informazioni</div>
        <div>
          ${[
            ['Versione', '1.0.0'],
            ['Data build', new Date().toLocaleDateString('it-IT')],
            ['Dati crypto', 'CoinGecko API (free)'],
            ['Fear & Greed', 'Alternative.me (free)'],
            ['News', 'CryptoCompare (free)'],
            ['Grafici', 'TradingView Widgets (free)'],
            ['Fondamentali', 'Yahoo Finance (free, proxy)'],
            ['Storage', 'localStorage (privato)'],
            ['COT', 'CFTC snapshot'],
          ].map(([label, val]) => `
            <div class="stat-row">
              <span class="stat-label">${label}</span>
              <span class="stat-val">${val}</span>
            </div>`).join('')}
        </div>

        <div style="margin-top:16px;padding:12px;background:var(--bg-input);border-radius:var(--radius-sm)">
          <div style="font-size:11px;color:var(--text-muted);line-height:1.7">
            <strong style="color:var(--text-secondary)">Come avviare localmente:</strong><br>
            <code style="color:var(--green)">cd dashboard && python3 -m http.server 8080</code><br>
            Poi apri <code style="color:var(--blue)">http://localhost:8080</code>
          </div>
        </div>
      </div>

    </div>
  `;

  // Show current portfolio count
  const portfolio = JSON.parse(localStorage.getItem('terminal_portfolio_v2') || '[]');
  document.getElementById('backup-status').textContent =
    `Portfolio attuale: ${portfolio.length} posizione/i salvata/e`;
}

window.applySettings = function() {
  const s = {
    userName: document.getElementById('s-name')?.value.trim() || '',
    currency: document.getElementById('s-currency')?.value || 'usd',
    defaultPage: document.getElementById('s-default-page')?.value || 'overview',
    refreshInterval: parseInt(document.getElementById('s-autorefresh')?.value || '60'),
    showTVTicker: document.getElementById('s-tv-ticker')?.value === 'tradingview',
  };
  saveSettings(s);

  // Update sidebar user name if provided
  const nameEl = document.getElementById('sidebar-username');
  if (nameEl && s.userName) nameEl.textContent = s.userName;

  // Show confirmation
  const btn = document.querySelector('[onclick="applySettings()"]');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ Salvato!';
    btn.style.background = 'rgba(0,229,180,0.3)';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
  }
};

window.exportPortfolio = function() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    portfolio: JSON.parse(localStorage.getItem('terminal_portfolio_v2') || '[]'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  document.getElementById('backup-status').textContent = '✓ Export completato!';
};

window.importPortfolio = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const portfolio = data.portfolio || data; // support both wrapped and raw array
      if (!Array.isArray(portfolio)) throw new Error('Formato non valido');
      const existing = JSON.parse(localStorage.getItem('terminal_portfolio_v2') || '[]');
      // Merge: avoid duplicates by ID
      const existingIds = new Set(existing.map(p => p.id));
      const newItems = portfolio.filter(p => !existingIds.has(p.id));
      localStorage.setItem('terminal_portfolio_v2', JSON.stringify([...existing, ...newItems]));
      const statusEl = document.getElementById('backup-status');
      if (statusEl) statusEl.textContent = `✓ Importate ${newItems.length} nuove posizioni (${portfolio.length - newItems.length} già presenti)`;
    } catch (err) {
      alert('Errore nell\'importazione: ' + err.message);
    }
    input.value = ''; // reset file input
  };
  reader.readAsText(file);
};

window.clearPortfolio = function() {
  if (!confirm('Sei sicuro di voler cancellare TUTTO il portfolio? Questa azione non è reversibile.\n\nSuggerimento: esporta prima un backup!')) return;
  localStorage.removeItem('terminal_portfolio_v2');
  document.getElementById('backup-status').textContent = '⚠️ Portfolio cancellato';
};
