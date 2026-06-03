/* ============================================================
   FEAR & GREED PAGE — Crypto + Stock Market + Commodities
   ============================================================ */
async function render_feargreed(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Fear &amp; Greed Index</div>
      <div class="page-subtitle">Sentiment per Crypto, Azionario e Materie Prime</div>
    </div>
    <div class="loading"><div class="spinner"></div> Caricamento dati sentiment…</div>
  `;

  const [cryptoFG, stockFG, vixData, commodData] = await Promise.allSettled([
    API.getFearGreed(90),
    API.getCNNFearGreed(),
    API.getYahooChartData('^VIX', '30d').catch(() => null),
    API.getYahooBatchQuote(['GC=F', 'SI=F', 'CL=F', 'HG=F']).catch(() => []),
  ]);

  const crypto = cryptoFG.status === 'fulfilled' ? cryptoFG.value : null;
  if (!crypto) { el.innerHTML = `<div class="empty">Impossibile caricare i dati crypto F&G</div>`; return; }

  const current = crypto.data[0];
  const val = parseInt(current.value);
  const { text, cls } = API.fgLabel(val);
  const color = API.fgColor(val);

  // Stock market F&G from CNN or computed from VIX
  let stockVal = null, stockLabel = '', stockColor = '';
  const cnnFG = stockFG.status === 'fulfilled' ? stockFG.value : null;
  if (cnnFG?.score != null) {
    stockVal = Math.round(cnnFG.score);
  } else if (vixData.status === 'fulfilled' && vixData.value?.length) {
    const vix = vixData.value[vixData.value.length - 1]?.[4] || 20;
    stockVal = vix > 40 ? 5 : vix > 30 ? 20 : vix > 25 ? 35 : vix > 20 ? 50 : vix > 15 ? 65 : vix > 12 ? 75 : 90;
  }
  if (stockVal !== null) {
    const sg = API.fgLabel(stockVal);
    stockLabel = sg.text; stockColor = API.fgColor(stockVal);
  }

  // Commodities sentiment from price momentum
  const commods = (commodData.status === 'fulfilled' ? commodData.value : []).filter(Boolean);

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Fear &amp; Greed Index</div>
      <div class="page-subtitle">Aggiornato: ${new Date().toLocaleTimeString('it-IT')}</div>
    </div>

    <!-- 3 GAUGES ROW -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">

      <!-- CRYPTO -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:24px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Crypto Market</div>
        <div class="fg-container">
          <svg class="fg-gauge-svg" viewBox="0 0 260 148" width="220" height="125" id="fg-main-gauge"></svg>
          <div class="fg-value" style="color:${color};font-size:32px">${val}</div>
          <div class="fg-label ${cls}" style="font-size:13px">${text}</div>
          <div class="fg-updated">Updated: ${API.timeAgo(current.timestamp)}</div>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px">Source: <a href="https://alternative.me" target="_blank" style="color:var(--blue)">alternative.me</a></div>
      </div>

      <!-- STOCK MARKET -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:24px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Stock Market</div>
        ${stockVal !== null ? `
          <div class="fg-container">
            <svg class="fg-gauge-svg" viewBox="0 0 260 148" width="220" height="125" id="fg-stock-gauge"></svg>
            <div class="fg-value" style="color:${stockColor};font-size:32px">${stockVal}</div>
            <div class="fg-label" style="font-size:13px;color:${stockColor}">${stockLabel}</div>
            <div class="fg-updated">${cnnFG ? 'Source: CNN Fear &amp; Greed' : 'Calcolato da VIX'}</div>
          </div>
          <div id="fg-stock-details" style="width:100%;margin-top:12px"></div>
        ` : `<div class="empty" style="padding:40px 0">Dati non disponibili<br><small style="color:var(--text-muted)">Yahoo Finance potrebbe essere temporaneamente non raggiungibile</small></div>`}
      </div>

      <!-- COMMODITIES -->
      <div class="card" style="display:flex;flex-direction:column;padding:24px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;text-align:center">Commodities Sentiment</div>
        <div id="fg-commod-panel" style="flex:1"></div>
      </div>

    </div>

    <div class="grid-2 mb-16" style="gap:16px">
      <!-- HISTORICAL CHART -->
      <div class="card">
        <div class="card-title mb-12">Crypto F&amp;G — Ultimi 90 Giorni</div>
        <div style="height:200px"><canvas id="fg-history-chart"></canvas></div>
      </div>
      <!-- SCALE -->
      <div class="card">
        <div class="card-title mb-10">Scala di Riferimento</div>
        ${[[0,25,'Extreme Fear','#ff1a44','Mercato fortemente in vendita. Opportunità storica di acquisto.'],
           [25,40,'Fear','#ff6633','Investitori timorosi. Asset potenzialmente sottovalutati.'],
           [40,60,'Neutral','#f5c400','Sentiment bilanciato. Nessun segnale forte.'],
           [60,75,'Greed','#88ee44','Investitori avidi. Considerare cautela.'],
           [75,100,'Extreme Greed','#00e5b4','Mercato surriscaldato. Storicamente opportunità di vendita.'],
        ].map(([lo,hi,label,c,desc]) => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="min-width:40px;text-align:center;background:${c}22;border:1px solid ${c}44;border-radius:3px;padding:2px 4px;font-size:10px;font-family:var(--mono);color:${c};font-weight:600;flex-shrink:0">${lo}–${hi}</div>
            <div><div style="font-size:11px;font-weight:600;color:${c}">${label}</div><div style="font-size:10px;color:var(--text-muted)">${desc}</div></div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title mb-12">Valori Recenti (Crypto)</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Data</th><th>Valore</th><th>Classificazione</th></tr></thead>
          <tbody id="fg-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Draw crypto gauge
  API.drawGaugeSVG(document.getElementById('fg-main-gauge'), val, 260);

  // Draw stock gauge
  if (stockVal !== null) {
    const sg = document.getElementById('fg-stock-gauge');
    if (sg) API.drawGaugeSVG(sg, stockVal, 260);

    // CNN F&G components
    if (cnnFG) {
      const det = document.getElementById('fg-stock-details');
      if (det) {
        const prev = cnnFG.previous_close != null ? Math.round(cnnFG.previous_close) : null;
        const w1 = cnnFG.previous_1_week != null ? Math.round(cnnFG.previous_1_week) : null;
        const m1 = cnnFG.previous_1_month != null ? Math.round(cnnFG.previous_1_month) : null;
        det.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px;text-align:center">
            ${prev != null ? `<div style="background:var(--bg-input);border-radius:4px;padding:6px"><div style="color:var(--text-muted)">Ieri</div><div style="color:${API.fgColor(prev)};font-weight:600">${prev}</div></div>` : ''}
            ${w1 != null ? `<div style="background:var(--bg-input);border-radius:4px;padding:6px"><div style="color:var(--text-muted)">1 sett.</div><div style="color:${API.fgColor(w1)};font-weight:600">${w1}</div></div>` : ''}
            ${m1 != null ? `<div style="background:var(--bg-input);border-radius:4px;padding:6px"><div style="color:var(--text-muted)">1 mese</div><div style="color:${API.fgColor(m1)};font-weight:600">${m1}</div></div>` : ''}
          </div>`;
      }
    }
  }

  // Commodities panel
  renderFGCommodities(commods);

  // History chart
  buildFGChart(crypto.data.slice(0, 60).reverse());

  // Table
  document.getElementById('fg-table-body').innerHTML = crypto.data.slice(0, 30).map(d => {
    const v = parseInt(d.value);
    const { text } = API.fgLabel(v);
    const c = API.fgColor(v);
    return `<tr>
      <td>${new Date(d.timestamp*1000).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td><span style="font-family:var(--mono);font-weight:600;color:${c}">${v}</span></td>
      <td><span class="badge" style="background:${c}22;color:${c}">${text}</span></td>
    </tr>`;
  }).join('');
}

