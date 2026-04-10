/**
 * Coffee Note — Service Worker
 * 전략:
 *   - 정적 자산 (CSS, JS, 폰트, 이미지): Cache-first
 *   - HTML 페이지: Network-first (오프라인 시 캐시 폴백)
 *   - Supabase API (supabase.co): 캐시 안 함, 네트워크 전용
 */

var CACHE_NAME = 'coffee-note-v1';

var STATIC_PRECACHE = [
  '/home.html',
  '/index.html',
  '/notes.html',
  '/mypage.html',
  '/tasting.html',
  '/recipe.html',
  '/recipe-register.html',
  '/recipe-detail.html',
  '/note-detail.html',
  '/register-coffee.html',
  '/common.css',
  '/app-shell.css',
  '/common.js',
  '/supabase.js',
  '/tasting-radar.js',
  '/card-generator.js',
  '/manifest.json'
];

// 설치: 정적 자산 사전 캐시
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_PRECACHE.map(function (url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function () {
        // 일부 파일 실패해도 설치 계속
      });
    })
  );
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Fetch 인터셉트
self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // Supabase API, Chrome extension, non-GET 요청 → 바이패스
  if (e.request.method !== 'GET') return;
  if (url.includes('supabase.co')) return;
  if (url.startsWith('chrome-extension')) return;

  var isHtml = e.request.headers.get('accept') &&
               e.request.headers.get('accept').includes('text/html');

  if (isHtml) {
    // HTML: Network-first, 오프라인 시 캐시
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
          return res;
        })
        .catch(function () {
          return caches.match(e.request);
        })
    );
  } else {
    // 정적 자산: Cache-first
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        return fetch(e.request).then(function (res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
          }
          return res;
        });
      })
    );
  }
});
