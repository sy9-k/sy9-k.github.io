// Todo（SK's Toolbox）
//   ・タスクは localStorage の sk_todo に保存する（SK Hub Systems には送らない）
//       { filter: "all|open|done",
//         tasks: [{ id, text, done, star, due: "YYYY-MM-DD" | null, created, updated, doneAt }] }
//   ・未完了は「★ → 期限の近い順 → 追加した順」、完了は「完了した新しい順」に並べる
//   ・文字を押すとその場で直せる。期限は見えない <input type="date"> の showPicker() で選ぶ
//   ・?embed のときは /toolbox/ の見本として、見本のタスクを表示だけする（保存したタスクは読まない）
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function $(id) { return document.getElementById(id); }

  // ---- 日付 ----
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  var dayFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", weekday: "short" });
  var yearFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
  function dueInfo(due) {
    var d = parseYmd(due);
    if (!d) return null;
    var today = parseYmd(ymd(new Date()));
    var diff = Math.round((d - today) / 864e5);
    var label = diff === 0 ? t("今日") : diff === 1 ? t("明日") : diff === -1 ? t("昨日")
      : (d.getFullYear() === today.getFullYear() ? dayFmt : yearFmt).format(d);
    return { label: label, today: diff === 0, over: diff < 0 };
  }

  // ---- 保存 ----
  var STORE = "sk_todo";
  var data = { filter: "all", tasks: [] };
  function valid(x) { return x && typeof x.id === "string" && typeof x.text === "string"; }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}");
      data.filter = ["all", "open", "done"].indexOf(d.filter) >= 0 ? d.filter : "all";
      data.tasks = Array.isArray(d.tasks) ? d.tasks.filter(valid) : [];
    } catch (e) { /* 初期値のまま */ }
  }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(data)); }
    catch (e) { say(t("保存できませんでした。端末の空き容量を確認してください")); }
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function find(id) { for (var i = 0; i < data.tasks.length; i++) if (data.tasks[i].id === id) return data.tasks[i]; return null; }
  function touch(task) { task.updated = Date.now(); }

  if (embed) {
    root.classList.add("is-embed");
    var now = Date.now(), today = new Date();
    var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    data.tasks = [
      { id: "a", text: t("レポートを提出する"), done: false, star: true, due: ymd(today), created: now },
      { id: "b", text: t("牛乳を買う"), done: false, star: false, due: ymd(tomorrow), created: now + 1 },
      { id: "c", text: t("部屋の掃除"), done: false, star: false, due: null, created: now + 2 },
      { id: "d", text: t("本を返す"), done: true, star: false, due: null, created: now, doneAt: now }
    ];
  } else {
    load();
  }

  // ---- 表示 ----
  var listEl = $("tasks"), doneListEl = $("done-tasks"), doneSection = $("done-section");
  var lastAdded = null;

  function openSorted() {
    return data.tasks.filter(function (x) { return !x.done; }).sort(function (a, b) {
      if (!!a.star !== !!b.star) return a.star ? -1 : 1;
      if ((a.due || "") !== (b.due || "")) {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due < b.due ? -1 : 1;
      }
      return (a.created || 0) - (b.created || 0);
    });
  }
  function doneSorted() {
    return data.tasks.filter(function (x) { return x.done; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
  }

  function icon(name) {
    var s = document.createElement("span");
    s.className = "msr";
    s.setAttribute("aria-hidden", "true");
    s.textContent = name;
    return s;
  }
  function iconButton(cls, name, label, act) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "icon-btn m3-state " + cls;
    b.dataset.act = act;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.appendChild(icon(name));
    return b;
  }

  function taskEl(task) {
    var li = document.createElement("li");
    li.className = "task" + (task.done ? " is-done" : "") + (task.id === lastAdded ? " is-new" : "");
    li.dataset.id = task.id;

    var check = document.createElement("button");
    check.type = "button";
    check.className = "check m3-state";
    check.dataset.act = "done";
    check.setAttribute("role", "checkbox");
    check.setAttribute("aria-checked", String(!!task.done));
    check.setAttribute("aria-label", t("完了にする"));
    var box = document.createElement("span");
    box.className = "check__box";
    box.appendChild(icon("check"));
    check.appendChild(box);

    var body = document.createElement("div");
    body.className = "task__body";
    var text = document.createElement("span");
    text.className = "task__text";
    text.dataset.act = "edit";
    text.textContent = task.text;
    body.appendChild(text);
    var info = dueInfo(task.due);
    if (info) {
      var meta = document.createElement("div");
      meta.className = "task__meta";
      var due = document.createElement("button");
      due.type = "button";
      due.className = "due" + (!task.done && info.today ? " is-today" : "") + (!task.done && info.over ? " is-over" : "");
      due.dataset.act = "due";
      due.title = t("期限を変える");
      due.appendChild(icon(!task.done && info.over ? "event_busy" : "event"));
      due.appendChild(document.createTextNode(info.label));
      meta.appendChild(due);
      body.appendChild(meta);
    }

    li.append(check, body);
    if (!task.due && !task.done) li.appendChild(iconButton("set-due", "event", t("期限を決める"), "due"));
    var star = iconButton("star", "star", t("重要"), "star");
    star.setAttribute("aria-pressed", String(!!task.star));
    li.appendChild(star);
    li.appendChild(iconButton("del", "delete", t("削除"), "del"));
    return li;
  }

  function render() {
    var open = openSorted(), done = doneSorted(), total = data.tasks.length;
    listEl.textContent = "";
    doneListEl.textContent = "";
    var f = data.filter;
    if (f === "done") done.forEach(function (x) { listEl.appendChild(taskEl(x)); });
    else open.forEach(function (x) { listEl.appendChild(taskEl(x)); });
    if (f === "all") done.forEach(function (x) { doneListEl.appendChild(taskEl(x)); });
    doneSection.hidden = f !== "all" || !done.length;
    $("done-title").textContent = t("完了（{n}）", { n: done.length });
    lastAdded = null;

    // 何もないとき
    var shown = f === "done" ? done.length : open.length + (f === "all" ? done.length : 0);
    var empty = $("empty");
    empty.hidden = shown > 0;
    $("empty-text").textContent = !total ? t("タスクはまだありません。上の欄から追加しましょう。")
      : f === "open" ? t("すべて完了しました。おつかれさまです！")
      : t("完了したタスクはありません。");

    // 件数と進み具合
    $("count").textContent = total ? t("{done} / {total} 件完了", { done: done.length, total: total }) : "";
    var pct = total ? done.length / total : 0;
    $("progress-bar").style.transform = "scaleX(" + pct + ")";
    $("progress").setAttribute("aria-valuenow", String(Math.round(pct * 100)));
    document.querySelectorAll("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === f)); });
  }

  // ---- テーマ・テーマカラー（共通の設定。/toolbox/shared/settings.js が <html> と --md-* に入れる）----
  // ここでは、ブラウザの上の帯の色（theme-color）だけ合わせる
  var themeColor = $("theme-color");
  function applyTheme() {
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue("--md-surface").trim() || "#f9faef";
  }

  // ---- スナックバー（「元に戻す」つき）----
  var toast = $("toast"), toastText = $("toast-text"), toastAction = $("toast-action"), toastTimer, toastUndo = null;
  function say(text, undo) {
    toastText.textContent = text;
    toastUndo = undo || null;
    toastAction.hidden = !undo;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); toastUndo = null; }, undo ? 6000 : 2200);
  }
  toastAction.addEventListener("click", function () {
    if (toastUndo) toastUndo();
    toastUndo = null;
    toast.classList.remove("is-on");
  });

  if (window.SKToolbox) SKToolbox.onChange(applyTheme); else applyTheme();
  render();
  if (embed) return;

  // ---- 追加 ----
  var form = $("add-form"), addText = $("add-text"), addBtn = $("btn-add"), addDue = $("add-due");
  var pendingDue = null;
  function renderPendingDue() {
    var info = dueInfo(pendingDue);
    addDue.hidden = !info;
    $("btn-add-date").hidden = !!info;
    if (!info) return;
    addDue.textContent = "";
    addDue.appendChild(icon("event"));
    addDue.appendChild(document.createTextNode(info.label));
    addDue.appendChild(icon("close"));
    addDue.setAttribute("aria-label", t("期限を外す") + " (" + info.label + ")");
  }
  addText.addEventListener("input", function () { addBtn.disabled = !addText.value.trim(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = addText.value.trim();
    if (!text) return;
    var task = { id: newId(), text: text, done: false, star: false, due: pendingDue, created: Date.now() };
    touch(task);
    data.tasks.push(task);
    if (data.filter === "done") data.filter = "all";
    lastAdded = task.id;
    addText.value = "";
    addBtn.disabled = true;
    pendingDue = null;
    renderPendingDue();
    save();
    render();
    addText.focus();
  });
  addDue.addEventListener("click", function () { pendingDue = null; renderPendingDue(); addText.focus(); });

  // ---- 期限（見えない日付の欄を開く）----
  var picker = $("date-picker"), pickerFor = null;
  function pickDate(forId, current) {
    pickerFor = forId;
    picker.value = current || ymd(new Date());
    if (typeof picker.showPicker === "function") {
      try { picker.showPicker(); return; } catch (e) { /* 下へ */ }
    }
    picker.focus();
    picker.click();
  }
  picker.addEventListener("change", function () {
    var v = /^\d{4}-\d{2}-\d{2}$/.test(picker.value) ? picker.value : null;
    if (pickerFor === "new") { pendingDue = v; renderPendingDue(); addText.focus(); return; }
    var task = find(pickerFor);
    if (!task) return;
    task.due = v;
    touch(task);
    save();
    render();
  });
  $("btn-add-date").addEventListener("click", function () { pickDate("new", pendingDue); });

  // ---- タスクの操作 ----
  function onListClick(e) {
    var actEl = e.target.closest("[data-act]");
    var li = e.target.closest(".task");
    if (!actEl || !li) return;
    var task = find(li.dataset.id);
    if (!task) return;
    var act = actEl.dataset.act;
    if (act === "done") {
      if (window.SKToolbox) SKToolbox.vibrate();
      task.done = !task.done;
      task.doneAt = task.done ? Date.now() : null;
      touch(task);
      save();
      // チェックの動きを見せてから並べかえる
      li.classList.toggle("is-done", task.done);
      actEl.setAttribute("aria-checked", String(task.done));
      li.classList.add("is-leaving");
      setTimeout(render, 320);
      if (task.done && !openSorted().length) say(t("すべて完了しました。おつかれさまです！"));
    } else if (act === "star") {
      task.star = !task.star;
      touch(task);
      save();
      render();
    } else if (act === "due") {
      pickDate(task.id, task.due);
    } else if (act === "del") {
      removeTasks([task], t("タスクを削除しました"));
    } else if (act === "edit") {
      startEdit(li, task);
    }
  }
  listEl.addEventListener("click", onListClick);
  doneListEl.addEventListener("click", onListClick);

  function removeTasks(tasks, message) {
    var ids = tasks.map(function (x) { return x.id; });
    data.tasks = data.tasks.filter(function (x) { return ids.indexOf(x.id) < 0; });
    save();
    render();
    say(message, function () {
      tasks.forEach(function (x) { if (!find(x.id)) data.tasks.push(x); });
      save();
      render();
    });
  }

  // その場で直す
  function startEdit(li, task) {
    var text = li.querySelector(".task__text");
    if (!text) return;
    var input = document.createElement("input");
    input.type = "text";
    input.className = "task__edit";
    input.value = task.text;
    input.maxLength = 300;
    input.setAttribute("aria-label", t("タスクを編集"));
    text.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var finished = false;
    function finish(commit) {
      if (finished) return;
      finished = true;
      var v = input.value.trim();
      if (commit && v && v !== task.text) { task.text = v; touch(task); save(); }
      if (commit && !v) { removeTasks([task], t("タスクを削除しました")); return; }
      render();
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); finish(true); }
      else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", function () { finish(true); });
  }

  // 絞り込み
  document.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () { data.filter = b.dataset.filter; save(); render(); });
  });

  // ---- メニュー ----
  var menu = $("menu"), menuBtn = $("btn-menu");
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button").focus();
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".menu-wrap")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  $("btn-clear-done").addEventListener("click", function () {
    setMenu(false);
    var done = data.tasks.filter(function (x) { return x.done; });
    if (!done.length) { say(t("完了したタスクはありません。")); return; }
    removeTasks(done, t("完了したタスクを {n} 件削除しました", { n: done.length }));
  });

  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  $("btn-export").addEventListener("click", function () {
    setMenu(false);
    var backup = { app: "sk-todo", version: 1, exportedAt: new Date().toISOString(), tasks: data.tasks };
    download("todo-backup-" + ymd(new Date()).replace(/-/g, "") + ".json", JSON.stringify(backup, null, 2));
  });
  $("btn-import").addEventListener("click", function () { setMenu(false); $("import-file").click(); });
  $("import-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    file.text().then(function (text) {
      var d = JSON.parse(text);
      var tasks = ((Array.isArray(d) ? d : d && d.tasks) || []).filter(valid);
      if (!tasks.length) throw new Error("empty");
      var added = 0;
      tasks.forEach(function (x) {
        var task = {
          id: x.id, text: x.text, done: !!x.done, star: !!x.star,
          due: parseYmd(x.due) ? x.due : null,
          created: Number(x.created) || Date.now(), updated: Number(x.updated) || Number(x.created) || Date.now(),
          doneAt: Number(x.doneAt) || null
        };
        var mine = find(task.id);
        if (!mine) { data.tasks.push(task); added++; }
        else if (task.updated > (mine.updated || 0)) { Object.assign(mine, task); added++; }
      });
      save();
      render();
      say(t("{n} 件のタスクを読み込みました", { n: added }));
    }).catch(function () { say(t("読み込めませんでした。Todo のバックアップのファイルを選んでください")); });
  });


  // ほかのタブで変えたとき（直している途中なら待つ）
  window.addEventListener("storage", function (e) {
    if (e.key !== STORE) return;
    load();
    applyTheme();
    if (!document.querySelector(".task__edit")) render();
  });
  // 日付が変わったら「今日」「明日」を出し直す
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && !document.querySelector(".task__edit")) render();
  });
})();
