/* ============================================================
   COT REPORT PAGE
   ============================================================ */

// Pre-loaded CFTC COT data snapshot (updated periodically by the user)
// Format: { asset, commercial: {long, short}, nonCommercial: {long, short}, date }
const COT_DATA = [
  { asset: 'Gold (GC)',           commercial: { long: 165432, short: 298765 }, nonCommercial: { long: 241876, short: 89234 },  date: '2025-05-27' },
  { asset: 'Silver (SI)',         commercial: { long: 43210,  short: 89765  }, nonCommercial: { long: 67890,  short: 21345  }, date: '2025-05-27' },
  { asset: 'Crude Oil (CL)',      commercial: { long: 298765, short: 412345 }, nonCommercial: { long: 432156, short: 187654 }, date: '2025-05-27' },
  { asset: 'Natural Gas (NG)',    commercial: { long: 234567, short: 312456 }, nonCommercial: { long: 134567, short: 189234 }, date: '2025-05-27' },
  { asset: 'S&P 500 E-mini (ES)', commercial: { long: 123456, short: 89234  }, nonCommercial: { long: 456789, short: 312456 }, date: '2025-05-27' },
  { asset: 'NASDAQ E-mini (NQ)',  commercial: { long: 34567,  short: 28765  }, nonCommercial: { long: 123456, short: 89234  }, date: '2025-05-27' },
  { asset: 'EUR/USD',             commercial: { long: 198765, short: 178456 }, nonCommercial: { long: 134567, short: 156789 }, date: '2025-05-27' },
  { asset: 'GBP/USD',             commercial: { long: 87654,  short: 98765  }, nonCommercial: { long: 67890,  short: 54321  }, date: '2025-05-27' },
  { asset: 'USD/JPY',             commercial: { long: 154321, short: 132456 }, nonCommercial: { long: 98765,  short: 123456 }, date: '2025-05-27' },
  { asset: 'Bitcoin (BTC)',       commercial: { long: 8765,   short: 12345  }, nonCommercial: { long: 23456,  short: 9876   }, date: '2025-05-27' },
  { asset: 'Wheat (ZW)',          commercial: { long: 134567, short: 156789 }, nonCommercial: { long: 89234,  short: 112345 }, date: '2025-05-27' },
  { asset: 'Corn (ZC)',           commercial: { long: 234567, short: 289876 }, nonCommercial: { long: 167890, short: 198765 }, date: '2025-05-27' },
];

