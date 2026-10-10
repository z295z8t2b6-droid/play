// Çevrimdışı önbellek (yalnız web/PWA; Capacitor'da (04) kaydedilmez).
// Kurulumda index.html ve onun bağladığı dosyalar önbelleğe alınır. Sayfalar: önce ağ, yoksa önbellek.
// assets/ (adı içerik özetli, değişmez): önce önbellek. Diğerleri: önbellekten ver, arkada tazele.
const CACHE = 'duscards-v1'
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(CORE)
    const html = await (await cache.match('./index.html')).text()
    const linked = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1])
    await cache.addAll(linked)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put('./index.html', copy))
      return res
    }).catch(async () => (await caches.match('./index.html')) ?? Response.error()))
    return
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const hit = await cache.match(req)
    const fresh = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    })
    if (hit && url.pathname.includes('/assets/')) return hit
    if (hit) { fresh.catch(() => {}); return hit }
    return fresh
  })())
})
