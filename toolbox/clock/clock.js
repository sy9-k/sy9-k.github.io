// Clock（SK's Toolbox）
//   ・時刻と日付を表示する。数字は 1 文字ずつ枠（.slot）に入れて、変わった文字だけ入れ替える
//   ・テーマ「空」では、時刻から空の色（--sky-top など）と太陽・月の位置（--orb-x / --orb-y）を計算する
//   ・設定は localStorage の sk_clock に保存する
//       { h24, sec, theme, night, date: 日付を出すか, part: 時間帯（朝・昼…）を出すか, timeSize: 時計の大きさ（%）, dateSize: 日付の大きさ（%）}
//   ・テーマ（背景）: 空（時刻で変わる）・オーロラ・海・さくら・森・ゆらぎ・夜・紙。見た目は clock.css（<html data-theme>）
//   ・「表示」のパネル（下のツールバーのパレット）で、背景・大きさ・日付と時間帯を出すかを変えられる
//   ・夜モード: 22 時〜6 時は画面を暗くする（body.is-night-dim）
//   ・世界時計・アラーム・タイマー・ストップウォッチは clock-tools.js
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
  // [key, 名前, 見本の色（パネルのボタン）]
  var THEME_LIST = [
    ["sky", t("空"), "linear-gradient(180deg, #2a66c8, #5592df 55%, #f2bd8c)"],
    ["aurora", t("オーロラ"), "radial-gradient(120% 80% at 30% 20%, #3ddc97 0%, transparent 55%), radial-gradient(90% 70% at 80% 30%, #8a5cff 0%, transparent 60%), #06101f"],
    ["ocean", t("海"), "linear-gradient(180deg, #0a6aa1, #053d6b 55%, #021a33)"],
    ["sakura", t("さくら"), "linear-gradient(180deg, #fff3f6, #ffdce6 55%, #ffc6d6)"],
    ["forest", t("森"), "linear-gradient(180deg, #2c5a33, #12351f 55%, #0b1f14)"],
    ["mesh", t("ゆらぎ"), "radial-gradient(80% 80% at 20% 30%, #ff6fb1 0%, transparent 60%), radial-gradient(80% 80% at 80% 70%, #4f8dff 0%, transparent 60%), radial-gradient(70% 70% at 70% 20%, #ffb35c 0%, transparent 60%), #1a1238"],
    ["night", t("夜"), "#000"],
    ["paper", t("紙"), "linear-gradient(180deg, #f4f1ea, #e9e3d6)"]
  ];
  var THEMES = THEME_LIST.map(function (x) { return x[0]; });
  function themeName(key) { for (var i = 0; i < THEME_LIST.length; i++) if (THEME_LIST[i][0] === key) return THEME_LIST[i][1]; return key; }
  var SIZE = { timeSize: [60, 140], dateSize: [60, 200] };
  var settings = { h24: true, sec: true, theme: "sky", night: false, date: true, part: true, timeSize: 100, dateSize: 100 };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) { /* 初期値のまま */ }
  if (THEMES.indexOf(settings.theme) < 0) settings.theme = "sky";
  Object.keys(SIZE).forEach(function (k) {
    var v = Math.round(Number(settings[k]));
    settings[k] = isFinite(v) ? Math.max(SIZE[k][0], Math.min(SIZE[k][1], v)) : 100;
  });
  settings.date = settings.date !== false;
  settings.part = settings.part !== false;
  if (embed) { settings = { h24: true, sec: true, theme: "sky", date: true, part: true, timeSize: 100, dateSize: 100 }; root.classList.add("is-embed"); }
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
      var top = settings.theme === "sky" ? paintSky(now) : getComputedStyle(root).getPropertyValue("--sky-top").trim();
      if (themeColor) themeColor.content = top || "#000000";
      if (!document.body.dataset.mode || document.body.dataset.mode === "clock") document.title = hh + ":" + pad(m) + (settings.h24 ? "" : " " + ampm.textContent) + " · Clock";
      document.body.classList.toggle("is-night-dim", !!settings.night && (h >= 22 || h < 6));
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
    document.body.classList.toggle("is-nodate", !settings.date);
    document.body.classList.toggle("is-nopart", !settings.part);
    root.style.setProperty("--time-scale", String(settings.timeSize / 100));
    root.style.setProperty("--date-scale", String(settings.dateSize / 100));
    var b24 = $("btn-24h");
    b24.setAttribute("aria-pressed", String(settings.h24));
    $("fmt-label").textContent = settings.h24 ? "24h" : "12h";
    $("btn-sec").setAttribute("aria-pressed", String(settings.sec));
    $("btn-night").setAttribute("aria-pressed", String(!!settings.night));
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
  function toggleNight() {
    settings.night = !settings.night;
    save(); applySettings();
    say(settings.night ? t("夜モード: 22 時〜6 時は画面を暗くします") : t("夜モードをオフにしました"));
  }
  function setTheme(key) {
    settings.theme = key;
    save(); applySettings(); renderLook();
  }
  function nextTheme() {
    setTheme(THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]);
    say(t("背景: {name}").replace("{name}", themeName(settings.theme)));
  }

  // ---- 表示のパネル（背景・大きさ・日付と時間帯）----
  var look = $("look"), lookBtn = $("btn-theme");
  var lookThemes = $("look-themes"), lookTime = $("look-time"), lookDate = $("look-date");
  var lookTimeOut = $("look-time-out"), lookDateOut = $("look-date-out");
  var lookShowDate = $("look-show-date"), lookShowPart = $("look-show-part");
  var themeButtons = THEME_LIST.map(function (th) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "look__theme m3-state";
    b.setAttribute("role", "radio");
    var sw = document.createElement("span");
    sw.className = "look__swatch";
    sw.style.background = th[2];
    var name = document.createElement("span");
    name.className = "look__theme-name";
    name.textContent = th[1];
    b.append(sw, name);
    b.addEventListener("click", function () { setTheme(th[0]); });
    lookThemes.appendChild(b);
    return b;
  });
  function renderLook() {
    THEME_LIST.forEach(function (th, i) {
      var on = th[0] === settings.theme;
      themeButtons[i].setAttribute("aria-checked", String(on));
      themeButtons[i].tabIndex = on ? 0 : -1;
    });
    lookTime.value = settings.timeSize;
    lookDate.value = settings.dateSize;
    lookTimeOut.textContent = settings.timeSize + "%";
    lookDateOut.textContent = settings.dateSize + "%";
    lookShowDate.checked = settings.date;
    lookShowPart.checked = settings.part;
  }
  function openLook() {
    renderLook();
    look.hidden = false;
    lookBtn.setAttribute("aria-expanded", "true");
    var cur = lookThemes.querySelector('[aria-checked="true"]');
    if (cur) cur.focus();
  }
  function closeLook(focusBack) {
    if (look.hidden) return;
    look.hidden = true;
    lookBtn.setAttribute("aria-expanded", "false");
    if (focusBack) lookBtn.focus();
  }
  function onRange(input, key) {
    input.addEventListener("input", function () {
      settings[key] = Number(input.value);
      applySettings();
      renderLook();
    });
    input.addEventListener("change", save);
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
      // 隠すのは「時計」の画面だけ（タイマーなどは操作するので出したまま）
      var mode = document.body.dataset.mode;
      if (mode && mode !== "clock") return;
      if (dock.matches(":hover") || dock.contains(document.activeElement) || !look.hidden) { wake(); return; }
      document.body.classList.add("is-idle");
    }, 3000);
  }

  applySettings();
  tick();
  requestAnimationFrame(frame);

  if (embed) return;

  $("btn-24h").addEventListener("click", toggle24);
  $("btn-sec").addEventListener("click", toggleSec);
  $("btn-wake").addEventListener("click", toggleWake);
  $("btn-full").addEventListener("click", toggleFull);
  $("btn-night").addEventListener("click", toggleNight);
  ["mousemove", "pointerdown", "keydown", "focusin"].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("button, a, input") || document.body.classList.contains("tbs-open")) return;
    if (document.body.dataset.mode && document.body.dataset.mode !== "clock") return;
    var k = e.key.toLowerCase();
    if (k === "f") toggleFull();
    else if (k === "s") toggleSec();
    else if (k === "h") toggle24();
    else if (k === "t") nextTheme();
  });

  // 表示のパネル
  lookBtn.addEventListener("click", function () { if (look.hidden) openLook(); else closeLook(false); });
  $("look-close").addEventListener("click", function () { closeLook(true); });
  onRange(lookTime, "timeSize");
  onRange(lookDate, "dateSize");
  lookShowDate.addEventListener("change", function () { settings.date = lookShowDate.checked; save(); applySettings(); });
  lookShowPart.addEventListener("change", function () { settings.part = lookShowPart.checked; save(); applySettings(); });
  $("look-reset").addEventListener("click", function () { settings.timeSize = 100; settings.dateSize = 100; save(); applySettings(); renderLook(); });
  // 背景のボタンは矢印キーでも選べる（ラジオボタンと同じ）
  lookThemes.addEventListener("keydown", function (e) {
    var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var i = (THEMES.indexOf(settings.theme) + d + THEMES.length) % THEMES.length;
    setTheme(THEMES[i]);
    themeButtons[i].focus();
  });
  look.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeLook(true); } });
  document.addEventListener("pointerdown", function (e) {
    if (!look.hidden && !look.contains(e.target) && !lookBtn.contains(e.target)) closeLook(false);
  });
  wake();
  // clock-tools.js から使う
  window.SKClock = { say: say, settings: function () { return settings; }, wake: wake };
  // オフライン・ホーム画面への追加・アクセスチェックは /toolbox/shared/pwa.js
})();
