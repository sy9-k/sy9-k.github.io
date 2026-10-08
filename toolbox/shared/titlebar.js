// SK's Toolbox のタイトルバー（パソコンの Chrome・Edge でアプリとして入れたとき。Window Controls Overlay）
//   ・manifest の display_override: ["window-controls-overlay"] で、ウィンドウのいちばん上の帯をページが使えるようになる
//     （右上・左上の閉じるボタンなどはブラウザが上に重ねる。タイトルバーの右の「∧」で、ふつうのタイトルバーに戻せる）
//   ・帯の中身: Toolbox のアイコンといまのアプリの名前・アプリの切りかえ・検索（⌘K）・設定
//     何もないところをドラッグすると、ウィンドウを動かせる（app-region: drag）
//   ・見た目と、中身をタイトルバーの分だけ下げるのは /toolbox/shared/m3.css（@media (display-mode: window-controls-overlay)）。
//     Clock は空をタイトルバーの下まで広げる（<html data-tbt="overlay">）
//   ・/toolbox/shared/settings.js が、Window Controls Overlay に対応したブラウザでだけ読み込む
(function () {
  "use strict";
  if (!navigator.windowControlsOverlay || document.querySelector(".tbt")) return;

  var I18N = window.SKI18N;
  function t(s) { return I18N ? I18N.t(s) : s; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }

  var APPS = [
    { path: "/toolbox/clock/", name: "Clock" },
    { path: "/toolbox/calc/", name: "Calc" },
    { path: "/toolbox/memo/", name: "Memo" },
    { path: "/toolbox/todo/", name: "Todo" },
    { path: "/toolbox/countdown/", name: "Countdown" }
  ];
  var path = location.pathname;
  var current = null;
  APPS.forEach(function (a) { if (path.indexOf(a.path) === 0) current = a; });
  var currentName = current ? current.name : path.indexOf("/toolbox/settings/") === 0 ? t("設定") : "";

  function build() {
    var bar = el("div", "tbt");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "SK's Toolbox");

    // Toolbox のアイコンと、いまのアプリ（押すとホーム）
    var brand = el("a", "tbt-brand");
    brand.href = "/toolbox/";
    brand.title = t("SK's Toolbox のホーム");
    var img = el("img");
    img.src = current ? current.path + "icon.svg" : "/toolbox/icon.svg";
    img.alt = "";
    brand.append(img, el("span", "tbt-name", "SK's Toolbox"));
    if (currentName) brand.append(el("span", "tbt-sep", "›"), el("span", "tbt-cur", currentName));
    bar.appendChild(brand);

    // 何もないところ（ここをドラッグしてウィンドウを動かす）
    bar.appendChild(el("span", "tbt-space"));

    // アプリの切りかえ
    var nav = el("nav", "tbt-apps");
    nav.setAttribute("aria-label", t("アプリの切りかえ"));
    APPS.forEach(function (a) {
      var link = el("a", "tbt-app");
      link.href = a.path;
      link.title = a.name;
      link.setAttribute("aria-label", a.name);
      if (a === current) link.setAttribute("aria-current", "page");
      var i = el("img");
      i.src = a.path + "icon.svg";
      i.alt = "";
      link.appendChild(i);
      nav.appendChild(link);
    });
    bar.appendChild(nav);

    // 検索・設定
    var search = el("button", "tbt-btn");
    search.type = "button";
    search.title = t("検索") + "（" + (/Mac/.test(navigator.platform) ? "⌘K" : "Ctrl+K") + "）";
    search.setAttribute("aria-label", t("検索"));
    search.appendChild(icon("search"));
    search.setAttribute("data-open-search", ""); // /toolbox/shared/search.js が開く
    var settings = el("button", "tbt-btn");
    settings.type = "button";
    settings.title = t("Toolbox の設定");
    settings.setAttribute("aria-label", t("Toolbox の設定"));
    settings.setAttribute("data-open-settings", ""); // /toolbox/shared/settings.js が開く
    settings.appendChild(icon("settings"));
    bar.append(search, settings);

    document.body.insertBefore(bar, document.body.firstChild);

    // 色は、そのページの背景と同じに（アプリごと・テーマごとに違うため）。Clock は空の上に重ねるので、色を付けない
    if (document.documentElement.getAttribute("data-tbt") !== "overlay") {
      var paint = function () {
        var bg = getComputedStyle(document.body).backgroundColor;
        if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") bg = getComputedStyle(document.documentElement).backgroundColor;
        bar.style.backgroundColor = bg;
      };
      paint();
      if (window.SKToolbox) window.SKToolbox.onChange(function () { requestAnimationFrame(paint); });
      if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { requestAnimationFrame(paint); });
      new MutationObserver(function () { requestAnimationFrame(paint); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    }
  }

  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();
