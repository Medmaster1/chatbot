#!/usr/bin/env python3
"""Convert a cTrader "End of Day Statement" HTML file into Google Sheets ready files.

The statement produced by cTrader is built for printing: nested tables, totals rows
written in white-on-white, ``<nobr>`` wrappers, dd/mm/yyyy timestamps and numbers
stored as text. Pasted into Google Sheets nothing is typed correctly and the totals
rows are invisible.

This script parses the statement and writes:

* ``--xlsx``     a multi sheet workbook (real dates, real numbers, formulas,
                 derived trade metrics). Upload it to Drive and Sheets opens it
                 natively, with no import dialog and no locale guessing.
* ``--csv-dir``  one CSV per section, in two flavours:
                 ``*.csv``    comma separated, dot decimals, ISO timestamps
                 ``*.it.csv`` semicolon separated, comma decimals, dd/mm/yyyy
                 (for spreadsheets whose locale is Italian).

Only the standard library is required for CSV output; ``openpyxl`` is needed for
``--xlsx``.

Usage:
    python3 tools/ctrader_statement_to_sheets.py STATEMENT.html \
        --xlsx out/statement.xlsx --csv-dir out/csv
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import os
import re
import sys
from html.parser import HTMLParser

# --------------------------------------------------------------------------- #
# HTML parsing
# --------------------------------------------------------------------------- #

TITLES = ("History", "Positions", "Orders", "Transactions", "Summary")

# Italian labels used for the generated sheets / files.
SECTION_LABELS = {
    "History": "Operazioni chiuse",
    "Positions": "Posizioni aperte",
    "Orders": "Ordini pendenti",
    "Transactions": "Transazioni",
    "Summary": "Riepilogo",
}

HEADER_LABELS = {
    "ID": "ID",
    "Symbol": "Simbolo",
    "Opening Direction": "Direzione apertura",
    "Closing Direction": "Direzione chiusura",
    "Opening Time (UTC+0)": "Apertura (UTC)",
    "Closing Time (UTC+0)": "Chiusura (UTC)",
    "Created (UTC+0)": "Creata (UTC)",
    "Submitted Time (UTC+0)": "Inviato (UTC)",
    "Time (UTC+0)": "Data/ora (UTC)",
    "Entry Price": "Prezzo entrata",
    "Closing Price": "Prezzo uscita",
    "Submitted Price": "Prezzo ordine",
    "Closing Quantity": "Quantita",
    "Current Quantity": "Quantita",
    "Quantity": "Quantita",
    "Current Volume": "Volume",
    "Volume": "Volume",
    "Direction": "Direzione",
    "Order Type": "Tipo ordine",
    "Swap": "Swap",
    "Commission": "Commissioni",
    "Commissions": "Commissioni",
    "Conversion Rate": "Tasso conversione",
    "S/L": "Stop loss",
    "SL is guaranteed": "SL garantito",
    "T/P": "Take profit",
    "TIF": "Validita",
    "Expiry Time": "Scadenza",
    "Type": "Tipo",
    "Note": "Nota",
    "Gross EUR": "Lordo EUR",
    "Net EUR": "Netto EUR",
    "Balance EUR": "Saldo EUR",
    "Amount EUR": "Importo EUR",
}

SUMMARY_LABELS = {
    "Deposit": "Depositi",
    "Withdrawal": "Prelievi",
    "Total Net": "Movimenti netti",
    "Balance": "Saldo",
    "Unrealized P&L": "P/L non realizzato",
    "Realized P&L": "P/L realizzato",
    "Margin": "Margine utilizzato",
    "Free Margin": "Margine libero",
    "Margin Level": "Livello margine",
    "Active bonus": "Bonus attivo",
    "Equity": "Equity",
}

META_LABELS = {
    "Account": "Conto",
    "Account type": "Tipo conto",
    "Currency": "Valuta",
}

GENERATED_RE = re.compile(r"^(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}(?:\.\d+)?),?\s*UTC$")
PERIOD_RE = re.compile(r"(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})")


class StatementParser(HTMLParser):
    """Collect every table of the statement as a list of rows of cell text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[dict] = []
        self._stack: list[dict] = []
        self._cell: list[str] | None = None

    # -- helpers ----------------------------------------------------------- #
    @property
    def _current(self) -> dict | None:
        return self._stack[-1] if self._stack else None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table":
            self._stack.append({"class": attrs.get("class", ""), "rows": []})
        elif tag == "tr" and self._current is not None:
            self._current["rows"].append([])
        elif tag in ("td", "th") and self._current is not None:
            if not self._current["rows"]:
                self._current["rows"].append([])
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None and self._current is not None:
            text = re.sub(r"\s+", " ", "".join(self._cell)).strip()
            self._current["rows"][-1].append(text)
            self._cell = None
        elif tag == "table" and self._stack:
            self.tables.append(self._stack.pop())

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def read_html(path: str) -> str:
    """cTrader declares charset=utf-16 but ships utf-8/ascii; try both."""
    raw = open(path, "rb").read()
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "cp1252", "latin-1"):
        try:
            text = raw.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
        if "<html" in text.lower():
            return text
    return raw.decode("utf-8", "replace")


