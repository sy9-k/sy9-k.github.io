// SK's Toolbox の横断検索（Ctrl+K・Mac は ⌘K。[data-open-search] のボタンでも開く）
//   メモ（sk_memo）・タスク（sk_todo）・Countdown の日（sk_countdown）・時間割の科目（sk_timetable）・計算の履歴（sk_calc）・アプリと機能を、まとめて探す
//   どれも、この端末の localStorage を読むだけ（どこにも送らない）。ロックしたメモの中身は探さない
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
    return out.slice(0, 60);
  }

  var overlay = null, items = [], active = 0, opener = null;
  function render(input, list) {
    var q = input.value.trim();
    list.textContent = "";
    items = q ? collect(q) : [];
    active = 0;
    if (!q) { list.appendChild(el("p", "sks-hint", t("メモ・タスク・Countdown の日・計算の履歴・アプリをまとめて探せます"))); return; }
    if (!items.length) { list.appendChild(el("p", "sks-hint", t("見つかりませんでした。"))); return; }
    var group = null;
    items.forEach(function (it, i) {
      if (it.group !== group) { group = it.group; list.appendChild(el("p", "sks-group", group)); }
      var a = el(it.url ? "a" : "button", "sks-item m3-state" + (it.done ? " is-done" : ""));
      if (it.url) a.href = it.url; else a.type = "button";
      a.id = "sks-item-" + i;
      a.setAttribute("role", "option");
      a.dataset.i = String(i);
      var img = el("img");
      img.src = it.img;
      img.alt = "";
      var text = el("span", "sks-item__text");
      text.append(el("span", "sks-item__title", it.title), el("span", "sks-item__sub", it.sub || ""));
      a.append(img, text, icon(it.url ? "arrow_outward" : "content_copy"));
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
    input.placeholder = t("Toolbox を検索");
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
