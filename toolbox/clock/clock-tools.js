// Clock（SK's Toolbox）— 世界時計・アラーム・タイマー・ストップウォッチ
//   ・設定と状態は localStorage の sk_clock_tools に保存する（SK Hub Systems には送らない）
//       { mode: "clock|world|alarm|timer|stopwatch", zones: [タイムゾーン],
//         alarms: [{ id, time: "HH:MM", label, days: [0〜6]（空ならいちど）, on, snoozeAt }],
//         timer: { duration, endAt, running, remaining }, sw: { start, elapsed, running, laps: [合計の時間] } }
//     タイマーとストップウォッチは開始した時刻を覚えるので、ページを閉じても続きから数える
//   ・アラームとタイマーの時刻は /toolbox/shared/remind.js（SKReminders.checkClock）が判定する。
//     Clock では window.SKClockRing で受けて、音を鳴らして全画面で知らせる（ほかのページでは通知だけ）
//   ・#world・#alarm・#timer・#stopwatch で開くと、その画面から
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function say(text) { if (window.SKClock) SKClock.say(text); }
  function h24() { return !window.SKClock || SKClock.settings().h24; }

  // ================================================================
  // 保存
  // ================================================================
  var STORE = "sk_clock_tools";
  var MODES = ["clock", "world", "alarm", "timer", "stopwatch"];
  var tools;
  function load() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { /* 初期値 */ }
    tools = {
      mode: MODES.indexOf(d.mode) >= 0 ? d.mode : "clock",
      zones: Array.isArray(d.zones) ? d.zones.filter(function (z) { return typeof z === "string"; }) : ["America/New_York", "Europe/London"],
      alarms: Array.isArray(d.alarms) ? d.alarms.filter(function (a) { return a && typeof a.id === "string" && /^\d{2}:\d{2}$/.test(a.time || ""); }) : [],
      timer: d.timer && typeof d.timer === "object" ? d.timer : { duration: 300000, endAt: null, running: false, remaining: 0 },
      sw: d.sw && typeof d.sw === "object" ? d.sw : { start: null, elapsed: 0, running: false, laps: [] }
    };
    if (!Array.isArray(tools.sw.laps)) tools.sw.laps = [];
  }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(tools)); } catch (e) { say(t("保存できませんでした")); }
  }
  load();
  if (embed) { tools.mode = "clock"; }

  // ================================================================
  // 画面の切りかえ
  // ================================================================
  var panels = document.querySelectorAll("[data-panel]");
  var tabs = document.querySelectorAll("[data-mode]");
  var titles = { clock: "Clock", world: t("世界時計"), alarm: t("アラーム"), timer: t("タイマー"), stopwatch: t("ストップウォッチ") };
  function setMode(mode, keepHash) {
    tools.mode = mode;
    document.body.dataset.mode = mode;
    Array.prototype.forEach.call(panels, function (p) { p.hidden = p.dataset.panel !== mode; });
    Array.prototype.forEach.call(tabs, function (b) { b.setAttribute("aria-selected", String(b.dataset.mode === mode)); b.tabIndex = b.dataset.mode === mode ? 0 : -1; });
    if (mode !== "clock" && !/bot|crawler|spider|crawling/i.test(navigator.userAgent)) document.title = titles[mode] + " · Clock";
    if (!embed && !keepHash) history.replaceState(null, "", mode === "clock" ? location.pathname : "#" + mode);
    if (window.SKClock) SKClock.wake();
    save();
    renderAll();
    // 動き: 画面を切りかえたら、カードが浮かび上がる
    if (window.M3 && !keepHash) {
      var shown = document.querySelector('[data-panel="' + mode + '"]');
      M3.enter(mode === "clock" ? shown : shown && shown.querySelector(".panel__card"));
      if (mode !== "clock") M3.stagger(shown.querySelector(".zones, .alarms, .presets, .laps"));
    }
  }
  $("modes").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mode]");
    if (b) setMode(b.dataset.mode);
  });
  $("modes").addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = MODES.indexOf(tools.mode) + (e.key === "ArrowRight" ? 1 : -1);
    var next = MODES[(i + MODES.length) % MODES.length];
    setMode(next);
    document.querySelector('[data-mode="' + next + '"]').focus();
  });

  // ================================================================
  // 世界時計
  // ================================================================
  var CITIES = [
    ["Asia/Tokyo", t("東京")], ["Asia/Seoul", t("ソウル")], ["Asia/Shanghai", t("上海")], ["Asia/Taipei", t("台北")], ["Asia/Hong_Kong", t("香港")],
    ["Asia/Manila", t("マニラ")], ["Asia/Ho_Chi_Minh", t("ホーチミン")], ["Asia/Bangkok", t("バンコク")], ["Asia/Singapore", t("シンガポール")], ["Asia/Jakarta", t("ジャカルタ")],
    ["Asia/Kolkata", t("ニューデリー")], ["Asia/Dubai", t("ドバイ")], ["Europe/Istanbul", t("イスタンブール")], ["Europe/Moscow", t("モスクワ")], ["Africa/Cairo", t("カイロ")],
    ["Africa/Johannesburg", t("ヨハネスブルグ")], ["Europe/Berlin", t("ベルリン")], ["Europe/Paris", t("パリ")], ["Europe/Rome", t("ローマ")], ["Europe/Madrid", t("マドリード")],
    ["Europe/London", t("ロンドン")], ["America/Sao_Paulo", t("サンパウロ")], ["America/New_York", t("ニューヨーク")], ["America/Toronto", t("トロント")], ["America/Chicago", t("シカゴ")],
    ["America/Mexico_City", t("メキシコシティ")], ["America/Denver", t("デンバー")], ["America/Los_Angeles", t("ロサンゼルス")], ["America/Vancouver", t("バンクーバー")], ["Pacific/Honolulu", t("ホノルル")],
    ["Australia/Sydney", t("シドニー")], ["Pacific/Auckland", t("オークランド")]
  ];
  function cityName(tz) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === tz) return CITIES[i][1]; return tz.split("/").pop().replace(/_/g, " "); }
  function tzParts(tz, d) {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function renderWorld() {
    var list = $("zones");
    var now = new Date();
    var local = tzParts(Intl.DateTimeFormat().resolvedOptions().timeZone, now);
    var localMin = Date.UTC(+local.year, +local.month - 1, +local.day, +local.hour, +local.minute);
    var fmtOpt = { hour: "numeric", minute: "2-digit", hour12: !h24() };
    if (list.childNodes.length !== tools.zones.length) {
      list.textContent = "";
      tools.zones.forEach(function (tz) {
        var li = el("li", "zone");
        li.dataset.tz = tz;
        var info = el("div", "zone__info");
        info.append(el("span", "zone__rel"), el("span", "zone__name", cityName(tz)));
        var time = el("span", "zone__time");
        var del = el("button", "icon-btn m3-state zone__del");
        del.type = "button";
        del.setAttribute("aria-label", t("{city} を削除", { city: cityName(tz) }));
        del.appendChild(icon("close"));
        li.append(el("span", "msr zone__sun"), info, time, del);
        list.appendChild(li);
      });
    }
    Array.prototype.forEach.call(list.children, function (li) {
      var tz = li.dataset.tz, p = tzParts(tz, now);
      var zMin = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
      var diff = Math.round((zMin - localMin) / 6e4);
      var dayDiff = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day) - Date.UTC(+local.year, +local.month - 1, +local.day)) / 864e5);
      var hours = Math.abs(diff) / 60;
      var hText = (hours % 1 ? hours.toFixed(1) : String(hours));
      var rel = (dayDiff === 0 ? t("今日") : dayDiff > 0 ? t("明日") : t("昨日")) + " · " + (diff === 0 ? t("同じ時刻") : diff > 0 ? t("{h} 時間進んでいる", { h: hText }) : t("{h} 時間遅れている", { h: hText }));
      li.querySelector(".zone__rel").textContent = rel;
      li.querySelector(".zone__time").textContent = new Intl.DateTimeFormat(locale, Object.assign({ timeZone: tz }, fmtOpt)).format(now);
      li.querySelector(".zone__sun").textContent = +p.hour >= 6 && +p.hour < 18 ? "light_mode" : "dark_mode";
    });
    $("zones-empty").hidden = tools.zones.length > 0;
  }
  $("zones").addEventListener("click", function (e) {
    var b = e.target.closest(".zone__del");
    if (!b) return;
    var tz = b.closest(".zone").dataset.tz;
    tools.zones = tools.zones.filter(function (z) { return z !== tz; });
    save();
    renderWorld();
  });
  $("world-add").addEventListener("click", function () {
    var options = CITIES.filter(function (c) { return tools.zones.indexOf(c[0]) < 0; }).map(function (c) { return { value: c[0], label: c[1], icon: "location_city" }; });
    window.M3.choose({ title: t("都市を追加"), options: options }).then(function (tz) {
      if (!tz) return;
      tools.zones.push(tz);
      save();
      renderWorld();
    });
  });

  // ================================================================
  // アラーム
  // ================================================================
  var dayShort = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + i)); });
  function timeText(hm) {
    var p = hm.split(":"), d = new Date();
    d.setHours(+p[0], +p[1], 0, 0);
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: !h24() }).format(d);
  }
  function daysText(days) {
    if (!days || !days.length) return t("1 回だけ");
    var s = days.slice().sort().join(",");
    if (s === "0,1,2,3,4,5,6") return t("毎日");
    if (s === "1,2,3,4,5") return t("平日");
    if (s === "0,6") return t("週末");
    return days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); }).map(function (i) { return dayShort[i]; }).join(" ");
  }
  // 次に鳴る時刻
  function nextFire(a, from) {
    if (a.snoozeAt && a.snoozeAt > from) return a.snoozeAt;
    var p = a.time.split(":");
    for (var i = 0; i < 8; i++) {
      var d = new Date(from);
      d.setDate(d.getDate() + i);
      d.setHours(+p[0], +p[1], 0, 0);
      if (d.getTime() <= from) continue;
      if (!a.days || !a.days.length || a.days.indexOf(d.getDay()) >= 0) return d.getTime();
    }
    return null;
  }
  function untilText(ms) {
    var mins = Math.max(1, Math.round(ms / 6e4)), h = Math.floor(mins / 60), m = mins % 60;
    return h ? t("{h} 時間 {m} 分後", { h: h, m: m }) : t("{m} 分後", { m: m });
  }
  function renderAlarms() {
    var list = $("alarms");
    list.textContent = "";
    var now = Date.now();
    tools.alarms.slice().sort(function (a, b) { return a.time < b.time ? -1 : 1; }).forEach(function (a) {
      var li = el("li", "alarm" + (a.on ? "" : " is-off"));
      li.dataset.id = a.id;
      var main = el("button", "alarm__main m3-state");
      main.type = "button";
      main.setAttribute("aria-label", t("{time} のアラームを編集", { time: a.time }));
      main.append(el("span", "alarm__time", timeText(a.time)));
      var sub = el("span", "alarm__sub", [a.label, daysText(a.days)].filter(Boolean).join(" · "));
      main.appendChild(sub);
      if (a.on) { var nf = nextFire(a, now); if (nf) main.appendChild(el("span", "alarm__next", untilText(nf - now) + (a.snoozeAt ? " · " + t("スヌーズ中") : ""))); }
      var sw = el("input", "tbs-switch");
      sw.type = "checkbox";
      sw.setAttribute("role", "switch");
      sw.checked = !!a.on;
      sw.setAttribute("aria-label", t("{time} のアラーム", { time: a.time }));
      li.append(main, sw);
      list.appendChild(li);
    });
    $("alarms-empty").hidden = tools.alarms.length > 0;
    renderNextAlarm();
  }
  function renderNextAlarm() {
    var now = Date.now(), best = null;
    tools.alarms.forEach(function (a) { if (!a.on) return; var nf = nextFire(a, now); if (nf && (!best || nf < best)) best = nf; });
    var line = $("next-alarm");
    line.hidden = !best || embed;
    if (best) {
      var d = new Date(best), today = new Date();
      var day = d.toDateString() === today.toDateString() ? t("今日") : t("明日");
      if (best - now > 2 * 864e5 || (day === t("明日") && d.getDate() !== new Date(now + 864e5).getDate())) day = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
      line.textContent = "";
      line.append(icon("alarm"), document.createTextNode(" " + day + " " + timeText(pad(d.getHours()) + ":" + pad(d.getMinutes()))));
    }
  }
  $("alarms").addEventListener("change", function (e) {
    if (!e.target.classList.contains("tbs-switch")) return;
    var a = findAlarm(e.target.closest(".alarm").dataset.id);
    if (!a) return;
    a.on = e.target.checked;
    a.snoozeAt = null;
    save();
    renderAlarms();
    if (a.on) { var nf = nextFire(a, Date.now()); if (nf) say(t("アラーム: {until}", { until: untilText(nf - Date.now()) })); }
  });
  $("alarms").addEventListener("click", function (e) {
    var b = e.target.closest(".alarm__main");
    if (b) editAlarm(findAlarm(b.closest(".alarm").dataset.id));
  });
  function findAlarm(id) { for (var i = 0; i < tools.alarms.length; i++) if (tools.alarms[i].id === id) return tools.alarms[i]; return null; }
  function editAlarm(a) {
    var draft = a ? JSON.parse(JSON.stringify(a)) : { id: newId(), time: pad((new Date().getHours() + 1) % 24) + ":00", label: "", days: [], on: true };
    var body = el("div", "alarm-edit");
    var timeIn = el("input", "alarm-edit__time");
    timeIn.type = "time";
    timeIn.value = draft.time;
    timeIn.setAttribute("aria-label", t("時刻"));
    var labelWrap = el("label", "m3-field");
    labelWrap.appendChild(el("span", "m3-field__label", t("ラベル")));
    var labelIn = el("input", "m3-field__input");
    labelIn.maxLength = 40;
    labelIn.value = draft.label || "";
    labelIn.placeholder = t("アラーム");
    labelWrap.appendChild(labelIn);
    var days = el("div", "alarm-edit__days");
    days.setAttribute("role", "group");
    days.setAttribute("aria-label", t("繰り返す曜日"));
    [1, 2, 3, 4, 5, 6, 0].forEach(function (i) {
      var b = el("button", "day m3-state", dayShort[i]);
      b.type = "button";
      b.setAttribute("aria-pressed", String(draft.days.indexOf(i) >= 0));
      b.addEventListener("click", function () {
        var k = draft.days.indexOf(i);
        if (k >= 0) draft.days.splice(k, 1); else draft.days.push(i);
        b.setAttribute("aria-pressed", String(k < 0));
        hint.textContent = daysText(draft.days);
      });
      days.appendChild(b);
    });
    var hint = el("p", "alarm-edit__hint", daysText(draft.days));
    body.append(timeIn, labelWrap, days, hint);
    var actions = [{ label: t("キャンセル"), value: null }, { label: a ? t("保存") : t("追加"), primary: true, value: "save" }];
    if (a) actions.unshift({ label: t("削除"), danger: true, value: "delete" });
    window.M3.dialog({ title: a ? t("アラームを編集") : t("アラームを追加"), body: body, actions: actions, onReady: function (close, box) { box.classList.add("alarm-dialog"); } }).then(function (v) {
      if (v === "delete") {
        tools.alarms = tools.alarms.filter(function (x) { return x.id !== a.id; });
      } else if (v === "save") {
        draft.time = /^\d{2}:\d{2}$/.test(timeIn.value) ? timeIn.value : draft.time;
        draft.label = labelIn.value.trim();
        draft.on = true;
        draft.snoozeAt = null;
        if (a) Object.assign(a, draft); else tools.alarms.push(draft);
        var nf = nextFire(draft, Date.now());
        if (nf) say(t("アラーム: {until}", { until: untilText(nf - Date.now()) }));
      } else return;
      save();
      renderAlarms();
    });
  }
  $("alarm-add").addEventListener("click", function () { editAlarm(null); });

  // ================================================================
  // タイマー
  // ================================================================
  var PRESETS = [60, 180, 300, 600, 900, 1800, 3600];
  var presetsEl = $("presets");
  PRESETS.forEach(function (sec) {
    var b = el("button", "chip m3-state", sec >= 3600 ? t("{h} 時間", { h: sec / 3600 }) : t("{m} 分", { m: sec / 60 }));
    b.type = "button";
    b.dataset.sec = String(sec);
    presetsEl.appendChild(b);
  });
  presetsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sec]");
    if (!b) return;
    var s = +b.dataset.sec;
    $("tm-h").value = Math.floor(s / 3600);
    $("tm-m").value = Math.floor(s % 3600 / 60);
    $("tm-s").value = s % 60;
    startTimer(s * 1000);
  });
  function clampInput(id, max) { var v = Math.max(0, Math.min(max, parseInt($(id).value, 10) || 0)); $(id).value = v; return v; }
  function startTimer(ms) {
    if (!ms) return;
    unlockAudio();
    tools.timer = { duration: ms, endAt: Date.now() + ms, running: true, remaining: ms };
    save();
    renderTimer();
  }
  $("timer-start").addEventListener("click", function () {
    var ms = (clampInput("tm-h", 23) * 3600 + clampInput("tm-m", 59) * 60 + clampInput("tm-s", 59)) * 1000;
    if (!ms) { say(t("時間を入れてください")); return; }
    startTimer(ms);
  });
  $("timer-cancel").addEventListener("click", function () { tools.timer = { duration: tools.timer.duration, endAt: null, running: false, remaining: 0 }; save(); renderTimer(); });
  $("timer-plus").addEventListener("click", function () {
    var tm = tools.timer;
    tm.duration += 60000;
    if (tm.running) tm.endAt += 60000; else tm.remaining += 60000;
    save();
    renderTimer();
  });
  $("timer-pause").addEventListener("click", function () {
    var tm = tools.timer;
    if (tm.running) { tm.remaining = Math.max(0, tm.endAt - Date.now()); tm.running = false; tm.endAt = null; }
    else if (tm.remaining > 0) { unlockAudio(); tm.endAt = Date.now() + tm.remaining; tm.running = true; }
    save();
    renderTimer();
  });
  function fmtDur(ms, cs) {
    var total = Math.max(0, ms), s = Math.floor(total / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    var out = (h ? h + ":" + pad(m) : String(m)) + ":" + pad(sec);
    if (cs) out = (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(sec) + "." + pad(Math.floor(total % 1000 / 10));
    return out;
  }
  var CIRC = 2 * Math.PI * 90;
  function renderTimer() {
    var tm = tools.timer;
    var active = tm.running || tm.remaining > 0;
    $("timer-setup").hidden = active;
    $("timer-run").hidden = !active;
    if (!active) return;
    var left = tm.running ? Math.max(0, tm.endAt - Date.now()) : tm.remaining;
    $("tm-left").textContent = fmtDur(left + (tm.running ? 999 : 0));
    var endAt = tm.running ? tm.endAt : Date.now() + tm.remaining;
    $("tm-end").textContent = "";
    $("tm-end").append(icon("notifications"), document.createTextNode(" " + timeText(pad(new Date(endAt).getHours()) + ":" + pad(new Date(endAt).getMinutes()))));
    $("tm-end").classList.toggle("is-paused", !tm.running);
    var bar = $("tring-bar");
    bar.style.strokeDasharray = CIRC.toFixed(1);
    bar.style.strokeDashoffset = (CIRC * (1 - left / Math.max(1, tm.duration))).toFixed(1);
    $("timer-pause-icon").textContent = tm.running ? "pause" : "play_arrow";
    $("timer-pause-label").textContent = tm.running ? t("一時停止") : t("再開");
  }

  // ================================================================
  // ストップウォッチ
  // ================================================================
  function swElapsed() { var s = tools.sw; return s.elapsed + (s.running ? Date.now() - s.start : 0); }
  $("sw-start").addEventListener("click", function () {
    var s = tools.sw;
    if (s.running) { s.elapsed = swElapsed(); s.running = false; s.start = null; }
    else { s.start = Date.now(); s.running = true; }
    save();
    renderSw(true);
  });
  $("sw-lap").addEventListener("click", function () {
    var s = tools.sw;
    if (s.running) s.laps.push(swElapsed());
    else { s.elapsed = 0; s.laps = []; s.start = null; }
    save();
    renderSw(true);
  });
  function renderSw(full) {
    var s = tools.sw, total = swElapsed();
    $("sw-time").textContent = fmtDur(total, true);
    if (!full) return;
    $("sw-start-icon").textContent = s.running ? "pause" : "play_arrow";
    $("sw-start-label").textContent = s.running ? t("ストップ") : total ? t("再開") : t("スタート");
    $("sw-lap-label").textContent = s.running || !total ? t("ラップ") : t("リセット");
    $("sw-lap").disabled = !s.running && !total;
    var list = $("sw-laps");
    list.textContent = "";
    var splits = s.laps.map(function (v, i) { return v - (i ? s.laps[i - 1] : 0); });
    var min = Math.min.apply(null, splits), max = Math.max.apply(null, splits);
    splits.map(function (v, i) { return [i, v]; }).reverse().forEach(function (p) {
      var li = el("li", "lap" + (splits.length >= 3 && p[1] === min ? " is-best" : "") + (splits.length >= 3 && p[1] === max ? " is-worst" : ""));
      li.append(el("span", "lap__no", t("ラップ {n}", { n: p[0] + 1 })), el("span", "lap__split", fmtDur(p[1], true)), el("span", "lap__total", fmtDur(s.laps[p[0]], true)));
      list.appendChild(li);
    });
  }

  // ================================================================
  // 鳴らす（アラーム・タイマー）
  // ================================================================
  var audio = null, beepTimer = null, ringing = null, autoStop = null;
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (e) { /* 音を出せない */ }
  }
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
  function beep() {
    if (!audio) return;
    var now = audio.currentTime;
    [0, .18, .36].forEach(function (d) {
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0, now + d);
      g.gain.linearRampToValueAtTime(.25, now + d + .02);
      g.gain.linearRampToValueAtTime(0, now + d + .14);
      o.connect(g).connect(audio.destination);
      o.start(now + d);
      o.stop(now + d + .16);
    });
    if (navigator.vibrate) { try { navigator.vibrate([200, 100, 200]); } catch (e) { /* 対応していない */ } }
  }
  function ring(ev) {
    ringing = ev;
    var isAlarm = ev.kind === "alarm";
    $("ring-icon").textContent = isAlarm ? "alarm" : "hourglass_bottom";
    $("ring-title").textContent = isAlarm ? (ev.alarm.label || t("アラーム")) : t("タイマーが終わりました");
    $("ring-time").textContent = isAlarm ? timeText(ev.alarm.time) : fmtDur(ev.timer.duration);
    $("ring-snooze").hidden = !isAlarm;
    $("ring").hidden = false;
    document.body.classList.add("is-ringing");
    $("ring-stop").focus();
    unlockAudio();
    beep();
    clearInterval(beepTimer);
    beepTimer = setInterval(beep, 1200);
    clearTimeout(autoStop);
    autoStop = setTimeout(stopRing, 5 * 6e4); // 5 分で止める
    if (document.visibilityState !== "visible" && window.SKReminders) {
      // ほかの画面から鳴ったときと同じ形（アラームには「スヌーズ」「止める」のボタン。/toolbox/shared/remind.js）
      SKReminders.notify(isAlarm ? (ev.alarm.label || t("アラーム")) : t("タイマーが終わりました"), "", isAlarm ? "sk-alarm-" + ev.alarm.id : "sk-timer", "clock", isAlarm ? {
        context: t("{time} のアラーム", { time: ev.alarm.time }),
        actions: [{ action: "snooze", title: t("スヌーズ（5 分）") }, { action: "stop", title: t("止める") }],
        data: { kind: "alarm", id: ev.alarm.id }
      } : {
        context: SKReminders.timerText ? SKReminders.timerText(ev.timer) : t("タイマー")
      });
    }
    load();
    renderAll();
  }
  function stopRing() {
    clearInterval(beepTimer);
    clearTimeout(autoStop);
    $("ring").hidden = true;
    document.body.classList.remove("is-ringing");
    ringing = null;
  }
  $("ring-stop").addEventListener("click", stopRing);
  // 通知の「スヌーズ」「止める」（/toolbox/shared/remind.js）: この画面で鳴っているなら、画面のボタンと同じことをする
  document.addEventListener("sk-alarm-action", function (e) {
    if (!ringing || ringing.kind !== "alarm" || ringing.alarm.id !== e.detail.id) return;
    e.preventDefault();
    if (e.detail.action === "snooze") $("ring-snooze").click(); else stopRing();
  });
  $("ring-snooze").addEventListener("click", function () {
    if (ringing && ringing.kind === "alarm") {
      load();
      var a = findAlarm(ringing.alarm.id);
      if (a) { a.on = true; a.snoozeAt = Date.now() + 5 * 6e4; save(); say(t("5 分後にもう一度鳴らします")); }
    }
    stopRing();
    renderAll();
  });

  // ================================================================
  // まとめて描く・動かす
  // ================================================================
  function renderAll() {
    if (tools.mode === "world") renderWorld();
    if (tools.mode === "alarm") renderAlarms();
    if (tools.mode === "timer") renderTimer();
    if (tools.mode === "stopwatch") renderSw(true);
    renderNextAlarm();
  }
  function frame() {
    if (!document.hidden) {
      if (tools.mode === "stopwatch" && tools.sw.running) renderSw(false);
      if (tools.mode === "timer" && tools.timer.running) renderTimer();
    }
    requestAnimationFrame(frame);
  }

  var startMode = location.hash.slice(1);
  setMode(!embed && MODES.indexOf(startMode) >= 0 ? startMode : embed ? "clock" : tools.mode, true);
  if (embed) return;

  window.SKClockRing = ring;
  requestAnimationFrame(frame);
  setInterval(function () {
    if (window.SKReminders) SKReminders.checkClock();
    if (tools.mode === "world") renderWorld();
    if (tools.mode === "alarm" && !document.querySelector(".tbs-dialog-scrim")) renderAlarms();
    renderNextAlarm();
  }, 1000);

  // スペースキー: タイマー・ストップウォッチの開始と停止
  document.addEventListener("keydown", function (e) {
    if (e.key !== " " || e.target.closest("input, button, textarea, select") || document.querySelector(".tbs-dialog-scrim, .tbs-overlay")) return;
    if (!$("ring").hidden) { e.preventDefault(); stopRing(); return; }
    if (tools.mode === "stopwatch") { e.preventDefault(); $("sw-start").click(); }
    else if (tools.mode === "timer") { e.preventDefault(); if ($("timer-run").hidden) $("timer-start").click(); else $("timer-pause").click(); }
  });

  // ほかのタブでアラームなどを変えたとき
  window.addEventListener("storage", function (e) {
    if (e.key !== STORE) return;
    var mode = tools.mode;
    load();
    tools.mode = mode;
    renderAll();
  });
})();
