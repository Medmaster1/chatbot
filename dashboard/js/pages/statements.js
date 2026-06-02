/* ============================================================
   FINANCIAL STATEMENTS PAGE
   ============================================================ */
async function render_statements(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title-large">Financial Statements</div>
      <div class="page-subtitle">Income Statement, Balance Sheet &amp; Cash Flow via Yahoo Finance</div>
    </div>

    <div class="card mb-16">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Stock Symbol</label>
          <input type="text" id="fs-symbol" placeholder="AAPL, MSFT, TSLA…" style="min-width:200px" value="AAPL">
        </div>
        <button class="btn btn-green" onclick="loadStatements()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><circle cx="11" cy="11" r="8" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/></svg>
          Load Statements
        </button>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap">
        ${['AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','JPM','V','NFLX'].map(s =>
          `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('fs-symbol').value='${s}';loadStatements()">${s}</button>`
        ).join('')}
      </div>
    </div>

    <div id="fs-result"></div>
  `;

  document.getElementById('fs-symbol').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadStatements();
  });

  loadStatements();
}

window.loadStatements = async function() {
  const symbol = (document.getElementById('fs-symbol')?.value || 'AAPL').trim().toUpperCase();
  const el = document.getElementById('fs-result');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Loading financial statements for ${symbol}…</div>`;

  try {
    const data = await API.getYahooSummary(symbol);
    if (!data) throw new Error('No data returned. The symbol may not exist.');
    renderStatements(symbol, data, el);
  } catch (err) {
    el.innerHTML = `
      <div class="card">
        <div class="alert alert-warning">Unable to load: ${err.message}</div>
        <p style="font-size:12px;color:var(--text-muted)">This uses Yahoo Finance via a CORS proxy. It may occasionally fail due to rate limits. Retry in a few seconds.</p>
      </div>`;
  }
};

function renderStatements(symbol, data, el) {
  const income = data.incomeStatementHistory?.incomeStatementHistory || [];
  const balance = data.balanceSheetHistory?.balanceSheetHistory || [];
  const cashflow = data.cashflowStatementHistory?.cashflowStatementHistory || [];

  const fmtV = v => v?.raw !== undefined ? API.formatNum(v.raw) : '—';
  const fmtD = (statements, key) => statements.slice(0,4).map(s => fmtV(s[key]));
  const dates = income.slice(0,4).map(s => {
    const d = s.endDate?.fmt || '';
    return d ? d.slice(0,4) : '—';
  });

  const tabHtml = `
    <div class="tabs mb-16" id="fs-tabs">
      <div class="tab active" data-tab="income">Income Statement</div>
      <div class="tab" data-tab="balance">Balance Sheet</div>
      <div class="tab" data-tab="cashflow">Cash Flow</div>
    </div>`;

  el.innerHTML = `
    <div class="card mb-12" style="padding:12px 16px">
      <div style="font-size:16px;font-weight:700">${symbol} — Annual Financial Statements</div>
      <div style="font-size:11px;color:var(--text-muted)">Source: Yahoo Finance • Values in USD</div>
    </div>
    ${tabHtml}
    <div class="card" id="fs-table-wrap"></div>`;

  document.getElementById('fs-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#fs-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderFSTable(tab.dataset.tab, dates, income, balance, cashflow);
  });

  renderFSTable('income', dates, income, balance, cashflow);
}

