# tools

## `ctrader_statement_to_sheets.py`

Converte l'estratto conto HTML di cTrader ("End of Day Statement") in file pronti
per Google Sheets.

Lo statement originale è pensato per la stampa: tabelle annidate, righe dei totali
scritte in bianco su bianco, tag `<nobr>`, date `gg/mm/aaaa` e numeri salvati come
testo. Incollato in Sheets non è ordinabile né sommabile.

### Uso

```bash
# CSV unico da caricare su Google Drive: diventa un foglio Google nativo
python3 tools/ctrader_statement_to_sheets.py Statement.html --gsheet-csv out/estratto.csv

# workbook multi-foglio (per Excel, o da aprire in Sheets dopo l'upload)
python3 tools/ctrader_statement_to_sheets.py Statement.html --xlsx out/estratto.xlsx

# CSV, uno per sezione, in due varianti di locale
python3 tools/ctrader_statement_to_sheets.py Statement.html --csv-dir out/csv
```

### `--gsheet-csv`: inserimento diretto in Google Sheets

Google Drive converte un CSV caricato in un foglio Google nativo, ma sempre con
una sola scheda: questa modalità impagina quindi tutte le sezioni una sotto
l'altra (intestazione, operazioni con riga TOTALE, statistiche, posizioni,
ordini, transazioni, riepilogo).

Usa separatore `;` e virgola decimale perché è l'unico formato che le
impostazioni locali italiane interpretano correttamente: con il punto decimale
Sheets legge `-5.15` come una **durata** (-5h15m), non come numero.

Le formule sono scritte con `;` come separatore di argomenti (locale italiano) e
restano vive nel foglio: `SUM`, `COUNTIF`, `SUMIF`, `AVERAGEIF`, `IFERROR`,
`SUMPRODUCT`, `MAX`, `MIN`.

`--csv-dir` scrive per ogni sezione:

| file | separatore | decimali | date |
|---|---|---|---|
| `*.csv` | virgola | punto | `aaaa-mm-gg hh:mm:ss` (ISO) |
| `*.it.csv` | punto e virgola | virgola | `gg/mm/aaaa hh.mm.ss` |

Usa la variante `.it.csv` se il foglio Google ha impostazioni locali italiane,
altrimenti i numeri vengono importati come testo.

### Consegna verso Google Sheets

Il connettore Drive accetta il contenuto del file solo **inline**, e oltre ~10 KB il
payload viene troncato: il file arriva corrotto e la conversione in foglio Google viene
rifiutata con `Invalid conversion requested`. Da qui la regola:

| Report | Come arriva su Sheets |
|---|---|
| Sotto la soglia (statement giornalieri) | caricato direttamente come foglio Google nativo, partendo da `--gsheet-csv` |
| Sopra la soglia (statement mensili) | consegnato come `.xlsx` formattato, da trascinare in Drive: aprendolo, Sheets lo converte mantenendo grafica, grafico e formule |

Un `.xlsx` caricato con conversione attiva diventa un foglio Google nativo **con** la
formattazione, quindi il trascinamento manuale non perde nulla: è solo un passaggio in più.
Verificare sempre `fileSize` dopo un upload binario — se non coincide con il file locale,
il payload è stato troncato.

### Ordine del report

Le sezioni sono impaginate per rilevanza decrescente, non nell'ordine dello
statement originale:

1. **Situazione del conto** — saldo, equity, margine libero e utilizzato, livello
   margine, P/L non realizzato, bonus
2. **Performance del periodo** — P/L realizzato, win rate, profit factor,
   aspettativa, profitto e perdita media, migliore e peggiore operazione, durata
   media, depositi e prelievi
3. **Riepilogo per strumento** — operazioni, vinte, perse, win rate, netto e netto
   medio per simbolo, ordinati per impatto: con formule `COUNTIFS`/`SUMIF` vive sulla
   tabella delle operazioni
4. **Andamento giornaliero** — operazioni, netto e saldo di fine giornata per ogni
   giorno operativo; nel workbook alimenta il grafico della curva del saldo
5. **Operazioni chiuse** — con riga TOTALE
6. **Ordini pendenti** → **Posizioni aperte** → **Transazioni**
7. **Dati del conto** — intestatario, email, periodo, data di generazione

Anche le colonne sono riordinate in modo leggibile: identità (ID, simbolo,
direzione) → tempi (apertura, chiusura, durata) → dimensione e prezzi → risultato
(punti, lordo, swap, commissioni, netto, esito) → saldo progressivo. La colonna
`Direzione chiusura` viene omessa perché sempre opposta all'apertura, e il tasso
di conversione va in fondo.

### Cosa produce il workbook

* `Riepilogo` – situazione del conto, performance del periodo e riepilogo per strumento
  (formule dal vivo sul foglio `Operazioni`, quindi si aggiornano se aggiungi righe),
  più i dati del conto
* `Operazioni` – storico con date e numeri tipizzati, colonne derivate
  `Durata (min)`, `Punti`, `Esito`, `P/L % sul saldo`, riga TOTALE con `SOMMA`,
  intestazione bloccata, scala colore sul netto e barre dati sulla durata
* `Andamento` – tabella giornaliera più il grafico a linee della curva del saldo
* `Ordini`, `Posizioni`, `Transazioni`

Il workbook viene ricompresso da `shrink_xlsx()`: via il tema colori da 10 KB (nessuno
stile vi fa riferimento) e le proprietà del documento, deflate al massimo. Serve a stare
sotto il limite del connettore quando il report è piccolo.

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
