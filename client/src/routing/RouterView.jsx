/// <reference types="vite/client" />
import { ErrorBoundary, Router, Route, lazy } from "preact-iso";

/**
 * @typedef {import('preact').ComponentType<any>} AnyComponent
 */

/**
 * A Vite dynamic import loader for a page module.
 *
 * @typedef {() => Promise<{ default: AnyComponent } & Record<string, any>>} Loader
 */

/** @type {Record<string, Loader>} */
const pageImports = import.meta.glob("../pages/**/!(_)*.{tsx,jsx}");

/**
 * @param {string} key
 * @returns {string}
 */
function pathToIsoPattern(key) {
  let routePath = key.replace(/^\.\.\/pages/, "").replace(/\.(t|j)sx$/, "");

  if (routePath.endsWith("/index")) {
    routePath = routePath.replace(/\/index$/, "") || "/";
  }

  routePath = routePath.replace(/\[\.\.\.([^/\]]+)\]/g, ":$1*");
  routePath = routePath.replace(/\[([^/\]]+)\]/g, ":$1");

  return routePath;
}

/**
 * @param {unknown} loader
 * @returns {() => Promise<{ default: AnyComponent }>}
 */
function toLazyModule(loader) {
  /** @type {Loader} */
  const typed = loader;

  return async () => {
    const mod = await typed();
    return { default: mod.default };
  };
}

function RouterView() {
  const entries = Object.entries(pageImports).filter(
    ([key]) => !key.includes("/pages/api/")
  );

  const notFoundEntry = entries.find(([key]) => /\/404\.(t|j)sx$/.test(key));

  const routes = entries
    .filter(([key]) => !/\/404\.(t|j)sx$/.test(key))
    .map(([key, loader]) => {
      const path = pathToIsoPattern(key);
      const Component = lazy(toLazyModule(loader));
      return <Route key={key} path={path} component={Component} />;
    });

  const NotFound = notFoundEntry
    ? lazy(toLazyModule(notFoundEntry[1]))
    : function NotFoundFallback() {
        return <p>no route found</p>;
      };

  return (
    <ErrorBoundary>
      <Router>
        {routes}
        <Route default component={NotFound} />
      </Router>
    </ErrorBoundary>
  );
}

export default RouterView;