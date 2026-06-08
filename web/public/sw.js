/**
 * AI Subscription Service Worker
 * Implements Advanced Caching Strategies:
 * - App Shell: Cache First (instant load)
 * - Immutable Assets: Cache First with indefinite expiration  
 * - Dynamic API: Stale-While-Revalidate (speed + freshness)
 * - Static Resources: Stale-While-Revalidate
 * - CDN Resources: Cache First with network fallback
 * - Periodic cache cleanup for dynamic content
 */

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const APP_SHELL_CACHE = `appshell-${CACHE_VERSION}`;
const CDN_CACHE = `cdn-${CACHE_VERSION}`;

// Cache limits to prevent unbounded growth
const MAX_DYNAMIC_ITEMS = 200;
const MAX_STATIC_ITEMS = 100;

// CDN domains for external resources (use CDN cache)
const CDN_DOMAINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'fonts.bunny.net',
  'jsdelivr.global.ssl.fastly.net',
];

// App Shell assets - core assets that should always be cached
// Paths are computed relative to the SW's own location so the same
// file works regardless of subdirectory (e.g. GitHub Pages project sites).
const SW_BASE = self.location.pathname.replace(/sw\.js$/, '');
const APP_SHELL_ASSETS = [
  SW_BASE,
  SW_BASE + 'index.html',
  SW_BASE + 'manifest.json',
  SW_BASE + 'icon.svg',
  SW_BASE + 'favicon.svg',
  SW_BASE + 'icons/192x192.png',
  SW_BASE + 'icons/512x512.png',
];

// Static assets that can be cached indefinitely (immutable with hash naming)
const IMMUTABLE_ASSETS = [
  // Assets with hash in filename are automatically considered immutable
];

// Install event - cache App Shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      console.log('[SW] Caching App Shell assets');
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            // Delete old version caches
            return ![
              STATIC_CACHE,
              DYNAMIC_CACHE,
              APP_SHELL_CACHE,
              CDN_CACHE
            ].includes(key);
          })
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension URLs
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // API requests: StaleWhileRevalidate strategy
  // Returns cached response immediately while fetching fresh data in background
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // App Shell: Cache First with network fallback
  if (isAppShellAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  // Static resources with hash names (immutable): Cache First indefinitely
  // These assets have content-based hashes in their filenames
  if (hasHashInFilename(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Other static assets (JS, CSS, images, fonts): StaleWhileRevalidate
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // CDN resources: Cache First for performance
  if (isCdnRequest(url)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  // HTML pages: StaleWhileRevalidate for offline support
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Default: Network First with cache fallback
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// CDN request detection
function isCdnRequest(url) {
  return CDN_DOMAINS.some(domain => url.hostname.includes(domain));
}

// Check if request is for App Shell asset
function isAppShellAsset(pathname) {
  return APP_SHELL_ASSETS.some(asset => 
    pathname === asset || pathname.endsWith(asset)
  );
}

// Check if filename contains hash (indicating immutable content)
function hasHashInFilename(pathname) {
  // Match patterns like: filename-a1b2c3d4.js
  const hashPattern = /-[a-f0-9]{8,}\.[a-z]+$/;
  return hashPattern.test(pathname);
}

// Cache First strategy - best for immutable static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Cache First HIT:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      console.log('[SW] Cache First MISS - cached:', request.url);
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache First FALLBACK (offline):', request.url);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network First strategy - best for dynamic API responses
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Network First FALLBACK (cached):', request.url);
      return cached;
    }
    console.log('[SW] Network First FALLBACK (offline):', request.url);
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// StaleWhileRevalidate strategy - best balance of speed and freshness
// Returns cached response immediately while updating cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start network fetch in background regardless of cache hit
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        console.log('[SW] SWR updated cache:', request.url);
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] SWR network failed:', request.url, error.message);
      // Return null to indicate network failure
      return null;
    });

  // Return cached response immediately if available
  if (cached) {
    console.log('[SW] StaleWhileRevalidate HIT:', request.url);
    return cached;
  }

  // Wait for network if no cache
  console.log('[SW] StaleWhileRevalidate MISS - waiting for network:', request.url);
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Network failed and no cache
  return new Response('Offline - Resource not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Periodic cache cleanup - clean up entries older than 7 days in dynamic cache
// Also enforces cache size limits
async function cleanupOldCacheEntries(cacheName, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const now = Date.now();
  
  // Sort by date, oldest first
  const entriesWithDate = [];
  for (const request of keys) {
    const cached = await cache.match(request);
    if (cached) {
      const dateHeader = cached.headers.get('date');
      const date = dateHeader ? new Date(dateHeader).getTime() : 0;
      entriesWithDate.push({ request, date });
    }
  }
  
  // Sort by date ascending
  entriesWithDate.sort((a, b) => a.date - b.date);
  
  // Delete entries older than max age
  const toDelete = entriesWithDate.filter(e => now - e.date > maxAgeMs);
  for (const { request } of toDelete) {
    await cache.delete(request);
    console.log('[SW] Deleted stale cache entry:', request.url);
  }
  
  // If still over limit, delete oldest entries
  const maxItems = cacheName.includes('dynamic') ? MAX_DYNAMIC_ITEMS : MAX_STATIC_ITEMS;
  const excessCount = entriesWithDate.length - maxItems;
  if (excessCount > 0) {
    const toRemove = entriesWithDate.slice(0, excessCount);
    for (const { request } of toRemove) {
      await cache.delete(request);
      console.log('[SW] Deleted excess cache entry:', request.url);
    }
  }
}

// Message handling for manual cache operations
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'skipWaiting':
      self.skipWaiting();
      break;

    case 'clearCache':
      // Clear all caches
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        console.log('[SW] All caches cleared');
        event.ports[0]?.postMessage({ success: true });
      });
      break;

    case 'cleanupOldEntries':
      cleanupOldCacheEntries(DYNAMIC_CACHE).then(() => {
        console.log('[SW] Old cache entries cleaned up');
        event.ports[0]?.postMessage({ success: true });
      });
      break;

    case 'getCacheStatus':
      caches.keys().then((keys) => {
        const status = {};
        const promises = keys.map(async (key) => {
          const cache = await caches.open(key);
          const keys = await cache.keys();
          status[key] = keys.length;
        });
        return Promise.all(promises).then(() => status);
      }).then((status) => {
        event.ports[0]?.postMessage({ success: true, status });
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

console.log('[SW] Service Worker loaded - AI Subscription v' + CACHE_VERSION);