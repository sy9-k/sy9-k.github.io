// SK's Toolbox の共通（各アプリの </body> の前で読み込む）
//   ・sw.js（アプリのフォルダにある）を登録して、オフラインでも開けるようにする
//   ・ホーム画面に追加できるとき（beforeinstallprompt）、[data-install] のボタンを出す
//   ・アプリとして開いたとき（インストールしたとき）は、端末の空きが少なくなってもデータを消さないよう、ブラウザにお願いする（storage.persist）
//   ・新しい版を公開したら（sw.js が変わり、新しい Service Worker に入れ替わったら）、画面の下に「新しくなりました」と出す。
//     「更新」で開き直す。30 分ごとと、画面に戻ったときに、新しい版がないか確かめる
//   ・SK Hub Systems のアクセスチェックと、アクセス解析（許可した人だけ）を読み込む。ほかのページと同じ
//   ・?embed（ホーム画面の時計など、iframe の見本）のときは何もしない
//   ・<script ... data-no-check> … アクセスチェックとアクセス解析は読み込まない（サイトのページの最後で読み込むとき。/toolbox/）
// アプリのデータは SK Hub Systems には送らず、それぞれのアプリが localStorage に保存する
(function () {
  "use strict";
  var script = document.currentScript;
  if (/[?&]embed\b/.test(location.search)) return;

  if ("serviceWorker" in navigator) {
    // いま Service Worker が動いているか（はじめて入るときは「新しくなりました」を出さない）
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") reg.update().catch(function () {}); });
    }).catch(function () {});
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) { hadController = true; return; }
      showUpdate();
    });
  }

  // 「新しくなりました」（画面の下。開き直すまで出しておく。閉じることもできる）
  var I18N = window.SKI18N;
  function t(s) { return I18N ? I18N.t(s) : s; }
  var updateBar = null;
  function showUpdate() {
    if (updateBar || !document.body) return;
    updateBar = document.createElement("div");
    updateBar.className = "tb-update";
    updateBar.setAttribute("role", "status");
    var ic = document.createElement("span");
    ic.className = "msr";
    ic.setAttribute("aria-hidden", "true");
    ic.textContent = "system_update";
    var text = document.createElement("span");
    text.className = "tb-update__text";
    text.textContent = t("SK's Toolbox が新しくなりました。更新すると反映されます");
    var go = document.createElement("button");
    go.type = "button";
    go.className = "m3-btn m3-state tb-update__go";
    go.textContent = t("更新");
    go.addEventListener("click", function () { location.reload(); });
    var close = document.createElement("button");
    close.type = "button";
    close.className = "icon-btn m3-state tb-update__close";
    close.setAttribute("aria-label", t("閉じる"));
    var x = document.createElement("span");
    x.className = "msr";
    x.setAttribute("aria-hidden", "true");
    x.textContent = "close";
    close.appendChild(x);
    close.addEventListener("click", function () { updateBar.remove(); });
    updateBar.append(ic, text, go, close);
    document.body.appendChild(updateBar);
    // タイトルバーのアイランドにも
    document.dispatchEvent(new CustomEvent("sk-island-flash", { detail: { icon: "system_update", text: t("SK's Toolbox が新しくなりました"), color: "#6cd3f7" } }));
  }

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
