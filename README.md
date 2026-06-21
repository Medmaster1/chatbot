# AURUM Suite — KID Digital Wealth

Sito e piattaforma di strumenti per **investitore/trader professionale** con focus su
**macroeconomia, energia (gas europeo e petrolio), metalli ed equity**.
Tutto in **HTML/CSS/JS puro** (app single-file), pubblicato su **GitHub Pages**.

🔗 **Live:** https://medmaster1.github.io/chatbot/

---

## Struttura del sito

### Vetrina (pagine pubbliche)
| Pagina | File | Contenuto |
|---|---|---|
| Profilo / Home | `profilo.html` | Bio, aree di competenza, metodo, link agli strumenti |
| Research | `research.html` | Note di mercato (array `POSTS`) con filtri e reader |
| Strumenti | `index.html` | Launcher della suite + nav vetrina |
| Contatti | `contatti.html` | Form contatto + newsletter (Formspree) |
| Note legali | `legal.html` | Disclaimer, privacy GDPR, cookie (template) |

### Strumenti (terminal)
| Strumento | File | Cosa fa |
|---|---|---|
| Macro & Energy | `macro-energy.html` | Gas UE (AGSI), LNG (ALSI), Brent/WTI, **curva forward**, scorte EIA, OPEC+, macro/curva tassi (FRED), COT, correlazioni cross-asset, calendario, sintesi bias |
| Market Analysis | `market-analysis.html` | Dashboard multi-asset: heatmap, rating tecnico, correlazioni, Fear & Greed, calendario |
| Gold / Silver | `gold-silver-terminal.html` | Trading desk metalli: candele, order book, ticket, P&L, gold/silver ratio |
| Confluence Helper | `confluence-helper.html` | Checklist top-down multi-timeframe con scoring di confluenza |
| Equity / Stocks | `equity.html` | Analista azioni: fondamentali, earnings, rating, gamma, Investability Score |

---

## Fonti dati (tutte free tier)

| Area | Fonte | Chiave |
|---|---|---|
| Riserve gas UE | AGSI/GIE (`agsi.gie.eu`) | gratuita (`x-key`) |
| LNG / rigassificazione UE | ALSI/GIE (`alsi.gie.eu`) | **stessa key AGSI** |
| Scorte petrolio USA / future | EIA v2 (`api.eia.gov`) | gratuita |
| Macro: tassi, CPI, curva, real yield | FRED (`api.stlouisfed.org`) | gratuita |
| Prezzi (energia, FX, indici) | Yahoo Finance | nessuna (via proxy CORS) |
| Posizionamento | CFTC COT (`publicreporting.cftc.gov`) | nessuna |

Le chiavi si inseriscono nella barra in alto di ogni terminal e restano **solo nel browser**
(`localStorage`). Si possono anche importare dal link: `…/macro-energy.html#agsi=...&eia=...&fred=...&proxy=...`

---

## Proxy CORS (consigliato)

Alcune fonti (Yahoo, EIA, FRED) non inviano header CORS. Il file
[`cloudflare-worker.js`](./cloudflare-worker.js) è un proxy gratuito da deployare su
Cloudflare Workers: incolla l'URL del worker nel campo **Proxy** dei terminal per la massima
affidabilità. In assenza, l'app usa proxy pubblici di fallback.

---

## Sviluppo locale

Essendo file statici, basta servirli con un qualsiasi server statico:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000/profilo.html
```

---

## Deploy

GitHub Pages tramite il workflow [`.github/workflows/pages.yml`](./.github/workflows/pages.yml):
ad ogni push su `main` copia tutte le pagine HTML, la cartella `assets/`, `sitemap.xml` e
`robots.txt` e pubblica il sito.

---

## Da personalizzare

- **Profilo**: nome, biografia, numeri delle statistiche (`profilo.html`)
- **Research**: i tuoi articoli nell'array `POSTS` (`research.html`)
- **Contatti**: `FORMSPREE_ID` e `CONTACT_EMAIL` (`contatti.html`)
- **Legal**: dati del titolare tra `[parentesi]` — **far revisionare a un legale** (`legal.html`)
- **OPEC+**: oggetto `OPEC` (tracker editoriale) in `macro-energy.html`

---

> ⚠️ **Avvertenza:** strumento di ricerca a finalità informative/didattiche.
> **Nessun consiglio d'investimento.** Le performance passate non sono indicative di risultati futuri.
