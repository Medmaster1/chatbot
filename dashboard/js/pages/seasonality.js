/* ============================================================
   SEASONALITY PAGE
   ============================================================ */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function render_seasonality(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">Seasonality</div>
        <div class="page-subtitle">Monthly return patterns based on historical data</div>
      </div>
      <div class="flex gap-8 align-items:center">
        <label class="form-label" style="margin:0">Asset:</label>
        <select id="season-asset" style="min-width:100px">
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="ETH">Ethereum (ETH)</option>
          <option value="SP500">S&amp;P 500</option>
          <option value="GOLD">Gold</option>
        </select>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-title mb-16">Average Monthly Returns (All Years)</div>
      <div class="chart-container" style="height:200px;margin-bottom:16px">
        <canvas id="season-bar-chart"></canvas>
      </div>
      <div id="season-avg-heatmap"></div>
    </div>

    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title">Year-by-Year Monthly Returns</div>
        <span style="font-size:10px;color:var(--text-muted)">Green = Positive&nbsp;&nbsp;Red = Negative</span>
      </div>
      <div class="heatmap-wrap" id="season-heatmap"></div>
    </div>

    <div class="card">
      <div class="card-title mb-12">Best &amp; Worst Months (Historical Average)</div>
      <div class="grid-2" id="season-stats"></div>
    </div>
  `;

  document.getElementById('season-asset').addEventListener('change', e => {
    renderSeasonality(e.target.value);
  });

  renderSeasonality('BTC');
}

function renderSeasonality(asset) {
  const data = API.SEASONALITY_DATA[asset];
  if (!data) return;

  // Bar chart
  buildSeasonalityBarChart(data.avg, asset);

  // Avg heatmap row
  renderAvgHeatmap(data.avg);

  // Full heatmap
  renderYearHeatmap(data.years);

  // Stats
  renderSeasonStats(data.avg);
}

function heatmapColor(val) {
  if (val === null || val === undefined) return 'background:var(--bg-input);color:var(--text-muted)';
  const v = parseFloat(val);
  if (isNaN(v)) return 'background:var(--bg-input);color:var(--text-muted)';
  if (v > 30)  return 'background:rgba(0,229,180,0.8);color:#000';
  if (v > 15)  return 'background:rgba(0,229,180,0.55);color:#000';
  if (v > 5)   return 'background:rgba(0,229,180,0.3);color:var(--text-primary)';
  if (v > 0)   return 'background:rgba(0,229,180,0.12);color:var(--green)';
  if (v > -5)  return 'background:rgba(255,61,106,0.12);color:var(--red)';
  if (v > -15) return 'background:rgba(255,61,106,0.3);color:var(--text-primary)';
  if (v > -30) return 'background:rgba(255,61,106,0.55);color:#fff';
  return 'background:rgba(255,61,106,0.8);color:#fff';
}

function renderAvgHeatmap(avg) {
  const cells = MONTHS.map((m, i) => {
    const v = avg[i];
    const sign = v >= 0 ? '+' : '';
    return `<td style="${heatmapColor(v)}" title="${m}: ${sign}${v.toFixed(1)}%">${sign}${v.toFixed(1)}%</td>`;
  }).join('');

  document.getElementById('season-avg-heatmap').innerHTML = `
    <table class="heatmap">
      <thead><tr><th>Year/Avg</th>${MONTHS.map(m => `<th>${m}</th>`).join('')}</tr></thead>
      <tbody><tr><td class="hm-year-label">Average</td>${cells}</tr></tbody>
    </table>`;
}

function renderYearHeatmap(years) {
  const sortedYears = Object.keys(years).sort().reverse();
  const rows = sortedYears.map(year => {
    const vals = years[year];
    const cells = MONTHS.map((m, i) => {
      const v = vals[i];
      if (v === null || v === undefined) return `<td style="background:var(--bg-input);color:var(--text-muted)">—</td>`;
      const sign = v >= 0 ? '+' : '';
      return `<td style="${heatmapColor(v)}" title="${m} ${year}: ${sign}${v.toFixed(1)}%">${sign}${v.toFixed(1)}%</td>`;
    }).join('');
    return `<tr><td class="hm-year-label">${year}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('season-heatmap').innerHTML = `
    <table class="heatmap">
      <thead><tr><th>Year</th>${MONTHS.map(m => `<th>${m}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderSeasonStats(avg) {
  const indexed = avg.map((v, i) => ({ month: MONTHS[i], val: v }));
  const sorted = [...indexed].sort((a, b) => b.val - a.val);
  const best = sorted.slice(0, 4);
  const worst = sorted.slice(-4).reverse();

  const el = document.getElementById('season-stats');

  el.innerHTML = `
    <div>
      <div class="section-divider">Best Months</div>
      ${best.map((m, i) => `
        <div class="stat-row">
          <span class="stat-label flex gap-8">
            <span style="font-size:11px;color:var(--text-muted);min-width:16px">#${i+1}</span>
            <strong>${m.month}</strong>
          </span>
          <span class="stat-val positive">+${m.val.toFixed(1)}%</span>
        </div>`).join('')}
    </div>
    <div>
      <div class="section-divider">Worst Months</div>
      ${worst.map((m, i) => `
        <div class="stat-row">
          <span class="stat-label flex gap-8">
            <span style="font-size:11px;color:var(--text-muted);min-width:16px">#${i+1}</span>
            <strong>${m.month}</strong>
          </span>
          <span class="stat-val negative">${m.val.toFixed(1)}%</span>
        </div>`).join('')}
    </div>`;
}

function buildSeasonalityBarChart(avg, asset) {
  const canvas = document.getElementById('season-bar-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chartInstance) { canvas._chartInstance.destroy(); }

  const colors = avg.map(v => v >= 0 ? 'rgba(0,229,180,0.7)' : 'rgba(255,61,106,0.7)');
  const borders = avg.map(v => v >= 0 ? '#00e5b4' : '#ff3d6a');

  canvas._chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{
        label: `${asset} Avg Monthly Return`,
        data: avg,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.raw;
              return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#4a5a6a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: {
          ticks: { color: '#4a5a6a', font: { size: 10 }, callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        }
      }
    }
  });
}
