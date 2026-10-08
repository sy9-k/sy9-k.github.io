// SK's Toolbox のホーム画面（/toolbox/）の Service Worker。スコープは /toolbox/ 全体
// 各アプリは自分のフォルダに自分の sw.js を持つ（スコープがせまいほうが使われる）。まだ開いたことのないアプリは、ここで開ける
const CACHE_NAME = 'sk-toolbox-v10';
const ASSETS = [
  // ホーム画面と、4 つのアプリ（ホーム画面から開いたことがなくても、オフラインで開けるように）
  '/toolbox/',
  '/toolbox/index.html',
  '/toolbox/home.css',
  '/toolbox/home.js',
  '/toolbox/manifest.json',
  '/toolbox/icon.svg',
  '/toolbox/icon-192.png',
  '/toolbox/icon-512.png',
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
  '/toolbox/settings/',
  '/toolbox/clock/',
  '/toolbox/clock/index.html',
  '/toolbox/clock/clock.css',
  '/toolbox/clock/clock.js',
  '/toolbox/clock/clock-tools.js',
  '/toolbox/clock/manifest.json',
  '/toolbox/clock/icon.svg',
  '/toolbox/clock/icon-192.png',
  '/toolbox/calc/',
  '/toolbox/calc/index.html',
  '/toolbox/calc/calc.css',
  '/toolbox/calc/calc.js',
  '/toolbox/calc/manifest.json',
  '/toolbox/calc/icon.svg',
  '/toolbox/calc/icon-192.png',
  '/toolbox/memo/',
  '/toolbox/memo/index.html',
  '/toolbox/memo/memo.css',
  '/toolbox/memo/memo.js',
  '/toolbox/memo/manifest.json',
  '/toolbox/memo/icon.svg',
  '/toolbox/memo/icon-192.png',
  '/toolbox/todo/',
  '/toolbox/todo/index.html',
  '/toolbox/todo/todo.css',
  '/toolbox/todo/todo.js',
  '/toolbox/countdown/',
  '/toolbox/countdown/index.html',
  '/toolbox/countdown/countdown.css',
  '/toolbox/countdown/countdown.js',
  '/toolbox/countdown/manifest.json',
  '/toolbox/countdown/icon.svg',
  '/toolbox/countdown/icon-192.png',
  '/toolbox/todo/manifest.json',
  '/toolbox/todo/icon.svg',
  '/toolbox/todo/icon-192.png',
  // ホーム画面はサイトのページ（上にサイト共通のヘッダー）
  '/assets/header.css',
  '/assets/site.css',
  '/assets/site.js',
  '/assets/logo.svg',
  '/assets/favicon.svg',
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
      if (key.startsWith('sk-toolbox-') && key !== CACHE_NAME) return caches.delete(key);
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
