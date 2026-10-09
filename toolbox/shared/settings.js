// SK's Toolbox の共通の設定（各アプリの <head> で、CSS のあとに読み込む）
//   <script src="/toolbox/shared/settings.js" data-app="calc"></script>   … Calc・Memo・Todo
//   <script src="/toolbox/shared/settings.js" data-app="clock" data-scope="clock"></script>   … Clock（テーマとテーマカラーは使わない）
//   <script src="/toolbox/shared/settings.js" data-scope="page"></script>   … /toolbox/settings/（設定のページ）
//   <script src="/toolbox/shared/settings.js" data-app="home" data-scope="site"></script>   … /toolbox/（サイトのヘッダーがあるホーム画面）
//       ライト・ダークは、Toolbox の設定が「端末に合わせる」ならサイトの「表示」（sk_theme。<head> の小さなスクリプトと assets/site.js が
//       <html data-theme> に付ける）のまま。ライト・ダークを選んでいれば Toolbox の設定を優先する（ヘッダーもいっしょに変わる）
//
//   ・設定は localStorage の sk_toolbox に保存する（オンライン同期をオンにしたときだけ、暗号化して SK Hub Systems アカウントにも保存する）
//       { theme: "auto|light|dark", color: "app|blue|sakura|…", motion: "auto|reduce", haptics: true|false, badge: true|false }
//   ・テーマ: <html data-theme="light|dark">（auto のときは付けない。各アプリの CSS が端末の設定に合わせる）
//   ・テーマカラー: SK's Brand のテーマカラー（SK's Blue など 7 色）から作った Material 3 の配色で --md-* を上書きする
//       配色は Google の material-color-utilities（SchemeFidelity）で前もって計算したもの。
//       "app" のときは各アプリの色（Calc は青、Memo はオレンジ、Todo は緑）のまま
//   ・動きを減らす: <html data-motion="reduce">（/toolbox/shared/m3.css が動きを止める）
//   ・設定の画面: SKToolbox.openSettings()（全画面のダイアログ）。/toolbox/settings/ では SKToolbox.renderSettings(要素)
//   ・ほかのタブで変えたときも、storage イベントで反映する
//   ・設定の画面のいちばん上に、SK Hub Systems アカウントのログインの状態を出す（MALU・Nagi のアカウントの画面と同じ情報）
//       Firebase は読み込まない。assets/hub/account.js がこのブラウザに保存したもの（skhub_account）を読むだけ。ログイン・ログアウトは /account/ で行う
//   ・その下に「オンライン同期」（任意。最初はオフ）。中身は /toolbox/shared/sync.js（ここで読み込む）
(function () {
  "use strict";

  var script = document.currentScript;
  var scope = (script && script.dataset.scope) || "app";
  var currentApp = (script && script.dataset.app) || "";
  var root = document.documentElement;
  var I18N = window.SKI18N;

  // 画面の切りかえのアニメーションは /toolbox/shared/m3.css のもの（タイトルバーを動かさないフェードスルー）。
  // frameworks/check.js がサイト共通の切りかえを後から入れて上書きしないよう、check.js が見る印を付けておく
  if (!document.querySelector('[data-RedCheckOSS-style="view-transition"]')) {
    var vt = document.createElement("meta");
    vt.setAttribute("data-RedCheckOSS-style", "view-transition");
    vt.content = "toolbox";
    (document.head || root).appendChild(vt);
  }

  // /toolbox/ のホームをアプリとして開いたとき（PWA）は、サイトのヘッダーを細くする（<html class="hd-compact">。見た目は assets/header.css）
  if (scope === "site" && window.matchMedia) {
    var appMode = window.matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen), (display-mode: minimal-ui)");
    var compact = function () { root.classList.toggle("hd-compact", appMode.matches || navigator.standalone === true); };
    compact();
    if (appMode.addEventListener) appMode.addEventListener("change", compact);
  }
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }

  // ---- テーマカラー（SK's Brand の 7 色。[ライト, ダーク] の順に ROLES の色を 6 桁ずつつなげたもの）----
  var ROLES = ["primary", "on-primary", "primary-container", "on-primary-container", "secondary-container", "on-secondary-container", "tertiary", "tertiary-container", "on-tertiary-container", "error", "error-container", "on-error-container", "surface", "on-surface", "on-surface-variant", "surface-container-low", "surface-container", "surface-container-high", "surface-container-highest", "outline", "outline-variant", "inverse-surface", "inverse-on-surface", "inverse-primary"];
  var PALETTES = {
    blue: ["004ac6ffffff2563ebeeefffacbfff394c84943700bc4800ffede6ba1a1affdad693000afaf8ff191b23434655f3f3feededf9e7e7f3e1e2ed737686c3c6d72e3039f0f0fbb4c5ff", "b4c5ff002a782563ebeeefff33467ea4b6f5ffb596bc4800ffede6ffb4ab93000affdad611131be1e2edc3c6d7191b231d1f27282a3232343d8d90a0434655e1e2ed2e30390053db"],
    sakura: ["b7005effffffdb2777fffdfffc86ac761b40006c1c008826fafff4ba1a1affdad693000afff8f826171c594047fff0f2ffe8edfde1e7f7dce18d6f77e1bec63d2c30ffecefffb1c7", "ffb1c7650031db2777fffdff83254aff9bb96ede70008826fafff4ffb4ab93000affdad61d0f13f7dce1e1bec626171c2b1b2036262a413035a88990594047f7dce13d2c30ba0060"],
    matcha: ["006b2cffffff00873af7fff2baecbc406c46a72d51c74668fffbffba1a1affdad693000af4fcf0171d163e4a3deff6eae9f0e5e3eadfdde5d96e7b6cbdcaba2b322becf3e762df7d", "62df7d0039141ca64d002e0f23502c90c193ffb2bfec628455001fffb4ab93000affdad60e150fdde5d9bdcaba171d161b211a252c2430372f8794853e4a3ddde5d92b322b006e2d"],
    mikan: ["a33900ffffffcc4900fffbffff9971772f0f005da80076d2fdfcffba1a1affdad693000afff8f62618135a4138fff1ecffe9e2fee2d9f8ddd48e7166e2bfb23d2d27ffede7ffb599", "ffb5995a1c00f660184011007c3313ffa17ca4c9ff2192fd002141ffb4ab93000affdad61d100bf8ddd4e2bfb22618132b1c1736262142312ba98a7e5a4138f8ddd43d2d27a73a00"],
    fuji: ["630ed4ffffff7c3aedede0ffc4a7ff5237877d3d00a15100ffe0cdba1a1affdad693000afef7ff1d1a244a4455f9f1fff3ebfaede5f4e8dfee7b7487ccc3d8332f39f6eefcd2bbff", "d2bbff3f008e7c3aedede0ff523787c3a6ffffb784a15100ffe0cdffb4ab93000affdad615121be8dfeeccc3d81d1a24221e282c283337333e958da14a4455e8dfee332f39732ee4"],
    sora: ["00647cffffff007f9dfafdffc3e8f8466977894e00a86516fffbffba1a1affdad693000af6fafd171c1e3e484df0f4f7eaeef1e5e9ebdfe3e66e797ebdc8ce2c3133edf1f46cd3f7", "6cd3f7003543269dbe00212b2a4e5a9abecdffb873c98031301800ffb4ab93000affdad60f1416dfe3e6bdc8ce171c1e1b2022262b2d3135388792983e484ddfe3e62c3133006780"],
    sumi: ["1d2b3effffff3341559eadc5dee2ee5f656e38270a503d1ec3a881ba1a1affdad693000afbf9fa1b1b1d44474cf5f3f5efedefeae7e9e4e2e475777dc5c6cd303032f2f0f2b9c7e0", "b9c7e02331443341559eadc5424750b0b5c0dfc299503d1ec3a881ffb4ab93000affdad6131315e4e2e4c5c6cd1b1b1d1f1f212a2a2b3435368e919744474ce4e2e4303032515f74"]
  };
  // 名前と見本の色は SK's Brand（/brand/）と同じ
  var COLORS = [
    { key: "blue", name: "SK's Blue", note: t("いつもの青"), sw: "#2563eb" },
    { key: "sakura", name: "SK's Sakura", note: t("さくら"), sw: "#db2777" },
    { key: "matcha", name: "SK's Matcha", note: t("抹茶"), sw: "#16a34a" },
    { key: "mikan", name: "SK's Mikan", note: t("みかん"), sw: "#ea580c" },
    { key: "fuji", name: "SK's Fuji", note: t("藤"), sw: "#7c3aed" },
    { key: "sora", name: "SK's Sora", note: t("空"), sw: "#0891b2" },
    { key: "sumi", name: "SK's Sumi", note: t("墨"), sw: "#334155" }
  ];

  // ---- 設定の読み書き ----
  var STORE = "sk_toolbox";
  var DEFAULTS = { theme: "auto", color: "app", motion: "auto", haptics: true, badge: true };
  var settings = {};
  function read() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { /* 初期値 */ }
    settings = {
      theme: ["auto", "light", "dark"].indexOf(d.theme) >= 0 ? d.theme : DEFAULTS.theme,
      color: d.color === "app" || PALETTES[d.color] ? d.color : DEFAULTS.color,
      motion: d.motion === "reduce" ? "reduce" : "auto",
      haptics: typeof d.haptics === "boolean" ? d.haptics : DEFAULTS.haptics,
      badge: typeof d.badge === "boolean" ? d.badge : DEFAULTS.badge
    };
  }
  function write() {
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) { /* 保存できなくても、このページでは反映する */ }
  }

  // ---- 反映 ----
  var darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  var listeners = [];
  var styleEl = null;
  // サイトのページ（scope "site"）で、サイトの「表示」が付けた data-theme（Toolbox の設定で上書きしていないときの値）
  var siteTheme = scope === "site" ? root.getAttribute("data-theme") : null;
  var writing = false;
  function isDark() {
    if (settings.theme !== "auto") return settings.theme === "dark";
    if (scope === "site" && siteTheme) return siteTheme === "dark";
    return darkMq.matches;
  }
  function setThemeAttr(value) {
    if (root.getAttribute("data-theme") === value || (!value && !root.hasAttribute("data-theme"))) return;
    writing = true;
    if (value) root.setAttribute("data-theme", value); else root.removeAttribute("data-theme");
    writing = false;
  }
  function paletteCss(key, dark) {
    var hex = PALETTES[key][dark ? 1 : 0];
    return ROLES.map(function (r, i) { return "--md-" + r + ":#" + hex.slice(i * 6, i * 6 + 6) + ";"; }).join("");
  }
  function apply() {
    if (settings.motion === "reduce") root.setAttribute("data-motion", "reduce");
    else root.removeAttribute("data-motion");
    if (scope !== "clock") {
      if (settings.theme !== "auto") setThemeAttr(settings.theme);
      else setThemeAttr(scope === "site" ? siteTheme : null);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "sk-toolbox-color";
        document.head.appendChild(styleEl);
      }
      // html:root:root … アプリの :root[data-theme="dark"] などより強くする
      styleEl.textContent = PALETTES[settings.color] ? "html:root:root{" + paletteCss(settings.color, isDark()) + "}" : "";
      root.setAttribute("data-color", settings.color);
    }
    listeners.forEach(function (fn) { try { fn(settings); } catch (e) { /* ほかの処理は続ける */ } });
  }
  function set(patch) {
    Object.keys(patch).forEach(function (k) { settings[k] = patch[k]; });
    write();
    apply();
    refreshUi();
  }

  read();
  apply();
  darkMq.addEventListener("change", apply);
  // サイトのページ: ヘッダーの「表示」でライト・ダークを変えたとき
  if (scope === "site" && window.MutationObserver) {
    new MutationObserver(function () {
      if (writing) return;
      siteTheme = root.getAttribute("data-theme");
      apply();
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
  // アカウントの状態が変わったとき（ほかのタブでログインした・assets/hub/account.js が知らせた）
  document.addEventListener("skhub:account", function () { refreshUi(); });
  window.addEventListener("storage", function (e) {
    if (e.key === HINT_KEY) { refreshUi(); return; }
    if (e.key !== STORE && e.key !== null) return;
    read();
    apply();
    refreshUi();
  });

  // ---- 振動（Calc のキー・Todo のチェック）----
  function vibrate() {
    if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* 対応していない */ } }
  }

  // ---- この端末のデータ ----
  var APPS = [
    { key: "sk_clock", app: "clock", name: "Clock", what: t("表示の設定・アラーム・世界時計"), extra: ["sk_clock_tools", "sk_clock_fired"] },
    { key: "sk_calc", app: "calc", name: "Calc", what: t("計算の履歴") },
    { key: "sk_memo", app: "memo", name: "Memo", what: t("メモと画像"), idb: "sk_toolbox_memo" },
    { key: "sk_todo", app: "todo", name: "Todo", what: t("タスク"), extra: ["sk_todo_notified"] },
    { key: "sk_countdown", app: "countdown", name: "Countdown", what: t("日の一覧") },
    { key: "sk_timetable", app: "timetable", name: "Timetable", what: t("時間割と、配信された時間割") },
    { key: "sk_roulette", app: "roulette", name: "Roulette", what: t("ルーレットと結果の履歴") }
  ];
  var sizeFmt = new Intl.NumberFormat((I18N && I18N.locale) || "ja-JP", { maximumFractionDigits: 1 });
  function sizeOf(key) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? 0 : (key.length + v.length) * 2;
    } catch (e) { return 0; }
  }
  // IndexedDB に入れた画像の大きさ（Memo）
  function idbSize(name) {
    return new Promise(function (resolve) {
      if (!window.indexedDB) { resolve(0); return; }
      var req = indexedDB.open(name);
      req.onupgradeneeded = function () { req.transaction.abort(); resolve(0); };
      req.onerror = function () { resolve(0); };
      req.onsuccess = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("images")) { db.close(); resolve(0); return; }
        var all = db.transaction("images").objectStore("images").getAll();
        all.onsuccess = function () { db.close(); resolve((all.result || []).reduce(function (s, b) { return s + (b && b.size || 0); }, 0)); };
        all.onerror = function () { db.close(); resolve(0); };
      };
    });
  }
  function syncOn() { return !!(window.SKToolboxSync && SKToolboxSync.isOn()); }
  function clearApp(a) {
    try { localStorage.removeItem(a.key); (a.extra || []).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* 消せないときはそのまま */ }
    // オンライン同期をしていれば、次に同期するときにアカウントから読み込み直す（消したことを、ほかの端末に広げない）
    if (window.SKToolboxSync) SKToolboxSync.forget([a.key]);
    if (a.idb && window.indexedDB) return new Promise(function (resolve) { var r = indexedDB.deleteDatabase(a.idb); r.onsuccess = r.onerror = r.onblocked = function () { resolve(); }; });
    return Promise.resolve();
  }
  function sizeText(bytes) {
    if (!bytes) return t("データなし");
    return bytes < 1024 ? t("{n} バイト", { n: bytes }) : t("{n} KB", { n: sizeFmt.format(bytes / 1024) });
  }

  // ---- SK Hub Systems アカウント（表示だけ）----
  var HINT_KEY = "skhub_account";
  function readHint() {
    try { return JSON.parse(localStorage.getItem(HINT_KEY) || "null"); } catch (e) { return null; }
  }
  function lp(u) { return I18N && I18N.path ? I18N.path(u) : u; }

  // ---- まとめてバックアップ ----
  var BACKUP_KEYS = ["sk_toolbox", "sk_toolbox_home", "sk_clock", "sk_clock_tools", "sk_calc", "sk_memo", "sk_todo", "sk_countdown", "sk_timetable", "sk_roulette"];
  function memoImages(mode, fn) {
    return new Promise(function (resolve) {
      if (!window.indexedDB) { resolve(null); return; }
      var req = indexedDB.open("sk_toolbox_memo", 1);
      req.onupgradeneeded = function () { req.result.createObjectStore("images"); };
      req.onerror = function () { resolve(null); };
      req.onsuccess = function () {
        var db = req.result, tx = db.transaction("images", mode), store = tx.objectStore("images");
        var result = fn(store);
        tx.oncomplete = function () { db.close(); resolve(result && result.result !== undefined ? result.result : result); };
        tx.onerror = function () { db.close(); resolve(null); };
      };
    });
  }
  function exportAll() {
    var storage = {};
    BACKUP_KEYS.forEach(function (k) { try { var v = localStorage.getItem(k); if (v !== null) storage[k] = v; } catch (e) { /* 読めないときは入れない */ } });
    var keys = [], blobs = [];
    memoImages("readonly", function (st) {
      var c = st.openCursor();
      c.onsuccess = function () { var cur = c.result; if (cur) { keys.push(cur.key); blobs.push(cur.value); cur.continue(); } };
      return null;
    }).then(function () {
      return Promise.all(blobs.map(function (b) { return new Promise(function (resolve) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = function () { resolve(null); }; r.readAsDataURL(b); }); }));
    }).then(function (urls) {
      var images = {};
      keys.forEach(function (k, i) { if (urls[i]) images[k] = urls[i]; });
      var d = new Date(), stamp = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
      var blob = new Blob([JSON.stringify({ app: "sk-toolbox", version: 1, exportedAt: d.toISOString(), storage: storage, images: images })], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "toolbox-backup-" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }
  function importAll(file) {
    file.text().then(function (text) {
      var d = JSON.parse(text);
      if (!d || d.app !== "sk-toolbox" || !d.storage || typeof d.storage !== "object") throw new Error("not a backup");
      return confirmDialog(t("バックアップを読み込みますか？"), t("いまの Toolbox のデータは、バックアップの内容に置きかわります。元に戻すことはできません。"), t("読み込む")).then(function (ok) {
        if (!ok) return;
        BACKUP_KEYS.forEach(function (k) {
          try { if (typeof d.storage[k] === "string") localStorage.setItem(k, d.storage[k]); else localStorage.removeItem(k); } catch (e) { /* 容量がいっぱいなど */ }
        });
        // オンライン同期をしていれば、次に同期するときにアカウントのデータとまとめる（古いバックアップで、ほかの端末のデータを消さない）
        if (window.SKToolboxSync) SKToolboxSync.forget(BACKUP_KEYS);
        var images = d.images && typeof d.images === "object" ? d.images : {};
        var ids = Object.keys(images).filter(function (id) { return /^[a-z0-9]{6,40}$/.test(id) && /^data:image\//.test(images[id]); });
        return Promise.all(ids.map(function (id) { return fetch(images[id]).then(function (r) { return r.blob(); }); })).then(function (blobs) {
          return memoImages("readwrite", function (st) { st.clear(); ids.forEach(function (id, i) { st.put(blobs[i], id); }); return null; });
        }).then(function () { location.reload(); });
      });
    }).catch(function () { alertSay(t("読み込めませんでした。Toolbox のバックアップのファイルを選んでください")); });
  }
  function alertSay(text) { confirmDialog(t("読み込めませんでした"), text, "OK"); }

  // ---- 画面の部品 ----
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }
  function label(title, sub) {
    var box = el("span", "tbs-label");
    box.appendChild(el("span", "tbs-label__title", title));
    if (sub) box.appendChild(el("span", "tbs-label__sub", sub));
    return box;
  }
  function section(title) {
    var s = el("section", "tbs-section");
    s.appendChild(el("h3", "tbs-section__title", title));
    return s;
  }
  // スイッチ（M3）
  function switchRow(title, sub, get, onChange) {
    var row = el("label", "tbs-item tbs-item--switch m3-state");
    row.appendChild(label(title, sub));
    var input = el("input", "tbs-switch");
    input.type = "checkbox";
    input.setAttribute("role", "switch");
    row.appendChild(input);
    input.addEventListener("change", function () { onChange(input.checked); });
    updaters.push(function () { input.checked = get(); });
    return row;
  }

  // 確認のダイアログ（M3 の基本のダイアログ）
  function confirmDialog(title, text, ok) {
    return new Promise(function (resolve) {
      var scrim = el("div", "tbs-dialog-scrim");
      var dlg = el("div", "tbs-dialog");
      dlg.setAttribute("role", "alertdialog");
      dlg.setAttribute("aria-modal", "true");
      var h = el("h2", "tbs-dialog__title", title);
      h.id = "tbs-dialog-title";
      dlg.setAttribute("aria-labelledby", h.id);
      dlg.appendChild(icon("delete"));
      dlg.appendChild(h);
      dlg.appendChild(el("p", "tbs-dialog__text", text));
      var actions = el("div", "tbs-dialog__actions");
      var cancel = el("button", "text-btn m3-state", t("キャンセル"));
      var okBtn = el("button", "text-btn tbs-danger m3-state", ok);
      cancel.type = okBtn.type = "button";
      actions.append(cancel, okBtn);
      dlg.appendChild(actions);
      scrim.appendChild(dlg);
      document.body.appendChild(scrim);
      var before = document.activeElement;
      cancel.focus();
      function close(v) {
        scrim.remove();
        document.removeEventListener("keydown", onKey, true);
        if (before && before.focus) before.focus();
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
        if (e.key === "Tab") { // ダイアログの中だけで移る
          var f = [cancel, okBtn], i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      }
      document.addEventListener("keydown", onKey, true);
      cancel.addEventListener("click", function () { close(false); });
      okBtn.addEventListener("click", function () { close(true); });
      scrim.addEventListener("click", function (e) { if (e.target === scrim) close(false); });
    });
  }

  // ---- 設定の画面 ----
  var updaters = [];
  function refreshUi() { updaters.forEach(function (fn) { fn(); }); }

  function accountSection() {
    var sec = section(t("SK Hub Systems アカウント"));
    var card = el("div", "tbs-account");
    sec.appendChild(card);
    function draw() {
      var hint = readHint();
      card.textContent = "";
      // アイコン（写真・頭文字・ログインしていないとき）
      var av = el("span", "tbs-account__avatar" + (hint ? "" : " is-empty"));
      if (hint && hint.photo) {
        var img = el("img");
        img.src = hint.photo;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        av.appendChild(img);
      } else if (hint) {
        av.textContent = hint.letter || "?";
        av.style.background = hint.color || "#2563eb";
      } else {
        av.appendChild(icon("person"));
      }
      var who = el("div", "tbs-account__who");
      who.appendChild(el("span", "tbs-account__name", hint ? (hint.name || hint.email || t("SK Hub Systems アカウント")) : t("ログインしていません")));
      if (hint && hint.email && hint.name) who.appendChild(el("span", "tbs-account__email", hint.email));
      var status = el("span", "tbs-account__status" + (hint ? " is-on" : ""));
      status.append(el("i"), document.createTextNode(hint ? t("ログイン中") : t("ログインしていません")));
      if (hint) who.appendChild(status);
      var top = el("div", "tbs-account__top");
      top.append(av, who);
      card.appendChild(top);

      if (!hint) card.appendChild(el("p", "tbs-account__lead", t("ログインすると、SK のアプリの記録や設定を、ほかの端末とまとめられます。")));
      var actions = el("div", "tbs-account__actions");
      function btn(cls, text, href) {
        var a = el("a", cls + " m3-state", text);
        a.href = href;
        actions.appendChild(a);
      }
      var here = location.pathname + location.search;
      if (hint) {
        btn("m3-btn m3-btn--tonal", t("アカウントを管理"), lp("/account/"));
        btn("text-btn", t("ログアウト"), lp("/account/?signout=1"));
      } else {
        btn("m3-btn", t("ログイン"), lp("/account/") + "?next=" + encodeURIComponent(here));
        btn("text-btn", t("詳しく"), lp("/sk-hub-systems/account/"));
      }
      card.appendChild(actions);
    }
    updaters.push(draw);
    return sec;
  }

  function buildSettings() {
    updaters = [];
    var body = el("div", "tbs-body");
    body.appendChild(accountSection());

    // オンライン同期（任意。中身は /toolbox/shared/sync.js）
    var syncSec = section(t("オンライン同期"));
    var syncBox = el("div");
    syncBox.setAttribute("data-tb-sync", "");
    syncSec.appendChild(syncBox);
    if (window.SKToolboxSync) SKToolboxSync.mount(syncBox);
    body.appendChild(syncSec);

    // 見た目
    var look = section(t("見た目"));
    var themeRow = el("div", "tbs-item tbs-item--col");
    themeRow.appendChild(label(t("テーマ"), scope === "clock" ? t("Clock は、時計の下のボタンでテーマを選びます") : ""));
    var seg = el("div", "tbs-seg");
    seg.setAttribute("role", "radiogroup");
    seg.setAttribute("aria-label", t("テーマ"));
    [["auto", "brightness_auto", t("端末に合わせる")], ["light", "light_mode", t("ライト")], ["dark", "dark_mode", t("ダーク")]].forEach(function (o) {
      var b = el("button", "tbs-seg__btn m3-state");
      b.type = "button";
      b.setAttribute("role", "radio");
      var check = icon("check"), ic = icon(o[1]);
      check.classList.add("tbs-seg__check");
      ic.classList.add("tbs-seg__icon");
      b.append(check, ic, el("span", "", o[2]));
      b.addEventListener("click", function () { set({ theme: o[0] }); });
      updaters.push(function () { b.setAttribute("aria-checked", String(settings.theme === o[0])); });
      seg.appendChild(b);
    });
    themeRow.appendChild(seg);
    look.appendChild(themeRow);

    var colorRow = el("div", "tbs-item tbs-item--col");
    colorRow.appendChild(label(t("テーマカラー"), t("Calc・Memo・Todo のボタンや背景の色。SK's Brand の色から選べます。Clock は空の色のままです")));
    var sw = el("div", "tbs-swatches");
    sw.setAttribute("role", "radiogroup");
    sw.setAttribute("aria-label", t("テーマカラー"));
    var current = el("p", "tbs-swatch-name");
    current.setAttribute("aria-live", "polite");
    [{ key: "app", name: t("アプリの色"), note: t("Calc は青、Memo はオレンジ、Todo は緑") }].concat(COLORS).forEach(function (c) {
      var b = el("button", "tbs-swatch m3-state" + (c.key === "app" ? " tbs-swatch--app" : ""));
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", c.name + "（" + c.note + "）");
      b.title = c.name + "（" + c.note + "）";
      if (c.sw) b.style.setProperty("--sw", c.sw);
      b.appendChild(icon("check"));
      b.addEventListener("click", function () { set({ color: c.key }); });
      updaters.push(function () {
        var on = settings.color === c.key;
        b.setAttribute("aria-checked", String(on));
        if (on) current.textContent = c.name + " — " + c.note;
      });
      sw.appendChild(b);
    });
    colorRow.appendChild(sw);
    colorRow.appendChild(current);
    look.appendChild(colorRow);

    look.appendChild(switchRow(t("動きを減らす"), t("画面の切りかえや、ボタンのアニメーションを少なくします"),
      function () { return settings.motion === "reduce"; }, function (on) { set({ motion: on ? "reduce" : "auto" }); }));
    body.appendChild(look);

    // 操作
    var use = section(t("操作"));
    use.appendChild(switchRow(t("押したときに振動する"), t("Calc のキーと、Todo のチェック。対応している端末（Android など）だけです"),
      function () { return settings.haptics; }, function (on) { set({ haptics: on }); vibrate(); }));
    // アプリのアイコンの数字（Badging API。対応しているブラウザで、アプリとして入れたとき）
    if (navigator.setAppBadge) {
      use.appendChild(switchRow(t("アイコンに数字を出す"), t("アプリとして入れたとき、Dock やホーム画面のアイコンに、期限切れと今日の Todo の数を出します"),
        function () { return settings.badge; }, function (on) {
          set({ badge: on });
          if (!on) navigator.clearAppBadge().catch(function () {});
          else if (window.SKReminders) SKReminders.check();
        }));
    }
    body.appendChild(use);

    // この端末のデータ
    var data = section(t("この端末のデータ"));
    var dataNote = el("p", "tbs-text");
    data.appendChild(dataNote);
    // データを消されにくくする（storage.persist。アプリとして入れると、たいてい自動でオンになる）
    if (navigator.storage && navigator.storage.persisted) {
      var keep = el("div", "tbs-item tbs-item--keep");
      keep.appendChild(icon("verified_user"));
      var keepLabel = label(t("データの保護"), t("確認中…"));
      keep.appendChild(keepLabel);
      var keepBtn = el("button", "text-btn m3-state", t("オンにする"));
      keepBtn.type = "button";
      keepBtn.hidden = true;
      keep.appendChild(keepBtn);
      data.appendChild(keep);
      var keepSub = keepLabel.querySelector(".tbs-label__sub");
      var drawKeep = function () {
        navigator.storage.persisted().then(function (on) {
          keepSub.textContent = on
            ? t("オン: 端末の空きが少なくなっても、ブラウザが Toolbox のデータを自動で消しません")
            : t("オフ: 端末の空きが少ないとき、ブラウザが Toolbox のデータを消すことがあります");
          keepBtn.hidden = on || !navigator.storage.persist;
        }).catch(function () { keep.hidden = true; });
      };
      keepBtn.addEventListener("click", function () {
        navigator.storage.persist().then(function (ok) {
          drawKeep();
          if (!ok && window.M3) M3.dialog({ title: t("データの保護"), icon: "info", body: el("p", "tbs-dialog__text", t("ブラウザに許可されませんでした。Toolbox をアプリとして入れると、オンになりやすくなります")), actions: [{ label: "OK", primary: true, value: null }] });
        }).catch(drawKeep);
      });
      drawKeep();
    }
    updaters.push(function () {
      dataNote.textContent = syncOn()
        ? t("Toolbox のデータは、この端末のブラウザに保存し、オンライン同期で暗号化して SK Hub Systems アカウントにも保存しています。ここで消去しても、次に同期するときにアカウントから読み込み直します。")
        : t("Toolbox のデータは、この端末のブラウザにだけ保存されます。SK Hub Systems などには送られません。ブラウザのデータを消すと、Toolbox のデータも消えます。");
    });
    APPS.forEach(function (a) {
      var row = el("div", "tbs-item tbs-item--data");
      var img = el("img", "tbs-app-icon");
      img.src = "/toolbox/" + a.app + "/icon.svg";
      img.alt = "";
      img.width = img.height = 40;
      row.appendChild(img);
      var lab = label(a.name, " ");
      var sub = lab.querySelector(".tbs-label__sub");
      row.appendChild(lab);
      var btn = el("button", "text-btn m3-state", t("消去"));
      btn.type = "button";
      btn.setAttribute("aria-label", t("{app} のデータを消去", { app: a.name }));
      row.appendChild(btn);
      updaters.push(function () {
        var size = sizeOf(a.key) + (a.extra || []).reduce(function (s, k) { return s + sizeOf(k); }, 0);
        sub.textContent = a.what + " · " + sizeText(size);
        btn.disabled = !size;
        if (a.idb) idbSize(a.idb).then(function (img) {
          if (!img) return;
          sub.textContent = a.what + " · " + sizeText(size + img);
          btn.disabled = false;
        });
      });
      btn.addEventListener("click", function () {
        confirmDialog(t("{app} のデータを消去しますか？", { app: a.name }),
          t("この端末に保存されている {app} の{what}を消去します。元に戻すことはできません。", { app: a.name, what: a.what }), t("消去"))
          .then(function (ok) {
            if (!ok) return;
            clearApp(a).then(function () {
              if (a.app === currentApp || currentApp === "home") { location.reload(); return; }
              refreshUi();
            });
          });
      });
      data.appendChild(row);
    });
    // まとめてバックアップ（Clock・Calc・Memo（画像も）・Todo・Countdown・Timetable・Roulette・この設定）
    var backupRow = el("div", "tbs-item tbs-item--backup");
    backupRow.appendChild(label(t("まとめてバックアップ"), t("すべてのアプリのデータを 1 つのファイルに。ほかの端末に移すときにも使えます")));
    var exportBtn = el("button", "m3-btn m3-btn--tonal m3-state");
    exportBtn.type = "button";
    exportBtn.append(icon("download"), el("span", "", t("書き出す")));
    var importBtn = el("button", "text-btn m3-state");
    importBtn.type = "button";
    importBtn.append(icon("upload"), el("span", "", t("読み込む")));
    var fileIn = el("input");
    fileIn.type = "file";
    fileIn.accept = "application/json,.json";
    fileIn.hidden = true;
    var btns = el("span", "tbs-backup__btns");
    btns.append(exportBtn, importBtn, fileIn);
    backupRow.appendChild(btns);
    exportBtn.addEventListener("click", exportAll);
    importBtn.addEventListener("click", function () { fileIn.click(); });
    fileIn.addEventListener("change", function () {
      var f = fileIn.files && fileIn.files[0];
      fileIn.value = "";
      if (f) importAll(f);
    });
    data.appendChild(backupRow);
    var allRow = el("div", "tbs-item tbs-item--end");
    var allBtn = el("button", "text-btn tbs-danger m3-state", t("Toolbox のデータをすべて消去"));
    allBtn.type = "button";
    allBtn.addEventListener("click", function () {
      confirmDialog(t("Toolbox のデータをすべて消去しますか？"),
        t("Clock・Calc・Memo・Todo・Countdown・Timetable・Roulette のデータと、この設定を消去します。元に戻すことはできません。"), t("すべて消去"))
        .then(function (ok) {
          if (!ok) return;
          Promise.all(APPS.concat([{ key: STORE }]).map(clearApp)).then(function () { location.reload(); });
        });
    });
    allRow.appendChild(allBtn);
    data.appendChild(allRow);
    body.appendChild(data);

    // その他
    var more = section(t("その他"));
    function linkRow(href, ic, title, sub) {
      var a = el("a", "tbs-item tbs-item--link m3-state");
      a.href = href;
      a.appendChild(icon(ic));
      a.appendChild(label(title, sub));
      a.appendChild(icon("chevron_right"));
      return a;
    }
    var langName = "";
    if (I18N) I18N.LANGS.forEach(function (l) { if (l.code === I18N.lang) langName = l.name; });
    // 言語を選んだら、いま開いているアプリ（またはこの設定のページ）に戻る（/lang/?next=戻り先。/lang/lang.js）
    var langLink = linkRow("/lang/", "language", t("言語"), langName);
    updaters.push(function () { langLink.href = "/lang/?next=" + encodeURIComponent(location.pathname + location.search + location.hash); });
    langLink.addEventListener("click", function () { langLink.href = "/lang/?next=" + encodeURIComponent(location.pathname + location.search + location.hash); });
    more.appendChild(langLink);
    more.appendChild(linkRow("/toolbox/", "apps", t("SK's Toolbox のアプリ一覧"), ""));
    more.appendChild(linkRow("/policies/", "policy", t("利用規約・プライバシーポリシー"), ""));
    // 最新の版に更新（古いファイルが残って、新しい機能が出てこないとき）
    var updRow = el("button", "tbs-item tbs-item--link tbs-item--button m3-state");
    updRow.type = "button";
    updRow.appendChild(icon("system_update"));
    var updLabel = label(t("最新の版に更新"), t("保存してある古いファイルを消して、Toolbox を最新の状態で読み込み直します。データは消えません"));
    updRow.appendChild(updLabel);
    updRow.appendChild(icon("refresh"));
    updRow.addEventListener("click", function () {
      if (updRow.disabled) return;
      updRow.disabled = true;
      updLabel.querySelector(".tbs-label__title").textContent = t("更新しています…");
      forceUpdate();
    });
    more.appendChild(updRow);
    more.appendChild(el("p", "tbs-version", "SK's Toolbox · 1.0"));
    body.appendChild(more);

    refreshUi();
    return body;
  }

  // ---- 最新の版に更新 ----
  //   1. Toolbox の Service Worker を外す（次に開いたときに、新しいものが入る）
  //   2. Toolbox の Service Worker が保存したファイル（sk-toolbox-・sk-todo- など）を消す
  //   3. このページが読み込んだファイルを、ブラウザのキャッシュを使わずに取り直す
  //   4. 開き直す。localStorage・IndexedDB（データ）には触らない
  function forceUpdate() {
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.filter(function (r) { return new URL(r.scope).pathname.indexOf("/toolbox/") === 0; }).map(function (r) { return r.unregister(); }));
      }).catch(function () { /* 外せなくても続ける */ }));
    }
    if (window.caches) {
      jobs.push(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return /^sk-(toolbox|clock|calc|memo|todo|countdown)-/.test(k); }).map(function (k) { return caches.delete(k); }));
      }).catch(function () { /* 同上 */ }));
    }
    Promise.all(jobs).then(function () {
      var urls = [location.pathname + location.search];
      try {
        performance.getEntriesByType("resource").forEach(function (e) {
          var u = new URL(e.name);
          if (u.origin === location.origin && urls.indexOf(u.pathname + u.search) < 0) urls.push(u.pathname + u.search);
        });
      } catch (e) { /* 取れなければ、このページだけ */ }
      return Promise.all(urls.map(function (u) { return fetch(u, { cache: "reload" }).catch(function () { /* オフラインなど */ }); }));
    }).then(function () { location.reload(); });
  }

  // 全画面のダイアログで開く（端末の「戻る」で閉じる）
  var dialog = null, opener = null;
  function openSettings() {
    if (dialog) return;
    opener = document.activeElement;
    dialog = el("div", "tbs-overlay" + (scope === "clock" ? " tbs-overlay--clock" : ""));
    var panel = el("div", "tbs-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "tbs-title");
    var bar = el("header", "tbs-bar");
    var close = el("button", "icon-btn m3-state");
    close.type = "button";
    close.setAttribute("aria-label", t("閉じる"));
    close.appendChild(icon("close"));
    var h = el("h2", "tbs-bar__title", t("Toolbox の設定"));
    h.id = "tbs-title";
    bar.append(close, h);
    panel.append(bar, buildSettings());
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    document.body.classList.add("tbs-open");
    close.focus();
    close.addEventListener("click", closeSettings);
    dialog.addEventListener("click", function (e) { if (e.target === dialog) closeSettings(); });
    dialog.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeSettings(); } });
    history.pushState(Object.assign({}, history.state, { tbSettings: true }), "");
  }
  function closeSettings(fromPop) {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
    updaters = [];
    document.body.classList.remove("tbs-open");
    if (opener && opener.focus) opener.focus();
    if (fromPop !== true && history.state && history.state.tbSettings) history.back();
  }
  window.addEventListener("popstate", function (e) {
    if (dialog && !(e.state && e.state.tbSettings)) closeSettings(true);
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-open-settings]");
    if (b) { e.preventDefault(); openSettings(); }
  });

  // /toolbox/settings/ のページに、そのまま出す
  function renderSettings(container) {
    container.textContent = "";
    container.appendChild(buildSettings());
  }

  window.SKToolbox = {
    get: function () { return settings; },
    set: set,
    onChange: function (fn) { listeners.push(fn); fn(settings); },
    vibrate: vibrate,
    // テーマカラーの一覧（SK's Brand の色。"app" は各アプリの色）。ホーム画面の「見た目」でも使う
    colors: [{ key: "app", name: t("アプリの色"), note: t("Calc は青、Memo はオレンジ、Todo は緑") }].concat(COLORS),
    openSettings: openSettings,
    renderSettings: renderSettings
  };

  // オンライン同期（任意）。見本（?embed）では読み込まない
  if (!/[?&]embed\b/.test(location.search)) {
    var sync = document.createElement("script");
    sync.src = "/toolbox/shared/sync.js";
    (document.head || document.documentElement).appendChild(sync);
  }
})();