function renderFSTable(type, dates, income, balance, cashflow) {
  const wrap = document.getElementById('fs-table-wrap');
  if (!wrap) return;

  const fmtV = v => v?.raw !== undefined ? API.formatNum(v.raw) : '—';
  const fmtD = (stmts, key) => stmts.slice(0,4).map(s => fmtV(s[key]));

  const thead = `<tr><th>Item</th>${dates.map(d => `<th class="r">${d}</th>`).join('')}</tr>`;

  let rows = [];

  if (type === 'income') {
    const sec = (label) => [label, null];
    const row = (label, key) => [label, income.length ? fmtD(income, key) : null];
    rows = [
      sec('REVENUE'),
      row('Total Revenue', 'totalRevenue'),
      row('Cost of Revenue', 'costOfRevenue'),
      row('Gross Profit', 'grossProfit'),
      sec('OPERATING EXPENSES'),
      row('R&D Expense', 'researchDevelopment'),
      row('Selling & Admin', 'sellingGeneralAdministrative'),
      row('Total Operating Expense', 'totalOperatingExpenses'),
      row('Operating Income', 'operatingIncome'),
      sec('INCOME'),
      row('EBITDA', 'ebitda'),
      row('Interest Expense', 'interestExpense'),
      row('Income Before Tax', 'incomeBeforeTax'),
      row('Income Tax Expense', 'incomeTaxExpense'),
      row('Net Income', 'netIncome'),
      row('EPS Basic', 'basicEPS'),
      row('EPS Diluted', 'dilutedEPS'),
    ];
  } else if (type === 'balance') {
    const sec = (label) => [label, null];
    const row = (label, key) => [label, balance.length ? fmtD(balance, key) : null];
    rows = [
      sec('CURRENT ASSETS'),
      row('Cash & Equivalents', 'cash'),
      row('Short-term Investments', 'shortTermInvestments'),
      row('Net Receivables', 'netReceivables'),
      row('Inventory', 'inventory'),
      row('Total Current Assets', 'totalCurrentAssets'),
      sec('LONG-TERM ASSETS'),
      row('Long-term Investments', 'longTermInvestments'),
      row('Property, Plant & Equip', 'propertyPlantEquipment'),
      row('Goodwill', 'goodWill'),
      row('Intangible Assets', 'intangibleAssets'),
      row('Total Assets', 'totalAssets'),
      sec('LIABILITIES'),
      row('Short-term Debt', 'shortLongTermDebt'),
      row('Accounts Payable', 'accountsPayable'),
      row('Total Current Liabilities', 'totalCurrentLiabilities'),
      row('Long-term Debt', 'longTermDebt'),
      row('Total Liabilities', 'totalLiab'),
      sec('EQUITY'),
      row('Retained Earnings', 'retainedEarnings'),
      row('Total Stockholder Equity', 'totalStockholderEquity'),
    ];
  } else {
    const sec = (label) => [label, null];
    const row = (label, key) => [label, cashflow.length ? fmtD(cashflow, key) : null];
    rows = [
      sec('OPERATING ACTIVITIES'),
      row('Net Income', 'netIncome'),
      row('Depreciation & Amortization', 'depreciation'),
      row('Change in Working Capital', 'changeToWorkingCapital'),
      row('Operating Cash Flow', 'totalCashFromOperatingActivities'),
      sec('INVESTING ACTIVITIES'),
      row('Capital Expenditures', 'capitalExpenditures'),
      row('Investments', 'investments'),
      row('Investing Cash Flow', 'totalCashflowsFromInvestingActivities'),
      sec('FINANCING ACTIVITIES'),
      row('Dividends Paid', 'dividendsPaid'),
      row('Net Borrowings', 'netBorrowings'),
      row('Stock Repurchase', 'repurchaseOfStock'),
      row('Financing Cash Flow', 'totalCashFromFinancingActivities'),
      sec('NET'),
      row('Net Change in Cash', 'changeInCash'),
      row('Free Cash Flow', 'freeCashFlow'),
    ];
  }

  const tbody = rows.map(([label, vals]) => {
    if (!vals) {
      return `<tr class="fs-section-row"><td colspan="${dates.length + 1}" style="padding-top:10px">${label}</td></tr>`;
    }
    return `<tr>
      <td style="font-family:var(--sans);font-size:12px;color:var(--text-secondary)">${label}</td>
      ${vals.map(v => `<td class="r" style="font-size:12px">${v}</td>`).join('')}
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table fs-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <p style="font-size:10px;color:var(--text-muted);margin-top:8px">Values in USD. Source: Yahoo Finance via proxy. Annual figures, most recent 4 years shown.</p>`;
}
