/**
 * aivory-uk-reverse-proxy — Cloudflare Worker for aivory.uk/* (mirror, no secrets).
 *
 * Deployed via API: PUT /accounts/{id}/workers/scripts/aivory-uk-reverse-proxy
 *   metadata: {"main_module":"worker.js","compatibility_date":"2024-09-01"}
 * Route: aivory.uk/* (zone aivory.uk). Backup of previous version: VPS /tmp/rp.js.bak.
 *
 * CRITICAL: /yjs* must NEVER be rewritten or wrapped in new Response().
 * The y-octo collab realtime channel (wss://aivory.uk/yjs/:room → aivory-collab:3200)
 * needs the 101 Switching Protocols to flow end-to-end. `new Response(body,
 * {status: 101})` throws RangeError inside Workers → Cloudflare error 1101.
 * Plain `fetch(request)` passthrough preserves Host + Upgrade headers and the
 * Traefik PathPrefix(/yjs) priority-100 router takes it to aivory-collab.
 */
const ORIGIN_HOST = "aivory.id";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // y-octo collab realtime: never rewrite or wrap /yjs upgrades.
    // A plain fetch() passthrough preserves Host + Upgrade headers so the
    // 101 flows end-to-end. Wrapping in new Response() throws on 101 (CF 1101).
    if (url.pathname === "/yjs" || url.pathname.startsWith("/yjs/")) {
      return fetch(request);
    }

    // Collapse `www.aivory.uk` onto the apex so Google only ever indexes
    // aivory.uk. Issued at the edge before any origin hop so cached responses
    // at CF POP become 301s instead of mirrored 200s. status:301 (permanent)
    // is what Search Console expects when dropping `www` URLs from the index.
    if (url.hostname === "www.aivory.uk") {
      url.hostname = "aivory.uk";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    const proxyHost = url.hostname;
    url.hostname = ORIGIN_HOST;

    const originRequest = new Request(url.toString(), request);
    originRequest.headers.set("Host", ORIGIN_HOST);
    originRequest.headers.set("x-aivory-proxy-host", proxyHost);
    originRequest.headers.set("x-aivory-skip-redirect", "1");

    const originResponse = await fetch(originRequest, { redirect: "manual" });

    const headers = new Headers(originResponse.headers);
    const location = headers.get("location");
    if (location) {
      try {
        const locUrl = new URL(location, url);
        if (locUrl.hostname === ORIGIN_HOST) {
          locUrl.hostname = proxyHost;
          headers.set("location", locUrl.toString());
        }
      } catch (e) {
        // leave location header untouched if it isn't a parseable URL
      }
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });
  },
};
