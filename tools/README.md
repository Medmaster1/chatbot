# tools

## `ctrader_statement_to_sheets.py`

Converte l'estratto conto HTML di cTrader ("End of Day Statement") in file pronti
per Google Sheets.

Lo statement originale è pensato per la stampa: tabelle annidate, righe dei totali
scritte in bianco su bianco, tag `<nobr>`, date `gg/mm/aaaa` e numeri salvati come
testo. Incollato in Sheets non è ordinabile né sommabile.

### Uso

```bash
# workbook multi-foglio (consigliato: si carica su Drive e Sheets lo apre così com'è)
python3 tools/ctrader_statement_to_sheets.py Statement.html --xlsx out/estratto.xlsx

# CSV, uno per sezione, in due varianti di locale
python3 tools/ctrader_statement_to_sheets.py Statement.html --csv-dir out/csv
```

`--csv-dir` scrive per ogni sezione:

| file | separatore | decimali | date |
|---|---|---|---|
| `*.csv` | virgola | punto | `aaaa-mm-gg hh:mm:ss` (ISO) |
| `*.it.csv` | punto e virgola | virgola | `gg/mm/aaaa hh.mm.ss` |

Usa la variante `.it.csv` se il foglio Google ha impostazioni locali italiane,
altrimenti i numeri vengono importati come testo.

### Cosa produce il workbook

* `Riepilogo` – intestazione del conto e voci di sintesi (saldo, equity, margine, P/L)
* `Operazioni chiuse` – storico con date e numeri tipizzati, più le colonne derivate
  `Durata (min)`, `Punti`, `Esito`, `P/L % sul saldo`, e riga TOTALE con formule `SOMMA`
* `Posizioni aperte`, `Ordini pendenti`, `Transazioni`
* `Statistiche` – win rate, profit factor, aspettativa, profitto/perdita media,
  migliore e peggiore operazione, durata media: tutte formule dal vivo sul foglio
  `Operazioni chiuse`, quindi si aggiornano se aggiungi righe
* `Legenda` – dizionario delle colonne e delle assunzioni

Le formule usano solo funzioni supportate sia da Excel sia da Google Sheets
(`SUM`, `COUNTIF`, `SUMIF`, `AVERAGEIF`, `IFERROR`, `SUMPRODUCT`, `MAX`, `MIN`).

### Controllo di quadratura

A ogni conversione lo script confronta la somma della colonna `Net EUR` con il
`Realized P&L` e l'ultimo `Balance EUR` con il saldo di riepilogo dello statement;
se non corrispondono stampa un avviso su stderr.

### Dipendenze

Solo libreria standard per l'output CSV; `openpyxl` per `--xlsx`.

### Nota sulla privacy

Gli estratti conto contengono numero di conto, email, intestatario e saldi: non
committarli in questo repository, che è pubblico. Genera i file in una cartella
fuori dal repo (o ignorata da git).
