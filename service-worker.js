// ============================================================
// service-worker.js - PWA Offline Support
// Handles: caching all app files on install, serving cached
// files when offline, updating cache when online.
// Strategy: Cache First for static assets, Network First
// for Supabase API calls so data stays fresh when online.
// ============================================================

const CACHE_NAME = 'my-diary-v1';

// Files to cache on install for full offline support
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/habits.html',
  '/tasks.html',
  '/journal.html',
  '/goals.html',
  '/finance.html',
  '/profile.html',
  '/css/main.css',
  '/css/themes.css',
  '/js/supabase.js',
  '/js/utils.js'
];

// ----------------------------------------------------------
// INSTALL EVENT
// Caches all static assets when service worker installs
// ----------------------------------------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service worker: caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------
// ACTIVATE EVENT
// Cleans up old caches from previous versions
// ----------------------------------------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Service worker: deleting old cache', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------
// FETCH EVENT
// Network first for API calls, cache first for static files
// ----------------------------------------------------------
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network first for Supabase API and exchange rate requests
  // so data is always fresh when online
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('er-api.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, return a simple offline response for API calls
          return new Response(
            JSON.stringify({ error: 'You are offline. Data will sync when you reconnect.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Cache first for CDN resources (fonts, icons, libraries)
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Cache first for all local static files
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache, try network and cache the result
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ----------------------------------------------------------
// MESSAGE EVENT
// Allows pages to send messages to the service worker
// Used for manual cache refresh triggers
// ----------------------------------------------------------
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});