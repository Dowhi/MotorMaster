const CACHE_NAME = 'motormaster-v9.1';
const ASSETS = [
    './',
    './index.html',
    './css/tokens.css',
    './css/reset.css',
    './css/app.css',
    './js/firebase-config.js',
    './js/state.js',
    './js/alerts.js',
    './js/notifications.js',
    './js/app.js',
    './img/icon-512.png',
    './manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});

/* Notification Click Handling */
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let c of clientList) {
                    if (c.focused) client = c;
                }
                return client.focus();
            }
            return clients.openWindow('./#/alerts');
        })
    );
});