function renderFGCommodities(quotes) {
  const el = document.getElementById('fg-commod-panel');
  if (!el) return;

  if (!quotes.length) {
    el.innerHTML = `<div class="empty">Dati commodity non disponibili</div>`;
    return;
  }

  const items = quotes.map(q => {
    const chg = q.regularMarketChangePercent || 0;
    const name = q.shortName || q.symbol;
    const sym = q.symbol;
    const price = q.regularMarketPrice || 0;
    // map momentum to sentiment
    let sentiment, sColor;
    if (chg > 3) { sentiment = 'Bullish Forte'; sColor = '#00e5b4'; }
    else if (chg > 1) { sentiment = 'Bullish'; sColor = '#88ee44'; }
    else if (chg > -1) { sentiment = 'Neutro'; sColor = '#f5c400'; }
    else if (chg > -3) { sentiment = 'Bearish'; sColor = '#ff6633'; }
    else { sentiment = 'Bearish Forte'; sColor = '#ff1a44'; }

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:12px;font-weight:600">${name.replace(' Futures','').replace(' COMEX','')}</div>
          <div style="font-size:10px;color:var(--text-muted)">${API.formatPrice(price)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:700;color:${sColor}">${sentiment}</div>
          <div class="${API.pctClass(chg)}" style="font-size:11px">${API.formatPct(chg)}</div>
        </div>
      </div>`;
  }).join('');

  // Overall commodities index
  const avgChg = quotes.reduce((s, q) => s + (q.regularMarketChangePercent || 0), 0) / quotes.length;
  const ovVal = Math.min(100, Math.max(0, 50 + avgChg * 5));
  const { text: ovText } = API.fgLabel(ovVal);
  const ovColor = API.fgColor(ovVal);

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:28px;font-weight:700;color:${ovColor}">${ovVal.toFixed(0)}</div>
      <div style="font-size:13px;color:${ovColor};font-weight:600">${ovText}</div>
      <div style="font-size:10px;color:var(--text-muted)">Indice aggregato momentum</div>
    </div>
    ${items}`;
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
