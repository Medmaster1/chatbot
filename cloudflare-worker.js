/**
 * AURUM · CORS proxy per Cloudflare Workers (piano gratuito)
 * ---------------------------------------------------------------
 * Rende affidabili le fonti dati prive di CORS (Yahoo Finance, CBOE)
 * usate da Market Analysis e dal Gold/Silver Terminal.
 *
 * DEPLOY (2 minuti):
 *  1. Vai su https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 *  2. Sostituisci il codice con questo file e premi "Deploy".
 *  3. Copia l'URL del worker (es. https://aurum-proxy.TUONOME.workers.dev).
 *  4. Nel sito Market Analysis incolla quell'URL nel campo "CORS proxy" (header) e Salva.
 *
 * USO: GET https://<worker>/?url=<URL_TARGET_ENCODED>
 * L'header X-Api-Key viene inoltrato (per FlashAlpha, se mai vorrai instradarlo).
 */
const ALLOW = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'cdn.cboe.com',
  'api.coingecko.com',
  'api.frankfurter.dev',
  'publicreporting.cftc.gov',
  'agsi.gie.eu',
  'lab.flashalpha.com',
  'nfs.faireconomy.media',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Api-Key, Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const target = new URL(request.url).searchParams.get('url');
    if (!target) return json({ error: 'missing url param' }, 400, cors);

    let host;
    try { host = new URL(target).hostname; } catch { return json({ error: 'bad url' }, 400, cors); }
    if (!ALLOW.some(h => host === h || host.endsWith('.' + h))) return json({ error: 'host not allowed' }, 403, cors);

    const fwd = {};
    const apiKey = request.headers.get('X-Api-Key');
    if (apiKey) fwd['X-Api-Key'] = apiKey;

    try {
      const upstream = await fetch(target, { headers: fwd, cf: { cacheTtl: 15, cacheEverything: true } });
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'public, max-age=15' },
      });
    } catch (e) {
      return json({ error: 'upstream fetch failed', detail: String(e) }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
