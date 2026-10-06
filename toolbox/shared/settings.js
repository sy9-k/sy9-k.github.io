// SK's Toolbox の共通の設定（各アプリの <head> で、CSS のあとに読み込む）
//   <script src="/toolbox/shared/settings.js" data-app="calc"></script>   … Calc・Memo・Todo
//   <script src="/toolbox/shared/settings.js" data-app="clock" data-scope="clock"></script>   … Clock（テーマとテーマカラーは使わない）
//   <script src="/toolbox/shared/settings.js" data-scope="page"></script>   … /toolbox/settings/（設定のページ）
//
//   ・設定は localStorage の sk_toolbox に保存する（SK Hub Systems には送らない）
//       { theme: "auto|light|dark", color: "app|blue|sakura|…", motion: "auto|reduce", haptics: true|false }
//   ・テーマ: <html data-theme="light|dark">（auto のときは付けない。各アプリの CSS が端末の設定に合わせる）
//   ・テーマカラー: SK's Brand のテーマカラー（SK's Blue など 7 色）から作った Material 3 の配色で --md-* を上書きする
//       配色は Google の material-color-utilities（SchemeFidelity）で前もって計算したもの。
//       "app" のときは各アプリの色（Calc は青、Memo はオレンジ、Todo は緑）のまま
//   ・動きを減らす: <html data-motion="reduce">（/toolbox/shared/m3.css が動きを止める）
//   ・設定の画面: SKToolbox.openSettings()（全画面のダイアログ）。/toolbox/settings/ では SKToolbox.renderSettings(要素)
//   ・ほかのタブで変えたときも、storage イベントで反映する
//   ・設定の画面のいちばん上に、SK Hub Systems アカウントのログインの状態を出す（MALU・Nagi のアカウントの画面と同じ情報）
//       Firebase は読み込まない。assets/hub/account.js がこのブラウザに保存したもの（skhub_account）を読むだけ。
//       Toolbox はアカウントと連携しない（データは同期しない）。ログイン・ログアウトは /account/ で行う
(function () {
  "use strict";

  var script = document.currentScript;
  var scope = (script && script.dataset.scope) || "app";
  var currentApp = (script && script.dataset.app) || "";
  var root = document.documentElement;
  var I18N = window.SKI18N;
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
  var DEFAULTS = { theme: "auto", color: "app", motion: "auto", haptics: true };
  var settings = {};
  function read() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { /* 初期値 */ }
    settings = {
      theme: ["auto", "light", "dark"].indexOf(d.theme) >= 0 ? d.theme : DEFAULTS.theme,
      color: d.color === "app" || PALETTES[d.color] ? d.color : DEFAULTS.color,
      motion: d.motion === "reduce" ? "reduce" : "auto",
      haptics: typeof d.haptics === "boolean" ? d.haptics : DEFAULTS.haptics
    };
  }
  function write() {
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) { /* 保存できなくても、このページでは反映する */ }
  }

  // ---- 反映 ----
  var darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  var listeners = [];
  var styleEl = null;
  function isDark() { return settings.theme === "dark" || (settings.theme === "auto" && darkMq.matches); }
  function paletteCss(key, dark) {
    var hex = PALETTES[key][dark ? 1 : 0];
    return ROLES.map(function (r, i) { return "--md-" + r + ":#" + hex.slice(i * 6, i * 6 + 6) + ";"; }).join("");
  }
  function apply() {
    if (settings.motion === "reduce") root.setAttribute("data-motion", "reduce");
    else root.removeAttribute("data-motion");
    if (scope !== "clock") {
      if (settings.theme === "auto") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", settings.theme);
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
    { key: "sk_clock", app: "clock", name: "Clock", what: t("表示の設定") },
    { key: "sk_calc", app: "calc", name: "Calc", what: t("計算の履歴") },
    { key: "sk_memo", app: "memo", name: "Memo", what: t("メモ") },
    { key: "sk_todo", app: "todo", name: "Todo", what: t("タスク") }
  ];
  var sizeFmt = new Intl.NumberFormat((I18N && I18N.locale) || "ja-JP", { maximumFractionDigits: 1 });
  function sizeOf(key) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? 0 : (key.length + v.length) * 2;
    } catch (e) { return 0; }
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
      var note = el("p", "tbs-account__note");
      note.append(icon("info"), document.createTextNode(t("Toolbox は SK Hub Systems アカウントと連携していません。ログインしていても、Toolbox のデータはこの端末にだけ保存されます。")));
      card.appendChild(note);
    }
    updaters.push(draw);
    return sec;
  }

  function buildSettings() {
    updaters = [];
    var body = el("div", "tbs-body");
    body.appendChild(accountSection());

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
    body.appendChild(use);

    // この端末のデータ
    var data = section(t("この端末のデータ"));
    data.appendChild(el("p", "tbs-text", t("Toolbox のデータは、この端末のブラウザにだけ保存されます。SK Hub Systems などには送られません。ブラウザのデータを消すと、Toolbox のデータも消えます。")));
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
        var size = sizeOf(a.key);
        sub.textContent = a.what + " · " + sizeText(size);
        btn.disabled = !size;
      });
      btn.addEventListener("click", function () {
        confirmDialog(t("{app} のデータを消去しますか？", { app: a.name }),
          t("この端末に保存されている {app} の{what}を消去します。元に戻すことはできません。", { app: a.name, what: a.what }), t("消去"))
          .then(function (ok) {
            if (!ok) return;
            try { localStorage.removeItem(a.key); } catch (e) { /* 消せないときはそのまま */ }
            if (a.app === currentApp) { location.reload(); return; }
            refreshUi();
          });
      });
      data.appendChild(row);
    });
    var allRow = el("div", "tbs-item tbs-item--end");
    var allBtn = el("button", "text-btn tbs-danger m3-state", t("Toolbox のデータをすべて消去"));
    allBtn.type = "button";
    allBtn.addEventListener("click", function () {
      confirmDialog(t("Toolbox のデータをすべて消去しますか？"),
        t("Clock・Calc・Memo・Todo のデータと、この設定を消去します。元に戻すことはできません。"), t("すべて消去"))
        .then(function (ok) {
          if (!ok) return;
          APPS.concat([{ key: STORE }]).forEach(function (a) { try { localStorage.removeItem(a.key); } catch (e) { /* そのまま */ } });
          location.reload();
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
    more.appendChild(el("p", "tbs-version", "SK's Toolbox · 1.0"));
    body.appendChild(more);

    refreshUi();
    return body;
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
    openSettings: openSettings,
    renderSettings: renderSettings
  };
})();
