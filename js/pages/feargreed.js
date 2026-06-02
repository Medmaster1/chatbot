/* ============================================================
   FEAR & GREED PAGE
   ============================================================ */
async function render_feargreed(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Fear &amp; Greed Index</div>
      <div class="page-subtitle">Market sentiment for crypto (Alternative.me) — Updated daily</div>
    </div>
    <div class="loading"><div class="spinner"></div> Loading sentiment data…</div>
  `;

  let data;
  try { data = await API.getFearGreed(90); } catch {
    el.innerHTML = `<div class="empty">Unable to load Fear &amp; Greed data</div>`; return;
  }

  const current = data.data[0];
  const val = parseInt(current.value);
  const { text, cls } = API.fgLabel(val);
  const color = API.fgColor(val);

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Fear &amp; Greed Index</div>
      <div class="page-subtitle">Market sentiment for crypto (Alternative.me) — Updated daily</div>
    </div>

    <div class="grid-2 mb-16">
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px">
        <div class="fg-container">
          <svg class="fg-gauge-svg" viewBox="0 0 260 148" width="260" height="148" id="fg-main-gauge"></svg>
          <div class="fg-value" style="color:${color}">${val}</div>
          <div class="fg-label ${cls}">${text}</div>
          <div class="fg-updated">Updated: ${API.timeAgo(current.timestamp)} &nbsp;•&nbsp; ${new Date(current.timestamp*1000).toLocaleDateString('it-IT')}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-12">Historical Scale</div>
        ${[
          [0,  25,  'Extreme Fear',  '#ff1a44', 'Market severely oversold. Historically a buying opportunity.'],
          [25, 40,  'Fear',          '#ff6633', 'Investors are fearful. Assets may be undervalued.'],
          [40, 60,  'Neutral',       '#f5c400', 'Balanced sentiment. No strong signal.'],
          [60, 75,  'Greed',         '#88ee44', 'Investors becoming greedy. Consider caution.'],
          [75, 100, 'Extreme Greed', '#00e5b4', 'Market overheated. Historically a selling opportunity.'],
        ].map(([lo, hi, label, color, desc]) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="min-width:44px;text-align:center;background:${color}22;border:1px solid ${color}55;border-radius:4px;padding:3px 6px;font-size:11px;font-family:var(--mono);color:${color};font-weight:600">${lo}–${hi}</div>
            <div>
              <div style="font-size:12px;font-weight:600;color:${color}">${label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${desc}</div>
            </div>
          </div>`).join('')}
        <div style="padding-top:8px;text-align:right">
          <span style="font-size:11px;color:var(--text-muted)">Source: </span>
          <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" style="font-size:11px;color:var(--blue)">alternative.me</a>
        </div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-title mb-16">Historical Fear &amp; Greed (Last 90 Days)</div>
      <div class="chart-container" style="height:220px">
        <canvas id="fg-history-chart"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title mb-12">Recent Values</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Value</th><th>Classification</th></tr></thead>
          <tbody id="fg-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Draw main gauge
  const mainGauge = document.getElementById('fg-main-gauge');
  API.drawGaugeSVG(mainGauge, val, 260);

  // History chart
  const points = data.data.slice(0, 60).reverse();
  buildFGChart(points);

  // Table
  const rows = data.data.slice(0, 30).map(d => {
    const v = parseInt(d.value);
    const { text, cls } = API.fgLabel(v);
    const color = API.fgColor(v);
    return `<tr>
      <td>${new Date(d.timestamp*1000).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td><span style="font-family:var(--mono);font-weight:600;color:${color}">${v}</span></td>
      <td><span class="badge" style="background:${color}22;color:${color}">${text}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('fg-table-body').innerHTML = rows;
}

function buildFGChart(points) {
  const canvas = document.getElementById('fg-history-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  canvas.height = 220;

  const labels = points.map(d => new Date(d.timestamp*1000).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}));
  const values = points.map(d => parseInt(d.value));
  const bgColors = values.map(v => API.fgColor(v) + '44');
  const borderColors = values.map(v => API.fgColor(v));

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Fear & Greed',
        data: values,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 2,
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
              return `${v} — ${API.fgLabel(v).text}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#4a5a6a', font: { size: 10 }, maxTicksLimit: 15 },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min: 0, max: 100,
          ticks: { color: '#4a5a6a', font: { size: 10 },
            callback: v => v <= 25 ? `${v} EF` : v <= 40 ? `${v} F` : v <= 60 ? `${v} N` : v <= 75 ? `${v} G` : `${v} EG`
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        }
      }
    }
  });
}
