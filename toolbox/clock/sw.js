const CACHE_NAME = 'sk-clock-v15';
const ASSETS = [
  '/toolbox/clock/',
  '/toolbox/clock/index.html',
  '/toolbox/clock/clock.css',
  '/toolbox/clock/clock.js',
  '/toolbox/clock/clock-tools.js',
  '/toolbox/clock/manifest.json',
  '/toolbox/clock/icon.svg',
  '/toolbox/clock/icon-192.png',
  '/toolbox/clock/icon-512.png',
  '/toolbox/shared/pwa.js',
  '/toolbox/shared/m3.css',
  '/toolbox/shared/m3.js',
  '/toolbox/shared/settings.js',
  '/toolbox/shared/remind.js',
  '/toolbox/shared/search.js',
  '/toolbox/shared/sync.js',
  '/toolbox/shared/sync-merge.js',
  '/toolbox/shared/sync-core.js',
  '/toolbox/shared/titlebar.js',
  // 設定の画面で出す、ほかのアプリのアイコン
  '/toolbox/countdown/icon.svg',
  '/toolbox/calc/icon.svg',
  '/toolbox/memo/icon.svg',
  '/toolbox/todo/icon.svg',
  '/toolbox/timetable/icon.svg',
  '/toolbox/roulette/icon.svg',
  // 多言語（オフラインでも選んだ言語で表示できるように）
  '/assets/i18n.js',
  '/assets/i18n/en.js',
  '/assets/i18n/zh-CN.js',
  '/assets/i18n/zh-TW.js',
  '/assets/i18n/ko.js',
  // 文字のフォントは、EU などでは読み込まないので先に取りに行かない（/assets/fonts.js が地域で判断する）
  '/assets/fonts.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (key.startsWith('sk-clock-') && key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // SK Hub Systems のアクセスチェック（/frameworks/ と Firestore）・アカウント（/assets/hub/・/y-filter/）はキャッシュしない。
  // キャッシュすると、ブロックの解除や check.js・アカウントの更新が反映されなくなるため。
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/frameworks/') || url.hostname === 'firestore.googleapis.com'
    || (url.origin === self.location.origin && (url.pathname.startsWith('/assets/hub/') || url.pathname.startsWith('/y-filter/')))) return;

  // 自分のサイトのファイルは通信優先（更新がすぐ届くように。オフラインのときだけキャッシュ）
  // Google Fonts はキャッシュ優先
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  if (!/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return; // アクセス解析などはキャッシュしない
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
      }
      return response;
    }))
  );
});

// 通知（Todo のリマインダー・Clock・SK Hub Systems のお知らせ）を押したら、そのページを開く（開いていれば前に出す）
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/toolbox/todo/';
  // 通知のページ（Todo・Clock・SK Hub Systems のお知らせ）が開いていれば前に出す
  const path = new URL(url, self.location.origin).pathname;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).pathname.startsWith(path) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
