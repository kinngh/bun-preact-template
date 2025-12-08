import { serve } from "bun";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const PORT = process.env.PORT || 3000;

/**
 * @typedef {"GET" | "POST" | "PUT" | "DELETE" | "PATCH"} HttpMethod
 *
 * @callback RouteHandler
 * @param {Request} req
 * @returns {Promise<Response> | Response}
 *
 * @callback Middleware
 * @param {Request} req
 * @returns {Promise<Response | Request | void> | Response | Request | void}
 *
 * @typedef {Record<HttpMethod, Record<string, RouteHandler>>} Routes
 */

/** @type {Routes} */
const routes = { GET: {}, POST: {}, PUT: {}, DELETE: {}, PATCH: {} };

const routeRoot = path.join(process.cwd(), "routes");

/**
 * Build a route path from a base path.
 *
 * @param {string} base
 * @returns {string}
 */
function toRoute(base) {
  const clean = base.replace(routeRoot, "") || "/";
  return clean.startsWith("/") ? clean : "/" + clean;
}

/**
 * Recursively register all route handlers under a directory.
 *
 * @param {string} dir
 * @param {string} [routeBase=""]
 * @returns {Promise<void>}
 */
async function register(dir, routeBase = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await register(entryPath, routeBase + "/" + entry.name);
      continue;
    }

    const name = path.basename(entry.name).replace(/\.(js|ts)$/, "");
    /** @type {HttpMethod} */
    const method = /** @type {HttpMethod} */ (name.toUpperCase());

    if (!(method in routes)) continue;

    const mod = await import(pathToFileURL(entryPath).href);
    if (typeof mod.default !== "function") continue;

    const route = toRoute(routeBase || "/");
    routes[method][route] = /** @type {RouteHandler} */ (mod.default);
  }
}

await register(routeRoot);

/**
 * Wrap a route handler with one or more middleware functions.
 *
 * Each middleware can:
 *  - return a Response to end the chain
 *  - return a Request to continue with a modified request
 *  - return void to pass the current request through
 *
 * The final function must return a Response.
 *
 * @param {...(Middleware | RouteHandler)} fns
 * @returns {RouteHandler}
 */
export function withMiddleware(...fns) {
  return async (req) => {
    let current = req;

    for (let i = 0; i < fns.length - 1; i++) {
      const r = await /** @type {Middleware} */ (fns[i])(current);
      if (r instanceof Response) return r;
      if (r instanceof Request) current = r;
    }

    const final = await /** @type {RouteHandler} */ (fns[fns.length - 1])(
      current
    );
    if (!(final instanceof Response))
      throw new Error("Final handler must return Response");
    return final;
  };
}

/**
 * Match a request path and method to a registered route, preferring
 * static routes over dynamic ones.
 *
 * @param {string} pathStr
 * @param {HttpMethod} method
 * @returns {{ handler: RouteHandler | null; params: Record<string, string> }}
 */
function matchRoute(pathStr, method) {
  const table = routes[method];
  const routeKeys = Object.keys(table);

  // Sort: static first, dynamic last
  routeKeys.sort(
    (a, b) => (a.includes(":") ? 1 : 0) - (b.includes(":") ? 1 : 0)
  );

  for (const route of routeKeys) {
    const rParts = route.split("/");
    const pParts = pathStr.split("/");

    if (rParts.length !== pParts.length) continue;

    /** @type {Record<string, string>} */
    const params = {};
    let matched = true;

    for (let i = 0; i < rParts.length; i++) {
      const r = rParts[i];
      const p = pParts[i];

      if (r.startsWith(":")) {
        params[r.slice(1)] = p;
      } else if (r !== p) {
        matched = false;
        break;
      }
    }

    if (matched) return { handler: table[route], params };
  }

  return { handler: null, params: {} };
}

serve({
  port: PORT,
  /**
   * Bun server fetch handler.
   *
   * @param {Request} req
   * @returns {Promise<Response>}
   */
  async fetch(req) {
    try {
      /** @type {HttpMethod} */
      const method = /** @type {HttpMethod} */ (req.method);
      const { pathname } = new URL(req.url);

      const { handler, params } = matchRoute(pathname, method);
      // Attach params to the request (Bun's Request is still an object)
      // eslint-disable-next-line no-extra-semi
      /** @type {any} */ (req).params = params;

      if (!handler) return new Response("Not found", { status: 404 });

      return await handler(req);
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log("Loaded routes:", routes);
console.log(`Server running at http://localhost:${PORT}`);
