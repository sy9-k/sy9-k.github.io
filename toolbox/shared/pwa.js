// SK's Toolbox の共通（各アプリの </body> の前で読み込む）
//   ・sw.js（アプリのフォルダにある）を登録して、オフラインでも開けるようにする
//   ・ホーム画面に追加できるとき（beforeinstallprompt）、[data-install] のボタンを出す
//   ・SK Hub Systems のアクセスチェックと、アクセス解析（許可した人だけ）を読み込む。ほかのページと同じ
//   ・?embed（/toolbox/ の見本の iframe）のときは何もしない
// アプリのデータは SK Hub Systems には送らず、それぞれのアプリが localStorage に保存する
(function () {
  "use strict";
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
  window.addEventListener("appinstalled", function () { deferred = null; show(false); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-install]");
    if (!b || !deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; show(false); });
  });

  ["/frameworks/check.js", "/assets/analytics.js"].forEach(function (src) {
    var s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  });
})();
