// Timetable（SK's Toolbox）— 時間割
//   ・自分の時間割は localStorage の sk_timetable に保存する（オンライン同期をオンにしたときだけ、暗号化して SK Hub Systems アカウントにも保存する。/toolbox/shared/sync.js）
//       { version: 1, view: "mine" | 配信された時間割の ID,
//         table: { name, days: 5|6, periods: 1〜10, times: [{ s: "HH:MM", e: "HH:MM" }], cells: { "曜日-時限": { subject, room, teacher, note, color } },
//                  updated, share: { tid, title, publishedAt } },        … share は管理者が配信したとき
//         received: { ID: { title, table, updatedAt, fetchedAt } } }     … 配信された時間割（見るだけ。端末に置いておき、オフラインでも見られる）
//   ・曜日は 0 = 月曜。いまの授業・次の授業は、時限の時刻から出す
//   ・クラスの時間割の配信（/toolbox/timetable/share.js）
//       管理者（SK Hub Systems の開発者）が、メールアドレスを入れて自分の時間割を配信する。受け取る人は、そのメールアドレスの
//       SK Hub Systems アカウントでログインすると、配信された時間割が出る（見るだけ。返事などはない）
//   ・コマの「Todo に追加」で、次にその授業がある日を期限にした宿題のタスクを作る（/toolbox/shared/remind.js）
//   ・?embed のときは見本の時間割を表示だけする
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
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function str(v, max) { return typeof v === "string" ? v.slice(0, max) : ""; }
  function minutes(hm) { var m = /^(\d{2}):(\d{2})$/.exec(hm || ""); return m ? +m[1] * 60 + +m[2] : null; }

  var COLORS = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#0d9488", "#334155"];
  var DEFAULT_TIMES = [["08:50", "09:40"], ["09:50", "10:40"], ["10:50", "11:40"], ["11:50", "12:40"], ["13:30", "14:20"], ["14:30", "15:20"], ["15:30", "16:20"], ["16:30", "17:20"], ["17:30", "18:20"], ["18:30", "19:20"]];
  // 曜日の名前（月〜土。2026-01-05 は月曜日）
  var dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  var DAY_NAMES = [0, 1, 2, 3, 4, 5].map(function (i) { return dayFmt.format(new Date(2026, 0, 5 + i)); });

  // ================================================================
  // データ
  // ================================================================
  var STORE = "sk_timetable";
  function cleanTable(x) {
    x = x && typeof x === "object" ? x : {};
    var days = x.days === 6 ? 6 : 5;
    var periods = Math.max(1, Math.min(10, Math.round(Number(x.periods)) || 6));
    var times = [];
    for (var p = 0; p < 10; p++) {
      var tm = Array.isArray(x.times) && x.times[p] ? x.times[p] : null;
      var s = tm && minutes(tm.s) !== null ? tm.s : DEFAULT_TIMES[p][0];
      var e = tm && minutes(tm.e) !== null ? tm.e : DEFAULT_TIMES[p][1];
      times.push({ s: s, e: e });
    }
    var cells = {};
    if (x.cells && typeof x.cells === "object") {
      Object.keys(x.cells).forEach(function (k) {
        var m = /^([0-5])-(\d)$/.exec(k), c = x.cells[k];
        if (!m || !c || typeof c !== "object") return;
        var subject = str(c.subject, 40).trim();
        if (!subject) return;
        cells[k] = {
          subject: subject, room: str(c.room, 30), teacher: str(c.teacher, 30), note: str(c.note, 500),
          color: /^#[0-9a-f]{6}$/i.test(c.color || "") ? c.color : COLORS[0]
        };
      });
    }
    var out = { name: str(x.name, 40).trim() || t("時間割"), days: days, periods: periods, times: times, cells: cells, updated: Number(x.updated) || 0 };
    if (x.share && typeof x.share.tid === "string") out.share = { tid: x.share.tid.slice(0, 40), title: str(x.share.title, 60), publishedAt: Number(x.share.publishedAt) || 0 };
    return out;
  }
  var data = { version: 1, view: "mine", table: cleanTable(null), received: {} };
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}") || {};
      data.table = cleanTable(d.table);
      data.received = {};
      if (d.received && typeof d.received === "object") {
        Object.keys(d.received).forEach(function (id) {
          var r = d.received[id];
          if (r && typeof r === "object") data.received[id] = { title: str(r.title, 60), table: cleanTable(r.table), updatedAt: Number(r.updatedAt) || 0, fetchedAt: Number(r.fetchedAt) || 0 };
        });
      }
      data.view = typeof d.view === "string" && (d.view === "mine" || data.received[d.view]) ? d.view : "mine";
    } catch (e) { /* 初期値 */ }
  }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { say(t("保存できませんでした")); }
  }
  function changed() { data.table.updated = Date.now(); save(); render(); }

  if (embed) {
    root.classList.add("is-embed");
    var demo = [[t("数学"), "201"], [t("英語"), "LL"], [t("国語"), "201"], [t("理科"), t("理科室")], [t("体育"), t("体育館")], [t("社会"), "201"]];
    var cells = {};
    for (var d0 = 0; d0 < 5; d0++) for (var p0 = 0; p0 < 6; p0++) {
      var s0 = demo[(d0 * 2 + p0) % demo.length];
      cells[d0 + "-" + p0] = { subject: s0[0], room: s0[1], color: COLORS[(d0 * 2 + p0) % demo.length] };
    }
    data.table = cleanTable({ name: t("時間割"), cells: cells });
  } else load();

  function current() {
    if (data.view !== "mine" && data.received[data.view]) return { table: data.received[data.view].table, readonly: true, title: data.received[data.view].title };
    return { table: data.table, readonly: false, title: data.table.name };
  }

  // ================================================================
  // いま・次
  // ================================================================
  // 月曜 = 0 … 土曜 = 5、日曜は -1
  function todayIndex(now) { var w = now.getDay(); return w === 0 ? -1 : w - 1; }
  function status(tb, now) {
    var di = todayIndex(now);
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var r = { day: di, now: null, next: null, hasToday: false };
    if (di < 0 || di >= tb.days) return r;
    for (var p = 0; p < tb.periods; p++) {
      var c = tb.cells[di + "-" + p];
      if (c) r.hasToday = true;
      var s = minutes(tb.times[p].s), e = minutes(tb.times[p].e);
      if (s === null || e === null) continue;
      if (nowMin >= s && nowMin < e) r.now = { p: p, cell: c || null, left: e - nowMin, total: Math.max(1, e - s) };
      else if (nowMin < s && !r.next && c) r.next = { p: p, cell: c, start: tb.times[p].s, until: s - nowMin };
    }
    return r;
  }
  // その授業が次にある日（今日がその曜日で、まだ終わっていなければ今日）
  function nextDate(di, p, tb) {
    var now = new Date();
    for (var add = 0; add < 8; add++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
      if (todayIndex(d) !== di) continue;
      if (add === 0) { var e = minutes(tb.times[p].e); if (e !== null && now.getHours() * 60 + now.getMinutes() >= e) continue; }
      return d;
    }
    return null;
  }

  // ================================================================
  // 表示
  // ================================================================
  var grid = $("grid"), firstRender = true;
  function periodLabel(p) { return t("{n} 限", { n: p + 1 }); }
  function render() {
    var cur = current(), tb = cur.table, now = new Date(), st = status(tb, now);
    $("title").textContent = cur.title;
    var count = Object.keys(tb.cells).length;
    var sub = cur.readonly ? t("配信された時間割（見るだけ）") : count ? t("{n} コマ", { n: count }) : t("コマを押して、科目を入れましょう");
    if (!cur.readonly && tb.share) sub += " · " + t("配信中");
    $("sub").textContent = sub;

    // 切りかえ
    var views = $("views"), ids = Object.keys(data.received);
    views.hidden = !ids.length;
    views.textContent = "";
    if (ids.length) {
      [["mine", t("自分の時間割"), "person"]].concat(ids.map(function (id) { return [id, data.received[id].title || t("配信された時間割"), "school"]; })).forEach(function (v) {
        var b = el("button", "view-chip m3-state");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(data.view === v[0]));
        b.append(icon(v[2]), el("span", "", v[1]));
        b.addEventListener("click", function () { data.view = v[0]; save(); firstRender = true; render(); });
        views.appendChild(b);
      });
    }

    renderNow(tb, st);

    // 表
    grid.style.setProperty("--days", String(tb.days));
    grid.textContent = "";
    grid.appendChild(el("span"));
    for (var d = 0; d < tb.days; d++) {
      var h = el("div", "grid__day" + (d === st.day ? " is-today" : ""));
      h.appendChild(document.createTextNode(DAY_NAMES[d]));
      if (d === st.day) h.appendChild(el("small", "", t("今日")));
      grid.appendChild(h);
    }
    var i = 0;
    for (var p = 0; p < tb.periods; p++) {
      // 時限の番号（自分の時間割では、押すとその時限の時刻を変えられる）
      var ph = el(cur.readonly ? "div" : "button", "grid__period" + (st.now && st.now.p === p ? " is-now" : "") + (cur.readonly ? "" : " m3-state"));
      if (!cur.readonly) { ph.type = "button"; ph.dataset.period = String(p); }
      ph.appendChild(document.createTextNode(String(p + 1)));
      ph.appendChild(el("small", "", tb.times[p].s + "\n" + tb.times[p].e));
      ph.title = periodLabel(p) + " " + tb.times[p].s + "〜" + tb.times[p].e + (cur.readonly ? "" : " · " + t("押すと時刻を変えられます"));
      grid.appendChild(ph);
      for (var d2 = 0; d2 < tb.days; d2++) {
        var key = d2 + "-" + p, c = tb.cells[key];
        var b = el("button", "cell m3-state");
        b.type = "button";
        b.dataset.key = key;
        if (c) {
          b.style.setProperty("--cc", c.color);
          b.appendChild(el("span", "cell__subject", c.subject));
          if (c.room) b.appendChild(el("span", "cell__room", c.room));
          b.setAttribute("aria-label", DAY_NAMES[d2] + " " + periodLabel(p) + " " + c.subject + (c.room ? " " + c.room : ""));
        } else {
          b.classList.add("cell--empty");
          if (cur.readonly) { b.classList.add("is-readonly"); b.tabIndex = -1; }
          else b.appendChild(icon("add"));
          b.setAttribute("aria-label", DAY_NAMES[d2] + " " + periodLabel(p) + " " + t("空き"));
        }
        if (d2 === st.day) b.classList.add("is-today");
        if (d2 === st.day && st.now && st.now.p === p && c) { b.classList.add("is-now"); b.dataset.now = t("いま"); }
        if (firstRender) { b.classList.add("cell--in"); b.style.setProperty("--i", String(i++)); }
        grid.appendChild(b);
      }
    }
    // 時限を増やす（10 限まで）
    if (!cur.readonly && tb.periods < 10) {
      var more = el("button", "grid__more m3-state");
      more.type = "button";
      more.id = "add-period";
      more.append(icon("add"), el("span", "", t("{n} 限を追加", { n: tb.periods + 1 })));
      grid.appendChild(more);
    }
    firstRender = false;
    $("note").textContent = cur.readonly
      ? t("配信した人が時間割を変えると、次に開いたときに新しくなります。")
      : t("時間割はこの端末のブラウザに保存されます（オンライン同期は任意）。");
  }

  function renderNow(tb, st) {
    var box = $("now");
    box.textContent = "";
    function card(kind, label, kicker, c, meta) {
      var a = el("div", "now-card now-card--" + kind);
      if (c) a.style.setProperty("--cc", c.color);
      var lb = el("span", "now-card__label");
      lb.appendChild(el("b", "", label));
      var tx = el("div", "now-card__text");
      tx.append(el("span", "now-card__kicker", kicker), el("span", "now-card__subject", c ? c.subject : t("空き時間")));
      if (meta) tx.appendChild(el("span", "now-card__meta", meta));
      a.append(lb, tx);
      box.appendChild(a);
      return a;
    }
    if (st.day < 0 || st.day >= tb.days) {
      var off = el("div", "now-card now-card--plain");
      off.append(icon("weekend"), el("span", "", t("今日は授業がありません")));
      box.appendChild(off);
      return;
    }
    if (st.now) {
      var c = st.now.cell;
      var meta = [c && c.room, c && c.teacher].filter(Boolean).join(" · ");
      var nc = card("now", String(st.now.p + 1), t("いま · あと {n} 分", { n: st.now.left }), c, meta);
      var bar = el("span", "now-card__bar");
      bar.style.width = Math.round((1 - st.now.left / st.now.total) * 100) + "%";
      nc.appendChild(bar);
    }
    if (st.next) {
      var c2 = st.next.cell;
      card("next", String(st.next.p + 1), t("次 · {time} から（あと {n} 分）", { time: st.next.start, n: st.next.until }), c2, [c2.room, c2.teacher].filter(Boolean).join(" · "));
    }
    if (!st.now && !st.next) {
      var done = el("div", "now-card now-card--plain");
      done.append(icon(st.hasToday ? "task_alt" : "event_available"), el("span", "", st.hasToday ? t("今日の授業は終わりました") : t("今日の時間割はまだ入っていません")));
      box.appendChild(done);
    }
  }

  // ================================================================
  // スナックバー
  // ================================================================
  var toast = $("toast"), toastText = $("toast-text"), toastAction = $("toast-action"), toastTimer, undoFn = null;
  function say(text, undo) {
    toastText.textContent = text;
    undoFn = undo || null;
    toastAction.hidden = !undo;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); undoFn = null; }, undo ? 6000 : 3000);
  }
  toastAction.addEventListener("click", function () { if (undoFn) undoFn(); toast.classList.remove("is-on"); undoFn = null; });

  // ================================================================
  // コマ
  // ================================================================
  function field(label, input) {
    var w = el("label", "m3-field");
    w.append(el("span", "m3-field__label", label), input);
    return w;
  }
  function input(value, max, placeholder) {
    var i = el("input", "m3-field__input");
    i.type = "text";
    i.value = value || "";
    i.maxLength = max;
    if (placeholder) i.placeholder = placeholder;
    return i;
  }
  // ほかのコマで使っている科目（同じ科目を入れたら、教室・先生・色をそろえる）
  function subjects(tb) {
    var map = {};
    Object.keys(tb.cells).forEach(function (k) { var c = tb.cells[k]; if (!map[c.subject]) map[c.subject] = c; });
    return map;
  }
  function addHomework(key, tb, c) {
    var R = window.SKReminders;
    if (!R) return;
    var m = /^(\d)-(\d)$/.exec(key), due = nextDate(+m[1], +m[2], tb);
    var data2 = R.load(), now = Date.now();
    data2.tasks.push(R.upgradeTask({ id: newId(), list: data2.lists[0].id, text: t("{subject} の宿題", { subject: c.subject }), due: due ? ymd(due) : null, created: now, updated: now }, data2.lists));
    try { R.save(data2); } catch (e) { say(t("保存できませんでした")); return; }
    say(due ? t("Todo に追加しました（期限 {date}）", { date: new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", weekday: "short" }).format(due) }) : t("Todo に追加しました"));
  }

  function openCell(key) {
    var cur = current(), tb = cur.table, c = tb.cells[key];
    var m = /^(\d)-(\d)$/.exec(key), di = +m[1], p = +m[2];
    var title = DAY_NAMES[di] + " " + periodLabel(p) + "（" + tb.times[p].s + "〜" + tb.times[p].e + "）";
    if (cur.readonly) {
      if (!c) return;
      var body = el("div", "tt-detail");
      function row(ic, text, cls) { if (!text) return; var r = el("div", "tt-detail__row"); r.append(icon(ic), el("span", cls || "", text)); body.appendChild(r); }
      row("menu_book", c.subject);
      row("meeting_room", c.room);
      row("person", c.teacher);
      row("notes", c.note, "tt-detail__note");
      window.M3.dialog({ title: title, body: body, actions: [{ label: t("Todo に宿題を追加"), value: "hw" }, { label: t("閉じる"), primary: true, value: null }] })
        .then(function (v) { if (v === "hw") addHomework(key, tb, c); });
      return;
    }
    var draft = c ? Object.assign({}, c) : { subject: "", room: "", teacher: "", note: "", color: COLORS[(di * 3 + p) % COLORS.length] };
    var box = el("div", "tt-edit");
    var subj = input(draft.subject, 40, t("例: 数学"));
    var room = input(draft.room, 30, t("例: 201 教室"));
    var teacher = input(draft.teacher, 30);
    var note = el("textarea", "m3-field__input");
    note.value = draft.note || "";
    note.maxLength = 500;
    note.rows = 2;
    box.appendChild(field(t("科目"), subj));
    // 使っている科目から選ぶ
    var known = subjects(tb), names = Object.keys(known);
    if (names.length) {
      var chips = el("div", "tt-chips");
      names.slice(0, 16).forEach(function (n) {
        var ch = el("button", "tt-chip m3-state", n);
        ch.type = "button";
        ch.style.setProperty("--cc", known[n].color);
        ch.addEventListener("click", function () {
          subj.value = n;
          room.value = known[n].room || "";
          teacher.value = known[n].teacher || "";
          pick(known[n].color);
        });
        chips.appendChild(ch);
      });
      box.appendChild(chips);
    }
    var r = el("div", "tt-edit__row");
    r.append(field(t("教室"), room), field(t("先生"), teacher));
    box.appendChild(r);
    box.appendChild(field(t("メモ"), note));
    var colors = el("div", "tt-colors");
    colors.setAttribute("role", "radiogroup");
    colors.setAttribute("aria-label", t("色"));
    function pick(col) {
      draft.color = col;
      Array.prototype.forEach.call(colors.children, function (x) { x.setAttribute("aria-checked", String(x.dataset.c === col)); });
    }
    COLORS.forEach(function (col) {
      var b = el("button", "tt-color m3-state");
      b.type = "button";
      b.dataset.c = col;
      b.style.setProperty("--sw", col);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", col);
      b.appendChild(icon("check"));
      b.addEventListener("click", function () { pick(col); });
      colors.appendChild(b);
    });
    box.appendChild(colors);
    pick(draft.color);
    // 同じ科目を入れたら、教室・先生・色をそろえる（まだ入れていなければ）
    subj.addEventListener("change", function () {
      var k = known[subj.value.trim()];
      if (!k) return;
      if (!room.value) room.value = k.room || "";
      if (!teacher.value) teacher.value = k.teacher || "";
      pick(k.color);
    });
    var actions = [{ label: t("キャンセル"), value: null }, { label: t("保存"), primary: true, value: "save" }];
    if (c) { actions.unshift({ label: t("Todo に宿題"), value: "hw" }); actions.unshift({ label: t("空ける"), danger: true, value: "clear" }); }
    window.M3.dialog({ title: title, body: box, actions: actions }).then(function (v) {
      if (v === "hw") { addHomework(key, tb, c); return; }
      if (v === "clear") {
        var removed = tb.cells[key];
        delete tb.cells[key];
        changed();
        say(t("{subject} を消しました", { subject: removed.subject }), function () { tb.cells[key] = removed; changed(); });
        return;
      }
      if (v !== "save") return;
      var name = subj.value.trim();
      if (!name) { if (c) { delete tb.cells[key]; changed(); } return; }
      tb.cells[key] = { subject: name.slice(0, 40), room: room.value.trim().slice(0, 30), teacher: teacher.value.trim().slice(0, 30), note: note.value.slice(0, 500), color: draft.color };
      changed();
    });
  }
  grid.addEventListener("click", function (e) {
    if (embed) return;
    var b = e.target.closest(".cell");
    if (b) { openCell(b.dataset.key); return; }
    var ph = e.target.closest(".grid__period[data-period]");
    if (ph) { openPeriod(+ph.dataset.period); return; }
    if (e.target.closest("#add-period")) addPeriod();
  });

  // 時限を 1 つ増やす（時刻は、前の時限の 10 分あとから 50 分。前の時限がなければ初期値）
  function addPeriod() {
    var tb = data.table;
    if (tb.periods >= 10) return;
    var p = tb.periods, prev = tb.times[p - 1];
    var pe = prev ? minutes(prev.e) : null;
    if (pe !== null && pe + 60 < 24 * 60) {
      var s = pe + 10, e = s + 50;
      tb.times[p] = { s: pad(Math.floor(s / 60)) + ":" + pad(s % 60), e: pad(Math.floor(e / 60)) + ":" + pad(e % 60) };
    }
    tb.periods = p + 1;
    changed();
    say(t("{n} 限を追加しました。番号を押すと時刻を変えられます", { n: p + 1 }));
  }

  // 1 つの時限の時刻を変える
  function openPeriod(p) {
    var tb = data.table;
    var box = el("div", "tt-edit");
    var row = el("div", "tt-time tt-time--one");
    var s = el("input"); s.type = "time"; s.value = tb.times[p].s; s.setAttribute("aria-label", t("始まり"));
    var e = el("input"); e.type = "time"; e.value = tb.times[p].e; e.setAttribute("aria-label", t("終わり"));
    var ls = el("label", "tt-time__field"); ls.append(el("span", "", t("始まり")), s);
    var le = el("label", "tt-time__field"); le.append(el("span", "", t("終わり")), e);
    row.append(ls, el("span", "", "〜"), le);
    box.appendChild(row);
    var err = el("p", "tt-error");
    box.appendChild(err);
    var actions = [{ label: t("キャンセル"), value: null }, { label: t("保存"), primary: true, value: "save" }];
    if (p === tb.periods - 1 && tb.periods > 1) actions.unshift({ label: t("この時限を消す"), danger: true, value: "remove" });
    window.M3.dialog({ title: t("{n} 限の時刻", { n: p + 1 }), icon: "schedule", body: box, actions: actions }).then(function (v) {
      if (v === "remove") {
        var removed = {};
        Object.keys(tb.cells).forEach(function (k) { if (+k.split("-")[1] === p) { removed[k] = tb.cells[k]; delete tb.cells[k]; } });
        tb.periods -= 1;
        changed();
        say(t("{n} 限を消しました", { n: p + 1 }), function () { Object.assign(tb.cells, removed); tb.periods = p + 1; changed(); });
        return;
      }
      if (v !== "save") return;
      var sm = minutes(s.value), em = minutes(e.value);
      if (sm === null || em === null || em <= sm) { say(t("終わりの時刻は、始まりより後にしてください")); return; }
      tb.times[p] = { s: s.value, e: e.value };
      changed();
    });
  }

  // ================================================================
  // 時間割の設定（名前・曜日・時限・時刻）
  // ================================================================
  function openSetup() {
    if (data.view !== "mine") { data.view = "mine"; save(); render(); }
    var tb = data.table, draft = { days: tb.days, periods: tb.periods };
    var box = el("div", "tt-edit");
    var name = input(tb.name, 40);
    box.appendChild(field(t("名前"), name));
    box.appendChild(el("p", "tt-label", t("曜日")));
    var seg = el("div", "tt-seg");
    seg.setAttribute("role", "radiogroup");
    [[5, t("月〜金")], [6, t("月〜土")]].forEach(function (o) {
      var b = el("button", "m3-state", o[1]);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(draft.days === o[0]));
      b.addEventListener("click", function () { draft.days = o[0]; Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute("aria-checked", String(x === b)); }); });
      seg.appendChild(b);
    });
    box.appendChild(seg);
    var per = el("input", "m3-field__input");
    per.type = "number";
    per.min = 1; per.max = 10;
    per.value = draft.periods;
    per.inputMode = "numeric";
    box.appendChild(field(t("1 日の時限の数（1〜10）"), per));
    box.appendChild(el("p", "tt-label", t("授業の始まりと終わりの時刻")));
    var times = el("div", "tt-times");
    var rows = [];
    function drawTimes() {
      var n = Math.max(1, Math.min(10, Math.round(Number(per.value)) || 1));
      times.textContent = "";
      for (var p = 0; p < 10; p++) {
        if (!rows[p]) {
          var s = el("input"); s.type = "time"; s.value = tb.times[p].s;
          var e = el("input"); e.type = "time"; e.value = tb.times[p].e;
          s.setAttribute("aria-label", t("{n} 限の始まり", { n: p + 1 }));
          e.setAttribute("aria-label", t("{n} 限の終わり", { n: p + 1 }));
          rows[p] = { s: s, e: e };
        }
        if (p >= n) continue;
        var r = el("div", "tt-time");
        r.append(el("span", "", periodLabel(p)), rows[p].s, el("span", "", "〜"), rows[p].e);
        times.appendChild(r);
      }
    }
    per.addEventListener("input", drawTimes);
    drawTimes();
    box.appendChild(times);
    window.M3.dialog({ title: t("時間割の設定"), icon: "tune", body: box, actions: [{ label: t("キャンセル"), value: null }, { label: t("保存"), primary: true, value: "save" }] }).then(function (v) {
      if (v !== "save") return;
      tb.name = name.value.trim().slice(0, 40) || t("時間割");
      tb.days = draft.days;
      tb.periods = Math.max(1, Math.min(10, Math.round(Number(per.value)) || tb.periods));
      var bad = 0;
      rows.forEach(function (r, p) {
        var sm = minutes(r.s.value), em = minutes(r.e.value);
        if (sm === null || em === null || em <= sm) { if (p < tb.periods) bad++; return; }
        tb.times[p] = { s: r.s.value, e: r.e.value };
      });
      if (bad) say(t("終わりが始まりより前の時限 {n} 件は、時刻を変えませんでした", { n: bad }));
      firstRender = true;
      changed();
      if (!bad) say(t("時間割の設定を保存しました"));
    });
  }

  // ================================================================
  // 配信された時間割の受け取り・管理者の配信（/toolbox/timetable/share.js。ログインしているときだけ読み込む）
  // ================================================================
  function hint() { try { return JSON.parse(localStorage.getItem("skhub_account") || "null"); } catch (e) { return null; } }
  var share = null;
  function loadShare() {
    if (!share) share = import("/toolbox/timetable/share.js").catch(function (e) { share = null; throw e; });
    return share;
  }
  // 配信された時間割を取りに行く（なくなったものは消す）
  function receive(manual) {
    if (embed || !hint()) return Promise.resolve();
    return loadShare().then(function (m) { return m.receive(); }).then(function (res) {
      if (res.status !== "ready") {
        if (manual) say(res.status === "unregistered" ? t("SK Hub Systems アカウントの作成（規約への同意）がまだです") : t("ログインし直してください"));
        return;
      }
      var next = {};
      res.items.forEach(function (it) {
        var tb = null;
        try { tb = cleanTable(JSON.parse(it.json)); } catch (e) { return; }
        next[it.tid] = { title: str(it.title, 60), table: tb, updatedAt: it.updatedAt, fetchedAt: Date.now() };
      });
      function stamp(r) { return JSON.stringify(Object.keys(r).map(function (k) { return [k, r[k].updatedAt]; })); }
      var hadBefore = Object.keys(data.received).length > 0, before = stamp(data.received);
      data.received = next;
      if (data.view !== "mine" && !next[data.view]) data.view = "mine";
      // はじめて配信を受け取り、自分の時間割がまだ空なら、配信されたほうを表示する
      if (!hadBefore && res.items.length && !Object.keys(data.table.cells).length) data.view = res.items[0].tid;
      save();
      if (stamp(next) !== before) firstRender = true;
      render();
      $("receive-hint").hidden = true;
      if (manual) say(res.items.length ? t("配信された時間割を更新しました") : t("配信された時間割はありません"));
    }).catch(function () { if (manual) say(t("確認できませんでした。インターネットの接続を確認してください。")); });
  }

  // 管理者: 自分の時間割を、メールアドレスを入れた人に配信する
  function parseEmails(text) {
    var ok = [], bad = [];
    text.split(/[\s,;、，；]+/).forEach(function (s) {
      s = s.trim().toLowerCase();
      if (!s) return;
      if (!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(s) || s.length > 254) { bad.push(s); return; }
      if (ok.indexOf(s) < 0) ok.push(s);
    });
    return { ok: ok, bad: bad };
  }
  var MAX_MEMBERS = 200;
  function openShare() {
    if (data.view !== "mine") { data.view = "mine"; save(); render(); }
    var tb = data.table;
    var box = el("div", "tt-edit tt-share");
    var info = el("p", "tt-info");
    info.append(icon("info"), el("span", "", t("自分の時間割を、メールアドレスを入れた人に配信します。受け取る人は、そのメールアドレスの SK Hub Systems アカウントでログインすると、時間割が表示されます（見るだけ）。メールアドレスは配信する相手を決めるためだけに使い、受け取る人どうしには見えません。")));
    box.appendChild(info);
    var title = input((tb.share && tb.share.title) || tb.name, 60, t("例: 2 年 3 組"));
    box.appendChild(field(t("配信する名前（クラス名など）"), title));
    var ta = el("textarea", "m3-field__input");
    ta.rows = 6;
    ta.placeholder = "taro@example.com\nhanako@example.com";
    ta.spellcheck = false;
    ta.autocapitalize = "off";
    box.appendChild(field(t("配信先のメールアドレス（1 行に 1 つ。カンマ区切りでも可）"), ta));
    var count = el("p", "tt-count");
    box.appendChild(count);
    var err = el("p", "tt-error");
    err.setAttribute("role", "alert");
    box.appendChild(err);
    function recount() {
      var r = parseEmails(ta.value);
      count.textContent = t("{n} 人", { n: r.ok.length }) + (r.bad.length ? " · " + t("形がちがうもの {n} 件", { n: r.bad.length }) : "");
    }
    ta.addEventListener("input", recount);
    if (tb.share) {
      var st = el("p", "tt-info");
      var stale = tb.updated > tb.share.publishedAt;
      st.append(icon(stale ? "sync_problem" : "campaign"), el("span", "", stale
        ? t("配信したあとに時間割を変えています。「配信を更新」を押すと、受け取る人の時間割も新しくなります。")
        : t("配信中です（{date} に配信）", { date: new Date(tb.share.publishedAt).toLocaleString(locale) })));
      box.insertBefore(st, box.children[1]);
      ta.disabled = true;
      ta.placeholder = t("読み込み中…");
      loadShare().then(function (m) { return m.loadMembers(tb.share.tid); }).then(function (emails) {
        ta.disabled = false;
        ta.placeholder = "taro@example.com\nhanako@example.com";
        ta.value = emails.join("\n");
        recount();
      }, function () { ta.disabled = false; err.textContent = t("配信先を読み込めませんでした"); });
    }
    recount();
    var actions = [{ label: t("キャンセル"), value: null }, { label: tb.share ? t("配信を更新") : t("配信する"), primary: true, value: "publish" }];
    if (tb.share) actions.unshift({ label: t("配信をやめる"), danger: true, value: "stop" });
    window.M3.dialog({ title: t("時間割を配信"), icon: "campaign", body: box, actions: actions }).then(function (v) {
      if (v === "stop") {
        return window.M3.confirm({ title: t("配信をやめますか？"), text: t("受け取っていた人の画面から、この時間割が消えます。あなたの時間割は消えません。"), ok: t("配信をやめる"), danger: true }).then(function (yes) {
          if (!yes) return;
          say(t("配信をやめています…"));
          return loadShare().then(function (m) { return m.unpublish(tb.share.tid); }).then(function () {
            delete tb.share;
            save(); render();
            say(t("配信をやめました"));
          }, function () { say(t("うまくいきませんでした。時間をおいてもう一度お試しください。")); });
        });
      }
      if (v !== "publish") return;
      var r = parseEmails(ta.value);
      if (!r.ok.length) { say(t("配信先のメールアドレスを入れてください")); return; }
      if (r.ok.length > MAX_MEMBERS) { say(t("配信先は {n} 人までです", { n: MAX_MEMBERS })); return; }
      var name = title.value.trim().slice(0, 60) || tb.name;
      var payload = JSON.stringify({ name: name, days: tb.days, periods: tb.periods, times: tb.times.slice(0, tb.periods), cells: tb.cells });
      say(t("配信しています…"));
      loadShare().then(function (m) { return m.publish({ tid: tb.share && tb.share.tid, title: name, json: payload, emails: r.ok }); }).then(function (tid) {
        tb.share = { tid: tid, title: name, publishedAt: Date.now() };
        save(); render();
        say(t("{n} 人に配信しました", { n: r.ok.length }) + (r.bad.length ? " · " + t("形がちがうメールアドレス {n} 件は入れませんでした", { n: r.bad.length }) : ""));
      }, function (e) {
        console.warn("[Timetable share]", e);
        say(t("配信できませんでした。管理者の SK Hub Systems アカウントでログインしているか確認してください。"));
      });
    });
  }

  // ================================================================
  // メニュー
  // ================================================================
  var menu = $("menu"), menuBtn = $("btn-menu");
  function setMenu(open) { menu.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open)); if (open) menu.querySelector("button:not([hidden])").focus(); }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".menu-wrap")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-menu]");
    if (!b) return;
    setMenu(false);
    var cmd = b.dataset.menu;
    if (cmd === "setup") openSetup();
    else if (cmd === "share") openShare();
    else if (cmd === "refresh") receive(true);
    else if (cmd === "export") {
      var url = URL.createObjectURL(new Blob([JSON.stringify({ app: "sk-timetable", version: 1, exportedAt: new Date().toISOString(), table: data.table }, null, 2)], { type: "application/json" }));
      var a = el("a"); a.href = url; a.download = "timetable-backup-" + ymd(new Date()).replace(/-/g, "") + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } else if (cmd === "import") $("import-file").click();
  });
  $("btn-setup").addEventListener("click", openSetup);
  $("import-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    file.text().then(function (text) {
      var d = JSON.parse(text);
      if (!d || d.app !== "sk-timetable" || !d.table) throw new Error("not a backup");
      return window.M3.confirm({ title: t("バックアップを読み込みますか？"), text: t("いまの自分の時間割は、バックアップの内容に置きかわります。"), ok: t("読み込む") }).then(function (yes) {
        if (!yes) return;
        var keep = data.table.share;
        data.table = cleanTable(d.table);
        if (keep) data.table.share = keep;
        data.view = "mine";
        firstRender = true;
        changed();
        say(t("読み込みました"));
      });
    }).catch(function () { say(t("読み込めませんでした。Timetable のバックアップのファイルを選んでください")); });
  });

  // ================================================================
  // はじめ
  // ================================================================
  render();
  if (embed) return;
  // 1 分ごとに、いまの授業を新しく
  setInterval(function () { if (document.visibilityState === "visible" && !document.querySelector(".tbs-dialog-scrim")) render(); }, 30000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") render(); });
  window.addEventListener("storage", function (e) { if (e.key === STORE) { load(); render(); } });

  // ログインしているとき: 配信された時間割を受け取る。管理者なら「配信」を出す
  var signedIn = !!hint();
  $("menu-refresh").hidden = !signedIn;
  $("receive-hint").hidden = signedIn || Object.keys(data.received).length > 0;
  $("receive-login").href = (I18N && I18N.path ? I18N.path("/account/") : "/account/") + "?next=" + encodeURIComponent(location.pathname);
  if (signedIn) {
    receive(false);
    setInterval(function () { if (document.visibilityState === "visible") receive(false); }, 30 * 60 * 1000);
    loadShare().then(function (m) { return m.isAdmin(); }).then(function (admin) { $("menu-share").hidden = !admin; }).catch(function () { /* 管理者でない */ });
  }
})();
