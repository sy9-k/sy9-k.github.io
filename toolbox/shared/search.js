// SK's Toolbox の横断検索（Ctrl+K・Mac は ⌘K。[data-open-search] のボタンでも開く）
//   メモ（sk_memo）・タスク（sk_todo）・Countdown の日（sk_countdown）・時間割の科目（sk_timetable）・計算の履歴（sk_calc）・アプリと機能を、まとめて探す
//   どれも、この端末の localStorage を読むだけ（どこにも送らない）。ロックしたメモの中身は探さない
//   コマンドも打てる: 「5分」「タイマー 1時間30分」→ タイマー開始 / 「12*3+4」→ 計算してコピー /
//     「todo 明日 9時 歯医者」「+ 宿題」→ Todo に追加 / 「メモ 牛乳を買う」→ 新しいメモ。何を打っても、最後に「Todo に追加」「メモにする」が出る
//     Todo とメモは、sessionStorage（sk_quick_todo・sk_quick_memo）に入れて、そのアプリを開いて追加してもらう（保存のしかたはアプリに任せる）
//   ↑↓ で選んで Enter で開く。Esc で閉じる
(function () {
  "use strict";
  if (/[?&]embed\b/.test(location.search)) return;
  var I18N = window.SKI18N;
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch (e) { return {}; } }
  function firstLine(text) { return String(text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean)[0] || ""; }

  // アプリと機能（名前で探す）
  var APPS = [
    { title: "Clock", sub: t("時計"), icon: "/toolbox/clock/icon.svg", url: "/toolbox/clock/", words: "clock 時計 とけい" },
    { title: t("世界時計"), sub: "Clock", icon: "/toolbox/clock/icon.svg", url: "/toolbox/clock/#world", words: "world 世界" },
    { title: t("アラーム"), sub: "Clock", icon: "/toolbox/clock/icon.svg", url: "/toolbox/clock/#alarm", words: "alarm アラーム 目覚まし" },
    { title: t("タイマー"), sub: "Clock", icon: "/toolbox/clock/icon.svg", url: "/toolbox/clock/#timer", words: "timer タイマー" },
    { title: t("ストップウォッチ"), sub: "Clock", icon: "/toolbox/clock/icon.svg", url: "/toolbox/clock/#stopwatch", words: "stopwatch ストップウォッチ" },
    { title: "Calc", sub: t("電卓"), icon: "/toolbox/calc/icon.svg", url: "/toolbox/calc/", words: "calc 電卓 計算" },
    { title: "Memo", sub: t("メモ帳"), icon: "/toolbox/memo/icon.svg", url: "/toolbox/memo/", words: "memo メモ" },
    { title: t("新しいメモ"), sub: "Memo", icon: "/toolbox/memo/icon.svg", url: "/toolbox/memo/#new", words: "new memo 新しい" },
    { title: "Todo", sub: t("リマインダー"), icon: "/toolbox/todo/icon.svg", url: "/toolbox/todo/", words: "todo タスク リマインダー" },
    { title: "Countdown", sub: t("あと何日"), icon: "/toolbox/countdown/icon.svg", url: "/toolbox/countdown/", words: "countdown カウントダウン" },
    { title: "Timetable", sub: t("時間割"), icon: "/toolbox/timetable/icon.svg", url: "/toolbox/timetable/", words: "timetable 時間割 授業 クラス" },
    { title: "Roulette", sub: t("ルーレット"), icon: "/toolbox/roulette/icon.svg", url: "/toolbox/roulette/", words: "roulette ルーレット くじ 抽選 順番" },
    { title: t("Toolbox の設定"), sub: "SK's Toolbox", icon: "/toolbox/icon.svg", url: "/toolbox/settings/", words: "settings 設定 テーマ" },
    { title: "SK's Toolbox", sub: t("ホーム"), icon: "/toolbox/icon.svg", url: "/toolbox/", words: "home ホーム" }
  ];

  // ---- コマンド ----
  // 「5分」「90秒」「1時間30分」「タイマー 3分」「timer 10m」→ ミリ秒（なければ 0）
  function parseTimer(q) {
    var m = /^(?:タイマー|timer)?\s*((?:\d+(?:\.\d+)?\s*(?:時間|h|hr|分|m|min|秒|s|sec)\s*)+)$/i.exec(q.trim());
    if (!m) return 0;
    var ms = 0, re = /(\d+(?:\.\d+)?)\s*(時間|hr|h|分|min|m|秒|sec|s)/gi, x;
    while ((x = re.exec(m[1]))) ms += parseFloat(x[1]) * (/^(時間|h|hr)$/i.test(x[2]) ? 36e5 : /^(分|m|min)$/i.test(x[2]) ? 6e4 : 1e3);
    return ms >= 1000 && ms <= 24 * 36e5 ? Math.round(ms) : 0;
  }
  // 計算（数字と + - × ÷ * / % ^ ( ) だけ。eval は使わない）
  function calc(q) {
    var src = q.replace(/[×xX]/g, "*").replace(/÷/g, "/").replace(/[，,]/g, "").replace(/＝|=\s*$/g, "").replace(/\s+/g, "");
    if (!/^[\d.+\-*/%^()]+$/.test(src) || !/\d/.test(src) || !/[+\-*/%^]/.test(src.replace(/^-/, ""))) return null;
    var i = 0;
    function num() {
      if (src[i] === "(") { i++; var v = expr(); if (src[i] !== ")") throw 0; i++; return v; }
      if (src[i] === "-") { i++; return -factor(); }
      var m = /^\d*\.?\d+/.exec(src.slice(i));
      if (!m) throw 0;
      i += m[0].length;
      var n = parseFloat(m[0]);
      if (src[i] === "%") { i++; n /= 100; }
      return n;
    }
    function factor() { var b = num(); if (src[i] === "^") { i++; return Math.pow(b, factor()); } return b; }
    function term() { var v = factor(); while (src[i] === "*" || src[i] === "/") { var op = src[i++], r = factor(); v = op === "*" ? v * r : v / r; } return v; }
    function expr() { var v = term(); while (src[i] === "+" || src[i] === "-") { var op = src[i++], r = term(); v = op === "+" ? v + r : v - r; } return v; }
    try {
      var v = expr();
      if (i !== src.length || !isFinite(v)) return null;
      return String(Math.round(v * 1e10) / 1e10);
    } catch (e) { return null; }
  }
  function durText(ms) {
    var s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return [h ? t("{n} 時間", { n: h }) : "", m ? t("{n} 分", { n: m }) : "", sec ? t("{n} 秒", { n: sec }) : ""].filter(Boolean).join(" ");
  }
  function commands(q) {
    var top = [], end = [], m;
    var ms = parseTimer(q);
    if (ms) top.push({ title: t("タイマーを {time} で始める", { time: durText(ms) }), sub: t("Clock のタイマー。ほかのアプリを開いていても、時間になったら知らせます"), img: "/toolbox/clock/icon.svg", run: function () { startTimer(ms); } });
    var r = calc(q);
    if (r !== null) top.push({ title: q.trim().replace(/\*/g, "×").replace(/\//g, "÷") + " = " + r, sub: t("押すと答えをコピー"), img: "/toolbox/calc/icon.svg", copy: r });
    if ((m = /^(?:\+|todo|やること|タスク)\s*(.+)$/i.exec(q.trim()))) top.push(todoCmd(m[1]));
    else end.push(todoCmd(q.trim()));
    if ((m = /^(?:メモ|memo|note)\s+(.+)$/i.exec(q.trim()))) top.push(memoCmd(m[1]));
    else end.push(memoCmd(q.trim()));
    top.forEach(function (x) { x.group = t("コマンド"); x.cmd = true; });
    end.forEach(function (x) { x.group = t("コマンド"); x.cmd = true; });
    return { top: top, end: end };
  }
  function todoCmd(text) {
    var hint = "";
    if (window.SKReminders && SKReminders.parseQuick) {
      var p = SKReminders.parseQuick(text);
      hint = [p.due || "", p.time || ""].filter(Boolean).join(" ");
    }
    return { title: t("Todo に追加: {text}", { text: text }), sub: hint ? t("期限 {due}", { due: hint }) : t("「明日 9時」なども書けます"), img: "/toolbox/todo/icon.svg", run: function () { handOff("sk_quick_todo", text, "/toolbox/todo/"); } };
  }
  function memoCmd(text) {
    return { title: t("メモにする: {text}", { text: text }), sub: t("新しいメモを作って開きます"), img: "/toolbox/memo/icon.svg", run: function () { handOff("sk_quick_memo", text, "/toolbox/memo/"); } };
  }
  function handOff(key, text, url) {
    try { sessionStorage.setItem(key, text); } catch (e) { return; }
    if (location.pathname === url) location.reload(); else location.href = url;
  }
  function startTimer(ms) {
    var tools = readJson("sk_clock_tools");
    tools.timer = { duration: ms, endAt: Date.now() + ms, running: true, remaining: ms };
    try { localStorage.setItem("sk_clock_tools", JSON.stringify(tools)); } catch (e) { return; }
    // Clock を開いているなら、タイマーの画面に（ほかのタブの Clock には storage イベントで伝わる）
    if (location.pathname === "/toolbox/clock/") { location.hash = "#timer"; location.reload(); return; }
    document.dispatchEvent(new CustomEvent("sk-island-flash", { detail: { icon: "hourglass_top", text: t("タイマー {time}", { time: durText(ms) }), color: "#F0997B" } }));
  }

  function collect(q) {
    var out = [], ql = q.toLowerCase();
    function hit(s) { return String(s || "").toLowerCase().indexOf(ql) >= 0; }
    APPS.forEach(function (a) { if (hit(a.title) || hit(a.sub) || hit(a.words)) out.push({ group: t("アプリ"), title: a.title, sub: a.sub, img: a.icon, url: a.url }); });
    var memo = readJson("sk_memo");
    (Array.isArray(memo.notes) ? memo.notes : []).forEach(function (n) {
      if (!n || n.deleted || n.locked || typeof n.text !== "string" || !hit(n.text)) return;
      var lines = n.text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var line = lines.filter(function (l) { return hit(l); })[0] || lines[1] || "";
      out.push({ group: "Memo", title: lines[0] || t("新しいメモ"), sub: line !== lines[0] ? line : "", img: "/toolbox/memo/icon.svg", url: "/toolbox/memo/#" + encodeURIComponent(n.id) });
    });
    var todo = readJson("sk_todo");
    (Array.isArray(todo.tasks) ? todo.tasks : []).forEach(function (x) {
      if (!x || typeof x.text !== "string" || !(hit(x.text) || hit(x.notes))) return;
      out.push({ group: "Todo", title: x.text, sub: (x.done ? t("完了済み") : x.due ? x.due + (x.time ? " " + x.time : "") : "") + (x.notes ? (x.done || x.due ? " · " : "") + firstLine(x.notes) : ""), img: "/toolbox/todo/icon.svg", url: "/toolbox/todo/#task-" + encodeURIComponent(x.id), done: !!x.done });
    });
    var cd = readJson("sk_countdown");
    (Array.isArray(cd.events) ? cd.events : []).forEach(function (ev) {
      if (!ev || typeof ev.name !== "string" || !hit(ev.name)) return;
      out.push({ group: "Countdown", title: (ev.emoji ? ev.emoji + " " : "") + ev.name, sub: ev.date, img: "/toolbox/countdown/icon.svg", url: "/toolbox/countdown/" });
    });
    // 時間割の科目（自分の時間割）
    var tt = readJson("sk_timetable");
    var cells = tt.table && tt.table.cells && typeof tt.table.cells === "object" ? tt.table.cells : {};
    var seen = {};
    Object.keys(cells).forEach(function (k) {
      var c = cells[k];
      if (!c || typeof c.subject !== "string" || seen[c.subject] || !(hit(c.subject) || hit(c.room) || hit(c.teacher))) return;
      seen[c.subject] = 1;
      out.push({ group: "Timetable", title: c.subject, sub: [c.room, c.teacher].filter(Boolean).join(" · "), img: "/toolbox/timetable/icon.svg", url: "/toolbox/timetable/" });
    });
    var calc = readJson("sk_calc");
    (Array.isArray(calc.history) ? calc.history : []).slice(0, 100).forEach(function (h) {
      if (!h || !(hit(h.e) || hit(h.r))) return;
      out.push({ group: "Calc", title: h.e.replace(/\*/g, "×").replace(/\//g, "÷") + " = " + h.r, sub: t("押すと答えをコピー"), img: "/toolbox/calc/icon.svg", copy: h.r });
    });
    var cmd = commands(q);
    return cmd.top.concat(out.slice(0, 60), cmd.end);
  }

  var overlay = null, items = [], active = 0, opener = null;
  function render(input, list) {
    var q = input.value.trim();
    list.textContent = "";
    items = q ? collect(q) : [];
    active = 0;
    if (!q) {
      list.appendChild(el("p", "sks-hint", t("メモ・タスク・Countdown の日・計算の履歴・アプリをまとめて探せます")));
      list.appendChild(el("p", "sks-hint sks-hint--sub", t("コマンドも使えます: 「5分」でタイマー、「12*3」で計算、「todo 明日 宿題」で Todo に追加、「メモ …」で新しいメモ")));
      return;
    }
    if (!items.length) { list.appendChild(el("p", "sks-hint", t("見つかりませんでした。"))); return; }
    var group = null;
    items.forEach(function (it, i) {
      if (it.group !== group) { group = it.group; list.appendChild(el("p", "sks-group", group)); }
      var a = el(it.url ? "a" : "button", "sks-item m3-state" + (it.done ? " is-done" : ""));
      if (it.url) a.href = it.url; else a.type = "button";
      if (it.cmd) a.classList.add("is-cmd");
      a.id = "sks-item-" + i;
      a.setAttribute("role", "option");
      a.dataset.i = String(i);
      var img = el("img");
      img.src = it.img;
      img.alt = "";
      var text = el("span", "sks-item__text");
      text.append(el("span", "sks-item__title", it.title), el("span", "sks-item__sub", it.sub || ""));
      a.append(img, text, icon(it.url ? "arrow_outward" : it.run ? "keyboard_return" : "content_copy"));
      list.appendChild(a);
    });
    highlight(input, list);
  }
  function highlight(input, list) {
    Array.prototype.forEach.call(list.querySelectorAll(".sks-item"), function (a) { a.setAttribute("aria-selected", String(+a.dataset.i === active)); });
    var cur = list.querySelector('[data-i="' + active + '"]');
    if (cur) { cur.scrollIntoView({ block: "nearest" }); input.setAttribute("aria-activedescendant", cur.id); }
  }
  function choose(i) {
    var it = items[i];
    if (!it) return;
    if (it.run) { close(); it.run(); return; }
    if (it.copy) {
      if (navigator.clipboard) navigator.clipboard.writeText(it.copy);
      close();
      return;
    }
    close();
    // 同じページの中（ハッシュだけちがう）なら、開き直す
    var u = new URL(it.url, location.href);
    if (u.pathname === location.pathname && u.hash) { location.hash = u.hash; location.reload(); }
    else location.href = it.url;
  }
  function open() {
    if (overlay) return;
    opener = document.activeElement;
    overlay = el("div", "sks-overlay");
    var panel = el("div", "sks-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", t("Toolbox を検索"));
    var bar = el("label", "sks-bar");
    var input = el("input");
    input.type = "search";
    input.placeholder = t("検索・コマンド（5分・12*3・todo …）");
    input.setAttribute("aria-label", t("Toolbox を検索"));
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", "sks-list");
    input.autocomplete = "off";
    var kbd = el("kbd", "sks-kbd", "Esc");
    bar.append(icon("search"), input, kbd);
    var list = el("div", "sks-list");
    list.id = "sks-list";
    list.setAttribute("role", "listbox");
    panel.append(bar, list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    input.focus();
    render(input, list);
    input.addEventListener("input", function () { render(input, list); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
        highlight(input, list);
      } else if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    list.addEventListener("click", function (e) {
      var a = e.target.closest("[data-i]");
      if (!a) return;
      e.preventDefault();
      choose(+a.dataset.i);
    });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }
  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    if (opener && opener.focus) opener.focus();
  }
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      e.stopPropagation();
      if (overlay) close(); else open();
    }
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-open-search]");
    if (b) { e.preventDefault(); open(); }
  });
  window.SKSearch = { open: open, close: close };
})();
