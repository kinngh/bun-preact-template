import { serve } from "bun";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const PORT = process.env.PORT || 3000;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type RouteHandler = (req: Request) => Promise<Response> | Response;
type Middleware = (
  req: Request
) => Promise<Response | Request | void> | Response | Request | void;

type Routes = {
  [K in HttpMethod]: Record<string, RouteHandler>;
};

const routes: Routes = { GET: {}, POST: {}, PUT: {}, DELETE: {}, PATCH: {} };

const routeRoot = path.join(process.cwd(), "routes");

/* ------------------------------------------
   Build route path from folder structure
------------------------------------------- */
function toRoute(base: string): string {
  const clean = base.replace(routeRoot, "") || "/";
  return clean.startsWith("/") ? clean : "/" + clean;
}

/* ------------------------------------------
   Register all routes recursively
------------------------------------------- */
async function register(dir: string, routeBase = ""): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await register(entryPath, routeBase + "/" + entry.name);
      continue;
    }

    const name = path.basename(entry.name).replace(/\.(js|ts)$/, "");
    const method = name.toUpperCase() as HttpMethod;

    if (!(method in routes)) continue;

    const mod = await import(pathToFileURL(entryPath).href);
    if (typeof mod.default !== "function") continue;

    const route = toRoute(routeBase || "/");
    routes[method][route] = mod.default as RouteHandler;
  }
}

await register(routeRoot);

/* ------------------------------------------
   Middleware wrapper
------------------------------------------- */
export function withMiddleware(
  ...fns: [...Middleware[], RouteHandler]
): RouteHandler {
  return async (req: Request): Promise<Response> => {
    let current = req;

    for (let i = 0; i < fns.length - 1; i++) {
      const r = await fns[i](current);
      if (r instanceof Response) return r;
      if (r instanceof Request) current = r;
    }

    const final = await fns[fns.length - 1](current);
    if (!(final instanceof Response))
      throw new Error("Final handler must return Response");
    return final;
  };
}

/* ------------------------------------------
   Route matching with static > dynamic
------------------------------------------- */
function matchRoute(
  path: string,
  method: HttpMethod
): { handler: RouteHandler | null; params: Record<string, string> } {
  const table = routes[method];
  const routeKeys = Object.keys(table);

  // Sort: static first, dynamic last
  routeKeys.sort(
    (a, b) => (a.includes(":") ? 1 : 0) - (b.includes(":") ? 1 : 0)
  );

  for (const route of routeKeys) {
    const rParts = route.split("/");
    const pParts = path.split("/");

    if (rParts.length !== pParts.length) continue;

    const params: Record<string, string> = {};
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

/* ------------------------------------------
   Server
------------------------------------------- */
serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    try {
      const method = req.method as HttpMethod;
      const { pathname } = new URL(req.url);

      const { handler, params } = matchRoute(pathname, method);
      (req as any).params = params;

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
