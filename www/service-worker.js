// ============================================================
// service-worker.js - PWA Offline Support + Push Notifications
// ============================================================

const CACHE_NAME = 'my-diary-v101';

const STATIC_ASSETS = [
  '/',
  '/login.html',
  '/index.html',
  '/habits.html',
  '/tasks.html',
  '/journal.html',
  '/linguistic.html',
  '/goals.html',
  '/finance.html',
  '/profile.html',
  '/css/main.css',
  '/css/themes.css',
  '/js/supabase.js',
  '/js/utils.js',
  '/js/scripture.js'
];

// ----------------------------------------------------------
// INSTALL
// ----------------------------------------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------
// ACTIVATE
// ----------------------------------------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------
// FETCH
// ----------------------------------------------------------
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('er-api.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are offline.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

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

  // Network-first for everything else (your own pages, CSS, JS).
  // Previously cache-first, which is why updates never showed up on
  // an already-installed PWA no matter how many times you deployed —
  // the cache was checked before the network, forever. Now it always
  // tries the real network first, and only falls back to the cache
  // when there's genuinely no connection.
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ----------------------------------------------------------
// PUSH NOTIFICATION HANDLER
// Receives push events and shows notification
// ----------------------------------------------------------
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MyDiary';
  const options = {
    body: data.body || 'Time to check your diary!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'mydiary-reminder',
    data: { url: data.url || '/index.html' },
    actions: data.actions || [],
    requireInteraction: false,
    silent: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ----------------------------------------------------------
// NOTIFICATION CLICK HANDLER
// Opens the app when user taps a notification
// ----------------------------------------------------------
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ----------------------------------------------------------
// MESSAGE HANDLER
// Receives scheduled notification times from the app
// ----------------------------------------------------------
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    // Store the schedule in the SW scope
    self.notificationSchedule = event.data.schedule;
  }
});

// ----------------------------------------------------------
// DIRECT NOTIFICATION FROM APP
// ----------------------------------------------------------
self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'mydiary-reminder',
      data: { url: event.data.url || '/index.html' }
    });
  }
});