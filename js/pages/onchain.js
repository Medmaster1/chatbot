/* ============================================================
   ON-CHAIN ANALYTICS — Bitcoin metrics via mempool.space (free, no key)
   ============================================================ */

async function render_onchain(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">On-Chain Analytics</div>
      <div class="page-subtitle">Bitcoin blockchain metrics — <a href="https://mempool.space" target="_blank" style="color:var(--blue)">mempool.space</a></div>
    </div>
    <div class="loading"><div class="spinner"></div> Caricamento dati on-chain…</div>
  `;

  try {
    const [mempool, fees, blocks, hashrate, difficulty] = await Promise.all([
      fetch('https://mempool.space/api/mempool').then(r => r.json()),
      fetch('https://mempool.space/api/v1/fees/recommended').then(r => r.json()),
      fetch('https://mempool.space/api/blocks').then(r => r.json()),
      fetch('https://mempool.space/api/v1/mining/hashrate/1m').then(r => r.json()).catch(() => null),
      fetch('https://mempool.space/api/v1/difficulty-adjustment').then(r => r.json()).catch(() => null),
    ]);

    const curHashrate = hashrate?.currentHashrate || 0;
    const curDiff = hashrate?.currentDifficulty || 0;

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-large">On-Chain Analytics</div>
        <div class="page-subtitle">Bitcoin — <a href="https://mempool.space" target="_blank" style="color:var(--blue)">mempool.space</a> — ${new Date().toLocaleTimeString('it-IT')}</div>
      </div>

      <!-- KEY METRICS -->
      <div class="grid-4 mb-16" id="oc-stats"></div>

      <div class="grid-2 mb-16" style="gap:20px">

        <!-- MEMPOOL -->
        <div class="card">
          <div class="card-title mb-12">Mempool Status</div>
          <div id="oc-mempool"></div>
        </div>

        <!-- FEES -->
        <div class="card">
          <div class="card-title mb-12">Fee Raccomandate (sat/vByte)</div>
          <div id="oc-fees"></div>
        </div>

      </div>

      <!-- DIFFICULTY ADJUSTMENT -->
      <div class="card mb-16">
        <div class="card-title mb-12">Prossimo Difficulty Adjustment</div>
        <div id="oc-difficulty">${difficulty ? '' : '<div class="empty">Dati non disponibili</div>'}</div>
      </div>

      <!-- RECENT BLOCKS -->
      <div class="card mb-16">
        <div class="card-title mb-12">Blocchi Recenti</div>
        <div id="oc-blocks"></div>
      </div>

      <!-- HASHRATE CHART -->
      ${hashrate?.hashrates?.length ? `
      <div class="card">
        <div class="card-title mb-12">Hashrate Bitcoin — Ultimi 30 Giorni</div>
        <div style="height:200px;position:relative"><canvas id="oc-hashrate-chart"></canvas></div>
      </div>` : ''}
    `;

    ocRenderStats(mempool, fees, curHashrate, curDiff, blocks);
    ocRenderMempool(mempool);
    ocRenderFees(fees);
    if (difficulty) ocRenderDifficulty(difficulty);
    ocRenderBlocks(blocks);
    if (hashrate?.hashrates?.length) ocRenderHashrateChart(hashrate.hashrates);

  } catch (e) {
    el.innerHTML = `<div class="empty">
      <p>Errore caricamento on-chain: ${e.message}</p>
      <p style="font-size:11px;color:var(--text-muted)">Verifica la connessione internet (mempool.space)</p>
    </div>`;
  }
}

