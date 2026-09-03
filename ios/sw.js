// 番茄钟离线缓存 Service Worker
// 策略：优先读本地缓存(秒开)，同时在后台悄悄去网络上拉一份新的存起来，
// 下次打开时如果内容有更新，自动生效——不需要用户手动清缓存。

var CACHE_NAME = 'pomodoro-cache-v1';
var FILES_TO_CACHE = [
  './',
  './index.html',
  './icon.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        // 网络不可用时，有缓存就用缓存，没有就只能算了
        return cached;
      });

      // 有缓存就立刻用缓存秒开，网络请求在后台悄悄更新缓存供下次使用
      return cached || networkFetch;
    })
  );
});
