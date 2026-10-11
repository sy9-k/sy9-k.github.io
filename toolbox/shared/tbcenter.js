// SK's Toolbox のタイトルバーの真ん中（パソコンでアプリとして入れ、タイトルバーを Toolbox のものにしたときだけ。/toolbox/shared/titlebar.js の .tbt の中）
//   スマホやブラウザのタブでは何もしない。どれを出すかは Toolbox の設定の「タイトルバー」（settings.titlebar.center）で選ぶ
//     island   … アイランド: いま大事なことを 1 つ。押すと下に広がって今日のまとめ
//     command  … コマンドバー: 検索欄の形。次の予定を薄く出し、押すと検索・コマンド（/toolbox/shared/search.js。⌘K と同じ）
//     chips    … ステータスチップ: 授業・Todo・アラーム・タイマーを小さい札で並べる（中身は settings.titlebar.chips）
//     ticker   … ティッカー: 1 行の文字が数秒ごとに入れ替わる
//     timeline … 今日のタイムライン: 今日の授業を色の帯で並べ、「今」の線が動く。下のふちに今の授業の進み具合
//     tabs     … アプリのタブ: アプリを名前で並べる（アイコンとアプリ名・アプリの切りかえの代わり）
//     menu     … メニューバー（「ファイル」「編集」…。作るのは /toolbox/shared/titlebar.js）
//     none     … 何も出さない
//   読むだけ。データは各アプリが localStorage に保存したもの（sk_clock_tools・sk_timetable・sk_todo）
//   リマインダー・アラーム・SK Hub のお知らせ・新しい版は、数秒だけ目立たせる（sk-island-flash / skreminder）
(function () {
  "use strict";
  var wco = navigator.windowControlsOverlay;
  if (!wco || /[?&]embed\b/.test(location.search) || window.SKTitlebarCenter) return;

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
  function conf() { var s = window.SKToolbox ? SKToolbox.get().titlebar : null; return s || { center: "command", chips: ["class", "todo", "alarm", "timer"] }; }
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
  // 今日の時間割（特別な日程（試験・休みなど）の日は、その日程。/toolbox/timetable/timetable.js と同じ決まり）
  function classInfo(now) {
    var data = readJson("sk_timetable") || {};
    var tb = data.view && data.view !== "mine" && data.received && data.received[data.view] ? data.received[data.view].table : data.table;
    if (!tb || !tb.cells) return {};
    var d = new Date(now), w = d.getDay(), di = w === 0 ? -1 : w - 1, ds = ymd(d), sp = null;
    (Array.isArray(tb.special) ? tb.special : []).forEach(function (x) { if (x && ds >= x.from && ds <= x.to) sp = x; });
    var day = sp ? (sp.days && sp.days[ds]) || { type: sp.kind === "off" ? "off" : "normal" } : null;
    var slots = [];
    if (day && day.type === "off") return { special: sp.name, off: true, list: [], periods: [] };
    if (day && day.type === "custom") {
      (Array.isArray(day.slots) ? day.slots : []).forEach(function (x, i) { slots.push({ p: i + 1, s: x.s, e: x.e, cell: x && typeof x.subject === "string" ? x : null }); });
    } else {
      if (di < 0 || di >= (tb.days === 6 ? 6 : 5)) return {};
      for (var p = 0; p < Math.min(10, tb.periods || 6); p++) {
        var tm = Array.isArray(tb.times) && tb.times[p] ? tb.times[p] : {}, c = tb.cells[di + "-" + p];
        slots.push({ p: p + 1, s: tm.s, e: tm.e, cell: c && typeof c.subject === "string" ? c : null });
      }
    }
    var mins = d.getHours() * 60 + d.getMinutes(), r = { list: [], periods: [], special: sp ? sp.name : "" };
    slots.forEach(function (sl) {
      var s = hm(sl.s), e = hm(sl.e), c = sl.cell;
      r.periods.push({ p: sl.p, s: s, e: e, cell: c });
      if (!c) return;
      var item = { p: sl.p, subject: c.subject, room: c.room || "", color: c.color, s: sl.s, e: sl.e };
      r.list.push(item);
      if (s !== null && e !== null && mins >= s && mins < e) { r.now = item; item.left = e - mins; item.progress = (mins - s) / Math.max(1, e - s); }
      else if (s !== null && mins < s && !r.next) { r.next = item; item.until = s - mins; }
    });
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

  // 出せるものを、大事な順にすべて（ティッカー・チップ用）。kind: timer / class / todo / alarm / time
  function items() {
    var now = Date.now(), tm = timerInfo(now), cl = classInfo(now), td = todoInfo(now), out = [];
    if (tm.timer) out.push({ key: "timer", kind: "timer", icon: tm.timer.paused ? "pause_circle" : "hourglass_top", text: dur(tm.timer.left), sub: tm.timer.paused ? t("一時停止") : t("タイマー"), progress: tm.timer.progress, color: "#F0997B", href: "/toolbox/clock/#timer" });
    if (tm.sw !== undefined) out.push({ key: "sw", kind: "timer", icon: "timer", text: dur(tm.sw), sub: t("ストップウォッチ"), color: "#85B7EB", href: "/toolbox/clock/#stopwatch" });
    if (cl.now) out.push({ key: "class", kind: "class", icon: "school", text: t("{p} 限 {subject}", { p: cl.now.p, subject: cl.now.subject }), sub: t("あと {n} 分", { n: cl.now.left }), progress: cl.now.progress, color: cl.now.color || "#5DCAA5", href: "/toolbox/timetable/" });
    if (td.soon) out.push({ key: "todo-soon", kind: "todo", icon: "notifications", text: td.soon.text, sub: timeFmt.format(new Date(td.soon.at)), color: "#97C459", href: "/toolbox/todo/#task-" + encodeURIComponent(td.soon.id) });
    if (cl.next) out.push({ key: "next", kind: "class", icon: "school", text: t("次 {p} 限 {subject}", { p: cl.next.p, subject: cl.next.subject }), sub: cl.next.s || "", color: cl.next.color || "#5DCAA5", href: "/toolbox/timetable/" });
    if (td.count && !td.soon) out.push({ key: "todo", kind: "todo", icon: "checklist", text: t("Todo {n} 件", { n: td.count }), sub: t("今日"), color: "#97C459", href: "/toolbox/todo/" });
    if (tm.alarm) out.push({ key: "alarm", kind: "alarm", icon: tm.alarm.snooze ? "snooze" : "alarm", text: timeFmt.format(new Date(tm.alarm.at)), sub: tm.alarm.label || (tm.alarm.snooze ? t("スヌーズ") : t("アラーム")), color: "#FAC775", href: "/toolbox/clock/#alarm" });
    out.push({ key: "time", kind: "time", icon: null, text: timeFmt.format(new Date(now)), sub: dateFmt.format(new Date(now)) });
    return out;
  }
  var flash = null;
  function flashItem() { return flash && Date.now() < flash.until ? { key: "flash", kind: "flash", icon: flash.icon || "notifications_active", text: flash.text, color: flash.color || "#ED93B1" } : null; }

  // ================================================================
  // 共通: 内容が変わったら幅をなめらかに
  // ================================================================
  function morph(node, fn) {
    var before = node.getBoundingClientRect().width;
    fn();
    if (reduced() || !node.animate) return;
    var after = node.getBoundingClientRect().width;
    if (before < 1 || after < 1 || Math.abs(after - before) < 1) return;
    node.animate([{ width: before + "px" }, { width: after + "px" }], { duration: 420, easing: "cubic-bezier(.34, 1.36, .64, 1)" });
  }
  function go(href) { location.href = href; }

  // ================================================================
  // 各モード
  // ================================================================
  var bar = null, slot = null, mode = "", view = null;

  // ---- アイランド ----
  function makeIsland() {
    var box = el("div", "isl"), pill = el("button", "isl__pill"), panel = el("div", "isl__panel");
    pill.type = "button";
    pill.setAttribute("aria-expanded", "false");
    pill.setAttribute("aria-label", t("アイランド（押すと今日のまとめ）"));
    var ic = icon("schedule"); ic.classList.add("isl__icon");
    var tx = el("span", "isl__text"), sub = el("span", "isl__sub"), pr = el("span", "isl__bar");
    pr.appendChild(el("i"));
    pill.append(ic, tx, sub, pr);
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("今日のまとめ"));
    box.append(pill, panel);
    var open = false, lastKey = "";
    function setOpen(v) { open = v; pill.setAttribute("aria-expanded", String(v)); box.classList.toggle("is-open", v); panel.hidden = !v; if (v) panelRender(); }
    pill.addEventListener("click", function () { setOpen(!open); });
    function onDown(e) { if (open && !box.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape" && open) { setOpen(false); pill.focus(); } }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    function panelRender() {
      var now = Date.now(), tm = timerInfo(now), cl = classInfo(now), td = todoInfo(now);
      panel.textContent = "";
      var head = el("div", "isl-panel__head");
      head.append(el("b", "", timeFmt.format(new Date(now))), el("span", "", dateFmt.format(new Date(now))));
      panel.appendChild(head);
      function row(iconName, title, s, color, href) {
        var r = el("a", "isl-row"); r.href = href;
        var i = icon(iconName); if (color) i.style.color = color;
        var x = el("span", "isl-row__text"); x.appendChild(el("b", "", title)); if (s) x.appendChild(el("small", "", s));
        r.append(i, x); panel.appendChild(r);
      }
      if (tm.timer) row(tm.timer.paused ? "pause_circle" : "hourglass_top", dur(tm.timer.left), tm.timer.paused ? t("タイマー（一時停止）") : t("タイマー"), "#F0997B", "/toolbox/clock/#timer");
      if (tm.sw !== undefined) row("timer", dur(tm.sw), t("ストップウォッチ"), "#85B7EB", "/toolbox/clock/#stopwatch");
      if (cl.now) row("school", t("{p} 限 {subject}", { p: cl.now.p, subject: cl.now.subject }), [t("いま · あと {n} 分", { n: cl.now.left }), cl.now.room].filter(Boolean).join(" · "), cl.now.color, "/toolbox/timetable/");
      if (cl.next) row("schedule", t("次 {p} 限 {subject}", { p: cl.next.p, subject: cl.next.subject }), [cl.next.s ? t("{time} から", { time: cl.next.s }) : "", cl.next.room].filter(Boolean).join(" · "), cl.next.color, "/toolbox/timetable/");
      if (td.soon) row("notifications", td.soon.text, timeFmt.format(new Date(td.soon.at)), "#97C459", "/toolbox/todo/#task-" + encodeURIComponent(td.soon.id));
      row("checklist", td.count ? t("今日の Todo {n} 件", { n: td.count }) : t("今日の Todo はありません"), td.count ? t("期限切れを含みます") : "", "#97C459", "/toolbox/todo/");
      if (tm.alarm) row(tm.alarm.snooze ? "snooze" : "alarm", timeFmt.format(new Date(tm.alarm.at)), tm.alarm.label || t("次のアラーム"), "#FAC775", "/toolbox/clock/#alarm");
      var apps = el("div", "isl-panel__apps");
      [["schedule", "Clock", "/toolbox/clock/"], ["school", "Timetable", "/toolbox/timetable/"], ["checklist", "Todo", "/toolbox/todo/"]].forEach(function (a) {
        var b = el("button", "isl-app"); b.type = "button";
        b.append(icon(a[0]), el("span", "", a[1]));
        b.addEventListener("click", function () { go(a[2]); });
        apps.appendChild(b);
      });
      panel.appendChild(apps);
    }
    return {
      node: box,
      paint: function (force) {
        var st = flashItem() || items()[0];
        function apply() {
          box.dataset.kind = st.key;
          box.style.setProperty("--isl-c", st.color || "#ffffff");
          ic.hidden = !st.icon; if (st.icon) ic.textContent = st.icon;
          tx.textContent = st.text;
          sub.textContent = st.sub || ""; sub.hidden = !st.sub;
          pr.hidden = typeof st.progress !== "number";
          if (typeof st.progress === "number") pr.firstChild.style.width = Math.round(Math.max(0, Math.min(1, st.progress)) * 100) + "%";
        }
        if (force || st.key !== lastKey) { morph(pill, apply); lastKey = st.key; } else apply();
        if (open) panelRender();
      },
      pop: function () { if (!reduced()) { box.classList.remove("is-flash"); void box.offsetWidth; box.classList.add("is-flash"); } },
      destroy: function () { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); }
    };
  }

  // ---- コマンドバー ----
  function makeCommand() {
    var b = el("button", "tbc-cmd");
    b.type = "button";
    b.setAttribute("aria-label", t("検索・コマンド（⌘K）"));
    var tx = el("span", "tbc-cmd__text");
    var kbd = el("kbd", "tbc-cmd__kbd", /Mac/.test(navigator.platform) ? "⌘K" : "Ctrl K");
    b.append(icon("search"), tx, kbd);
    b.addEventListener("click", function () { if (window.SKSearch) SKSearch.open(); });
    return {
      node: b,
      paint: function () {
        var f = flashItem();
        b.classList.toggle("is-flash", !!f);
        if (f) { tx.textContent = f.text; return; }
        var list = items().filter(function (x) { return x.kind !== "time"; });
        var first = list[0];
        tx.textContent = (first ? first.text + (first.sub ? " · " + first.sub : "") + " · " : "") + t("検索・コマンド");
      }
    };
  }

  // ---- ステータスチップ ----
  function makeChips() {
    var box = el("div", "tbc-chips"), last = "";
    return {
      node: box,
      paint: function () {
        var want = conf().chips || ["class", "todo", "alarm", "timer"];
        var list = items().filter(function (x) { return x.kind !== "time" && want.indexOf(x.kind) >= 0; });
        // 種類ごとに 1 つ（授業は「いま」があれば「次」は出さない）
        var seen = {};
        list = list.filter(function (x) { if (seen[x.kind]) return false; seen[x.kind] = 1; return true; });
        // 並びは設定の順（出たり消えたりしても、場所が入れかわらないように）
        list.sort(function (a, b) { return want.indexOf(a.kind) - want.indexOf(b.kind); });
        var f = flashItem();
        if (f) list.unshift(f);
        if (!list.length) list = [items().pop()];
        var sig = list.map(function (x) { return x.key + x.text + (x.sub || ""); }).join("|");
        if (sig === last) return;
        last = sig;
        box.textContent = "";
        list.slice(0, 4).forEach(function (x) {
          var c = el(x.href ? "a" : "span", "tbc-chip" + (x.kind === "flash" ? " is-flash" : ""));
          if (x.href) c.href = x.href;
          c.style.setProperty("--c", x.color || "currentColor");
          if (x.icon) c.appendChild(icon(x.icon));
          c.appendChild(el("span", "", x.kind === "todo" && x.key === "todo" ? String(todoInfo(Date.now()).count) : x.text));
          if (x.kind === "class" && x.key === "class" && x.sub) c.appendChild(el("small", "", x.sub));
          c.title = x.text + (x.sub ? " · " + x.sub : "");
          box.appendChild(c);
        });
      }
    };
  }

  // ---- ティッカー ----
  function makeTicker() {
    var b = el("button", "tbc-ticker"), line = el("span", "tbc-ticker__line");
    b.type = "button";
    b.appendChild(line);
    var idx = 0, shownKey = "", lastTurn = Date.now(), cur = null;
    b.addEventListener("click", function () { if (cur && cur.href) go(cur.href); });
    function show(x, animate) {
      cur = x;
      var n = el("span", "tbc-ticker__item" + (animate && !reduced() ? " is-in" : ""));
      if (x.icon) { var i = icon(x.icon); i.style.color = x.color || ""; n.appendChild(i); }
      n.appendChild(el("span", "", x.text));
      if (x.sub) n.appendChild(el("small", "", x.sub));
      line.textContent = "";
      line.appendChild(n);
    }
    return {
      node: b,
      paint: function () {
        var f = flashItem();
        var list = f ? [f] : items();
        if (list.length > 1) list = list.filter(function (x) { return x.kind !== "time"; }).concat([list[list.length - 1]]);
        var now = Date.now();
        if (now - lastTurn >= 4000 || f) { idx = f ? 0 : (idx + 1) % list.length; lastTurn = now; }
        var x = list[idx % list.length];
        var key = x.key + (f ? "f" : "");
        if (key !== shownKey) { show(x, true); shownKey = key; }
        else show(x, false);
      }
    };
  }

  // ---- 今日のタイムライン ----
  function makeTimeline() {
    var box = el("a", "tbc-tl"), track = el("span", "tbc-tl__track"), label = el("span", "tbc-tl__label"), progress = el("span", "tbc-tl__progress");
    box.href = "/toolbox/timetable/";
    box.append(track, label);
    var lastSig = "";
    return {
      node: box,
      extra: progress,
      paint: function () {
        var now = Date.now(), cl = classInfo(now), f = flashItem();
        var ps = (cl.periods || []).filter(function (p) { return p.s !== null && p.e !== null; });
        if (!ps.length || !cl.list.length) {
          track.hidden = true;
          label.textContent = f ? f.text : (cl.special ? cl.special + (cl.off ? " · " + t("休み") : "") + " · " : "") + timeFmt.format(new Date(now)) + " · " + dateFmt.format(new Date(now));
          progress.style.width = "0";
          return;
        }
        track.hidden = false;
        var start = ps[0].s, end = ps[ps.length - 1].e, span = Math.max(1, end - start);
        var sig = ps.map(function (p) { return p.p + ":" + (p.cell ? p.cell.color : "-"); }).join(",");
        if (sig !== lastSig) {
          lastSig = sig;
          track.textContent = "";
          ps.forEach(function (p) {
            var seg = el("i", "tbc-tl__seg" + (p.cell ? "" : " is-empty"));
            seg.style.left = ((p.s - start) / span * 100) + "%";
            seg.style.width = ((p.e - p.s) / span * 100) + "%";
            if (p.cell) seg.style.background = p.cell.color || "#5DCAA5";
            seg.title = t("{p} 限", { p: p.p }) + (p.cell ? " " + p.cell.subject : "");
            track.appendChild(seg);
          });
          track.appendChild(el("b", "tbc-tl__now"));
        }
        var d = new Date(now), mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
        var pos = Math.max(0, Math.min(1, (mins - start) / span));
        track.querySelector(".tbc-tl__now").style.left = (pos * 100) + "%";
        label.textContent = f ? f.text : cl.now ? t("{p} 限 {subject}", { p: cl.now.p, subject: cl.now.subject }) + " · " + t("あと {n} 分", { n: cl.now.left })
          : cl.next ? t("次 {p} 限 {subject}", { p: cl.next.p, subject: cl.next.subject }) + " · " + cl.next.s
            : t("今日の授業は終わりました");
        progress.style.width = cl.now ? Math.round(cl.now.progress * 100) + "%" : "0";
        progress.style.background = cl.now ? (cl.now.color || "#5DCAA5") : "transparent";
      }
    };
  }

  // ---- アプリのタブ ----
  var TABS = [["/toolbox/", "Toolbox"], ["/toolbox/clock/", "Clock"], ["/toolbox/todo/", "Todo"], ["/toolbox/memo/", "Memo"], ["/toolbox/calc/", "Calc"], ["/toolbox/countdown/", "Countdown"], ["/toolbox/timetable/", "Timetable"], ["/toolbox/roulette/", "Roulette"]];
  function makeTabs() {
    var nav = el("nav", "tbc-tabs");
    nav.setAttribute("aria-label", t("アプリの切りかえ"));
    var path = location.pathname, curPath = "/toolbox/";
    TABS.forEach(function (x) { if (x[0] !== "/toolbox/" && path.indexOf(x[0]) === 0) curPath = x[0]; });
    if (path.indexOf("/toolbox/settings/") === 0) curPath = "";
    TABS.forEach(function (x) {
      var a = el("a", "tbc-tab", x[0] === "/toolbox/" ? t("ホーム") : x[1]);
      a.href = x[0];
      if (x[0] === curPath) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
    return { node: nav, paint: function () {}, tabs: true };
  }

  var MAKERS = { island: makeIsland, command: makeCommand, chips: makeChips, ticker: makeTicker, timeline: makeTimeline, tabs: makeTabs };

  // ================================================================
  // 組み立て・切りかえ
  // ================================================================
  var ticking = null;
  function setMode(m) {
    if (view && view.destroy) view.destroy();
    if (view && view.extra) view.extra.remove();
    if (view && view.node) view.node.remove(); // アプリのタブは .tbc の外（帯の左）にある
    slot.textContent = "";
    bar.classList.remove("tbt--tabs", "tbt--chips", "tbt--tight");
    view = null;
    mode = MAKERS[m] || m === "menu" ? m : "none"; // メニューバーは /toolbox/shared/titlebar.js が出す
    bar.dataset.center = mode;
    if (!MAKERS[mode]) return;
    view = MAKERS[mode]();
    if (view.tabs) { bar.classList.add("tbt--tabs"); bar.insertBefore(view.node, bar.firstChild); }
    else {
      if (mode === "chips") bar.classList.add("tbt--chips");
      slot.appendChild(view.node);
    }
    if (view.extra) bar.appendChild(view.extra);
    view.paint(true);
    fit();
  }
  function tick() { if (view && document.visibilityState === "visible") { view.paint(false); fit(); } }
  // メニューバー（左）と重なるなら、真ん中ではなく右に寄せる
  function fit() {
    var mb = bar.querySelector(".tbt-menubar"), tight = false;
    if (mb && mb.offsetWidth && slot.offsetWidth) {
      var r = bar.getBoundingClientRect();
      tight = r.left + r.width / 2 - slot.offsetWidth / 2 < mb.getBoundingClientRect().right + 12;
    }
    bar.classList.toggle("tbt--tight", tight);
  }
  function sync() {
    var want = conf().center || "command";
    if (want !== mode) setMode(want);
    var on = wco.visible && !!MAKERS[mode];
    if (on && !ticking) { tick(); ticking = setInterval(tick, 1000); }
    else if (!on && ticking) { clearInterval(ticking); ticking = null; }
  }
  function showFlash(detail) {
    if (!detail || !detail.text) return;
    flash = { text: String(detail.text).slice(0, 80), icon: detail.icon, color: detail.color, until: Date.now() + 6000 };
    if (view) { view.paint(true); if (view.pop) view.pop(); }
    setTimeout(function () { if (view) view.paint(true); }, 6100);
  }
  document.addEventListener("skreminder", function (e) { showFlash({ text: e.detail && e.detail.text, icon: "notifications_active" }); });
  document.addEventListener("sk-island-flash", function (e) { showFlash(e.detail); });

  function mount() {
    bar = document.querySelector(".tbt");
    if (!bar) return false;
    slot = el("div", "tbc");
    bar.appendChild(slot);
    sync();
    wco.addEventListener("geometrychange", sync);
    if (window.SKToolbox) SKToolbox.onChange(function () { var before = mode; sync(); if (view && before === mode) view.paint(true); requestAnimationFrame(fit); });
    window.addEventListener("resize", function () { requestAnimationFrame(fit); });
    window.addEventListener("storage", function (e) { if (view && /^sk_(clock_tools|timetable|todo)$/.test(e.key || "")) view.paint(true); });
    return true;
  }
  if (!(document.body && mount())) {
    new MutationObserver(function (m, obs) { if (mount()) obs.disconnect(); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.SKTitlebarCenter = { flash: showFlash };
  window.SKIsland = window.SKTitlebarCenter;
})();
