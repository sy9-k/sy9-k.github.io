// Memo（SK's Toolbox）
//   ・メモは localStorage の sk_memo に保存する（SK Hub Systems には送らない）
//       { notes: [{ id, text, pinned, created, updated }] }。テーマなどは共通の設定（/toolbox/shared/settings.js）
//   ・1 行目がタイトル。書くと少し待ってから自動で保存する。空のまま離れたメモは消す
//   ・せまい画面では、メモを開くと履歴（history.pushState）に積む。端末の「戻る」で一覧に戻れる
//   ・バックアップ（JSON）の書き出し・読み込み。読み込みは同じ id なら新しいほうを残す
//   ・?embed のときは /toolbox/ の見本として、見本のメモを表示だけする（保存したメモは読まない）
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function $(id) { return document.getElementById(id); }

  // ---- 保存 ----
  var STORE = "sk_memo";
  var data = { notes: [] };
  function valid(n) { return n && typeof n.id === "string" && typeof n.text === "string"; }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}");
      data.notes = Array.isArray(d.notes) ? d.notes.filter(valid) : [];
    } catch (e) { /* 初期値のまま */ }
  }
  function save() {
    if (embed) return true;
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
      return true;
    } catch (e) {
      say(t("保存できませんでした。端末の空き容量を確認してください"));
      return false;
    }
  }

  if (embed) {
    root.classList.add("is-embed");
    var now = Date.now();
    data.notes = [
      { id: "a", pinned: true, created: now, updated: now - 6e5, text: [t("買い物リスト"), t("・牛乳"), t("・食パン"), t("・トマト"), t("・コーヒー豆")].join("\n") },
      { id: "b", pinned: false, created: now, updated: now - 36e5, text: [t("週末にやりたいこと"), t("映画を見る。部屋の模様替え。")].join("\n") },
      { id: "c", pinned: false, created: now, updated: now - 864e5, text: [t("アイデア"), t("Toolbox に入れたい道具を考える")].join("\n") }
    ];
  } else {
    load();
  }

  // ---- 文字 ----
  var timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  var dayFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  var fullFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
  var longFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  function shortDate(time) {
    var d = new Date(time), now = new Date();
    if (d.toDateString() === now.toDateString()) return timeFmt.format(d);
    if (d.getFullYear() === now.getFullYear()) return dayFmt.format(d);
    return fullFmt.format(d);
  }
  function lines(text) { return text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean); }
  function title(n) { return lines(n.text)[0] || t("新しいメモ"); }
  function snippet(n) { return lines(n.text).slice(1).join(" ").slice(0, 120); }

  // ---- 一覧 ----
  var app = $("app"), listEl = $("list"), searchEl = $("search");
  var narrow = window.matchMedia("(max-width: 760px)");
  var currentId = null;

  function sorted() {
    return data.notes.slice().sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.updated || 0) - (a.updated || 0);
    });
  }
  function find(id) { for (var i = 0; i < data.notes.length; i++) if (data.notes[i].id === id) return data.notes[i]; return null; }

  function renderList() {
    var q = searchEl.value.trim().toLowerCase();
    var notes = sorted().filter(function (n) { return !q || n.text.toLowerCase().indexOf(q) >= 0; });
    listEl.textContent = "";
    var hasPinned = notes.some(function (n) { return n.pinned; });
    var section = null;
    notes.forEach(function (n) {
      var s = n.pinned ? "pin" : "all";
      if (hasPinned && s !== section) {
        section = s;
        var h = document.createElement("p");
        h.className = "list__head";
        h.textContent = s === "pin" ? t("ピン留め") : t("メモ");
        listEl.appendChild(h);
      }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "note m3-state";
      b.dataset.id = n.id;
      if (n.id === currentId) b.setAttribute("aria-current", "true");
      var body = document.createElement("span");
      body.className = "note__body";
      var tt = document.createElement("span");
      tt.className = "note__title";
      tt.textContent = title(n);
      var meta = document.createElement("span");
      meta.className = "note__meta";
      var time = document.createElement("time");
      time.dateTime = new Date(n.updated || 0).toISOString();
      time.textContent = shortDate(n.updated || 0);
      var sn = document.createElement("span");
      sn.textContent = snippet(n);
      meta.append(time, sn);
      body.append(tt, meta);
      b.appendChild(body);
      if (n.pinned) {
        var pin = document.createElement("span");
        pin.className = "msr msr--fill";
        pin.setAttribute("aria-hidden", "true");
        pin.textContent = "push_pin";
        b.appendChild(pin);
      }
      listEl.appendChild(b);
    });
    $("list-empty").hidden = data.notes.length > 0;
    $("search-empty").hidden = !(q && data.notes.length && !notes.length);
  }

  // ---- 本文 ----
  var textEl = $("text"), statusEl = $("status"), countEl = $("count"), datesEl = $("dates"), pinBtn = $("btn-pin");

  function renderEditor() {
    var n = find(currentId);
    app.classList.toggle("has-note", !!n);
    if (!n) return;
    if (textEl.value !== n.text) textEl.value = n.text;
    pinBtn.setAttribute("aria-pressed", String(!!n.pinned));
    renderInfo(n);
  }
  function renderInfo(n) {
    countEl.textContent = t("{n} 文字", { n: Array.from(n.text.replace(/\n/g, "")).length.toLocaleString(locale) });
    datesEl.textContent = t("更新 {date}", { date: longFmt.format(new Date(n.updated || 0)) });
  }

  // 空のまま離れたメモは消す
  function dropIfEmpty(id) {
    var n = find(id);
    if (n && !n.text.trim()) {
      data.notes = data.notes.filter(function (x) { return x.id !== id; });
      save();
    }
  }

  function open(id, push) {
    flush();
    if (currentId && currentId !== id) dropIfEmpty(currentId);
    currentId = id;
    statusEl.textContent = "";
    app.classList.toggle("is-editing", !!id);
    if (push && id && narrow.matches && !embed) history.pushState({ memo: id }, "", "#" + id);
    else if (!embed) history.replaceState(id ? { memo: id } : null, "", id ? "#" + id : location.pathname + location.search);
    renderEditor();
    renderList();
  }
  function closeEditor() {
    if (history.state && history.state.memo) history.back();
    else open(null, false);
  }

  function newNote() {
    var now = Date.now();
    var n = { id: now.toString(36) + Math.random().toString(36).slice(2, 7), text: "", pinned: false, created: now, updated: now };
    data.notes.push(n);
    searchEl.value = "";
    open(n.id, true);
    textEl.focus();
  }

  // 書いたら少し待って保存
  var saveTimer = null, dirty = false;
  function flush() {
    if (!dirty) return;
    clearTimeout(saveTimer);
    dirty = false;
    if (save()) statusEl.textContent = t("保存しました");
  }

  // ---- テーマ・テーマカラー（共通の設定。/toolbox/shared/settings.js が <html> と --md-* に入れる）----
  // ここでは、ブラウザの上の帯の色（theme-color）だけ合わせる
  var themeColor = $("theme-color");
  function applyTheme() {
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue(narrow.matches ? "--md-surface" : "--md-surface-container").trim() || "#faebe0";
  }

  // ---- 通知（「元に戻す」つき）----
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

  // ---- ファイル ----
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }

  if (window.SKToolbox) SKToolbox.onChange(applyTheme); else applyTheme();
  var startId = decodeURIComponent(location.hash.slice(1));
  if (embed) {
    currentId = "a";
    app.classList.add("has-note");
    renderEditor();
    renderList();
    textEl.readOnly = true;
    return;
  }
  if (startId && find(startId)) open(startId, false);
  else { if (location.hash) history.replaceState(null, "", location.pathname + location.search); renderList(); renderEditor(); }

  // ---- 操作 ----
  listEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-id]");
    if (b) open(b.dataset.id, true);
  });
  $("btn-new").addEventListener("click", newNote);
  $("btn-back").addEventListener("click", closeEditor);
  searchEl.addEventListener("input", renderList);

  textEl.addEventListener("input", function () {
    var n = find(currentId);
    if (!n) return;
    n.text = textEl.value;
    n.updated = Date.now();
    statusEl.textContent = t("保存中…");
    renderInfo(n);
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { flush(); renderList(); }, 400);
  });

  pinBtn.addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    n.pinned = !n.pinned;
    save();
    renderEditor();
    renderList();
    say(n.pinned ? t("ピン留めしました") : t("ピン留めを外しました"));
  });

  $("btn-delete").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    flush();
    var removed = n;
    data.notes = data.notes.filter(function (x) { return x.id !== removed.id; });
    save();
    if (narrow.matches) closeEditor(); else open(null, false);
    say(t("メモを削除しました"), function () {
      data.notes.push(removed);
      save();
      open(removed.id, true);
    });
  });

  $("btn-download").addEventListener("click", function () {
    var n = find(currentId);
    if (!n || !n.text.trim()) return;
    var name = title(n).replace(/[\\\/:*?"<>|]/g, "").slice(0, 40).trim() || "memo";
    download(name + ".txt", n.text, "text/plain;charset=utf-8");
  });

  // メニュー
  var menu = $("menu"), menuBtn = $("btn-menu");
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button").focus();
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".menu-wrap")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); return; }
    if (e.key === "Escape" && narrow.matches && currentId) closeEditor();
  });

  $("btn-export").addEventListener("click", function () {
    setMenu(false);
    flush();
    var backup = { app: "sk-memo", version: 1, exportedAt: new Date().toISOString(), notes: data.notes };
    download("memo-backup-" + stamp() + ".json", JSON.stringify(backup, null, 2), "application/json");
  });
  $("btn-import").addEventListener("click", function () { setMenu(false); $("import-file").click(); });
  $("import-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    file.text().then(function (text) {
      var d = JSON.parse(text);
      var notes = (Array.isArray(d) ? d : d && d.notes) || [];
      notes = notes.filter(valid);
      if (!notes.length) throw new Error("empty");
      var added = 0;
      notes.forEach(function (n) {
        var mine = find(n.id);
        var note = { id: n.id, text: n.text, pinned: !!n.pinned, created: Number(n.created) || Date.now(), updated: Number(n.updated) || Date.now() };
        if (!mine) { data.notes.push(note); added++; }
        else if (note.updated > (mine.updated || 0)) { Object.assign(mine, note); added++; }
      });
      save();
      renderList();
      renderEditor();
      say(t("{n} 件のメモを読み込みました", { n: added }));
    }).catch(function () { say(t("読み込めませんでした。Memo のバックアップのファイルを選んでください")); });
  });

  narrow.addEventListener("change", applyTheme);

  // 端末の「戻る」
  window.addEventListener("popstate", function (e) {
    var id = e.state && e.state.memo;
    open(id && find(id) ? id : null, false);
  });

  // 閉じる前に保存
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });

  // ほかのタブで書いたとき
  window.addEventListener("storage", function (e) {
    if (e.key !== STORE) return;
    var editing = document.activeElement === textEl;
    var mine = editing ? find(currentId) : null;
    load();
    if (mine) {
      var other = find(mine.id);
      if (other) Object.assign(other, mine); else data.notes.push(mine);
    }
    applyTheme();
    if (currentId && !find(currentId)) open(null, false);
    renderList();
    if (!editing) renderEditor();
  });
})();
