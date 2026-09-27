// SK's Brand のページ（/brand/）の動き
//   ・テーマカラーの丸を押すと、そのテーマカラーを試せる（assets/site.js の window.SKTheme。ヘッダーの「表示」と同じ）
//   ・色のコードを押すと、コピーする
//   ・「形と動き」の見本を動かす
(function () {
  "use strict";
  var t = window.SKI18N ? window.SKI18N.t : function (s, p) { return p ? s.replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; }) : s; };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var toastEl = document.querySelector("[data-brand-toast]");
  var toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  // ---------- 色のコードをコピー ----------
  function copy(text) {
    var done = function () { toast(t("コピーしました: {code}", { code: text })); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { toast(text); });
    } else {
      toast(text);
    }
  }
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.title = t("押してコピー");
    var run = function (e) { e.stopPropagation(); e.preventDefault(); copy(el.dataset.copy); };
    el.addEventListener("click", run);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") run(e); });
  });

  // ---------- テーマカラーを試す ----------
  function markAccent() {
    var current = window.SKTheme ? window.SKTheme.get().accent : "blue";
    document.querySelectorAll("[data-brand-accents] [data-accent]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.accent === current));
    });
  }
  document.querySelectorAll("[data-brand-accents] [data-accent]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (!window.SKTheme) return;
      window.SKTheme.set({ accent: btn.dataset.accent }, btn, e);
    });
  });
  document.addEventListener("sk:theme", markAccent);
  markAccent();

  // ---------- 形と動きの見本 ----------
  function play(name, button, event) {
    if (name === "theme") {
      if (!window.SKTheme) return;
      var dark = document.documentElement.dataset.theme === "dark"
        || (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      window.SKTheme.set({ mode: dark ? "light" : "dark" }, button, event);
      return;
    }
    var el = document.querySelector('[data-motion="' + name + '"]');
    if (!el || !el.animate || reduced) return;
    if (name === "page") {
      el.animate([
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(.96)", opacity: 0, offset: .45 },
        { transform: "scale(.96)", opacity: 0, offset: .55 },
        { transform: "scale(1)", opacity: 1 }
      ], { duration: 800, easing: "cubic-bezier(.4, .04, 0, 1)" });
    } else if (name === "pop") {
      el.animate([{ transform: "scale(.7)" }, { transform: "scale(1.22)", offset: .6 }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.34, 1.56, .64, 1)" });
    }
  }
  document.querySelectorAll("[data-play]").forEach(function (btn) {
    btn.addEventListener("click", function (e) { play(btn.dataset.play, btn, e); });
  });
  // 円く広がる見本は、ずっとゆっくり動かしておく（動きを減らす設定では止まる。CSS）
})();
