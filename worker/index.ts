/**
 * Cloudflare Worker (static assets) — a DORMANT MIRROR, not production.
 *
 * Production is Google Cloud: the SPA in a Cloud Storage bucket and the Express API
 * on Cloud Run, both behind one HTTPS load balancer in me-central2 (Dammam), which
 * is what keeps user data in-Kingdom. Nothing deploys here today. This front is
 * kept working so it stays a viable fallback, and so `wrangler deploy` is a real
 * option rather than a config that rotted while nobody was looking.
 *
 * What it does: serves the Vite-built SPA from the bundled dist/ assets and proxies
 * same-origin `/api/*` to the Cloud Run gateway, so chat and account work here with
 * no CORS and no CSP change (`connect-src 'self'` stays valid).
 *
 * Routing is driven by wrangler.toml: `run_worker_first = ["/api/*"]` guarantees
 * this Worker runs before the asset layer for `/api/*` (so the SPA fallback can
 * never swallow an API call), while every other path is served straight from the
 * static assets, with `not_found_handling = "single-page-application"` returning
 * index.html for client-side routes.
 *
 * See docs/RUNBOOK-golive.md for the production topology.
 */

/** Fallback when the `API_ORIGIN` var is absent from wrangler.toml. */
const DEFAULT_API_ORIGIN = 'https://api.flygaca.com';

interface Env {
  /** Static-assets binding (configured under [assets] in wrangler.toml). */
  ASSETS: Fetcher;
  /**
   * Cloud Run origin to proxy `/api/*` to, from `[vars]` in wrangler.toml. A var
   * rather than a constant so pointing this mirror at a different project — or a
   * staging service — is a config change, not a code change.
   */
  API_ORIGIN?: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const origin = env.API_ORIGIN ?? DEFAULT_API_ORIGIN;
      const target = `${origin}${url.pathname}${url.search}`;
      // Re-issue the request at the API origin, preserving method, headers (incl.
      // the session cookie) and body; returning the fetch response streams it back
      // unchanged, which preserves the SSE chat stream.
      try {
        return await fetch(new Request(target, request));
      } catch {
        return new Response('Bad gateway', { status: 502 });
      }
    }

    // Everything else: serve the static SPA assets (index.html fallback handled
    // by not_found_handling = "single-page-application").
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
