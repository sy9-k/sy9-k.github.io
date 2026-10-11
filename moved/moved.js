// 移行期間が終わったあとの古いアドレスのページ（/moved/）の動き
//   残っていない人（none）: 5 秒数えて sk-hub.jp の同じページへ。残っている人（left）: 書き出し・消すの案内
//   いまは形だけ（PREVIEW）: 端末のデータは見ず、移動・書き出し・消すもしない。.prep の中のボタンで状態を切り替える
//   本番にするときは PREVIEW を false にし、端末に古いデータ（localStorage の sk_*・IndexedDB）があるかで state を決める
(function () {
  "use strict";
  var PREVIEW = true;
  var I18N = window.SKI18N;
  function t(s) { return I18N ? I18N.t(s) : s; }

  var page = document.getElementById("page");
  // sk-hub.jp の同じページ（このページ自体のときはトップ）
  var path = location.pathname === "/moved/" ? "/" : location.pathname;
  var dest = "https://sk-hub.jp" + path + location.search + location.hash;
  document.querySelectorAll(".to-new").forEach(function (a) { a.href = dest; });
  document.querySelectorAll(".path").forEach(function (p) { p.textContent = path; });

  var snack = document.getElementById("snack"), snackTimer;
  function toast(text) {
    document.getElementById("snack-text").textContent = text;
    snack.classList.add("is-on");
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { snack.classList.remove("is-on"); }, 3000);
  }

  var fg = document.getElementById("fg"), sec = document.getElementById("sec"), secText = document.getElementById("sec-text");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, timer;
  function countdown() {
    clearInterval(timer);
    page.classList.remove("stopped");
    var n = 5;
    sec.textContent = secText.textContent = n;
    fg.style.transition = "none"; fg.style.strokeDashoffset = "0";
    fg.getBoundingClientRect();
    if (!reduce) { fg.style.transition = "stroke-dashoffset 5s linear"; fg.style.strokeDashoffset = "126"; }
    timer = setInterval(function () {
      n--;
      sec.textContent = secText.textContent = Math.max(n, 0);
      if (n > 0) return;
      clearInterval(timer);
      if (PREVIEW) toast(t("準備中なので、移動はしません"));
      else location.replace(dest);
    }, 1000);
  }
  document.getElementById("stay").addEventListener("click", function () { clearInterval(timer); page.classList.add("stopped"); });

  function show(state) {
    page.setAttribute("data-state", state);
    document.querySelectorAll(".prep-switch button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.demo === state)); });
    if (state === "none") countdown(); else clearInterval(timer);
  }
  document.querySelectorAll(".prep-switch button").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.demo); }); });

  document.getElementById("export").addEventListener("click", function () { toast(t("準備中なので、まだ書き出しません")); });
  document.getElementById("erase").addEventListener("click", function () {
    var ask = window.M3 && M3.confirm
      ? M3.confirm({ title: t("このアドレスのデータを消しますか？"), text: t("sy9-k.github.io に残っている SK's Toolbox・Nagi・MALU のデータを、この端末から消します。元に戻すことはできません。"), ok: t("消す"), danger: true, icon: "delete" })
      : Promise.resolve(confirm(t("このアドレスのデータを消しますか？")));
    ask.then(function (ok) { if (ok) toast(t("準備中なので、消していません")); });
  });

  // 準備中は sk-hub.jp を開かない
  if (PREVIEW) {
    document.querySelectorAll('a[href^="https://sk-hub.jp"]').forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); toast(t("準備中なので、sk-hub.jp には移動しません")); });
    });
  }
  show(PREVIEW && /[?&]state=left\b/.test(location.search) ? "left" : "none");
})();
