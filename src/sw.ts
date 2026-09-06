/// <reference lib="webworker" />
import {
  precacheAndRoute,
  createHandlerBoundToURL,
  addPlugins,
  getCacheKeyForURL,
} from "workbox-precaching";
import { cacheNames } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string }>;
};
const manifest = self.__WB_MANIFEST;
let downloaded = 0;
addPlugins([
  {
    async cacheDidUpdate() {
      downloaded++;
      for (const client of await self.clients.matchAll({
        includeUncontrolled: true,
      }))
        client.postMessage({
          type: "DOWNLOAD_PROGRESS",
          downloaded,
          total: manifest.length,
        });
    },
  },
]);
precacheAndRoute(manifest);
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type === "ACTIVATE") self.skipWaiting();
  if (["VERIFY", "REPAIR"].includes(type))
    event.waitUntil(
      (async () => {
        let cached = 0;
        const cache = await caches.open(cacheNames.precache);
        for (const item of manifest) {
          const key = getCacheKeyForURL(item.url)!;
          const before = await cache.match(key);
          if (!before && type === "REPAIR") {
            try {
              const response = await fetch(key, {
                cache: "reload",
                signal: AbortSignal.timeout(8000),
              });
              if (response.ok) {
                // Failed WebKit installs can leave unreadable records that ignore put().
                // Remove only this missing asset before replacing it.
                await cache.delete(key);
                await cache.put(key, response);
              }
            } catch {
              /* Keep missing assets unready; a later retry can repair them. */
            }
          }
          if (await cache.match(key)) cached++;
        }
        event.ports[0]?.postMessage({
          cached,
          total: manifest.length,
          ready: cached === manifest.length && manifest.length > 0,
        });
      })(),
    );
});