# --------------------------------------------------------------------------- #
# Value typing
# --------------------------------------------------------------------------- #

DATE_RE = re.compile(r"^(\d{2})/(\d{2})/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$")
NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")


def typed(value: str):
    """Return a datetime / float / str for a raw statement cell."""
    value = (value or "").strip()
    if value in ("", "-", "n/a", "N/A"):
        return None if value in ("", "-") else value
    m = DATE_RE.match(value)
    if m:
        day, month, year, hh, mm, ss, ms = m.groups()
        if hh is None:
            return dt.date(int(year), int(month), int(day))
        micro = int((ms or "0").ljust(6, "0")[:6])
        return dt.datetime(int(year), int(month), int(day), int(hh), int(mm), int(ss), micro)
    if NUM_RE.match(value):
        return float(value)
    return value


def parse_statement(path: str) -> dict:
    parser = StatementParser()
    parser.feed(read_html(path))

    meta: dict[str, str] = {}
    sections: dict[str, dict] = {}
    summary: list[tuple[str, object]] = []
    period = generated = None

    for table in parser.tables:
        rows = [r for r in table["rows"] if any(c for c in r)]
        if not rows:
            continue
        cls = table["class"]

        if cls == "dataTable":
            title = rows[0][0] if rows[0] else ""
            if title not in TITLES:
                continue
            header = [c for c in rows[1][1:]] if len(rows) > 1 else []
            body, totals = [], []
            for row in rows[2:]:
                cells = row[1:]
                if row and row[0] == "Totals":
                    totals = cells
                elif len(cells) >= max(1, len(header) - 2) and "No " not in row[0]:
                    body.append([typed(c) for c in cells])
            sections[title] = {"headers": header, "rows": body, "totals": totals}

        elif cls == "summaryTable":
            for row in rows[1:]:
                cells = [c for c in row if c != ""]
                for i in range(0, len(cells) - 1, 2):
                    label, value = cells[i], cells[i + 1]
                    if label and not label.startswith("Summary"):
                        summary.append((SUMMARY_LABELS.get(label, label), typed(value)))

        else:  # header / meta tables
            for row in rows:
                cells = [c for c in row if c]
                for i, text in enumerate(cells):
                    label = text.rstrip(" :")
                    if label in META_LABELS and i + 1 < len(cells):
                        meta[META_LABELS[label]] = cells[i + 1]
                    elif GENERATED_RE.match(text):
                        generated = GENERATED_RE.match(text).group(1)
                    elif PERIOD_RE.search(text):
                        m2 = PERIOD_RE.search(text)
                        period = f"{m2.group(1)} - {m2.group(2)}"
                    elif "@" in text and "." in text and " " not in text:
                        meta["Email"] = text
                    elif (len(cells) == 1 and "Email" in meta and "Intestatario" not in meta
                          and len(re.findall(r"[A-Za-z]{2,}", text)) >= 2):
                        meta["Intestatario"] = text.strip()
    if period:
        meta["Periodo"] = period
    if generated:
        meta["Generato"] = f"{generated} UTC"
    return {"meta": meta, "sections": sections, "summary": summary}


