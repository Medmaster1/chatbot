/* ============================================================
   DEFI DASHBOARD — DeFiLlama API (free, no key needed)
   ============================================================ */
const LLAMA_BASE = 'https://api.llama.fi';

async function llamaFetch(path) {
  const r = await fetch(LLAMA_BASE + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('DeFiLlama ' + r.status);
  return r.json();
}

async function render_defi(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">DeFi Dashboard</div>
      <div class="page-subtitle">Dati TVL da DeFiLlama API — aggiornamento in tempo reale, nessuna API key</div>
    </div>
    <div class="loading"><div class="spinner"></div> Caricamento dati DeFi…</div>
  `;

  try {
    const [protocols, chains, globalTvl] = await Promise.all([
      llamaFetch('/protocols'),
      llamaFetch('/v2/chains'),
      llamaFetch('/v2/historicalChainTvl').catch(() => null),
    ]);

    const totalTvl = chains.reduce((s, c) => s + (c.tvl || 0), 0);
    const sortedProtocols = [...protocols].sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 50);
    const top20Protocols = sortedProtocols.slice(0, 20);
    const sortedChains = [...chains].sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 15);

    // Compute 24h/7d changes from protocols
    const totalChange24h = protocols.reduce((s, p) => s + (p.change_1d || 0), 0) / protocols.length;

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-large">DeFi Dashboard</div>
        <div class="page-subtitle">Source: <a href="https://defillama.com" target="_blank" style="color:var(--blue)">DeFiLlama</a> — ${protocols.length} protocolli monitorati</div>
      </div>

      <!-- SUMMARY STATS -->
      <div class="grid-4 mb-16" id="defi-summary"></div>

      <div class="grid-2 mb-16" style="gap:20px">

        <!-- TOP PROTOCOLS -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Top Protocolli per TVL</div>
            <div class="tabs" id="defi-cat-tabs" style="margin:0">
              <div class="tab active" data-cat="all">Tutti</div>
              <div class="tab" data-cat="Dexes">DEX</div>
              <div class="tab" data-cat="Lending">Lending</div>
              <div class="tab" data-cat="Liquid Staking">Liquid Staking</div>
              <div class="tab" data-cat="Bridge">Bridge</div>
            </div>
          </div>
          <div id="defi-protocols-wrap"></div>
        </div>

        <!-- TVL BY CHAIN -->
        <div>
          <div class="card mb-16">
            <div class="card-title mb-12">TVL per Chain</div>
            <div style="height:220px;position:relative"><canvas id="defi-chain-chart"></canvas></div>
          </div>
          <div class="card">
            <div class="card-title mb-10">Top Chains</div>
            <div id="defi-chains-list"></div>
          </div>
        </div>

      </div>

      <!-- HISTORICAL CHART -->
      ${globalTvl ? `
      <div class="card mb-16">
        <div class="card-title mb-12">Total DeFi TVL — Storico</div>
        <div style="height:200px;position:relative"><canvas id="defi-tvl-chart"></canvas></div>
      </div>` : ''}

      <!-- YIELD OPPORTUNITIES -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Yield Opportunities (DeFiLlama Yields)</div>
          <button class="btn btn-ghost btn-sm" onclick="loadDefiYields()">Carica</button>
        </div>
        <div id="defi-yields-wrap">
          <div class="empty" style="padding:20px">Clicca "Carica" per vedere le opportunità di yield farming</div>
        </div>
      </div>
    `;

    // Summary stats
    renderDefiSummary(protocols, totalTvl, totalChange24h, chains);

    // Protocols table
    renderDefiProtocols(sortedProtocols, 'all');
    document.getElementById('defi-cat-tabs')?.addEventListener('click', e => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      document.querySelectorAll('#defi-cat-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDefiProtocols(sortedProtocols, tab.dataset.cat);
    });

    // Chain chart + list
    renderDefiChainChart(sortedChains, totalTvl);
    renderDefiChainList(sortedChains);

    // Historical TVL chart
    if (globalTvl?.length) {
      renderDefiTVLChart(globalTvl.slice(-90)); // last 90 days
    }

  } catch (e) {
    el.innerHTML = `<div class="empty"><p>Errore caricamento DeFiLlama: ${e.message}</p><p style="font-size:11px;color:var(--text-muted)">Verifica la connessione internet</p></div>`;
  }
}

