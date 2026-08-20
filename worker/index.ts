/**
 * Cloudflare Worker (static assets). Serves the Fly GACA SPA from the bundled
 * dist/ assets and proxies same-origin `/api/*` requests to the Cloud Run origin,
 * so chat/content work on the Cloudflare front with no CORS and no CSP change
 * (`connect-src 'self'` stays valid). That origin is the single Express service in
 * `server/`, which mounts every route under `/api` and deploys separately. See
 * docs/RUNBOOK-deploy.md.
 *
 * Routing is driven by wrangler.toml: `run_worker_first = ["/api/*"]` guarantees
 * this Worker runs before the asset layer for `/api/*` (so the SPA fallback can
 * never swallow an API call), while every other path is served straight from the
 * static assets, with `not_found_handling = "single-page-application"` returning
 * index.html for client-side routes.
 */

/** The canonical origin of the Cloud Run service built from `server/`. */
const API_ORIGIN = 'https://api.flygaca.com';

interface Env {
  /** Static-assets binding (configured under [assets] in wrangler.toml). */
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const target = `${API_ORIGIN}${url.pathname}${url.search}`;
      // Re-issue the request at the API origin, preserving method, headers (incl.
      // the session cookie and any `Authorization` bearer), and body; returning the
      // fetch response streams it back unchanged (preserves SSE).
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