# --------------------------------------------------------------------------- #
# Derived trade metrics (History)
# --------------------------------------------------------------------------- #

DERIVED = ["Durata (min)", "Punti", "Esito", "P/L % sul saldo"]


def derive_history(headers: list[str], row: list) -> list:
    """Duration, price move in points, win/loss flag and % of balance."""
    idx = {h: i for i, h in enumerate(headers)}

    def get(name):
        i = idx.get(name)
        return row[i] if i is not None and i < len(row) else None

    opened, closed = get("Opening Time (UTC+0)"), get("Closing Time (UTC+0)")
    duration = None
    if isinstance(opened, dt.datetime) and isinstance(closed, dt.datetime):
        duration = round((closed - opened).total_seconds() / 60, 2)

    entry, exit_ = get("Entry Price"), get("Closing Price")
    direction = get("Opening Direction")
    points = None
    if isinstance(entry, float) and isinstance(exit_, float) and direction:
        points = round(exit_ - entry if direction.upper() == "BUY" else entry - exit_, 5)

    net, balance = get("Net EUR"), get("Balance EUR")
    outcome = pct = None
    if isinstance(net, float):
        outcome = "WIN" if net > 0 else ("LOSS" if net < 0 else "BE")
        if isinstance(balance, float) and balance - net:
            pct = net / (balance - net)
    return [duration, points, outcome, pct]


def check_consistency(data: dict) -> list[str]:
    """Cross-check the parsed rows against the totals printed on the statement."""
    warnings = []
    history = data["sections"].get("History")
    if not history or not history["rows"]:
        return warnings
    idx = {h: i for i, h in enumerate(history["headers"])}
    net = sum(r[idx["Net EUR"]] for r in history["rows"]
              if isinstance(r[idx["Net EUR"]], float))
    for label, value in data["summary"]:
        if label in ("P/L realizzato", "Realized P&L") and isinstance(value, float):
            if abs(net - value) > 0.01:
                warnings.append(f"somma Netto EUR ({net:.2f}) != P/L realizzato dello "
                                f"statement ({value:.2f})")
    last_balance = history["rows"][-1][idx["Balance EUR"]]
    for label, value in data["summary"]:
        if label in ("Saldo", "Balance") and isinstance(value, float):
            if isinstance(last_balance, float) and abs(last_balance - value) > 0.01:
                warnings.append(f"ultimo Saldo EUR ({last_balance:.2f}) != saldo di "
                                f"riepilogo ({value:.2f})")
    return warnings


# --------------------------------------------------------------------------- #
# CSV output
# --------------------------------------------------------------------------- #

def fmt_intl(value):
    if isinstance(value, dt.datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, dt.date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, float):
        return repr(round(value, 10))
    return "" if value is None else value


def fmt_it(value):
    if isinstance(value, dt.datetime):
        return value.strftime("%d/%m/%Y %H.%M.%S")
    if isinstance(value, dt.date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, float):
        return repr(round(value, 10)).replace(".", ",")
    return "" if value is None else value


def write_csvs(data: dict, out_dir: str) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    written = []
    blocks: list[tuple[str, list[str], list[list]]] = []

    meta_rows = [[k, v] for k, v in data["meta"].items()]
    blocks.append(("00_intestazione", ["Voce", "Valore"], meta_rows))

    for name, section in data["sections"].items():
        headers = [HEADER_LABELS.get(h, h) for h in section["headers"]]
        rows = [list(r) for r in section["rows"]]
        if name == "History":
            headers = headers + DERIVED
            rows = [r + derive_history(section["headers"], r) for r in rows]
        blocks.append((f"{list(SECTION_LABELS).index(name) + 1:02d}_{SECTION_LABELS[name].replace(' ', '_').lower()}", headers, rows))

    blocks.append(("05_riepilogo", ["Voce", "Valore"], [[k, v] for k, v in data["summary"]]))

    for base, headers, rows in blocks:
        for suffix, delim, fmt in ((".csv", ",", fmt_intl), (".it.csv", ";", fmt_it)):
            path = os.path.join(out_dir, base + suffix)
            with open(path, "w", newline="", encoding="utf-8") as fh:
                writer = csv.writer(fh, delimiter=delim)
                writer.writerow(headers)
                writer.writerows([[fmt(c) for c in row] for row in rows])
            written.append(path)
    return written



