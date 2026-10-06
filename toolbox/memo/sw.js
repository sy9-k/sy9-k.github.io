const CACHE_NAME = 'sk-memo-v5';
const ASSETS = [
  '/toolbox/memo/',
  '/toolbox/memo/index.html',
  '/toolbox/memo/memo.css',
  '/toolbox/memo/memo.js',
  '/toolbox/memo/manifest.json',
  '/toolbox/memo/icon.svg',
  '/toolbox/memo/icon-192.png',
  '/toolbox/memo/icon-512.png',
  '/toolbox/shared/pwa.js',
  '/toolbox/shared/m3.css',
  '/toolbox/shared/m3.js',
  '/toolbox/shared/settings.js',
  // 設定の画面で出す、ほかのアプリのアイコン
  '/toolbox/clock/icon.svg',
  '/toolbox/calc/icon.svg',
  '/toolbox/todo/icon.svg',
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
      if (key.startsWith('sk-memo-') && key !== CACHE_NAME) return caches.delete(key);
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
