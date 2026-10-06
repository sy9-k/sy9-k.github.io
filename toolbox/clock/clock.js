// Clock（SK's Toolbox）
//   ・時刻と日付を表示する。数字は 1 文字ずつ枠（.slot）に入れて、変わった文字だけ入れ替える
//   ・テーマ「空」では、時刻から空の色（--sky-top など）と太陽・月の位置（--orb-x / --orb-y）を計算する
//   ・設定（24 時間表示・秒・テーマ）は localStorage の sk_clock に保存する
//   ・?embed のときは /toolbox/ の見本として表示だけする（ボタン・保存なし）
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s) { return I18N ? I18N.t(s) : s; }
  function $(id) { return document.getElementById(id); }

  // ---- 設定 ----
  var STORE = "sk_clock";
  var THEMES = ["sky", "night", "paper"];
  var THEME_NAMES = { sky: t("空のテーマ"), night: t("夜のテーマ"), paper: t("紙のテーマ") };
  var settings = { h24: true, sec: true, theme: "sky" };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) { /* 初期値のまま */ }
  if (THEMES.indexOf(settings.theme) < 0) settings.theme = "sky";
  if (embed) { settings = { h24: true, sec: true, theme: "sky" }; root.classList.add("is-embed"); }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) { /* 保存できなくても動く */ }
  }

  // ---- 空の色（時刻 → 色）----
  // [時, 上, 中, 下, 太陽・月の光, 星の濃さ]
  var SKY = [
    [0, "#070b24", "#141a45", "#2b2560", "#3a3f8f", 1],
    [4.5, "#0c1233", "#22265a", "#4a3a6e", "#6a5a9a", .8],
    [6, "#2a3270", "#7a5c99", "#f2a07f", "#ffc29a", .15],
    [7.5, "#4174c4", "#93abdc", "#ffd2b0", "#fff0d0", 0],
    [10, "#2a66c8", "#5592df", "#9fc6f0", "#ffffff", 0],
    [14, "#2760c0", "#4c89da", "#96c0ee", "#fffbe6", 0],
    [16.5, "#3a5aa8", "#8589c8", "#f2bd8c", "#ffe0b0", 0],
    [18, "#2e2c6e", "#8a4f8f", "#f2875f", "#ffb27a", .05],
    [19.3, "#161a4a", "#3d2f6e", "#8a4e78", "#c06a8a", .4],
    [21, "#0a0f2e", "#1a1d4c", "#33285e", "#4a4a9a", .9],
    [24, "#070b24", "#141a45", "#2b2560", "#3a3f8f", 1]
  ];
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k) {
    var x = rgb(a), y = rgb(b);
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * k); }).join(",") + ")";
  }
  function paintSky(now) {
    var h = now.getHours() + now.getMinutes() / 60;
    var i = 0;
    while (SKY[i + 1][0] <= h) i++;
    var a = SKY[i], b = SKY[i + 1];
    var k = (h - a[0]) / (b[0] - a[0]);
    k = k * k * (3 - 2 * k); // なめらかに
    var top = mix(a[1], b[1], k);
    root.style.setProperty("--sky-top", top);
    root.style.setProperty("--sky-mid", mix(a[2], b[2], k));
    root.style.setProperty("--sky-low", mix(a[3], b[3], k));
    root.style.setProperty("--orb", mix(a[4], b[4], k));
    root.style.setProperty("--stars", String(a[5] + (b[5] - a[5]) * k));
    // 太陽は 6 時〜18 時、月は 18 時〜6 時に、左から右へ弧を描いて動く
    var p = ((h + 18) % 12) / 12;
    root.style.setProperty("--orb-x", (12 + p * 76) + "%");
    root.style.setProperty("--orb-y", (96 - Math.sin(p * Math.PI) * 86) + "%");
    return top;
  }
  function clearSky() {
    ["--sky-top", "--sky-mid", "--sky-low", "--orb", "--stars", "--orb-x", "--orb-y"].forEach(function (p) { root.style.removeProperty(p); });
  }

  // ---- 時刻の表示 ----
  var hm = $("hm"), sec = $("sec"), ampm = $("ampm"), dateEl = $("date"), partEl = $("part"), bar = $("bar");
  var themeColor = $("theme-color");
  var dateFmt = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", weekday: "long" });

  // 文字列 text を、1 文字ずつの枠に入れる（変わった文字だけ入れ替える）
  function setText(box, text) {
    if (box.childNodes.length !== text.length) {
      box.textContent = "";
      for (var j = 0; j < text.length; j++) {
        var s = document.createElement("span");
        s.className = "slot" + (text[j] === ":" ? " slot--colon" : "");
        box.appendChild(s);
      }
    }
    for (var i = 0; i < text.length; i++) {
      var slot = box.childNodes[i];
      var ch = text[i];
      if (slot.dataset.v === ch) continue;
      var first = slot.dataset.v === undefined;
      slot.dataset.v = ch;
      var old = slot.querySelector("span:not(.out)");
      var span = document.createElement("span");
      span.textContent = ch;
      if (!first) span.className = "in";
      slot.appendChild(span);
      if (old) {
        old.className = "out";
        old.addEventListener("animationend", function () { this.remove(); }, { once: true });
      }
    }
  }

  function partOfDay(h) {
    if (h < 4) return t("深夜");
    if (h < 6) return t("明け方");
    if (h < 10) return t("朝");
    if (h < 14) return t("昼");
    if (h < 17) return t("昼下がり");
    if (h < 19) return t("夕方");
    return t("夜");
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var lastMinute = -1;

  function render() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var hh = settings.h24 ? pad(h) : String(h % 12 || 12);
    setText(hm, hh + ":" + pad(m));
    setText(sec, settings.sec ? pad(now.getSeconds()) : "");
    ampm.textContent = settings.h24 ? "" : (h < 12 ? t("午前") : t("午後"));

    var minute = h * 60 + m;
    if (minute !== lastMinute) {
      lastMinute = minute;
      dateEl.textContent = dateFmt.format(now);
      partEl.textContent = partOfDay(h);
      var top = settings.theme === "sky" ? paintSky(now) : null;
      if (themeColor) themeColor.content = top || (settings.theme === "paper" ? "#f4f1ea" : "#000000");
      document.title = hh + ":" + pad(m) + (settings.h24 ? "" : " " + ampm.textContent) + " · Clock";
    }
  }

  function tick() {
    render();
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }

  // 秒のバー（1 分で端まで）
  function frame() {
    if (settings.sec && !document.hidden) {
      var now = new Date();
      bar.style.transform = "scaleX(" + ((now.getSeconds() * 1000 + now.getMilliseconds()) / 60000).toFixed(4) + ")";
    }
    requestAnimationFrame(frame);
  }

  function applySettings() {
    root.setAttribute("data-theme", settings.theme);
    if (settings.theme !== "sky") clearSky();
    document.body.classList.toggle("is-nosec", !settings.sec);
    var b24 = $("btn-24h");
    b24.setAttribute("aria-pressed", String(settings.h24));
    $("fmt-label").textContent = settings.h24 ? "24h" : "12h";
    $("btn-sec").setAttribute("aria-pressed", String(settings.sec));
    lastMinute = -1;
    render();
  }

  // ---- 通知（上に少し出る文字）----
  var toast = $("toast"), toastTimer;
  function say(text) {
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 1800);
  }

  // ---- ボタン ----
  function toggle24() { settings.h24 = !settings.h24; save(); applySettings(); say(settings.h24 ? t("24 時間表示") : t("12 時間表示")); }
  function toggleSec() { settings.sec = !settings.sec; save(); applySettings(); say(settings.sec ? t("秒を表示") : t("秒を隠す")); }
  function nextTheme() {
    settings.theme = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length];
    save(); applySettings(); say(THEME_NAMES[settings.theme]);
  }

  // 画面をつけたままにする（Screen Wake Lock。タブを離れると外れるので、戻ったら取り直す）
  var wakeLock = null, wantWake = false;
  function setWakeButton() { $("btn-wake").setAttribute("aria-pressed", String(wantWake)); }
  function requestWake() {
    return navigator.wakeLock.request("screen").then(function (lock) {
      wakeLock = lock;
      lock.addEventListener("release", function () { wakeLock = null; });
    });
  }
  function toggleWake() {
    if (!("wakeLock" in navigator)) { say(t("この端末では使えません")); return; }
    if (wantWake) {
      wantWake = false;
      if (wakeLock) wakeLock.release();
      setWakeButton();
      say(t("画面のスリープを元に戻しました"));
      return;
    }
    requestWake().then(function () {
      wantWake = true;
      setWakeButton();
      say(t("画面をつけたままにします"));
    }).catch(function () { say(t("この端末では使えません")); });
  }
  document.addEventListener("visibilitychange", function () {
    if (wantWake && !wakeLock && document.visibilityState === "visible") requestWake().catch(function () {});
    if (document.visibilityState === "visible") { lastMinute = -1; render(); }
  });

  function toggleFull() {
    var el = document.documentElement;
    var isFull = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFull) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { say(t("この端末では使えません")); return; }
    var r = req.call(el);
    if (r && r.catch) r.catch(function () { say(t("この端末では使えません")); });
  }

  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (ev) {
    document.addEventListener(ev, function () {
      var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      $("full-icon").textContent = isFull ? "fullscreen_exit" : "fullscreen";
      $("btn-full").setAttribute("aria-label", isFull ? t("全画面を終了") : t("全画面"));
    });
  });

  // ---- しばらく操作しないと、ボタンとカーソルを隠す ----
  var dock = $("dock"), idleTimer;
  function wake() {
    document.body.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dock.matches(":hover") || dock.contains(document.activeElement)) { wake(); return; }
      document.body.classList.add("is-idle");
    }, 3000);
  }

  applySettings();
  tick();
  requestAnimationFrame(frame);

  if (embed) return;

  $("btn-24h").addEventListener("click", toggle24);
  $("btn-sec").addEventListener("click", toggleSec);
  $("btn-theme").addEventListener("click", nextTheme);
  $("btn-wake").addEventListener("click", toggleWake);
  $("btn-full").addEventListener("click", toggleFull);
  ["mousemove", "pointerdown", "keydown", "focusin"].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("button, a, input") || document.body.classList.contains("tbs-open")) return;
    var k = e.key.toLowerCase();
    if (k === "f") toggleFull();
    else if (k === "s") toggleSec();
    else if (k === "h") toggle24();
    else if (k === "t") nextTheme();
  });
  wake();
  // オフライン・ホーム画面への追加・アクセスチェックは /toolbox/shared/pwa.js
})();
