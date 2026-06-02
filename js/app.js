/* ============================================================
   APP — Router, Navigation, Clock, Market Status
   ============================================================ */
const App = (() => {

  const PAGES = {
    overview:    { title: 'Overview',             group: 'market',   icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    markets:     { title: 'Markets & Charts',     group: 'market',   icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    feargreed:   { title: 'Fear & Greed',         group: 'market',   icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    scanner:     { title: 'Overbought / Oversold',group: 'analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    seasonality: { title: 'Seasonality',          group: 'analysis', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    patterns:    { title: 'Patterns',             group: 'analysis', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    fundamentals:{ title: 'Fundamentals',         group: 'research', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    statements:  { title: 'Financial Statements', group: 'research', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    cot:         { title: 'COT Report',           group: 'research', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    news:        { title: 'News',                 group: 'info',     icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6-4h.01M6 20h.01' },
    political:   { title: 'Political',            group: 'info',     icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9' },
    portfolio:   { title: 'Portfolio',            group: 'personal', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    watchlist:   { title: 'Watchlist',            group: 'personal', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    alerts:      { title: 'Price Alerts',         group: 'personal', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    screener:    { title: 'Screener',             group: 'analysis', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
    defi:        { title: 'DeFi',                 group: 'market',   icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    journal:     { title: 'Trading Journal',      group: 'personal', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    settings:    { title: 'Impostazioni',         group: 'personal', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  };

  const GROUPS = {
    market:   'Markets',
    analysis: 'Analysis',
    research: 'Research',
    info:     'Information',
    personal: 'Personal',
  };

  let currentPage = null;
  let clockInterval = null;
  let refreshTimer = null;

  /* ---- Build Sidebar ---- */
  function buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const grouped = {};
    for (const [id, cfg] of Object.entries(PAGES)) {
      if (!grouped[cfg.group]) grouped[cfg.group] = [];
      grouped[cfg.group].push({ id, ...cfg });
    }
    let html = '';
    for (const [group, label] of Object.entries(GROUPS)) {
      if (!grouped[group]) continue;
      html += `<div class="nav-group"><div class="nav-group-label">${label}</div>`;
      for (const page of grouped[group]) {
        const paths = page.icon.split(' M ').map((p, i) => i === 0 ? `<path d="${p}"/>` : `<path d="M ${p}"/>`).join('');
        html += `<div class="nav-item" data-page="${page.id}" id="nav-${page.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">${paths}</svg>
          <span>${page.title}</span>
        </div>`;
      }
      html += '</div>';
    }
    nav.innerHTML = html;
    nav.addEventListener('click', e => {
      const item = e.target.closest('.nav-item');
      if (item) navigate(item.dataset.page);
    });

    // Apply user name from settings
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const nameEl = document.getElementById('sidebar-username');
    if (nameEl && settings.userName) nameEl.textContent = settings.userName;
  }

  /* ---- Navigation ---- */
  function navigate(pageId) {
    if (!PAGES[pageId]) return;
    if (currentPage === pageId) return;
    currentPage = pageId;

    // Stop any running auto-refresh
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    document.getElementById('page-title').textContent = PAGES[pageId].title;
    history.replaceState(null, '', '#' + pageId);

    const content = document.getElementById('app-content');
    content.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;

    const renderer = window[`render_${pageId}`];
    if (typeof renderer === 'function') {
      Promise.resolve().then(async () => {
        await renderer(content);
        // Start auto-refresh only for overview
        if (pageId === 'overview') startAutoRefresh(content);
      }).catch(err => {
        console.error('Page render error:', err);
        content.innerHTML = `<div class="empty">
          <p style="color:var(--red)">Errore nel caricamento</p>
          <p style="color:var(--text-muted);font-size:11px">${err.message}</p>
        </div>`;
      });
    } else {
      content.innerHTML = `<div class="empty"><p>Pagina non trovata: ${pageId}</p></div>`;
    }
  }

  function startAutoRefresh(content) {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const interval = (settings.refreshInterval || 60) * 1000;
    if (!interval) return;
    refreshTimer = setInterval(() => {
      if (currentPage !== 'overview') { clearInterval(refreshTimer); return; }
      render_overview(content);
    }, interval);
  }

  /* ---- Clock & Market Status ---- */
  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('topbar-time');
    const clockEl = document.getElementById('sidebar-clock');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (clockEl) clockEl.textContent =
      now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }) + ' ' +
      now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    updateMarketStatus(now);
  }

  function updateMarketStatus(now) {
    const pill = document.getElementById('market-status-pill');
    if (!pill) return;
    const day = now.getUTCDay();
    const t = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (day === 0 || day === 6) {
      pill.innerHTML = `<div class="dot dot-neutral"></div><span>Weekend</span>`; return;
    }
    if (t >= 540 && t < 810)       pill.innerHTML = `<div class="dot dot-pre"></div><span>Pre-Market</span>`;
    else if (t >= 810 && t < 1200) pill.innerHTML = `<div class="dot dot-open"></div><span>NYSE Open</span>`;
    else if (t >= 1200)            pill.innerHTML = `<div class="dot dot-closed"></div><span>After Hours</span>`;
    else                           pill.innerHTML = `<div class="dot dot-neutral"></div><span>Markets Closed</span>`;
  }

  /* ---- Init ---- */
  function init() {
    buildSidebar();
    clockInterval = setInterval(updateClock, 1000);
    updateClock();

    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const hash = location.hash.replace('#', '') || settings.defaultPage || 'overview';
    navigate(PAGES[hash] ? hash : 'overview');

    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '');
      if (PAGES[h] && h !== currentPage) navigate(h);
    });
  }

  window.App = { navigate, PAGES };
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
