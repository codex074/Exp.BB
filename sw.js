const CACHE_NAME = 'opd-expiry-v1';
const ASSETS = [
  './index.html',
  './app.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // ให้โหลดข้อมูลจาก Google Script เสมอ (ไม่ cache API)
  if (e.request.url.includes('script.google.com')) {
    return fetch(e.request);
  }
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});