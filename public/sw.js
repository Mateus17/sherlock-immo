// Service worker minimal : garde l'application (HTML, JS, CSS, icônes) en cache
// pour qu'elle s'ouvre même si le serveur qui l'a servie n'est plus joignable.
// Les appels aux API publiques et les tuiles de carte ne sont jamais mis en cache.
// Changer le numéro pour forcer le renouvellement du cache après une évolution du service worker
const CACHE = 'sherlock-immo-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  // Réseau d'abord (mises à jour), cache en secours
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request).then((r) => r ?? caches.match('./'))),
  )
})