# --------------------------------------------------------------------------- #
# Single-tab CSV for direct upload to Google Drive (native Google Sheet)
# --------------------------------------------------------------------------- #

def write_gsheet_csv(data: dict, path: str) -> str:
    """One semicolon/comma-decimal CSV holding every section, stacked.

    Google Drive converts an uploaded CSV into a native Google Sheet, but only
    ever with a single tab, so the sections are stacked with title rows and the
    formulas use ';' as argument separator (Italian locale).
    """
    rows: list[list] = []

    def add(*cells):
        rows.append(list(cells))

    def row_of(offset_from_end: int = 0) -> int:
        """1-based spreadsheet row number of the row about to be written."""
        return len(rows) + 1 + offset_from_end

    add("ESTRATTO CONTO cTrader")
    for key, value in data["meta"].items():
        add(key, value)
    add()

    history = data["sections"].get("History")
    hist_first = hist_last = None
    if history and history["rows"]:
        headers = [HEADER_LABELS.get(h, h) for h in history["headers"]] + DERIVED
        body = [list(r) + derive_history(history["headers"], r) for r in history["rows"]]
        add("OPERAZIONI CHIUSE")
        add(*headers)
        hist_first = row_of()
        for row in body:
            add(*row)
        hist_last = row_of(-1)
        totals = [""] * len(headers)
        totals[0] = "TOTALE"
        for name in ("Swap", "Commissioni", "Lordo EUR", "Netto EUR"):
            if name in headers:
                col = _col_letter(headers.index(name) + 1)
                totals[headers.index(name)] = f"=SUM({col}{hist_first}:{col}{hist_last})"
        add(*totals)
        add()

        net = f"N{hist_first}:N{hist_last}"
        dur = f"P{hist_first}:P{hist_last}"
        sym = f"B{hist_first}:B{hist_last}"
        net = f"{_col_letter(headers.index('Netto EUR') + 1)}{hist_first}:" \
              f"{_col_letter(headers.index('Netto EUR') + 1)}{hist_last}"
        dur = f"{_col_letter(headers.index('Durata (min)') + 1)}{hist_first}:" \
              f"{_col_letter(headers.index('Durata (min)') + 1)}{hist_last}"
        sym = f"{_col_letter(headers.index('Simbolo') + 1)}{hist_first}:" \
              f"{_col_letter(headers.index('Simbolo') + 1)}{hist_last}"
        add("STATISTICHE")
        add("Operazioni chiuse", f"=COUNT({net})")
        add("Operazioni in profitto", f'=COUNTIF({net};">0")')
        add("Operazioni in perdita", f'=COUNTIF({net};"<0")')
        add("Win rate", f'=IFERROR(COUNTIF({net};">0")/COUNT({net});"")')
        add("P/L netto totale", f"=SUM({net})")
        add("Profitto medio", f'=IFERROR(AVERAGEIF({net};">0");"")')
        add("Perdita media", f'=IFERROR(AVERAGEIF({net};"<0");"")')
        add("Profit factor", f'=IFERROR(SUMIF({net};">0")/ABS(SUMIF({net};"<0"));"")')
        add("Aspettativa per operazione", f'=IFERROR(AVERAGE({net});"")')
        add("Migliore operazione", f"=MAX({net})")
        add("Peggiore operazione", f"=MIN({net})")
        add("Durata media (min)", f'=IFERROR(AVERAGE({dur});"")')
        add("Strumenti negoziati", f'=IFERROR(SUMPRODUCT((COUNTIF({sym};{sym})>0)/COUNTIF({sym};{sym}));"")')
        add()

    for name in ("Positions", "Orders", "Transactions"):
        section = data["sections"].get(name)
        if not section:
            continue
        add(SECTION_LABELS[name].upper())
        add(*[HEADER_LABELS.get(h, h) for h in section["headers"]])
        if section["rows"]:
            for row in section["rows"]:
                add(*row)
        else:
            add("Nessun record nel periodo")
        add()

    if data["summary"]:
        add("RIEPILOGO")
        for label, value in data["summary"]:
            add(label, value)

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerows([[fmt_it(c) for c in row] for row in rows])
    return path