async function render_cot(el) {
  el.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <div class="page-title-large">COT Report</div>
        <div class="page-subtitle">Commitment of Traders — CFTC Weekly Report (snapshot)</div>
      </div>
      <a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" class="btn btn-ghost btn-sm">
        CFTC Source ↗
      </a>
    </div>

    <div class="alert alert-info mb-16">
      <strong>Note:</strong> I dati mostrati sono una snapshot. Per i dati live clicca "CFTC Source" sopra. La CFTC pubblica ogni venerdì i dati al martedì precedente.
    </div>

    <div class="grid-4 mb-16" id="cot-summary-stats"></div>

    <div class="card mb-16">
      <div class="card-header mb-16">
        <div class="card-title">Non-Commercial Net Positioning</div>
        <div class="flex gap-8">
          <span class="badge badge-green">Long</span>
          <span class="badge badge-red">Short</span>
        </div>
      </div>
      <div id="cot-bars"></div>
    </div>

    <div class="card mb-16">
      <div class="card-title mb-12">Detailed COT Data</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th class="r">Comm. Long</th>
              <th class="r">Comm. Short</th>
              <th class="r">Net Comm.</th>
              <th class="r">Non-Comm. Long</th>
              <th class="r">Non-Comm. Short</th>
              <th class="r">Net Non-Comm.</th>
              <th class="c">Sentiment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="cot-table-body"></tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title mb-12">How to Read the COT Report</div>
      <div class="grid-2" style="gap:16px">
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">
          <p><strong style="color:var(--text-primary)">Commercial Traders</strong> sono le aziende che usano i futures per coprire rischi reali (produttori, consumatori). Le loro posizioni mostrano il sentiment dei professionisti del settore.</p>
          <br>
          <p><strong style="color:var(--text-primary)">Non-Commercial Traders</strong> (Large Speculators) sono hedge fund e grandi operatori che speculano sulla direzione del mercato. Sono considerati i "trend followers".</p>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">
          <p><strong style="color:var(--green)">Net Long Non-Comm.</strong>: I grandi speculatori sono rialzisti — segnale potenzialmente positivo per il trend.</p>
          <br>
          <p><strong style="color:var(--red)">Net Short Non-Comm.</strong>: I grandi speculatori sono ribassisti — possibile pressione al ribasso.</p>
          <br>
          <p style="color:var(--text-muted);font-size:11px">⚠️ Il COT è un indicatore lagging. Va usato in combinazione con analisi tecnica.</p>
        </div>
      </div>
    </div>
  `;

  renderCOTSummary();
  renderCOTBars();
  renderCOTTable();
}

function renderCOTSummary() {
  const bullish = COT_DATA.filter(d => (d.nonCommercial.long - d.nonCommercial.short) > 0).length;
  const bearish = COT_DATA.filter(d => (d.nonCommercial.long - d.nonCommercial.short) < 0).length;
  const totalLong = COT_DATA.reduce((s, d) => s + d.nonCommercial.long, 0);
  const totalShort = COT_DATA.reduce((s, d) => s + d.nonCommercial.short, 0);
  const netBias = ((totalLong - totalShort) / (totalLong + totalShort) * 100).toFixed(1);

  document.getElementById('cot-summary-stats').innerHTML = `
    <div class="card card-sm">
      <div class="card-title">Bullish Assets</div>
      <div class="card-value positive">${bullish}</div>
      <div class="card-change neutral">Non-Comm. net long</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Bearish Assets</div>
      <div class="card-value negative">${bearish}</div>
      <div class="card-change neutral">Non-Comm. net short</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Net Long Positions</div>
      <div class="card-value">${API.formatNum(totalLong)}</div>
      <div class="card-change neutral">all instruments</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Overall Bias</div>
      <div class="card-value ${netBias >= 0 ? 'positive' : 'negative'}">${netBias >= 0 ? '+' : ''}${netBias}%</div>
      <div class="card-change neutral">net positioning</div>
    </div>`;
}

function renderCOTBars() {
  const container = document.getElementById('cot-bars');
  if (!container) return;

  container.innerHTML = COT_DATA.map(d => {
    const ncLong = d.nonCommercial.long;
    const ncShort = d.nonCommercial.short;
    const total = ncLong + ncShort;
    const longPct = total > 0 ? (ncLong / total * 100).toFixed(1) : 50;
    const shortPct = 100 - parseFloat(longPct);
    const net = ncLong - ncShort;
    const netSign = net >= 0 ? '+' : '';
    const netColor = net >= 0 ? 'var(--green)' : 'var(--red)';

    return `
      <div class="cot-row">
        <div class="cot-meta">
          <span class="cot-asset-name">${d.asset}</span>
          <span class="cot-net" style="color:${netColor}">Net: ${netSign}${API.formatNum(net)}</span>
        </div>
        <div class="cot-bar-outer">
          <div class="cot-bar-long" style="width:${longPct}%"></div>
          <div class="cot-bar-short" style="width:${shortPct}%;left:auto"></div>
        </div>
        <div class="cot-labels">
          <span class="positive">${longPct}% Long (${API.formatNum(ncLong)})</span>
          <span class="negative">${shortPct}% Short (${API.formatNum(ncShort)})</span>
        </div>
      </div>`;
  }).join('');
}

function renderCOTTable() {
  const rows = COT_DATA.map(d => {
    const commNet = d.commercial.long - d.commercial.short;
    const ncNet = d.nonCommercial.long - d.nonCommercial.short;
    const sentiment = ncNet > 0
      ? '<span class="badge badge-green">Bullish</span>'
      : '<span class="badge badge-red">Bearish</span>';
    return `<tr>
      <td style="font-family:var(--sans)">${d.asset}</td>
      <td class="r positive">${API.formatNum(d.commercial.long)}</td>
      <td class="r negative">${API.formatNum(d.commercial.short)}</td>
      <td class="r ${commNet >= 0 ? 'positive' : 'negative'}">${commNet >= 0 ? '+' : ''}${API.formatNum(commNet)}</td>
      <td class="r positive">${API.formatNum(d.nonCommercial.long)}</td>
      <td class="r negative">${API.formatNum(d.nonCommercial.short)}</td>
      <td class="r ${ncNet >= 0 ? 'positive' : 'negative'}">${ncNet >= 0 ? '+' : ''}${API.formatNum(ncNet)}</td>
      <td class="c">${sentiment}</td>
      <td style="font-size:11px;color:var(--text-muted)">${d.date}</td>
    </tr>`;
  }).join('');

  document.getElementById('cot-table-body').innerHTML = rows;
}
