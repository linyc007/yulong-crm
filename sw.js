/**
 * Service Worker — 御龙批发CRM
 * 离线缓存策略
 */

const CACHE_NAME = 'yulong-crm-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/utils/helpers.js',
  './js/utils/export.js',
  './js/pages/dashboard.js',
  './js/pages/customers.js',
  './js/pages/orders.js',
  './js/pages/payments.js',
  './js/pages/logistics.js',
  './js/pages/followups.js',
  './js/pages/products.js',
  './icons/icon-512.png',
  './manifest.json',
];

// 安装 — 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活 — 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截 — Cache First, Network Fallback
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和外部请求
  if (event.request.method !== 'GET') return;

  // 外部CDN资源使用 Network First
  if (event.request.url.includes('cdn.sheetjs.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 本地资源使用 Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // 离线时返回主页
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
