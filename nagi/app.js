// Nagi（凪）— 集中タイマー
//   集中（初期 25 分）→ 休憩（5 分）をくり返し、4 回ごとに長い休憩（15 分）。集中した時間を記録して、1 日の目標と連続日数を出す
//   ・記録と設定はこのブラウザの localStorage（nagi_sessions / nagi_settings / nagi_timer）
//   ・SK Hub Systems アカウントとの同期は account.js（window.NAGI でやり取りする）
//   ・残り時間は「終わる時刻」から計算する（タブが裏にあっても、閉じて開き直しても、ずれない）
//   ・タイマーの状態は、同じブラウザのほかのタブ（storage イベント）と、アカウントで同期しているほかの端末（account.js）にそろえる
//     （あとで操作したほう = changedAt が新しいほうに合わせる）
//   ・残り時間は、ピクチャー イン ピクチャー（PiP）の小さな窓でも見られる
(function () {
  "use strict";

  var I18N = window.SKI18N || { lang: "ja", t: function (s, p) { return p ? s.replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; }) : s; } };
  var t = I18N.t;

  var SETTINGS_KEY = "nagi_settings";
  var SESSIONS_KEY = "nagi_sessions";
  var TIMER_KEY = "nagi_timer";
  var INSTALL_KEY = "nagi_install_dismissed";
  var SESSIONS_MAX = 3000;       // 記録は新しいものから 3000 件まで（1 日 8 回で約 1 年）
  var MIN_RECORD_MS = 60 * 1000; // 1 分未満でやめたものは記録しない
  var RING = 2 * Math.PI * 108;

  var DEFAULTS = { focus: 25, short: 5, long: 15, every: 4, goal: 120, autoBreak: true, autoFocus: false, sound: true, notify: false, goalUpdatedAt: 0 };

  var $ = function (id) { return document.getElementById(id); };

  // ---------- 保存 ----------
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できなくても、このページでは動く */ }
  }

  function clampInt(v, min, max, fallback) {
    var n = Math.round(Number(v));
    return isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }
  function normalizeSettings(s) {
    s = s || {};
    return {
      focus: clampInt(s.focus, 1, 180, DEFAULTS.focus),
      short: clampInt(s.short, 1, 60, DEFAULTS.short),
      long: clampInt(s.long, 1, 90, DEFAULTS.long),
      every: clampInt(s.every, 2, 10, DEFAULTS.every),
      goal: clampInt(s.goal, 10, 1440, DEFAULTS.goal),
      autoBreak: s.autoBreak !== undefined ? !!s.autoBreak : DEFAULTS.autoBreak,
      autoFocus: !!s.autoFocus,
      sound: s.sound !== undefined ? !!s.sound : DEFAULTS.sound,
      notify: !!s.notify,
      goalUpdatedAt: Number(s.goalUpdatedAt) || 0
    };
  }

  var settings = normalizeSettings(load(SETTINGS_KEY, {}));
  // 記録: [{ i: ID, s: 始めた時刻（ミリ秒）, m: 集中した分（小数） }]
  var sessions = (load(SESSIONS_KEY, []) || []).filter(function (x) { return x && x.i && isFinite(x.s) && isFinite(x.m); });

  // タイマーの状態
  //   mode: focus / short / long, running, endAt（動いているとき）, remaining（止まっているとき、ミリ秒）, total: その回の長さ（ミリ秒）
  //   round: 今のサイクルで何回目の集中か, focusStart: 集中を始めた時刻, focusedMs: 一時停止までに集中した時間, resumedAt
  //   changedAt: 最後に操作した時刻（ほかのタブ・端末とそろえるときに、新しいほうを選ぶ）
  function normalizeTimer(x) {
    if (!x || !/^(focus|short|long)$/.test(x.mode)) return null;
    var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
    return {
      mode: x.mode, running: !!x.running, endAt: num(x.endAt), remaining: num(x.remaining), total: num(x.total),
      round: Math.max(1, Math.round(num(x.round)) || 1), focusStart: num(x.focusStart), focusedMs: num(x.focusedMs), resumedAt: num(x.resumedAt),
      changedAt: num(x.changedAt)
    };
  }
  var timer = normalizeTimer(load(TIMER_KEY, null)) || { mode: "focus", running: false, endAt: 0, remaining: settings.focus * 60000, total: settings.focus * 60000, round: 1, focusStart: 0, focusedMs: 0, resumedAt: 0, changedAt: 0 };

  var listeners = [];
  function changed(kind) {
    listeners.forEach(function (fn) { try { fn(kind); } catch (e) { /* 同期の失敗でタイマーは止めない */ } });
  }

  function durationOf(mode) {
    return (mode === "focus" ? settings.focus : mode === "short" ? settings.short : settings.long) * 60000;
  }
  // 今の回の長さ（ほかの端末で始めたときは、その端末の長さ）
  function totalOf() {
    return timer.total || durationOf(timer.mode);
  }

  // ---------- 日付と集計 ----------
  function dayKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayTotals() {
    var map = {};
    sessions.forEach(function (x) { var k = dayKey(x.s); map[k] = (map[k] || 0) + x.m; });
    return map;
  }
  function addDays(ms, n) {
    var d = new Date(ms);
    d.setDate(d.getDate() + n);
    return d.getTime();
  }
  // 連続日数: 今日達成していれば今日から、まだなら昨日から、目標を達成した日をさかのぼって数える
  function streakOf(totals) {
    var now = Date.now();
    var day = (totals[dayKey(now)] || 0) >= settings.goal ? now : addDays(now, -1);
    var n = 0;
    while ((totals[dayKey(day)] || 0) >= settings.goal) { n++; day = addDays(day, -1); }
    return n;
  }

  function formatMinutes(min) {
    var m = Math.floor(min + 1e-6);
    var h = Math.floor(m / 60);
    var r = m % 60;
    if (h === 0) return t("{m}分", { m: r });
    return r === 0 ? t("{h}時間", { h: h }) : t("{h}時間{m}分", { h: h, m: r });
  }
  function formatClock(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // ---------- 記録 ----------
  function record(startMs, focusedMs) {
    if (focusedMs < MIN_RECORD_MS) return false;
    var before = (dayTotals()[dayKey(Date.now())] || 0) >= settings.goal;
    // ID は始めた時刻から決める（同期しているほかの端末も同じ集中を記録したとき、同じ ID で 1 件にまとまる）
    var id = startMs.toString(36) + "-f";
    sessions = sessions.filter(function (x) { return x.i !== id; });
    sessions.push({ i: id, s: startMs, m: Math.round(focusedMs / 600) / 100 });
    sessions.sort(function (a, b) { return a.s - b.s; });
    if (sessions.length > SESSIONS_MAX) sessions = sessions.slice(-SESSIONS_MAX);
    save(SESSIONS_KEY, sessions);
    var after = (dayTotals()[dayKey(Date.now())] || 0) >= settings.goal;
    renderStats();
    if (!before && after) {
      toast(t("今日の目標を達成しました！"));
      celebrate();
    }
    changed("sessions");
    return true;
  }

  // ---------- 音と通知 ----------
  var audio = null;
  function ensureAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (e) { audio = null; }
    loadBreakSound();
  }
  // 集中から休憩に変わるときの音（効果音ラボ「クイズ正解2」。鉄琴のフレーズ）。読めなかったら風鈴の音
  var breakSound = null, breakLoading = false;
  function loadBreakSound() {
    if (!audio || breakSound || breakLoading) return;
    breakLoading = true;
    fetch("sound/break.mp3").then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, ng) { audio.decodeAudioData(b, ok, ng); }); })
      .then(function (buf) { breakSound = buf; }, function () { breakLoading = false; });
  }
  // kind … "break"（集中のあと）なら鉄琴の音、それ以外（休憩のあと）は風鈴の音
  function chime(kind) {
    if (!settings.sound || !audio) return;
    if (kind === "break" && breakSound) {
      var src = audio.createBufferSource();
      var vol = audio.createGain();
      vol.gain.value = 0.8;
      src.buffer = breakSound;
      src.connect(vol).connect(audio.destination);
      src.start();
      return;
    }
    // 風鈴のような、やわらかい 3 つの音
    var now = audio.currentTime;
    [880, 1318.5, 1760].forEach(function (freq, i) {
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      var start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + 1.7);
    });
  }
  // context … 本文の 1 行目「Nagi · ○○」の ○○（終わった集中・休憩と、その長さ）
  function notify(title, body, context) {
    if (!settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    // 通知の形は SK's Toolbox とそろえる（本文の 1 行目 … 「Nagi · 何の通知か」。小さなアイコンは白と透明だけの三日月）
    var options = { body: "Nagi · " + (context || t("タイマー")) + (body ? "\n" + body : ""), icon: "ico/icon-192.png", badge: "ico/badge-96.png", tag: "nagi", renotify: true, timestamp: Date.now(), vibrate: [200, 100, 200] };
    function show() {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(title, options); }).catch(function () {});
      } else {
        try { new Notification(title, options); } catch (e) { /* 通知が使えない環境 */ }
      }
    }
    // アイコン: Nagi のアイコンの右下に、小さな SK のマークを重ねる（SK's Toolbox と同じ。作れなければ Nagi のアイコンだけ）
    var done = false;
    var wait = setTimeout(function () { if (!done) { done = true; show(); } }, 1500);
    nagiIcon().then(function (url) { if (done) return; done = true; clearTimeout(wait); options.icon = url; show(); });
  }
  var nagiIconP = null;
  function nagiIcon() {
    if (nagiIconP) return nagiIconP;
    function img(src) { return new Promise(function (ok, ng) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ng; i.src = src; }); }
    nagiIconP = Promise.all([img("ico/icon-192.png"), img("/assets/logo.svg")]).then(function (im) {
      var S = 192, c = document.createElement("canvas");
      c.width = c.height = S;
      var g = c.getContext("2d"), r = 37, cx = S - r - 1, cy = S - r - 1;
      g.drawImage(im[0], 0, 0, 168, 168);
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill();
      g.save(); g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.clip();
      g.drawImage(im[1], cx - (r - 5), cy - (r - 5), (r - 5) * 2, (r - 5) * 2);
      g.restore();
      return c.toDataURL("image/png");
    }).catch(function () { nagiIconP = null; return "ico/icon-192.png"; });
    return nagiIconP;
  }

  // ---------- タイマー ----------
  var doneTimer = null;
  var tickTimer = null;

  // at … 操作した時刻（時間が来て切りかわったときは、終わる時刻。ふつうは今）
  function persist(at) {
    timer.changedAt = at || Date.now();
    save(TIMER_KEY, timer);
    changed("timer");
  }

  function remainingMs() {
    return timer.running ? Math.max(0, timer.endAt - Date.now()) : timer.remaining;
  }

  function start() {
    if (timer.running) return;
    ensureAudio();
    var now = Date.now();
    timer.running = true;
    timer.endAt = now + timer.remaining;
    timer.resumedAt = now;
    if (timer.mode === "focus" && !timer.focusStart) timer.focusStart = now;
    persist();
    schedule();
    render();
  }

  function pause() {
    if (!timer.running) return;
    var now = Date.now();
    timer.remaining = Math.max(0, timer.endAt - now);
    if (timer.mode === "focus") timer.focusedMs += now - timer.resumedAt;
    timer.running = false;
    persist();
    unschedule();
    render();
  }

  // 集中した時間（一時停止中の時間は数えない）
  function focusedSoFar() {
    if (timer.mode !== "focus") return 0;
    return timer.focusedMs + (timer.running ? Math.min(Date.now(), timer.endAt) - timer.resumedAt : 0);
  }

  function setMode(mode, keepRound, at) {
    unschedule();
    timer.mode = mode;
    timer.running = false;
    timer.remaining = timer.total = durationOf(mode);
    timer.focusStart = 0;
    timer.focusedMs = 0;
    if (!keepRound && mode === "focus") timer.round = timer.round || 1;
    persist(at);
    render();
  }

  // 次の種類へ（集中のあとは休憩、休憩のあとは集中。every 回ごとに長い休憩）
  function nextMode() {
    if (timer.mode === "focus") {
      return timer.round % settings.every === 0 ? "long" : "short";
    }
    return "focus";
  }

  function finish(natural) {
    var wasFocus = timer.mode === "focus";
    var endedAt = natural ? timer.endAt : 0;
    // 通知の 1 行目: 終わったもの（「集中 25 分」「休憩 5 分」「長い休憩 15 分」）
    var doneMin = timer.mode === "focus" ? settings.focus : timer.mode === "short" ? settings.short : settings.long;
    var doneText = t(timer.mode === "focus" ? "集中 {n} 分" : timer.mode === "short" ? "休憩 {n} 分" : "長い休憩 {n} 分", { n: doneMin });
    if (wasFocus) {
      record(timer.focusStart || Date.now() - focusedSoFar(), focusedSoFar());
    }
    var next = nextMode();
    if (!wasFocus) timer.round = timer.mode === "long" ? 1 : timer.round + 1;
    setMode(next, true, endedAt);
    if (natural) {
      chime(wasFocus ? "break" : "focus");
      if (wasFocus) notify(t("集中おつかれさまでした"), next === "long" ? t("長い休憩にしましょう。") : t("少し休憩しましょう。"), doneText);
      else notify(t("休憩おわり"), t("次の集中をはじめましょう。"), doneText);
      var auto = wasFocus ? settings.autoBreak : settings.autoFocus;
      if (auto) start();
      else toast(wasFocus ? t("集中おつかれさまでした。休憩しましょう。") : t("休憩おわり。次の集中をはじめましょう。"));
    }
  }

  function reset() {
    // 途中でやめた集中も、1 分以上なら記録する
    if (timer.mode === "focus") record(timer.focusStart || Date.now(), focusedSoFar());
    setMode(timer.mode, true);
  }

  function skip() {
    finish(false);
  }

  function schedule() {
    unschedule();
    // 終わる時刻に 1 回だけ（くり返しのタイマーより、裏のタブでも遅れにくい）
    doneTimer = setTimeout(function () { finish(true); }, Math.max(0, timer.endAt - Date.now()) + 30);
    tickTimer = setInterval(renderTime, 250);
  }
  function unschedule() {
    clearTimeout(doneTimer);
    clearInterval(tickTimer);
    doneTimer = null;
    tickTimer = null;
  }

  // ---------- 表示 ----------
  var MODE_LABEL = { focus: t("集中"), short: t("休憩"), long: t("長い休憩") };

  function renderTime() {
    var rem = remainingMs();
    var clock = formatClock(rem);
    $("time").textContent = clock;
    var total = totalOf();
    var ratio = total ? Math.min(1, rem / total) : 0;
    $("ring-progress").style.strokeDashoffset = String(RING * (1 - ratio));
    document.title = timer.running ? clock + " · " + MODE_LABEL[timer.mode] + " | Nagi" : "Nagi";
    renderPip(clock, ratio);
    if (timer.running && rem <= 0 && !doneTimer) finish(true);
  }

  function render() {
    document.body.classList.toggle("is-break", timer.mode !== "focus");
    document.body.classList.toggle("is-running", !!timer.running);
    if (typeof updateWakeLock === "function") { updateWakeLock(); poke(); }
    document.querySelectorAll("[data-mode]").forEach(function (btn) {
      var on = btn.dataset.mode === timer.mode;
      // 選んだものが変わったら、小さく弾ませる（MALU の辞書の選択と同じ）
      if (on && btn.getAttribute("aria-selected") === "false" && typeof animateEl === "function") animateEl(btn, "is-pop", 300);
      btn.setAttribute("aria-selected", String(on));
    });
    var fresh = !timer.running && timer.remaining === totalOf();
    $("start-label").textContent = timer.running ? t("一時停止") : fresh ? t("はじめる") : t("つづける");
    $("start-icon").textContent = timer.running ? "pause" : "play_arrow";
    $("mode-name").textContent = MODE_LABEL[timer.mode];
    $("mode-icon").textContent = timer.mode === "focus" ? "self_improvement" : "coffee";
    $("status").textContent = timer.running
      ? (timer.mode === "focus" ? t("集中しています") : t("休憩しています"))
      : fresh ? (timer.mode === "focus" ? t("準備ができたら「はじめる」") : t("ひと休みしましょう")) : t("一時停止中");
    $("round").textContent = t("集中 {n} / {every} 回目", { n: ((timer.round - 1) % settings.every) + 1, every: settings.every });
    renderPipState(fresh);
    // スマホのブラウザの上の帯は、背景（M3 の surface）に合わせる
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#f4fbf8");
    renderTime();
  }

  var WEEKDAYS = [t("日"), t("月"), t("火"), t("水"), t("木"), t("金"), t("土")];
  function renderStats() {
    var totals = dayTotals();
    var today = totals[dayKey(Date.now())] || 0;
    var goal = settings.goal;
    $("today-minutes").textContent = formatMinutes(today);
    $("today-goal").textContent = " / " + formatMinutes(goal);
    var pct = Math.min(100, Math.round(today / goal * 100));
    // M3 の線の進み具合: 進んだ部分とすき間（4px）と残り。0% のときは進んだ部分を出さない
    $("goal-fill").style.width = pct > 0 ? "calc(" + pct + "% - 2px)" : "0";
    $("goal-fill").style.display = pct > 0 ? "" : "none";
    $("goal-bar").setAttribute("aria-valuenow", String(pct));
    var done = today >= goal;
    document.querySelector(".today").classList.toggle("is-done", done);
    $("goal-note").textContent = done ? t("今日の目標を達成しました") : t("目標まで あと {rest}", { rest: formatMinutes(goal - today) });
    var streak = streakOf(totals);
    $("streak-value").textContent = t("{n}日連続", { n: streak });
    $("streak").classList.toggle("is-zero", streak === 0);

    // この 7 日
    var chart = $("week-chart");
    var days = [];
    for (var i = 6; i >= 0; i--) days.push(addDays(Date.now(), -i));
    var values = days.map(function (d) { return totals[dayKey(d)] || 0; });
    var max = Math.max(goal, Math.max.apply(null, values)) || 1;
    chart.replaceChildren();
    var line = document.createElement("div");
    line.className = "week-goal";
    line.style.bottom = "calc(" + (goal / max) + " * (100% - 22px) + 22px)";
    chart.appendChild(line);
    days.forEach(function (d, idx) {
      var col = document.createElement("div");
      col.className = "week-day" + (values[idx] >= goal ? " is-met" : "") + (idx === 6 ? " is-today" : "");
      col.title = formatMinutes(values[idx]);
      var bar = document.createElement("div");
      bar.className = "week-bar";
      bar.style.height = "calc(" + (values[idx] / max) + " * (100% - 22px))";
      var label = document.createElement("small");
      label.textContent = idx === 6 ? t("今日") : WEEKDAYS[new Date(d).getDay()];
      col.append(bar, label);
      chart.appendChild(col);
    });
    var week = values.reduce(function (a, b) { return a + b; }, 0);
    $("week-total").textContent = t("合計 {time}", { time: formatMinutes(week) });
  }

  var toastTimer = null;
  function toast(text) {
    var el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200);
  }

  // 目標を達成したとき: 輪がゆっくり光る
  function celebrate() {
    var ring = $("ring-progress");
    if (!ring.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ring.animate([{ filter: "drop-shadow(0 0 0 transparent)" }, { filter: "drop-shadow(0 0 22px var(--accent-2))" }, { filter: "drop-shadow(0 0 0 transparent)" }], { duration: 1800, easing: "ease-in-out" });
  }

  // ---------- 設定 ----------
  var fields = {
    focus: $("set-focus"), short: $("set-short"), long: $("set-long"), every: $("set-every"), goal: $("set-goal"),
    autoBreak: $("set-auto-break"), autoFocus: $("set-auto-focus"), sound: $("set-sound"), notify: $("set-notify")
  };
  function fillSettings() {
    ["focus", "short", "long", "every", "goal"].forEach(function (k) { fields[k].value = settings[k]; });
    ["autoBreak", "autoFocus", "sound", "notify"].forEach(function (k) { fields[k].checked = settings[k]; });
    renderNotifyHint();
  }
  function renderNotifyHint() {
    var hint = $("notify-hint");
    if (!("Notification" in window)) hint.textContent = t("このブラウザは通知に対応していません。");
    else if (Notification.permission === "denied") hint.textContent = t("通知がブロックされています。ブラウザのサイトの設定で許可してください。");
    else hint.textContent = "";
  }
  function saveSettings(patch) {
    var goalChanged = patch.goal !== undefined && patch.goal !== settings.goal;
    settings = normalizeSettings(Object.assign({}, settings, patch));
    if (goalChanged) settings.goalUpdatedAt = Date.now();
    save(SETTINGS_KEY, settings);
    // 止まっていて、まだ始めていないタイマーは、新しい時間にそろえる
    if (!timer.running && !timer.focusStart && timer.remaining !== durationOf(timer.mode)) { timer.remaining = timer.total = durationOf(timer.mode); persist(); }
    render();
    renderStats();
    if (goalChanged) changed("goal");
  }
  ["focus", "short", "long", "every", "goal"].forEach(function (k) {
    fields[k].addEventListener("change", function () { var p = {}; p[k] = fields[k].value; saveSettings(p); fields[k].value = settings[k]; });
  });
  ["autoBreak", "autoFocus", "sound"].forEach(function (k) {
    fields[k].addEventListener("change", function () {
      var p = {}; p[k] = fields[k].checked; saveSettings(p);
      if (k === "sound" && settings.sound) { ensureAudio(); chime(); }
    });
  });
  fields.notify.addEventListener("change", function () {
    if (!fields.notify.checked) { saveSettings({ notify: false }); return; }
    if (!("Notification" in window)) { fields.notify.checked = false; renderNotifyHint(); return; }
    Notification.requestPermission().then(function (p) {
      var ok = p === "granted";
      fields.notify.checked = ok;
      saveSettings({ notify: ok });
      renderNotifyHint();
      if (ok) toast(t("終わったときに通知します"));
    });
  });

  // 設定（MALU の設定と同じ形。左のカテゴリで中身を切りかえる。開くたびに「基本設定」から）
  var settingsNav = [].slice.call(document.querySelectorAll("#settings [data-settings-target]"));
  function showSettingsSection(id) {
    [].forEach.call(document.querySelectorAll("#settings .settings-section"), function (sec) { sec.classList.toggle("settings-section--active", sec.id === id); });
    settingsNav.forEach(function (b) {
      var on = b.getAttribute("data-settings-target") === id;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    var body = document.querySelector("#settings .settings-panel__body");
    if (body) body.scrollTop = 0;
  }
  // スマホ（せまい画面）: 最初はカテゴリの一覧だけ。押すとその中身に切りかわり（is-detail）、戻るボタンで一覧に戻る
  var settingsLayout = document.querySelector("#settings .settings-layout");
  function narrow() { return window.matchMedia && matchMedia("(max-width: 820px)").matches; }
  settingsNav.forEach(function (b) {
    b.addEventListener("click", function () {
      showSettingsSection(b.getAttribute("data-settings-target"));
      settingsLayout.classList.add("is-detail");
    });
  });
  // 設定を検索: カテゴリの名前・要約と、そのページの中の文字で、一覧をしぼる
  var settingsSearch = $("settings-search");
  function filterSettings() {
    var v = settingsSearch.value.trim().toLowerCase(), any = false;
    settingsNav.forEach(function (b) {
      var sec = document.getElementById(b.getAttribute("data-settings-target"));
      var hit = !v || (b.textContent + " " + (sec ? sec.textContent : "")).toLowerCase().indexOf(v) >= 0;
      b.hidden = !hit;
      if (hit) any = true;
    });
    $("settings-search-none").hidden = any;
  }
  settingsSearch.addEventListener("input", filterSettings);
  // 開く・閉じるときの動きは MALU と同じ（元の画面が少し沈んで消えてから、設定が右から入る。閉じるときは逆）
  var settingsDialog = $("settings");
  var mainParts = [document.querySelector(".top-bar"), document.querySelector(".page")];
  function reduced() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function animateEl(el, cls, ms) {
    if (!el || reduced()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  var settingsBusy = false;
  function openSettings() {
    if (settingsDialog.open || settingsBusy) return;
    fillSettings();
    showSettingsSection("settings-general");
    settingsLayout.classList.remove("is-detail");
    settingsSearch.value = "";
    filterSettings();
    showVersion();
    if (reduced()) { settingsDialog.showModal(); return; }
    settingsBusy = true;
    mainParts.forEach(function (el) { el.classList.add("view-exit"); });
    setTimeout(function () {
      mainParts.forEach(function (el) { el.classList.remove("view-exit"); });
      settingsDialog.showModal();
      animateEl(settingsDialog, "settings-view--enter", 400);
      settingsBusy = false;
    }, 180);
  }
  function closeSettings() {
    if (!settingsDialog.open || settingsBusy) return;
    if (reduced()) { settingsDialog.close(); return; }
    settingsBusy = true;
    settingsDialog.classList.add("settings-view--leave");
    setTimeout(function () {
      settingsDialog.classList.remove("settings-view--leave");
      settingsDialog.close();
      mainParts.forEach(function (el) { animateEl(el, "view-enter", 400); });
      settingsBusy = false;
    }, 200);
  }
  $("settings-button").addEventListener("click", openSettings);
  // 戻るボタン（form method="dialog"）と Esc キーも、動きをつけて閉じる
  settingsDialog.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();
    // スマホで中身を見ているときは、まずカテゴリの一覧に戻る
    if (narrow() && settingsLayout.classList.contains("is-detail")) { settingsLayout.classList.remove("is-detail"); return; }
    closeSettings();
  });
  settingsDialog.addEventListener("cancel", function (e) { e.preventDefault(); closeSettings(); });

  // 押したところから広がる波紋（MALU と同じ）
  var RIPPLE = ".icon-btn, .filled-btn, .text-btn, .outlined-btn, .tonal-icon-btn, .fab, .segmented button, .settings-nav__item, .settings-action, .chip";
  document.addEventListener("pointerdown", function (e) {
    var target = e.target.closest && e.target.closest(RIPPLE);
    if (!target || target.disabled || reduced()) return;
    var r = target.getBoundingClientRect();
    var size = Math.hypot(r.width, r.height) * 2;
    var dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.width = dot.style.height = size + "px";
    dot.style.left = (e.clientX - r.left - size / 2) + "px";
    dot.style.top = (e.clientY - r.top - size / 2) + "px";
    target.appendChild(dot);
    dot.addEventListener("animationend", function () { dot.remove(); });
  });

  // 更新の確認（MALU と同じ。Service Worker に新しい版がないか確かめる。見つけたら、ボタンが「再読み込み」に変わる）
  var updateBox = document.querySelector("#settings .about-status");
  var updateStatus = $("about-update-status");
  var updateButton = $("check-update");
  var updateFound = false;
  function setUpdateState(state, text) {
    updateBox.classList.toggle("is-checking", state === "checking");
    updateBox.classList.toggle("is-new", state === "new");
    updateBox.classList.toggle("is-error", state === "error");
    updateBox.querySelector(".about-status__mark .ms").textContent = state === "checking" ? "progress_activity" : state === "new" ? "upgrade" : state === "error" ? "error" : "check";
    updateStatus.textContent = text;
  }
  function checkUpdate() {
    if (updateFound) { location.reload(); return; }
    if (!("serviceWorker" in navigator)) { setUpdateState("error", t("この端末では更新を確認できません")); return; }
    updateButton.disabled = true;
    setUpdateState("checking", t("更新を確認しています…"));
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) throw new Error("no registration");
      return reg.update().then(function () { return reg; });
    }).then(function (reg) {
      updateFound = !!(reg.installing || reg.waiting);
      if (updateFound) {
        setUpdateState("new", t("新しい版が見つかりました"));
        updateButton.textContent = t("再読み込み");
      } else {
        setUpdateState("ok", t("Nagi は最新です"));
      }
    }).catch(function () {
      setUpdateState("error", t("更新を確認できませんでした。インターネットの接続を確かめてください"));
    }).then(function () { updateButton.disabled = false; });
  }
  updateButton.addEventListener("click", checkUpdate);

  // キャッシュを消して読み込み直す（Nagi が保存したファイルだけ。localStorage の記録と設定には触らない）
  $("reset-cache").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    var jobs = [];
    if (window.caches && caches.keys) jobs.push(caches.keys().then(function (names) { return Promise.all(names.filter(function (n) { return /^nagi-/.test(n); }).map(function (n) { return caches.delete(n); })); }));
    if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.unregister(); }));
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  });

  // バージョン（このアプリについて）。「1.0（ビルド 6）」… ビルドは、この端末に入っている Service Worker のキャッシュの番号（nagi/sw.js の CACHE_NAME）
  var APP_VERSION = "1.0";
  function showVersion() {
    var out = $("app-version");
    out.textContent = APP_VERSION;
    if (!window.caches || !caches.keys) return;
    caches.keys().then(function (names) {
      var build = 0;
      names.forEach(function (n) { var m = /^nagi-v(\d+)$/.exec(n); if (m) build = Math.max(build, +m[1]); });
      if (build) out.textContent = t("{version}（ビルド {build}）", { version: APP_VERSION, build: build });
    }).catch(function () {});
  }
  $("clear-button").addEventListener("click", function () {
    if (!confirm(t("このブラウザに保存した集中の記録を消します。SK Hub Systems アカウントで同期している記録は消えません。よろしいですか？"))) return;
    sessions = [];
    save(SESSIONS_KEY, sessions);
    renderStats();
    toast(t("このブラウザの記録を消しました"));
    changed("cleared");
  });

  // ---------- 操作 ----------
  $("start-button").addEventListener("click", function () { if (timer.running) pause(); else start(); });
  $("reset-button").addEventListener("click", reset);
  $("skip-button").addEventListener("click", skip);
  document.querySelectorAll("[data-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.mode === timer.mode) return;
      if (timer.mode === "focus") record(timer.focusStart || Date.now(), focusedSoFar());
      setMode(btn.dataset.mode, true);
    });
  });
  // キーボード: Space はじめる・一時停止 / R リセット / N 次へ / F 拡大表示 / P 小さな窓（PiP） / Esc 拡大表示をやめる（入力中・設定を開いているときは除く）
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea, select, dialog[open]")) return;
    if (e.code === "Space") {
      if (e.target.closest("button")) return; // ボタンにいるときは、ボタンを押したことにする
      e.preventDefault();
      if (timer.running) pause(); else start();
    } else if (e.code === "KeyR") { e.preventDefault(); reset(); }
    else if (e.code === "KeyN") { e.preventDefault(); skip(); }
    else if (e.code === "KeyF") { e.preventDefault(); setZen(!isZen()); }
    else if (e.code === "KeyP" && !$("pip-button").hidden) { e.preventDefault(); openPip(); }
    else if (e.code === "Escape" && isZen() && !document.fullscreenElement) { setZen(false); }
  });

  // ---------- 拡大表示（タイマーだけを画面いっぱいに） ----------
  // 全画面にできるブラウザでは全画面にする。動いているあいだは画面が暗くならないようにする（Screen Wake Lock）
  var wakeLock = null;
  function isZen() { return document.body.classList.contains("is-zen"); }
  function setZen(on) {
    document.body.classList.toggle("is-zen", on);
    $("zen-icon").textContent = on ? "fullscreen_exit" : "fullscreen";
    $("zen-button").setAttribute("aria-label", on ? t("拡大表示をやめる") : t("拡大表示"));
    $("zen-button").title = on ? t("拡大表示をやめる") + "（F）" : t("拡大表示") + "（F）";
    var root = document.documentElement;
    if (on && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    updateWakeLock();
    poke();
  }
  $("zen-button").addEventListener("click", function () { setZen(!isZen()); });
  // Esc などで全画面をやめたら、拡大表示もやめる
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && isZen()) setZen(false); });
  function updateWakeLock() {
    var want = isZen() && timer.running && "wakeLock" in navigator && document.visibilityState === "visible";
    if (want && !wakeLock) {
      navigator.wakeLock.request("screen").then(function (lock) {
        wakeLock = lock;
        lock.addEventListener("release", function () { wakeLock = null; });
      }).catch(function () {});
    } else if (!want && wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }
  // 拡大表示で動いているあいだ、3 秒さわらなければボタンを隠す（動かすと戻る）
  var idleTimer = null;
  function poke() {
    document.body.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (isZen() && timer.running) document.body.classList.add("is-idle"); }, 3000);
  }
  ["mousemove", "pointerdown", "keydown", "touchstart"].forEach(function (name) { document.addEventListener(name, poke, { passive: true }); });
  // 別のタブから戻ったとき・スリープから戻ったときに表示を合わせる
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { renderTime(); renderStats(); }
    updateWakeLock(); // 画面が暗くならないようにする設定は、タブを離れると外れるので付け直す
  });

  // ---------- ホーム画面に追加 ----------
  var installEvent = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installEvent = e;
    if (!load(INSTALL_KEY, false)) $("install-banner").hidden = false;
  });
  $("install-button").addEventListener("click", function () {
    $("install-banner").hidden = true;
    if (installEvent) installEvent.prompt();
    installEvent = null;
  });
  $("install-dismiss").addEventListener("click", function () {
    $("install-banner").hidden = true;
    save(INSTALL_KEY, true);
  });
  window.addEventListener("appinstalled", function () { $("install-banner").hidden = true; });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // ---------- ほかのタブ・端末のタイマーに合わせる ----------
  // 自分のより新しい（changedAt が大きい）ときだけ入れかえる。入れかえたことは、ほかへは知らせない（行ったり来たりしないように）
  function applyTimer(remote) {
    var next = normalizeTimer(remote);
    if (!next || !(next.changedAt > (timer.changedAt || 0))) return false;
    unschedule();
    timer = next;
    save(TIMER_KEY, timer);
    catchUp();
    render();
    return true;
  }
  // 同じブラウザのほかのタブで操作したとき
  window.addEventListener("storage", function (e) {
    if (e.key !== TIMER_KEY || !e.newValue) return;
    try { applyTimer(JSON.parse(e.newValue)); } catch (x) { /* 読めない値は無視 */ }
  });

  // ---------- ピクチャー イン ピクチャー（残り時間を小さな窓で、ほかのアプリの上に出す） ----------
  //   Document Picture-in-Picture に対応したブラウザ（パソコンの Chrome・Edge など）… 輪と残り時間と、はじめる・一時停止・次へのボタン
  //   それ以外で動画の PiP に対応したブラウザ（Safari・iPhone・iPad・Android など）… 残り時間を描いた動画を小さな窓に出す
  //     （窓の再生・一時停止のボタンで、タイマーをはじめる・一時停止できる）
  var pip = null; // { kind: "document" | "video", win / video, ... }
  var docPipOk = "documentPictureInPicture" in window;
  var videoPipOk = !!(document.pictureInPictureEnabled && HTMLCanvasElement.prototype.captureStream);
  if (docPipOk || videoPipOk) $("pip-button").hidden = false;

  function pipColors() {
    var cs = getComputedStyle(document.body);
    var v = function (name, fb) { return cs.getPropertyValue(name).trim() || fb; };
    return { bg: v("--surface", "#f4fbf8"), fg: v("--on-surface", "#161d1b"), sub: v("--on-surface-variant", "#3f4946"), primary: v("--primary", "#006a60"), track: v("--secondary-container", "#cce8e2") };
  }

  function openPip() {
    if (pip) { closePip(); return; }
    if (docPipOk) openDocumentPip();
    else if (videoPipOk) openVideoPip();
  }

  function openDocumentPip() {
    window.documentPictureInPicture.requestWindow({ width: 280, height: 320 }).then(function (win) {
      var d = win.document;
      // 本体と同じ見た目にする（CSS・フォント・ライト／ダーク）
      [].forEach.call(document.querySelectorAll('link[rel="stylesheet"], style'), function (n) { d.head.appendChild(n.cloneNode(true)); });
      var theme = document.documentElement.getAttribute("data-theme");
      if (theme) d.documentElement.setAttribute("data-theme", theme);
      d.documentElement.lang = document.documentElement.lang;
      d.title = "Nagi";
      d.body.className = "pip-body";
      d.body.innerHTML =
        '<div class="pip">' +
          '<span class="mode-chip pip-chip"><span class="ms" aria-hidden="true" data-pip="icon"></span><span data-pip="mode"></span></span>' +
          '<div class="pip-timer">' +
            '<svg class="ring" viewBox="0 0 240 240" aria-hidden="true"><circle class="ring-track" cx="120" cy="120" r="108"/><circle class="ring-progress" data-pip="ring" cx="120" cy="120" r="108"/></svg>' +
            '<div class="pip-time" data-pip="time"></div>' +
          '</div>' +
          '<div class="pip-controls">' +
            '<button type="button" class="tonal-icon-btn" data-pip="reset"><span class="ms" aria-hidden="true">restart_alt</span></button>' +
            '<button type="button" class="fab pip-fab" data-pip="start"><span class="ms" aria-hidden="true" data-pip="start-icon"></span></button>' +
            '<button type="button" class="tonal-icon-btn" data-pip="skip"><span class="ms" aria-hidden="true">skip_next</span></button>' +
          '</div>' +
        '</div>';
      var q = function (k) { return d.querySelector('[data-pip="' + k + '"]'); };
      q("reset").setAttribute("aria-label", t("リセット")); q("reset").title = t("リセット");
      q("skip").setAttribute("aria-label", t("次へ")); q("skip").title = t("次へ");
      q("start").addEventListener("click", function () { if (timer.running) pause(); else start(); });
      q("reset").addEventListener("click", reset);
      q("skip").addEventListener("click", skip);
      d.addEventListener("keydown", function (e) {
        if (e.code === "Space") { e.preventDefault(); if (timer.running) pause(); else start(); }
      });
      pip = { kind: "document", win: win, q: q, last: "" };
      win.addEventListener("pagehide", function () { if (pip && pip.win === win) { pip = null; renderPipButton(); } });
      // 窓が見えているあいだは、窓の描画のたびに残り時間を合わせる（本体のタブが裏にあって、タイマーが間引かれても止まらない）
      (function loop() {
        if (!pip || pip.win !== win) return;
        renderTime();
        win.requestAnimationFrame(function () { setTimeout(loop, 200); });
      })();
      render();
      renderPipButton();
    }).catch(function () {
      // 窓を開けなかった（ボタンを押した直後でないなど）。動画の PiP が使えれば、そちらで
      if (videoPipOk) openVideoPip();
    });
  }

  // 動画の PiP の用意（Safari は、押したその場で PiP にしないと開けないので、動画は先に作っておく）
  var pipVideo = null;
  function prepareVideoPip() {
    if (pipVideo || !videoPipOk) return pipVideo;
    var canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    var video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    // 画面の外に置く（見えないと PiP にできないブラウザがあるので、display: none にはしない）
    video.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    pipVideo = { canvas: canvas, video: video };
    drawPipCanvas(true, canvas);
    video.srcObject = canvas.captureStream();
    // 窓の再生・一時停止のボタンで、タイマーをはじめる・一時停止する（PiP で出しているときだけ）
    video.addEventListener("play", function () { if (pip && pip.ready && !timer.running) start(); });
    video.addEventListener("pause", function () { if (pip && pip.ready && timer.running && document.pictureInPictureElement === video) pause(); });
    video.addEventListener("leavepictureinpicture", function () { if (pip && pip.kind === "video") closePip(); });
    return pipVideo;
  }

  function openVideoPip() {
    var pv = prepareVideoPip();
    if (!pv) return;
    var video = pv.video;
    pip = { kind: "video", canvas: pv.canvas, video: video, last: "", ready: false };
    drawPipCanvas(true);
    // タブが裏にあっても描き続けるように、時間を数えるのは Worker にまかせる（メインのタイマーは裏で間引かれる）
    try {
      var src = "setInterval(function(){postMessage(0)},250)";
      pip.ticker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
      pip.ticker.onmessage = function () { drawPipCanvas(false); };
    } catch (e) { pip.ticker = null; }
    var mine = pip;
    video.play().catch(function () {});
    // play() を待たずに、押したその場で PiP にする
    video.requestPictureInPicture().then(function () {
      if (pip !== mine) return;
      mine.ready = true;
      renderPipButton();
      render();
    }).catch(function () {
      if (pip !== mine) return;
      closePip();
      toast(t("ピクチャー イン ピクチャーを開けませんでした"));
    });
  }

  function closePip() {
    var p = pip;
    pip = null;
    if (!p) return;
    if (p.kind === "document") {
      try { p.win.close(); } catch (e) { /* もう閉じている */ }
    } else {
      if (p.ticker) p.ticker.terminate();
      if (document.pictureInPictureElement === p.video && document.exitPictureInPicture) document.exitPictureInPicture().catch(function () {});
      p.video.pause();
    }
    renderPipButton();
  }

  function renderPipButton() {
    var on = !!pip;
    $("pip-icon").textContent = on ? "picture_in_picture_off" : "picture_in_picture_alt";
    var label = on ? t("小さな窓を閉じる") : t("小さな窓で表示");
    $("pip-button").setAttribute("aria-label", label);
    $("pip-button").title = label;
  }

  // 残り時間（renderTime から）
  function renderPip(clock, ratio) {
    if (!pip) return;
    if (pip.kind === "document") {
      pip.q("time").textContent = clock;
      pip.q("ring").style.strokeDashoffset = String(RING * (1 - ratio));
    } else {
      drawPipCanvas(false);
    }
  }
  // 種類・動いているか（render から）
  function renderPipState(fresh) {
    if (!pip) return;
    if (pip.kind === "document") {
      var b = pip.win.document.body;
      b.classList.toggle("is-break", timer.mode !== "focus");
      b.classList.toggle("is-running", !!timer.running);
      pip.q("mode").textContent = MODE_LABEL[timer.mode];
      pip.q("icon").textContent = timer.mode === "focus" ? "self_improvement" : "coffee";
      pip.q("start-icon").textContent = timer.running ? "pause" : "play_arrow";
      var label = timer.running ? t("一時停止") : fresh ? t("はじめる") : t("つづける");
      pip.q("start").setAttribute("aria-label", label);
      pip.q("start").title = label;
    } else {
      drawPipCanvas(true);
      // 窓の再生・一時停止のボタンの形を、タイマーに合わせる（イベントが返ってきても、タイマーと同じなので何もしない）
      if (!pip.ready) return;
      var v = pip.video;
      if (timer.running && v.paused) v.play().catch(function () {});
      else if (!timer.running && !v.paused) v.pause();
    }
  }

  // 動画の PiP に出す絵（残り時間・種類・進み具合の線）。秒が変わったときだけ描き直す
  function drawPipCanvas(force, canvas) {
    var p = canvas ? { canvas: canvas } : pip;
    if (!p || !p.canvas) return;
    var rem = remainingMs();
    var clock = formatClock(rem);
    var key = clock + timer.mode + timer.running;
    if (!force && key === p.last) {
      // 止まった絵でも、動画として流れ続けるように 1 秒に 1 回は描く
      if (Date.now() - (p.drawnAt || 0) < 1000) return;
    }
    p.last = key;
    p.drawnAt = Date.now();
    var c = pipColors();
    var g = p.canvas.getContext("2d");
    var W = p.canvas.width, H = p.canvas.height;
    var font = getComputedStyle(document.body).fontFamily;
    g.fillStyle = c.bg;
    g.fillRect(0, 0, W, H);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = c.primary;
    g.font = "700 34px " + font;
    g.fillText(MODE_LABEL[timer.mode] + (timer.running ? "" : " · " + t("一時停止中")), W / 2, 74);
    g.fillStyle = c.fg;
    g.font = "500 150px " + font;
    g.fillText(clock, W / 2, 190);
    // 進み具合（残りの割合）
    var total = totalOf();
    var ratio = total ? Math.min(1, rem / total) : 0;
    var x = 64, y = 300, w = W - 128, h = 14;
    g.fillStyle = c.track;
    roundRect(g, x, y, w, h, h / 2);
    if (ratio > 0) {
      g.fillStyle = c.primary;
      roundRect(g, x, y, Math.max(h, w * ratio), h, h / 2);
    }
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  }
  $("pip-button").addEventListener("click", openPip);
  // Document PiP がないブラウザでは、動画の PiP を先に用意しておく
  if (!docPipOk && videoPipOk) prepareVideoPip();

  // ---------- account.js（同期）とのやり取り ----------
  window.NAGI = {
    t: t,
    toast: toast,
    getSessions: function () { return sessions.slice(); },
    // 同期でまとめた記録を入れる（ID でまとめる。新しいものから SESSIONS_MAX 件）
    mergeSessions: function (list) {
      var byId = {};
      sessions.concat(list || []).forEach(function (x) { if (x && x.i && isFinite(x.s) && isFinite(x.m)) byId[x.i] = { i: String(x.i), s: Number(x.s), m: Number(x.m) }; });
      var merged = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.s - b.s; }).slice(-SESSIONS_MAX);
      var changedAny = merged.length !== sessions.length;
      sessions = merged;
      save(SESSIONS_KEY, sessions);
      renderStats();
      return changedAny;
    },
    getGoal: function () { return { goal: settings.goal, updatedAt: settings.goalUpdatedAt }; },
    // アカウントの目標のほうが新しければ、そちらにする
    setGoal: function (goal, updatedAt) {
      if (!(updatedAt > settings.goalUpdatedAt)) return;
      settings = normalizeSettings(Object.assign({}, settings, { goal: goal, goalUpdatedAt: updatedAt }));
      save(SETTINGS_KEY, settings);
      renderStats();
    },
    onChange: function (fn) { listeners.push(fn); },
    // タイマーの状態（ほかの端末との同期）
    getTimer: function () { return Object.assign({}, timer); },
    applyTimer: applyTimer
  };

  // ---------- 起動 ----------
  // 閉じているあいだに終わっていたら、そこで区切る（自動では次を始めない）
  //   切りかわった時刻は「終わる時刻」にする（そのあとにほかの端末で始めた次の回のほうが新しい、とわかるように）
  function catchUp() {
    if (timer.running && timer.endAt <= Date.now()) {
      if (timer.mode === "focus") record(timer.focusStart || timer.endAt - totalOf(), timer.focusedMs + (timer.endAt - timer.resumedAt));
      var nm = nextMode();
      if (timer.mode !== "focus") timer.round = timer.mode === "long" ? 1 : timer.round + 1;
      setMode(nm, true, timer.endAt);
    } else if (timer.running) {
      schedule();
    } else {
      unschedule();
    }
  }
  catchUp();
  render();
  renderStats();
  // 日付が変わったら、今日の集計を切り替える
  setInterval(renderStats, 60 * 1000);
})();
