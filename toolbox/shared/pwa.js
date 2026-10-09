// SK's Toolbox の共通（各アプリの </body> の前で読み込む）
//   ・sw.js（アプリのフォルダにある）を登録して、オフラインでも開けるようにする
//   ・ホーム画面に追加できるとき（beforeinstallprompt）、[data-install] のボタンを出す
//   ・アプリとして開いたとき（インストールしたとき）は、端末の空きが少なくなってもデータを消さないよう、ブラウザにお願いする（storage.persist）
//   ・SK Hub Systems のアクセスチェックと、アクセス解析（許可した人だけ）を読み込む。ほかのページと同じ
//   ・?embed（ホーム画面の時計など、iframe の見本）のときは何もしない
//   ・<script ... data-no-check> … アクセスチェックとアクセス解析は読み込まない（サイトのページの最後で読み込むとき。/toolbox/）
// アプリのデータは SK Hub Systems には送らず、それぞれのアプリが localStorage に保存する
(function () {
  "use strict";
  var script = document.currentScript;
  if (/[?&]embed\b/.test(location.search)) return;

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});

  var deferred = null;
  function show(on) {
    document.querySelectorAll("[data-install]").forEach(function (b) { b.hidden = !on; });
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    show(true);
  });
  // データを消されにくくする（アプリとして開いたとき・入れたとき。ブラウザが判断し、許可されないこともある）
  function persist() {
    if (!navigator.storage || !navigator.storage.persist || !navigator.storage.persisted) return;
    navigator.storage.persisted().then(function (done) { if (!done) return navigator.storage.persist(); }).catch(function () { /* 対応していない */ });
  }
  var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen), (display-mode: minimal-ui)").matches;
  if (standalone || navigator.standalone === true) persist();
  window.addEventListener("appinstalled", function () { deferred = null; show(false); persist(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-install]");
    if (!b || !deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; show(false); });
  });

  if (script && script.hasAttribute("data-no-check")) return;
  ["/frameworks/check.js", "/assets/analytics.js"].forEach(function (src) {
    var s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  });
})();