function renderDefiSummary(protocols, totalTvl, avgChange24h, chains) {
  const el = document.getElementById('defi-summary');
  if (!el) return;

  const topProtocol = protocols[0] || {};
  const ethTvl = chains.find(c => c.name === 'Ethereum')?.tvl || 0;
  const protocolsPositive = protocols.filter(p => (p.change_1d || 0) > 0).length;

  el.innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Total DeFi TVL</div>
      <div class="card-value">${API.formatNum(totalTvl)}</div>
      <div class="card-change ${API.pctClass(avgChange24h)}">${API.formatPct(avgChange24h)} avg 24h</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Protocolli Monitorati</div>
      <div class="card-value">${protocols.length.toLocaleString()}</div>
      <div class="card-change neutral">${protocolsPositive} positivi 24h</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">#1 Protocollo</div>
      <div class="card-value" style="font-size:16px;margin-top:4px">${topProtocol.name || '—'}</div>
      <div class="card-change neutral">${API.formatNum(topProtocol.tvl)} TVL</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">ETH Dominance DeFi</div>
      <div class="card-value">${totalTvl > 0 ? (ethTvl / totalTvl * 100).toFixed(1) + '%' : '—'}</div>
      <div class="card-change neutral">TVL ${API.formatNum(ethTvl)}</div>
    </div>`;
}

function renderDefiProtocols(allProtocols, cat) {
  const wrap = document.getElementById('defi-protocols-wrap');
  if (!wrap) return;

  const filtered = cat === 'all'
    ? allProtocols.slice(0, 20)
    : allProtocols.filter(p => p.category === cat).slice(0, 20);

  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty">Nessun protocollo trovato per questa categoria</div>`; return;
  }

  const rows = filtered.map((p, i) => {
    const chg1d = p.change_1d || 0;
    const chg7d = p.change_7d || 0;
    return `<tr>
      <td class="muted mono" style="width:24px">${i + 1}</td>
      <td>
        <div class="coin-cell">
          <img src="${p.logo || ''}" width="22" height="22" style="border-radius:4px;background:var(--bg-input)" onerror="this.style.display='none'">
          <div>
            <div style="font-weight:600;font-size:12px">${p.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${p.category || '—'}</div>
          </div>
        </div>
      </td>
      <td class="r mono">${API.formatNum(p.tvl)}</td>
      <td class="r ${API.pctClass(chg1d)}">${API.formatPct(chg1d)}</td>
      <td class="r ${API.pctClass(chg7d)}">${API.formatPct(chg7d)}</td>
      <td style="font-size:10px;color:var(--text-muted)">${(p.chains || []).slice(0, 3).join(', ')}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap" style="margin-top:10px">
      <table class="data-table">
        <thead><tr><th>#</th><th>Protocollo</th><th class="r">TVL</th><th class="r">24h</th><th class="r">7d</th><th>Chain</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderDefiChainChart(chains, totalTvl) {
  const canvas = document.getElementById('defi-chain-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const top8 = chains.slice(0, 8);
  const otherTvl = chains.slice(8).reduce((s, c) => s + (c.tvl || 0), 0);

  const labels = [...top8.map(c => c.name), 'Other'];
  const values = [...top8.map(c => c.tvl || 0), otherTvl];
  const COLORS = ['#00e5b4','#4da6ff','#f5c400','#ff3d6a','#a78bfa','#fb923c','#34d399','#60a5fa','#8b949e'];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: COLORS.map(c => c + 'cc'),
        borderColor: COLORS,
        borderWidth: 1.5,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#8892a0', font: { size: 10 }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${API.formatNum(ctx.raw)} (${(ctx.raw/totalTvl*100).toFixed(1)}%)` } }
      },
      cutout: '60%',
    }
  });
}

function renderDefiChainList(chains) {
  const el = document.getElementById('defi-chains-list');
  if (!el) return;
  const totalTvl = chains.reduce((s, c) => s + (c.tvl || 0), 0);
  el.innerHTML = chains.slice(0, 10).map(c => {
    const pct = totalTvl > 0 ? (c.tvl / totalTvl * 100) : 0;
    return `
      <div class="stat-row">
        <span class="stat-label">${c.name}</span>
        <span class="stat-val flex gap-8">
          <span style="font-size:11px;color:var(--text-muted)">${pct.toFixed(1)}%</span>
          <span>${API.formatNum(c.tvl)}</span>
        </span>
      </div>`;
  }).join('');
}

function renderDefiTVLChart(data) {
  const canvas = document.getElementById('defi-tvl-chart');
  if (!canvas || typeof Chart === 'undefined' || !data.length) return;

  const labels = data.map(d => new Date(d.date * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }));
  const values = data.map(d => d.tvl || 0);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total DeFi TVL',
        data: values,
        borderColor: '#00e5b4',
        borderWidth: 1.5,
        backgroundColor: 'rgba(0,229,180,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => API.formatNum(ctx.raw) } } },
      scales: {
        x: { ticks: { color: '#4a5a6a', font: { size: 10 }, maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#4a5a6a', font: { size: 10 }, callback: v => API.formatNum(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

window.loadDefiYields = async function() {
  const el = document.getElementById('defi-yields-wrap');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Caricamento yield pools…</div>`;
  try {
    const r = await fetch('https://yields.llama.fi/pools');
    if (!r.ok) throw new Error('Yields API error');
    const j = await r.json();
    const pools = (j.data || [])
      .filter(p => p.tvlUsd > 1e6 && p.apy > 0)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 30);

    if (!pools.length) { el.innerHTML = `<div class="empty">Nessun dato disponibile</div>`; return; }

    const rows = pools.map(p => `<tr>
      <td style="font-family:var(--sans)">${p.project}</td>
      <td>${p.symbol || '—'}</td>
      <td style="color:var(--text-secondary)">${p.chain}</td>
      <td class="r" style="color:var(--green);font-family:var(--mono);font-weight:600">${p.apy.toFixed(2)}%</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${API.formatNum(p.tvlUsd)}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${p.stablecoin ? '✓' : '—'}</td>
    </tr>`).join('');

    el.innerHTML = `
      <div class="table-wrap" style="margin-top:10px">
        <table class="data-table">
          <thead><tr><th>Protocollo</th><th>Pool</th><th>Chain</th><th class="r">APY</th><th class="r">TVL</th><th class="r">Stablecoin</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="font-size:10px;color:var(--text-muted);padding:8px">Showing top 30 by TVL (>$1M). APY include impermanent loss. DYOR.</p>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">Errore: ${e.message}</div>`;
  }
};