def _col_letter(index: int) -> str:
    letters = ""
    while index:
        index, rest = divmod(index - 1, 26)
        letters = chr(65 + rest) + letters
    return letters


# --------------------------------------------------------------------------- #
# XLSX output
# --------------------------------------------------------------------------- #

EUR_FMT = '#,##0.00;[Red]-#,##0.00'
PRICE_FMT = '#,##0.00####'
PCT_FMT = '0.00%;[Red]-0.00%'
DATE_FMT = 'dd/mm/yyyy hh:mm:ss'

MONEY_COLS = {"Swap", "Commissioni", "Lordo EUR", "Netto EUR", "Saldo EUR", "Amount EUR"}
PRICE_COLS = {"Prezzo entrata", "Prezzo uscita", "Prezzo ordine", "Stop loss", "Take profit"}


def write_xlsx(data: dict, path: str) -> str:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.table import Table, TableStyleInfo

    base = Font(name="Arial", size=10)
    bold = Font(name="Arial", size=10, bold=True)
    head_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="1F3864")
    title_font = Font(name="Arial", size=14, bold=True, color="1F3864")
    thin = Side(style="thin", color="BFBFBF")
    box = Border(top=thin, bottom=thin, left=thin, right=thin)

    wb = Workbook()
    wb.remove(wb.active)

    def style_header(ws, row_idx, ncols):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=row_idx, column=c)
            cell.font, cell.fill, cell.border = head_font, head_fill, box
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws.row_dimensions[row_idx].height = 30

    def autosize(ws, headers, rows, start=1):
        for i, header in enumerate(headers, start=start):
            width = len(str(header))
            for row in rows:
                v = row[i - start] if i - start < len(row) else None
                width = max(width, len(fmt_intl(v)))
            ws.column_dimensions[get_column_letter(i)].width = min(max(width + 3, 10), 26)

    def data_sheet(title, headers, rows, table_name, freeze="A3", numeric_totals=()):
        ws = wb.create_sheet(title)
        ws.sheet_view.showGridLines = False
        ws["A1"] = title
        ws["A1"].font = title_font
        ws.append([])
        ws.append(headers)
        style_header(ws, 3, len(headers))
        for row in rows:
            ws.append(row)
        first, last = 4, 3 + len(rows)
        for r in range(first, last + 1):
            for c, header in enumerate(headers, start=1):
                cell = ws.cell(row=r, column=c)
                cell.font, cell.border = base, box
                if isinstance(cell.value, (dt.datetime, dt.date)):
                    cell.number_format = DATE_FMT
                elif header in MONEY_COLS:
                    cell.number_format = EUR_FMT
                elif header in PRICE_COLS:
                    cell.number_format = PRICE_FMT
                elif header == "Tasso conversione":
                    cell.number_format = "0.0000000000"
                elif header == "P/L % sul saldo":
                    cell.number_format = PCT_FMT
                elif header == "Durata (min)":
                    cell.number_format = "0.00"
                elif header == "Punti":
                    cell.number_format = "0.00"
                elif isinstance(cell.value, float):
                    cell.number_format = "0.####"
        if rows:
            ws.add_table(Table(displayName=table_name,
                               ref=f"A3:{get_column_letter(len(headers))}{last}",
                               tableStyleInfo=TableStyleInfo(name="TableStyleLight9",
                                                             showRowStripes=True)))
            if numeric_totals:
                trow = last + 1
                ws.cell(row=trow, column=1, value="TOTALE").font = bold
                for header in numeric_totals:
                    if header in headers:
                        col = get_column_letter(headers.index(header) + 1)
                        cell = ws.cell(row=trow, column=headers.index(header) + 1,
                                       value=f"=SUM({col}{first}:{col}{last})")
                        cell.font, cell.number_format = bold, EUR_FMT
        else:
            ws.cell(row=4, column=1, value="Nessun record nel periodo").font = base
        ws.freeze_panes = freeze
        autosize(ws, headers, rows)
        return ws, first, last

    # ---- Riepilogo ------------------------------------------------------- #
    ws = wb.create_sheet("Riepilogo")
    ws.sheet_view.showGridLines = False
    ws["A1"] = "Estratto conto - riepilogo"
    ws["A1"].font = title_font
    r = 3
    for key, value in data["meta"].items():
        ws.cell(row=r, column=1, value=key).font = bold
        ws.cell(row=r, column=2, value=value).font = base
        r += 1
    r += 1
    ws.cell(row=r, column=1, value="Voce").font = head_font
    ws.cell(row=r, column=2, value="Valore").font = head_font
    for c in (1, 2):
        ws.cell(row=r, column=c).fill = head_fill
        ws.cell(row=r, column=c).border = box
    r += 1
    for label, value in data["summary"]:
        ws.cell(row=r, column=1, value=label).font = base
        cell = ws.cell(row=r, column=2, value=value)
        cell.font = base
        if isinstance(value, float):
            cell.number_format = EUR_FMT
        r += 1
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 34

    # ---- Sections -------------------------------------------------------- #
    hist_first = hist_last = None
    hist_cols: dict[str, str] = {}
    for name in TITLES[:-1]:
        section = data["sections"].get(name)
        if not section:
            continue
        headers = [HEADER_LABELS.get(h, h) for h in section["headers"]]
        rows = [list(r) for r in section["rows"]]
        totals = ()
        if name == "History":
            headers += DERIVED
            rows = [r + derive_history(section["headers"], r) for r in rows]
            totals = ("Swap", "Commissioni", "Lordo EUR", "Netto EUR")
        _, first, last = data_sheet(SECTION_LABELS[name], headers, rows,
                                    table_name=f"tbl_{name}", numeric_totals=totals)
        if name == "History" and rows:
            from openpyxl.utils import get_column_letter as gcl
            hist_first, hist_last = first, last
            hist_cols = {h: gcl(i + 1) for i, h in enumerate(headers)}

    # ---- Statistiche (formulas over the History sheet) ------------------- #
    if hist_first:
        sheet = f"'{SECTION_LABELS['History']}'"
        net = f"{sheet}!{hist_cols['Netto EUR']}{hist_first}:{hist_cols['Netto EUR']}{hist_last}"
        dur = f"{sheet}!{hist_cols['Durata (min)']}{hist_first}:{hist_cols['Durata (min)']}{hist_last}"
        sym = f"{sheet}!{hist_cols['Simbolo']}{hist_first}:{hist_cols['Simbolo']}{hist_last}"
        stats = [
            ("Operazioni chiuse", f"=COUNT({net})", "0"),
            ("Operazioni in profitto", f'=COUNTIF({net},">0")', "0"),
            ("Operazioni in perdita", f'=COUNTIF({net},"<0")', "0"),
            ("Win rate", f'=IFERROR(COUNTIF({net},">0")/COUNT({net}),"")', PCT_FMT),
            ("P/L netto totale", f"=SUM({net})", EUR_FMT),
            ("Profitto medio", f'=IFERROR(AVERAGEIF({net},">0"),"")', EUR_FMT),
            ("Perdita media", f'=IFERROR(AVERAGEIF({net},"<0"),"")', EUR_FMT),
            ("Profit factor", f'=IFERROR(SUMIF({net},">0")/ABS(SUMIF({net},"<0")),"")', "0.00"),
            ("Aspettativa per operazione", f"=IFERROR(AVERAGE({net}),\"\")", EUR_FMT),
            ("Migliore operazione", f"=MAX({net})", EUR_FMT),
            ("Peggiore operazione", f"=MIN({net})", EUR_FMT),
            ("Durata media (min)", f'=IFERROR(AVERAGE({dur}),"")', "0.00"),
            ("Strumenti negoziati",
             f'=IFERROR(SUMPRODUCT((COUNTIF({sym},{sym})>0)/COUNTIF({sym},{sym})),"")', "0"),
        ]
        ws = wb.create_sheet("Statistiche")
        ws.sheet_view.showGridLines = False
        ws["A1"] = "Statistiche di periodo"
        ws["A1"].font = title_font
        ws["A3"], ws["B3"] = "Metrica", "Valore"
        for c in (1, 2):
            cell = ws.cell(row=3, column=c)
            cell.font, cell.fill, cell.border = head_font, head_fill, box
        for i, (label, formula, fmt) in enumerate(stats, start=4):
            ws.cell(row=i, column=1, value=label).font = base
            cell = ws.cell(row=i, column=2, value=formula)
            cell.font, cell.number_format, cell.border = base, fmt, box
        ws.column_dimensions["A"].width = 30
        ws.column_dimensions["B"].width = 18

    # ---- Legenda --------------------------------------------------------- #
    ws = wb.create_sheet("Legenda")
    ws.sheet_view.showGridLines = False
    ws["A1"] = "Come leggere questo file"
    ws["A1"].font = title_font
    notes = [
        ("Origine", "Estratto conto cTrader (HTML) convertito con tools/ctrader_statement_to_sheets.py"),
        ("Date/ora", "Convertite in valori data-ora reali (UTC+0), formato dd/mm/yyyy hh:mm:ss: ordinabili e filtrabili"),
        ("Numeri", "Convertiti in numeri veri (non testo): somme, medie e grafici funzionano subito"),
        ("Totali", "Nell'originale erano bianchi su bianco; qui sono formule SOMMA visibili in fondo alle tabelle"),
        ("Durata (min)", "Minuti tra apertura e chiusura dell'operazione"),
        ("Punti", "Movimento di prezzo a favore: (uscita - entrata) per BUY, (entrata - uscita) per SELL"),
        ("Esito", "WIN / LOSS / BE in base al Netto EUR"),
        ("P/L % sul saldo", "Netto EUR diviso il saldo precedente all'operazione (Saldo EUR - Netto EUR)"),
        ("Statistiche", "Formule dal vivo sul foglio Operazioni chiuse: aggiungendo righe si aggiornano"),
        ("Google Sheets", "Carica il file su Drive e aprilo: viene convertito senza finestra di importazione"),
    ]
    ws["A3"], ws["B3"] = "Voce", "Descrizione"
    for c in (1, 2):
        cell = ws.cell(row=3, column=c)
        cell.font, cell.fill, cell.border = head_font, head_fill, box
    for i, (label, text) in enumerate(notes, start=4):
        ws.cell(row=i, column=1, value=label).font = bold
        cell = ws.cell(row=i, column=2, value=text)
        cell.font = base
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 95

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    wb.save(path)
    return path


