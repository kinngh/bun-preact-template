import { serve } from "bun";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const PORT = Number(process.env.PORT) || 3000;

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

// ----- ROUTE REGISTRATION

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routeRoot = path.join(__dirname, "routes");

// Vite Preact build output: client/dist
const CLIENT_DIST_DIR = path.join(__dirname, "..", "client", "dist");
const INDEX_HTML_PATH = path.join(CLIENT_DIST_DIR, "index.html");

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

// ----- MIDDLEWARE COMPOSER

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
      current,
    );
    if (!(final instanceof Response))
      throw new Error("Final handler must return Response");
    return final;
  };
}

// ----- ROUTE MATCHING

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
    (a, b) => (a.includes(":") ? 1 : 0) - (b.includes(":") ? 1 : 0),
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

// ----- STATIC FRONTEND / SPA SETUP

/** Very small mime map for common frontend assets. */
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/**
 * Check if a path is a real file.
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Serve a static asset from client/dist if it exists.
 *
 * @param {string} pathname
 * @returns {Promise<Response | null>}
 */
async function serveStaticAsset(pathname) {
  const safePath = pathname.replace(/^\/+/, "");
  const filePath =
    safePath === "" ? INDEX_HTML_PATH : path.join(CLIENT_DIST_DIR, safePath);

  if (!(await fileExists(filePath))) return null;

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  const file = Bun.file(filePath);
  return new Response(file, {
    headers: {
      "Content-Type": mime,
    },
  });
}

/**
 * Serve the SPA index.html (for client-side routing).
 *
 * @returns {Promise<Response>}
 */
async function serveIndexHtml() {
  const file = Bun.file(INDEX_HTML_PATH);
  return new Response(file, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

// ----- BUN SERVER

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
      const url = new URL(req.url);
      const pathname = url.pathname;

      /** @type {string} */
      const rawMethod = req.method.toUpperCase();
      /** @type {HttpMethod | null} */
      const method =
        rawMethod === "GET" ||
        rawMethod === "POST" ||
        rawMethod === "PUT" ||
        rawMethod === "DELETE" ||
        rawMethod === "PATCH"
          ? /** @type {HttpMethod} */ (rawMethod)
          : null;

      // 1) Try registered routes first
      if (method) {
        const { handler, params } = matchRoute(pathname, method);
        if (handler) {
          /** @type {any} */ (req).params = params;
          return await handler(req);
        }
      }

      // 2) For GET/HEAD, try static assets, then SPA index.html
      if (rawMethod === "GET" || rawMethod === "HEAD") {
        const assetResponse = await serveStaticAsset(pathname);
        if (assetResponse) return assetResponse;

        // SPA catch-all: anything not matched and not a static asset
        return await serveIndexHtml();
      }

      // 3) Non-GET/HEAD with no route -> 404
      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log("Loaded routes:", routes);
console.log(`Server running at http://localhost:${PORT}`);
