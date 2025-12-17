import { useLocation, useRoute } from "preact-iso";

/**
 * @typedef {Object} RouterLike
 * @property {(url: string, replace?: boolean) => void} push
 * @property {Record<string, string>} query
 * @property {Record<string, string>} params
 * @property {string} currentPath
 * @property {string} url
 */

/**
 * Router hook backed by preact-iso.
 *
 * @returns {RouterLike}
 */
export function useRouter() {
  const location = useLocation();
  const route = useRoute();

  return {
    push: (url, replace) => location.route(url, replace),
    query: route.query,
    params: route.params,
    currentPath: route.path,
    url: location.url,
  };
}

export default useRouter;
