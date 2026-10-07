// SK's Toolbox のホーム画面（/toolbox/）
//   ・あいさつ（時間帯で変わる）と、Todo・Memo・Calc のウィジェット。時計は Clock の ?embed を iframe で出す（_build/pages/toolbox.html。build で /toolbox/index.html になる）
//   ・ウィジェットは各アプリが localStorage に保存したもの（sk_todo・sk_memo・sk_calc）を読むだけ。
//     Todo だけは、ここでチェックすると完了にできる（Todo アプリと同じ形で sk_todo に書く）
//   ・ほかのタブ・アプリで変えたら（storage イベント）、戻ってきたら（visibilitychange）、1 分ごとに出し直す
(function () {
  "use strict";

  var root = document.documentElement;
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name, cls) { var s = el("span", "msr" + (cls ? " " + cls : ""), name); s.setAttribute("aria-hidden", "true"); return s; }
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }

  // ---- あいさつ ----
  function greet() {
    var h = new Date().getHours();
    $("greet").textContent = h >= 4 && h < 10 ? t("おはようございます") : h >= 10 && h < 17 ? t("こんにちは") : t("こんばんは");
  }

  // ---- 日付（Todo と同じ）----
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  var dayFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  function dueInfo(due) {
    var d = parseYmd(due);
    if (!d) return null;
    var diff = Math.round((d - parseYmd(ymd(new Date()))) / 864e5);
    return { label: diff === 0 ? t("今日") : diff === 1 ? t("明日") : diff === -1 ? t("昨日") : dayFmt.format(d), today: diff === 0, over: diff < 0 };
  }

  // ---- Todo（データの形・完了・繰り返しは /toolbox/shared/remind.js の SKReminders）----
  var R = window.SKReminders, MAX_TASKS = 4;
  function openTasks(tasks) {
    return tasks.filter(function (x) { return !x.done && !x.parent; }).sort(function (a, b) {
      if (!!a.flagged !== !!b.flagged) return a.flagged ? -1 : 1;
      if ((a.due || "") !== (b.due || "")) {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due < b.due ? -1 : 1;
      }
      if ((a.time || "") !== (b.time || "")) return (a.time || "") < (b.time || "") ? -1 : 1;
      return (b.priority || 0) - (a.priority || 0) || (a.created || 0) - (b.created || 0);
    });
  }
  function renderTodo() {
    var data = R.load();
    var tasks = data.tasks;
    var open = openTasks(tasks);
    var today = 0, over = 0;
    open.forEach(function (x) { var i = dueInfo(x.due); if (i && i.today) today++; if (i && i.over) over++; });
    $("todo-meta").textContent = open.length ? t("残り {n} 件", { n: open.length }) : "";
    // 数字（今日・期限切れ・フラグ）
    var stats = $("todo-stats");
    stats.textContent = "";
    [[today, t("今日"), "#2563eb"], [over, t("期限切れ"), over ? "var(--md-error)" : ""], [open.filter(function (x) { return x.flagged; }).length, t("フラグ付き"), "#ea580c"]].forEach(function (st) {
      var b = el("a", "tbh-stat");
      b.href = "/toolbox/todo/";
      if (st[2]) b.style.setProperty("--sc", st[2]);
      b.append(el("b", "", String(st[0])), el("span", "", st[1]));
      stats.appendChild(b);
    });

    var list = $("todo-list");
    list.textContent = "";
    open.slice(0, MAX_TASKS).forEach(function (x) {
      var li = el("li", "w-task");
      li.dataset.id = x.id;
      var check = el("button", "w-check m3-state");
      check.type = "button";
      check.setAttribute("role", "checkbox");
      check.setAttribute("aria-checked", "false");
      check.setAttribute("aria-label", t("完了にする") + ": " + x.text);
      var box = el("span");
      box.appendChild(icon("check"));
      check.appendChild(box);
      var text = el("a", "w-task__text", (x.priority ? new Array(x.priority + 1).join("!") + " " : "") + x.text);
      text.href = "/toolbox/todo/";
      li.append(check, text);
      if (x.repeat) li.appendChild(icon("repeat", "w-task__icon"));
      if (x.flagged) li.appendChild(icon("flag", "w-task__star"));
      var info = dueInfo(x.due);
      if (info) li.appendChild(el("span", "w-due" + (info.today ? " is-today" : "") + (info.over ? " is-over" : ""), info.label + (x.time ? " " + x.time : "")));
      list.appendChild(li);
    });
    if (open.length > MAX_TASKS) {
      var more = el("a", "w-more", t("ほか {n} 件", { n: open.length - MAX_TASKS }));
      more.href = "/toolbox/todo/";
      list.appendChild(more);
    }
    var empty = $("todo-empty");
    empty.hidden = open.length > 0;
    empty.textContent = tasks.length ? t("すべて完了しました。おつかれさまです！") : t("タスクはまだありません。");
  }
  // ここでチェックしたら、Todo アプリと同じように完了にする（繰り返しのものは次の日付へ）
  $("todo-list").addEventListener("click", function (e) {
    var check = e.target.closest(".w-check");
    if (!check) return;
    var li = check.closest(".w-task");
    var data = R.load();
    var task = null;
    data.tasks.forEach(function (x) { if (x.id === li.dataset.id) task = x; });
    if (!task) return;
    var res = R.complete(task, data);
    try { R.save(data); } catch (err) { return; }
    if (window.SKToolbox) SKToolbox.vibrate();
    check.setAttribute("aria-checked", "true");
    li.classList.add("is-done");
    setTimeout(renderTodo, res.next ? 250 : 450);
  });
  document.addEventListener("skreminder", function () { renderTodo(); });

  // その場でタスクを追加（最初のリストに入れる）
  $("todo-add").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("todo-add-text"), v = input.value.trim();
    if (!v) return;
    var data = R.load(), now = Date.now();
    // 「明日 9時 歯医者」などから、日付・時刻・繰り返し・優先度を取り出す（/toolbox/shared/remind.js）
    var q = R.parseQuick(v);
    data.tasks.push(R.upgradeTask({ id: now.toString(36) + Math.random().toString(36).slice(2, 7), list: data.lists[0].id, text: q.text, due: q.due, time: q.time, repeat: q.repeat, priority: q.priority, created: now, updated: now }, data.lists));
    try { R.save(data); } catch (err) { return; }
    input.value = "";
    renderTodo();
  });

  // ---- 見た目（テーマカラー・ライト／ダーク。共通の設定 /toolbox/shared/settings.js）----
  var THEME_ICONS = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
  var THEME_NAMES = { auto: t("端末の設定に合わせる"), light: t("ライト"), dark: t("ダーク") };
  function renderLook(st) {
    var S = window.SKToolbox;
    if (!S) return;
    st = st || S.get();
    var box = $("look-swatches");
    if (!box.childNodes.length) {
      S.colors.forEach(function (c) {
        var b = el("button", "tbs-swatch m3-state" + (c.key === "app" ? " tbs-swatch--app" : ""));
        b.type = "button";
        b.dataset.color = c.key;
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", c.name + "（" + c.note + "）");
        b.title = c.name;
        if (c.sw) b.style.setProperty("--sw", c.sw);
        b.appendChild(icon("check"));
        b.addEventListener("click", function () { S.set({ color: c.key }); });
        box.appendChild(b);
      });
    }
    var name = "";
    Array.prototype.forEach.call(box.children, function (b) {
      var on = b.dataset.color === st.color;
      b.setAttribute("aria-checked", String(on));
      if (on) name = b.title;
    });
    $("look-meta").textContent = name + " · " + THEME_NAMES[st.theme];
    $("look-theme-icon").textContent = THEME_ICONS[st.theme];
  }
  $("look-theme").addEventListener("click", function () {
    var S = window.SKToolbox;
    if (!S) return;
    var order = ["auto", "light", "dark"];
    S.set({ theme: order[(order.indexOf(S.get().theme) + 1) % order.length] });
  });

  // ---- Memo ----
  var memoTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  function shortDate(time) {
    var d = new Date(time || 0), now = new Date();
    return d.toDateString() === now.toDateString() ? memoTime.format(d) : dayFmt.format(d);
  }
  function renderMemo() {
    var data = readJson("sk_memo") || {};
    var notes = (Array.isArray(data.notes) ? data.notes : []).filter(function (n) { return n && !n.deleted && typeof n.text === "string" && (n.text.trim() || /data-img=/.test(n.html || "")); });
    notes.sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.updated || 0) - (a.updated || 0);
    });
    $("memo-meta").textContent = notes.length ? t("{n} 件", { n: notes.length }) : "";
    var list = $("memo-list");
    list.textContent = "";
    notes.slice(0, 2).forEach(function (n) {
      var lines = n.text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var a = el("a", "w-note m3-state");
      a.href = "/toolbox/memo/#" + encodeURIComponent(n.id);
      a.appendChild(el("span", "w-note__title", lines[0] || t("画像")));
      a.appendChild(el("span", "w-note__sub", shortDate(n.updated) + "　" + lines.slice(1).join(" ").slice(0, 80)));
      list.appendChild(a);
    });
    $("memo-empty").hidden = notes.length > 0;
  }

  // ---- Calc（最後の計算）----
  function group(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmt(s) {
    return String(s).replace(/(\d+)(\.\d*)?(e[+\-]?\d+)?|[*\/\-]/gi, function (m, int, frac, exp) {
      return int !== undefined ? group(int) + (frac || "") + (exp || "") : { "*": "×", "/": "÷", "-": "−" }[m];
    });
  }
  function renderCalc() {
    var data = readJson("sk_calc") || {};
    var h = Array.isArray(data.history) && data.history[0];
    var res = $("calc-res");
    if (h && typeof h.e === "string" && typeof h.r === "string") {
      $("calc-expr").textContent = fmt(h.e) + " =";
      res.textContent = fmt(h.r);
      res.classList.remove("is-empty");
    } else {
      $("calc-expr").textContent = "";
      res.textContent = t("まだ計算していません。");
      res.classList.add("is-empty");
    }
  }

  // ---- Countdown（近い日を 3 つ。毎年のものは次の年へ）----
  function cdOccurrence(ev, now) {
    var d = parseYmd(ev.date);
    if (!d) return null;
    if (ev.yearly) {
      d = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1);
    }
    return d;
  }
  function renderCountdown() {
    var data = readJson("sk_countdown") || {};
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var list = (Array.isArray(data.events) ? data.events : []).map(function (ev) {
      var at = ev && typeof ev.name === "string" ? cdOccurrence(ev, now) : null;
      return at ? { ev: ev, days: Math.round((at - today) / 864e5) } : null;
    }).filter(function (x) { return x && x.days >= 0; }).sort(function (a, b) { return a.days - b.days; });
    $("cd-meta").textContent = list.length ? t("{n} 件の予定", { n: list.length }) : "";
    var box = $("cd-list");
    box.textContent = "";
    list.slice(0, 3).forEach(function (x) {
      var a = el("a", "w-cd m3-state");
      a.href = "/toolbox/countdown/";
      a.style.setProperty("--ec", /^#[0-9a-f]{6}$/i.test(x.ev.color || "") ? x.ev.color : "#7c3aed");
      var days = el("span", "w-cd__days");
      if (x.days === 0) days.appendChild(el("b", "", t("今日")));
      else { days.appendChild(document.createTextNode(t("あと") + " ")); days.appendChild(el("b", "", String(x.days))); days.appendChild(document.createTextNode(t("日"))); }
      a.append(el("span", "w-cd__emoji", x.ev.emoji || "⭐"), el("span", "w-cd__name", x.ev.name), days);
      box.appendChild(a);
    });
    $("cd-empty").hidden = list.length > 0;
  }

  // ---- ホームを編集（タイルの順番・表示と非表示。localStorage の sk_toolbox_home）----
  var HOME = "sk_toolbox_home", TILES = ["clock", "todo", "memo", "countdown", "calc", "look"];
  var bento = $("bento"), editing = false;
  function readHome() {
    var h = readJson(HOME) || {};
    var order = Array.isArray(h.order) ? h.order.filter(function (k) { return TILES.indexOf(k) >= 0; }) : [];
    TILES.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    return { order: order, hidden: Array.isArray(h.hidden) ? h.hidden.filter(function (k) { return TILES.indexOf(k) >= 0; }) : [] };
  }
  var home = readHome();
  function saveHome() { try { localStorage.setItem(HOME, JSON.stringify(home)); } catch (e) { /* 保存できなくても、このページでは反映する */ } }
  var TILE_NAMES = { clock: "Clock", todo: "Todo", memo: "Memo", countdown: "Countdown", calc: "Calc", look: t("見た目") };
  function applyHome() {
    home.order.forEach(function (k, i) {
      var tile = bento.querySelector('[data-tile="' + k + '"]');
      if (!tile) return;
      tile.style.order = String(i);
      tile.dataset.hidden = String(home.hidden.indexOf(k) >= 0);
      var bar = tile.querySelector(".tbh-tile__edit");
      if (!editing) { if (bar) bar.remove(); return; }
      if (!bar) {
        bar = el("div", "tbh-tile__edit");
        [["up", "arrow_upward", t("前へ")], ["down", "arrow_downward", t("後ろへ")], ["hide", "visibility", ""]].forEach(function (b) {
          var btn = el("button", "icon-btn m3-state");
          btn.type = "button";
          btn.dataset.edit = b[0];
          btn.appendChild(icon(b[1]));
          if (b[2]) { btn.setAttribute("aria-label", TILE_NAMES[k] + ": " + b[2]); btn.title = b[2]; }
          bar.appendChild(btn);
        });
        tile.appendChild(bar);
      }
      var hidden = home.hidden.indexOf(k) >= 0;
      var hideBtn = bar.querySelector('[data-edit="hide"]');
      hideBtn.querySelector(".msr").textContent = hidden ? "visibility_off" : "visibility";
      hideBtn.setAttribute("aria-pressed", String(!hidden));
      hideBtn.setAttribute("aria-label", TILE_NAMES[k] + ": " + (hidden ? t("表示する") : t("隠す")));
      hideBtn.title = hidden ? t("表示する") : t("隠す");
      bar.querySelector('[data-edit="up"]').disabled = i === 0;
      bar.querySelector('[data-edit="down"]').disabled = i === home.order.length - 1;
    });
  }
  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("is-home-editing", on);
    $("home-editbar").hidden = !on;
    $("home-edit").setAttribute("aria-pressed", String(on));
    applyHome();
    if (on) $("home-done").focus();
  }
  $("home-edit").addEventListener("click", function () { setEditing(!editing); });
  $("home-done").addEventListener("click", function () { setEditing(false); });
  $("home-reset").addEventListener("click", function () { home = { order: TILES.slice(), hidden: [] }; saveHome(); applyHome(); });
  // 編集中は、タイルを押してもアプリを開かない
  bento.addEventListener("click", function (e) {
    if (!editing) return;
    var b = e.target.closest("[data-edit]");
    e.preventDefault();
    e.stopPropagation();
    if (!b) return;
    var k = b.closest("[data-tile]").dataset.tile, i = home.order.indexOf(k);
    if (b.dataset.edit === "up" && i > 0) { home.order.splice(i, 1); home.order.splice(i - 1, 0, k); }
    else if (b.dataset.edit === "down" && i < home.order.length - 1) { home.order.splice(i, 1); home.order.splice(i + 1, 0, k); }
    else if (b.dataset.edit === "hide") {
      var h = home.hidden.indexOf(k);
      if (h >= 0) home.hidden.splice(h, 1); else home.hidden.push(k);
    }
    saveHome();
    applyHome();
    var again = bento.querySelector('[data-tile="' + k + '"] [data-edit="' + b.dataset.edit + '"]');
    if (again && !again.disabled) again.focus();
  }, true);
  applyHome();

  function renderAll() {
    greet();
    renderTodo();
    renderMemo();
    renderCalc();
    renderCountdown();
  }
  renderAll();
  // 動き: Todo の数字を数え上げる
  if (window.M3) Array.prototype.forEach.call(document.querySelectorAll(".tbh-stat b"), function (b) { var n = +b.textContent; if (n > 0) M3.countUp(b, n, String, 600); });

  // ブラウザの上の帯の色
  var themeColor = $("theme-color");
  function applyTheme() {
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue("--md-surface").trim() || "#f9f9ff";
  }
  if (window.SKToolbox) SKToolbox.onChange(function (st) { applyTheme(); renderLook(st); }); else applyTheme();

  window.addEventListener("storage", function (e) {
    if (!e.key || /^sk_(todo|memo|calc|countdown)$/.test(e.key)) renderAll();
    if (e.key === HOME) { home = readHome(); applyHome(); }
  });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") renderAll(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) renderAll(); });
  setInterval(function () { if (document.visibilityState === "visible") { greet(); renderTodo(); } }, 60000);
})();
