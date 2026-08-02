const APP_VERSION = 'planivo-v7';
const STATIC_CACHE = `${APP_VERSION}:static`;
const PAGE_CACHE = `${APP_VERSION}:pages`;
const IMAGE_CACHE = `${APP_VERSION}:media`;
const OFFLINE_URLS = ['/', '/manifest.webmanifest'];
const CORE_ASSETS = [
  '/assets/images/planivo-logo.png',
  '/assets/images/planivo-mark.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/manifest.webmanifest',
];
const NEVER_CACHE_PATHS = [
  /^\/api\//,
  /^\/login/,
  /^\/logout/,
  /^\/register/,
  /^\/password/,
  /^\/sanctum\//,
  /^\/broadcasting\//,
];

function isNeverCachePath(pathname) {
  return NEVER_CACHE_PATHS.some(pattern => pattern.test(pathname));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/build/') ||
    url.pathname.startsWith('/assets/icons/') ||
    url.pathname.startsWith('/assets/images/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/manifest.webmanifest'
  );
}

function isMediaAsset(request, url) {
  return (
    request.destination === 'image' ||
    request.destination === 'font' ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i.test(url.pathname)
  );
}

function shouldStoreResponse(response) {
  return response && response.ok && response.type === 'basic';
}

function offlinePage() {
  return new Response(
    `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#4b2142">
  <title>Planivo - hors ligne</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fffaf5;color:#292524;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{width:min(92vw,520px);padding:32px;border:1px solid #e7e5e4;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(41,37,36,.10);text-align:center}
    img{width:88px;height:88px;object-fit:contain;margin-bottom:18px}
    h1{font-size:26px;margin:0 0 10px;font-family:Georgia,serif;font-weight:500}
    p{margin:0;color:#78716c;line-height:1.65}
    button{margin-top:24px;border:0;border-radius:12px;background:#4b2142;color:#fff;padding:13px 18px;font-weight:700}
  </style>
</head>
<body>
  <main>
    <img src="/assets/icons/icon-192.png" alt="">
    <h1>Mode hors ligne</h1>
    <p>Cette page n'est pas encore disponible hors connexion. Revenez sur une page déjà ouverte ou réessayez lorsque le réseau revient.</p>
    <button onclick="location.reload()">Réessayer</button>
  </main>
</body>
</html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}

async function readBuildAssets() {
  try {
    const response = await fetch('/build/manifest.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const manifest = await response.json();
    const assets = new Set(['/build/manifest.json']);

    Object.values(manifest).forEach(entry => {
      if (entry.file) assets.add(`/build/${entry.file}`);
      (entry.css || []).forEach(file => assets.add(`/build/${file}`));
      (entry.assets || []).forEach(file => assets.add(`/build/${file}`));
    });

    return [...assets];
  } catch {
    return [];
  }
}

async function precache() {
  const cache = await caches.open(STATIC_CACHE);
  const buildAssets = await readBuildAssets();
  await Promise.allSettled(
    [...CORE_ASSETS, ...buildAssets].map(url =>
      cache.add(new Request(url, { cache: 'reload' })),
    ),
  );

  const pageCache = await caches.open(PAGE_CACHE);
  await Promise.allSettled(
    OFFLINE_URLS.map(async url => {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (shouldStoreResponse(response)) {
        await pageCache.put(url, response);
      }
    }),
  );
}

self.addEventListener('install', event => {
  event.waitUntil(precache());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => !key.startsWith(APP_VERSION))
        .map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);
    if (shouldStoreResponse(response) && response.headers.get('content-type')?.includes('text/html')) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      await cache.match(request) ||
      await cache.match('/') ||
      offlinePage()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (shouldStoreResponse(response)) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async response => {
      if (shouldStoreResponse(response)) {
        const cache = await caches.open(IMAGE_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!['GET', 'HEAD'].includes(request.method)) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNeverCachePath(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isMediaAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