# --------------------------------------------------------------------------- #

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("statement", help="cTrader statement .html file")
    ap.add_argument("--xlsx", help="write a Google Sheets ready workbook here")
    ap.add_argument("--csv-dir", help="write one CSV per section into this directory")
    ap.add_argument("--gsheet-csv", metavar="FILE",
                    help="write a single semicolon CSV with every section stacked, "
                         "ready to upload to Google Drive as a native Google Sheet")
    args = ap.parse_args(argv)

    if not args.xlsx and not args.csv_dir and not args.gsheet_csv:
        ap.error("choose at least one of --xlsx / --csv-dir / --gsheet-csv")

    data = parse_statement(args.statement)
    counts = ", ".join(f"{name}: {len(s['rows'])}" for name, s in data["sections"].items())
    print(f"parsed {args.statement} -> {counts}")
    for warning in check_consistency(data):
        print(f"ATTENZIONE: {warning}", file=sys.stderr)

    if args.csv_dir:
        for path in write_csvs(data, args.csv_dir):
            print("wrote", path)
    if args.gsheet_csv:
        print("wrote", write_gsheet_csv(data, args.gsheet_csv))
    if args.xlsx:
        print("wrote", write_xlsx(data, args.xlsx))
    return 0


if __name__ == "__main__":
    sys.exit(main())