function ocRenderStats(mempool, fees, hashrate, difficulty, blocks) {
  const el = document.getElementById('oc-stats');
  if (!el) return;

  const avgBlockSec = blocks?.length > 1
    ? (blocks[0].timestamp - blocks[blocks.length - 1].timestamp) / (blocks.length - 1)
    : 600;
  const avgBlockMin = avgBlockSec / 60;
  const hrEH = hashrate / 1e18;
  const diffT = difficulty / 1e12;

  el.innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Hashrate</div>
      <div class="card-value">${hrEH >= 1 ? hrEH.toFixed(2) + ' EH/s' : (hashrate / 1e15).toFixed(2) + ' PH/s'}</div>
      <div class="card-change neutral">Potenza di mining</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Difficoltà</div>
      <div class="card-value">${diffT.toFixed(2)}T</div>
      <div class="card-change neutral">Mining difficulty</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Mempool</div>
      <div class="card-value">${(mempool.count || 0).toLocaleString()}</div>
      <div class="card-change neutral">${((mempool.vsize || 0) / 1e6).toFixed(1)} MB pendenti</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Block Time Medio</div>
      <div class="card-value ${avgBlockMin > 12 ? 'red' : avgBlockMin < 8 ? 'green' : ''}">${avgBlockMin.toFixed(1)} min</div>
      <div class="card-change neutral">Ultimi ${blocks?.length || 0} blocchi</div>
    </div>`;
}

function ocRenderMempool(mempool) {
  const el = document.getElementById('oc-mempool');
  if (!el) return;

  const count = mempool.count || 0;
  const vsize = mempool.vsize || 0;
  const totalFee = mempool.total_fee || 0;
  const avgFeeSat = count > 0 ? Math.round(totalFee / count) : 0;

  el.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">TX non confermate</span>
      <span class="stat-val mono">${count.toLocaleString()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Dimensione Mempool</span>
      <span class="stat-val mono">${(vsize / 1e6).toFixed(3)} MB</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Fee Totali Pending</span>
      <span class="stat-val mono">${(totalFee / 1e8).toFixed(6)} BTC</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Fee Media per TX</span>
      <span class="stat-val mono">${avgFeeSat.toLocaleString()} sat</span>
    </div>`;

  if (mempool.fee_histogram?.length) {
    const hist = mempool.fee_histogram.slice(0, 8);
    const maxCount = Math.max(...hist.map(h => h[1]));
    el.innerHTML += `<div style="margin-top:16px">
      <div class="form-label mb-8">Distribuzione Fee (sat/vByte)</div>
      ${hist.map(([fee, cnt]) => {
        const pct = maxCount > 0 ? (cnt / maxCount * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:11px">
          <span style="color:var(--text-muted);width:70px;flex-shrink:0">${fee}+ sat/vB</span>
          <div style="flex:1;background:var(--bg-input);border-radius:2px;height:7px">
            <div style="width:${pct}%;background:var(--blue);height:100%;border-radius:2px"></div>
          </div>
          <span style="color:var(--text-secondary);width:55px;text-align:right">${cnt.toLocaleString()}</span>
        </div>`;
      }).join('')}
    </div>`;
  }
}

function ocRenderFees(fees) {
  const el = document.getElementById('oc-fees');
  if (!el) return;

  const levels = [
    { label: '⚡ Alta priorità (~10 min)', key: 'fastestFee',  color: 'var(--green)' },
    { label: '🕐 Media (~30 min)',         key: 'halfHourFee', color: 'var(--yellow)' },
    { label: '🕐 Bassa (~1 ora)',          key: 'hourFee',     color: 'var(--text-secondary)' },
    { label: '💤 Economy',                 key: 'economyFee',  color: 'var(--text-muted)' },
    { label: '📉 Minima',                  key: 'minimumFee',  color: 'var(--text-muted)' },
  ];

  const max = fees.fastestFee || 1;

  el.innerHTML = levels.map(lv => `
    <div class="stat-row">
      <span class="stat-label">${lv.label}</span>
      <span class="stat-val mono" style="color:${lv.color}">${fees[lv.key] || '—'} sat/vB</span>
    </div>`).join('');

  el.innerHTML += `<div style="margin-top:16px">
    ${levels.slice(0, 4).map(lv => {
      const v = fees[lv.key] || 0;
      const pct = Math.max(4, (v / max * 100));
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px">
          <span>${lv.label.replace(/[⚡🕐💤📉]\s/,'')}</span>
          <span style="color:${lv.color}">${v} sat/vB</span>
        </div>
        <div style="background:var(--bg-input);border-radius:3px;height:7px">
          <div style="width:${pct}%;background:${lv.color};height:100%;border-radius:3px;transition:width 0.4s"></div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function ocRenderDifficulty(adj) {
  const el = document.getElementById('oc-difficulty');
  if (!el) return;

  const chg = adj.difficultyChange || 0;
  const progress = Math.min(100, Math.max(0, adj.progressPercent || 0));
  const retarget = adj.estimatedRetargetDate ? new Date(adj.estimatedRetargetDate * 1000) : null;
  const remaining = adj.remainingBlocks || 0;
  const timeAvgMin = adj.timeAvg ? (adj.timeAvg / 60).toFixed(1) : '—';

  el.innerHTML = `
    <div class="grid-4 mb-12">
      <div class="stat-row"><span class="stat-label">Cambio Previsto</span>
        <span class="stat-val ${chg >= 0 ? 'positive' : 'negative'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>
      </div>
      <div class="stat-row"><span class="stat-label">Blocchi Rimanenti</span>
        <span class="stat-val">${remaining.toLocaleString()}</span>
      </div>
      <div class="stat-row"><span class="stat-label">Block Time Attuale</span>
        <span class="stat-val">${timeAvgMin} min</span>
      </div>
      <div class="stat-row"><span class="stat-label">Data Prevista</span>
        <span class="stat-val">${retarget ? retarget.toLocaleDateString('it-IT') : '—'}</span>
      </div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:5px">
        <span>Progresso Epoch (2016 blocchi)</span>
        <span>${progress.toFixed(1)}%</span>
      </div>
      <div style="background:var(--bg-input);border-radius:5px;height:10px">
        <div style="width:${progress}%;background:var(--blue);height:100%;border-radius:5px;transition:width 0.5s"></div>
      </div>
    </div>`;
}

function ocRenderBlocks(blocks) {
  const el = document.getElementById('oc-blocks');
  if (!el || !blocks?.length) return;

  const rows = blocks.slice(0, 10).map(b => {
    const t = new Date(b.timestamp * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sizeMB = ((b.size || 0) / 1e6).toFixed(2);
    const fees = ((b.extras?.totalFees || 0) / 1e8).toFixed(4);
    const pool = b.extras?.pool?.name || '—';
    return `<tr>
      <td class="mono">${(b.height || 0).toLocaleString()}</td>
      <td style="font-size:11px;color:var(--text-muted)">${t}</td>
      <td class="r mono">${(b.tx_count || 0).toLocaleString()}</td>
      <td class="r" style="font-size:11px;color:var(--text-muted)">${sizeMB} MB</td>
      <td class="r mono" style="font-size:11px;color:var(--yellow)">${fees} BTC</td>
      <td style="font-size:10px;color:var(--text-muted);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pool}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Altezza</th><th>Ora</th><th class="r">TX</th><th class="r">Dimensione</th><th class="r">Fee Totali</th><th>Pool</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function ocRenderHashrateChart(hashrates) {
  const canvas = document.getElementById('oc-hashrate-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const data = hashrates.slice(-30);
  const labels = data.map(d =>
    new Date(d.timestamp * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  );
  const values = data.map(d => (d.avgHashrate || 0) / 1e18);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Hashrate (EH/s)',
        data: values,
        borderColor: '#4da6ff',
        borderWidth: 1.5,
        backgroundColor: 'rgba(77,166,255,0.07)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.raw.toFixed(2) + ' EH/s' } }
      },
      scales: {
        x: { ticks: { color: '#4a5a6a', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#4a5a6a', font: { size: 10 }, callback: v => v.toFixed(0) + ' EH' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}
