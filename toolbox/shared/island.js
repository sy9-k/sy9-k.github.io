// SK's Toolbox のアイランド（タイトルバーの真ん中の小さな島。iPhone の Dynamic Island のように、いま大事なことを 1 つだけ出す）
//   ・パソコンでアプリとして入れ、タイトルバーを Toolbox のものにしたときだけ（/toolbox/shared/titlebar.js の .tbt の中）。
//     スマホやブラウザのタブでは何もしない
//   ・出すもの（上ほど優先）: 届いたお知らせ（数秒だけ大きく）→ 動いているタイマー → ストップウォッチ → いまの授業 →
//     1 時間以内のリマインダー → 次の授業 → 12 時間以内のアラーム → 時刻と日付
//   ・押すと下に広がって、今日のまとめ（授業・Todo・アラーム・タイマー）と、アプリを開くボタンが出る
//   ・読むだけ。データは各アプリが localStorage に保存したもの（sk_clock_tools・sk_timetable・sk_todo）
//   ・内容が変わったら、幅がなめらかに伸び縮みする（動きを減らす設定では動かさない）
//   ・Toolbox の設定の「アイランド」でオフにできる
(function () {
  "use strict";
  var wco = navigator.windowControlsOverlay;
  if (!wco || /[?&]embed\b/.test(location.search) || window.SKIsland) return;

  var root = document.documentElement;
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  function hm(s) { var m = /^(\d{2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dur(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ":" + pad(m) : String(m)) + ":" + pad(s); }
  function reduced() { return root.getAttribute("data-motion") === "reduce" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function enabled() { return !window.SKToolbox || SKToolbox.get().island !== false; }
  var timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  var dateFmt = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", weekday: "short" });

  // ================================================================
  // いまの状態を集める
  // ================================================================
  function timerInfo(now) {
    var tools = readJson("sk_clock_tools") || {};
    var tm = tools.timer, sw = tools.sw, r = {};
    if (tm && tm.running && tm.endAt) {
      var left = Math.max(0, Math.ceil((tm.endAt - now) / 1000));
      r.timer = { left: left, progress: tm.duration ? 1 - left * 1000 / tm.duration : null };
    } else if (tm && !tm.running && tm.remaining > 0 && tm.duration && tm.remaining < tm.duration) {
      r.timer = { left: Math.ceil(tm.remaining / 1000), paused: true, progress: 1 - tm.remaining / tm.duration };
    }
    if (sw && sw.running && sw.start) r.sw = Math.floor(((Number(sw.elapsed) || 0) + now - sw.start) / 1000);
    // 次のアラーム（12 時間以内）
    var d = new Date(now), best = null;
    (Array.isArray(tools.alarms) ? tools.alarms : []).forEach(function (a) {
      if (!a || !a.on) return;
      if (a.snoozeAt && a.snoozeAt > now) { if (!best || a.snoozeAt < best.at) best = { at: a.snoozeAt, label: a.label, snooze: true }; return; }
      var m = hm(a.time);
      if (m === null) return;
      var days = Array.isArray(a.days) ? a.days : [];
      for (var add = 0; add < 2; add++) {
        var at = new Date(d.getFullYear(), d.getMonth(), d.getDate() + add, Math.floor(m / 60), m % 60).getTime();
        if (at <= now) continue;
        if (days.length && days.indexOf(new Date(at).getDay()) < 0) continue;
        if (!best || at < best.at) best = { at: at, label: a.label };
        break;
      }
    });
    if (best && best.at - now <= 12 * 36e5) r.alarm = best;
    return r;
  }
  function classInfo(now) {
    var data = readJson("sk_timetable") || {};
    var tb = data.view && data.view !== "mine" && data.received && data.received[data.view] ? data.received[data.view].table : data.table;
    if (!tb || !tb.cells) return {};
    var d = new Date(now), w = d.getDay(), di = w === 0 ? -1 : w - 1;
    if (di < 0 || di >= (tb.days === 6 ? 6 : 5)) return {};
    var mins = d.getHours() * 60 + d.getMinutes(), r = { list: [] };
    for (var p = 0; p < Math.min(10, tb.periods || 6); p++) {
      var c = tb.cells[di + "-" + p], tm = Array.isArray(tb.times) && tb.times[p] ? tb.times[p] : {};
      if (!c || typeof c.subject !== "string") continue;
      var s = hm(tm.s), e = hm(tm.e);
      var item = { p: p + 1, subject: c.subject, room: c.room || "", color: c.color, s: tm.s, e: tm.e };
      r.list.push(item);
      if (s !== null && e !== null && mins >= s && mins < e) { r.now = item; item.left = e - mins; item.progress = (mins - s) / Math.max(1, e - s); }
      else if (s !== null && mins < s && !r.next) { r.next = item; item.until = s - mins; }
    }
    return r;
  }
  function todoInfo(now) {
    var data = readJson("sk_todo") || {};
    var today = ymd(new Date(now)), r = { count: 0 };
    (Array.isArray(data.tasks) ? data.tasks : []).forEach(function (x) {
      if (!x || x.done || x.parent || !x.due || x.due > today) return;
      r.count++;
      if (x.due === today && x.time) {
        var at = new Date(x.due + "T" + x.time + ":00").getTime();
        if (at >= now - 5 * 6e4 && at - now <= 60 * 6e4 && (!r.soon || at < r.soon.at)) r.soon = { at: at, text: x.text, id: x.id };
      }
    });
    return r;
  }

  // いちばん大事なものを 1 つ
  var flash = null;
  function current() {
    var now = Date.now();
    if (flash && now < flash.until) return { key: "flash", icon: flash.icon || "notifications_active", text: flash.text, color: flash.color || "#ED93B1", wide: true };
    var tm = timerInfo(now), cl = classInfo(now), td = todoInfo(now);
    if (tm.timer) return { key: "timer", icon: tm.timer.paused ? "pause_circle" : "hourglass_top", text: dur(tm.timer.left), sub: tm.timer.paused ? t("一時停止") : t("タイマー"), progress: tm.timer.progress, color: "#F0997B", href: "/toolbox/clock/#timer" };
    if (tm.sw !== undefined) return { key: "sw", icon: "timer", text: dur(tm.sw), sub: t("ストップウォッチ"), color: "#85B7EB", href: "/toolbox/clock/#stopwatch" };
    if (cl.now) return { key: "class", icon: "school", text: t("{p} 限 {subject}", { p: cl.now.p, subject: cl.now.subject }), sub: t("あと {n} 分", { n: cl.now.left }), progress: cl.now.progress, color: cl.now.color || "#5DCAA5", href: "/toolbox/timetable/" };
    if (td.soon) return { key: "todo", icon: "notifications", text: td.soon.text, sub: timeFmt.format(new Date(td.soon.at)), color: "#97C459", href: "/toolbox/todo/#task-" + encodeURIComponent(td.soon.id) };
    if (cl.next) return { key: "next", icon: "school", text: t("次 {p} 限 {subject}", { p: cl.next.p, subject: cl.next.subject }), sub: cl.next.s || "", color: cl.next.color || "#5DCAA5", href: "/toolbox/timetable/" };
    if (tm.alarm) return { key: "alarm", icon: tm.alarm.snooze ? "snooze" : "alarm", text: timeFmt.format(new Date(tm.alarm.at)), sub: tm.alarm.label || (tm.alarm.snooze ? t("スヌーズ") : t("アラーム")), color: "#FAC775", href: "/toolbox/clock/#alarm" };
    return { key: "time", icon: null, text: timeFmt.format(new Date(now)), sub: dateFmt.format(new Date(now)) };
  }

  // ================================================================
  // 島
  // ================================================================
  var box = null, pill, iconEl, textEl, subEl, barEl, panel, lastKey = "", ticking = null, open = false;
  function build(bar) {
    box = el("div", "isl");
    pill = el("button", "isl__pill");
    pill.type = "button";
    pill.setAttribute("aria-expanded", "false");
    pill.setAttribute("aria-controls", "isl-panel");
    pill.setAttribute("aria-label", t("アイランド（押すと今日のまとめ）"));
    iconEl = icon("schedule");
    iconEl.classList.add("isl__icon");
    textEl = el("span", "isl__text");
    subEl = el("span", "isl__sub");
    barEl = el("span", "isl__bar");
    barEl.appendChild(el("i"));
    pill.append(iconEl, textEl, subEl, barEl);
    panel = el("div", "isl__panel");
    panel.id = "isl-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("今日のまとめ"));
    box.append(pill, panel);
    bar.appendChild(box);
    pill.addEventListener("click", function () { setOpen(!open); });
    document.addEventListener("pointerdown", function (e) { if (open && !box.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { setOpen(false); pill.focus(); } });
    paint(true);
  }

  // 幅を、前の幅から新しい幅へなめらかに
  function morph(fn) {
    var before = pill.getBoundingClientRect().width;
    fn();
    if (reduced() || !pill.animate) return;
    var after = pill.getBoundingClientRect().width;
    // 見えていなかった（幅 0）ときや、変わらないときは動かさない
    if (before < 1 || after < 1 || Math.abs(after - before) < 1) return;
    pill.animate([{ width: before + "px" }, { width: after + "px" }], { duration: 420, easing: "cubic-bezier(.34, 1.36, .64, 1)" });
  }
  function paint(force) {
    if (!box) return;
    var st = current();
    var changed = st.key !== lastKey;
    function apply() {
      box.dataset.kind = st.key;
      box.style.setProperty("--isl-c", st.color || "#ffffff");
      iconEl.hidden = !st.icon;
      if (st.icon) iconEl.textContent = st.icon;
      textEl.textContent = st.text;
      subEl.textContent = st.sub || "";
      subEl.hidden = !st.sub;
      barEl.hidden = typeof st.progress !== "number";
      if (typeof st.progress === "number") barEl.firstChild.style.width = Math.round(Math.max(0, Math.min(1, st.progress)) * 100) + "%";
    }
    if (changed || force) { morph(apply); lastKey = st.key; }
    else apply();
    if (open) renderPanel();
  }

  // 広げたとき: 今日のまとめ
  function go(href) { location.href = href; }
  function row(iconName, title, sub, color, href) {
    var r = el(href ? "a" : "div", "isl-row");
    if (href) r.href = href;
    var ic = icon(iconName);
    if (color) ic.style.color = color;
    var tx = el("span", "isl-row__text");
    tx.appendChild(el("b", "", title));
    if (sub) tx.appendChild(el("small", "", sub));
    r.append(ic, tx);
    return r;
  }
  function renderPanel() {
    var now = Date.now(), tm = timerInfo(now), cl = classInfo(now), td = todoInfo(now);
    panel.textContent = "";
    var head = el("div", "isl-panel__head");
    head.append(el("b", "", timeFmt.format(new Date(now))), el("span", "", dateFmt.format(new Date(now))));
    panel.appendChild(head);
    if (tm.timer) panel.appendChild(row(tm.timer.paused ? "pause_circle" : "hourglass_top", dur(tm.timer.left), tm.timer.paused ? t("タイマー（一時停止）") : t("タイマー"), "#F0997B", "/toolbox/clock/#timer"));
    if (tm.sw !== undefined) panel.appendChild(row("timer", dur(tm.sw), t("ストップウォッチ"), "#85B7EB", "/toolbox/clock/#stopwatch"));
    if (cl.now) panel.appendChild(row("school", t("{p} 限 {subject}", { p: cl.now.p, subject: cl.now.subject }), [t("いま · あと {n} 分", { n: cl.now.left }), cl.now.room].filter(Boolean).join(" · "), cl.now.color, "/toolbox/timetable/"));
    if (cl.next) panel.appendChild(row("schedule", t("次 {p} 限 {subject}", { p: cl.next.p, subject: cl.next.subject }), [cl.next.s ? t("{time} から", { time: cl.next.s }) : "", cl.next.room].filter(Boolean).join(" · "), cl.next.color, "/toolbox/timetable/"));
    if (td.soon) panel.appendChild(row("notifications", td.soon.text, timeFmt.format(new Date(td.soon.at)), "#97C459", "/toolbox/todo/#task-" + encodeURIComponent(td.soon.id)));
    panel.appendChild(row("checklist", td.count ? t("今日の Todo {n} 件", { n: td.count }) : t("今日の Todo はありません"), td.count ? t("期限切れを含みます") : "", "#97C459", "/toolbox/todo/"));
    if (tm.alarm) panel.appendChild(row(tm.alarm.snooze ? "snooze" : "alarm", timeFmt.format(new Date(tm.alarm.at)), tm.alarm.label || t("次のアラーム"), "#FAC775", "/toolbox/clock/#alarm"));
    if (!cl.now && !cl.next && cl.list && cl.list.length) panel.appendChild(row("event_available", t("今日の授業は終わりました"), "", "#5DCAA5", "/toolbox/timetable/"));
    var apps = el("div", "isl-panel__apps");
    [["schedule", "Clock", "/toolbox/clock/"], ["school", "Timetable", "/toolbox/timetable/"], ["checklist", "Todo", "/toolbox/todo/"]].forEach(function (a) {
      var b = el("button", "isl-app");
      b.type = "button";
      b.append(icon(a[0]), el("span", "", a[1]));
      b.addEventListener("click", function () { go(a[2]); });
      apps.appendChild(b);
    });
    panel.appendChild(apps);
  }
  function setOpen(v) {
    open = v;
    pill.setAttribute("aria-expanded", String(v));
    box.classList.toggle("is-open", v);
    if (v) { renderPanel(); panel.hidden = false; }
    else panel.hidden = true;
  }

  // 届いたお知らせ（リマインダー・アラーム・SK Hub のお知らせ）を数秒だけ大きく
  function showFlash(detail) {
    if (!detail || !detail.text) return;
    flash = { text: String(detail.text).slice(0, 80), icon: detail.icon, color: detail.color, until: Date.now() + 6000 };
    paint(true);
    if (box && !reduced()) { box.classList.remove("is-flash"); void box.offsetWidth; box.classList.add("is-flash"); }
    setTimeout(function () { paint(true); }, 6100);
  }
  document.addEventListener("skreminder", function (e) { showFlash({ text: e.detail && e.detail.text, icon: "notifications_active" }); });
  document.addEventListener("sk-island-flash", function (e) { showFlash(e.detail); });

  // ================================================================
  // はじめ（タイトルバーが出ているあいだだけ動かす）
  // ================================================================
  function start() {
    if (ticking || !box) return;
    paint(true);
    ticking = setInterval(function () { if (document.visibilityState === "visible") paint(false); }, 1000);
  }
  function stop() { clearInterval(ticking); ticking = null; if (open) setOpen(false); }
  function sync() {
    var on = enabled() && wco.visible;
    if (box) box.hidden = !enabled();
    if (on) start(); else stop();
  }
  function mount() {
    var bar = document.querySelector(".tbt");
    if (!bar) return false;
    build(bar);
    sync();
    wco.addEventListener("geometrychange", sync);
    if (window.SKToolbox) SKToolbox.onChange(sync);
    window.addEventListener("storage", function (e) { if (/^sk_(clock_tools|timetable|todo)$/.test(e.key || "")) paint(true); });
    return true;
  }
  // タイトルバー（titlebar.js が <body> の最初に入れる）ができたら
  if (!(document.body && mount())) {
    new MutationObserver(function (m, obs) { if (mount()) obs.disconnect(); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.SKIsland = { flash: showFlash };
})();
