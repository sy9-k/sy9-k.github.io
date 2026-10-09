// Memo（SK's Toolbox）— Apple のメモのような、書式つきのメモ帳
//   ・メモは localStorage の sk_memo に保存する（オンライン同期をオンにしたときだけ、暗号化して SK Hub Systems アカウントにも保存する。/toolbox/shared/sync.js）。画像は同期しない
//       { version: 2, sort: "updated|created|title", view: フォルダの id,
//         folders: [{ id, name }],
//         notes: [{ id, html, text, folder, pinned, created, updated, deleted? }] }
//       html … 本文（下の sanitize() を通した HTML。画像は <img data-img="id"> だけで、中身は IndexedDB）
//       text … 本文の文字だけ（一覧・検索・ホーム画面のウィジェット用。1 行目がタイトル）
//       deleted … 「最近削除した項目」に入れた時刻。30 日たつと完全に消す
//     テーマなどは共通の設定（/toolbox/shared/settings.js）
//   ・画像は IndexedDB（sk_toolbox_memo の images）に保存する。localStorage に入れると、すぐ容量がいっぱいになるため。
//     どちらも、この端末のブラウザの中だけ。大きい画像は長い辺 1600px に縮めてから保存する
//   ・本文は contenteditable。書式は document.execCommand（太字・斜体・下線・取り消し線・リスト・見出し…）
//     チェックリストは <ul class="checklist">、チェックしたものは <li class="checked">
//   ・貼り付け・読み込んだ HTML は sanitize() で、決まったタグと属性だけにする（ほかのサイトのスクリプトなどが動かないように）
//   ・せまい画面では、メモを開くと履歴（history.pushState）に積む。端末の「戻る」で一覧に戻れる
//   ・#new で開くと、すぐ新しいメモを書きはじめる（ホーム画面の「新しいメモ」）
//   ・ロック（パスワードで本文を暗号化）・#タグで絞り込み・画像の拡大・音声入力・PDF（印刷）・選んだ文字を Todo のタスクに
//   ・?embed のときは見本のメモを表示だけする（保存したメモは読まない）
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s, p) { return I18N ? I18N.t(s, p) : s.replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name, cls) { var s = el("span", "msr" + (cls ? " " + cls : ""), name); s.setAttribute("aria-hidden", "true"); return s; }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ================================================================
  // 本文の HTML を安全にする（決まったタグと属性だけ残す）
  // ================================================================
  var KEEP = { DIV: 1, P: 1, BR: 1, H1: 1, H2: 1, H3: 1, B: 1, I: 1, U: 1, S: 1, MARK: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1, A: 1, IMG: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, HR: 1 };
  var RENAME = { STRONG: "B", EM: "I", STRIKE: "S", DEL: "S", INS: "U", H4: "H3", H5: "H3", H6: "H3", DT: "DIV", DD: "DIV", ARTICLE: "DIV", SECTION: "DIV", HEADER: "DIV", FOOTER: "DIV", MAIN: "DIV", FIGURE: "DIV", FIGCAPTION: "DIV" };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, NOSCRIPT: 1, SVG: 1, MATH: 1, META: 1, LINK: 1, TITLE: 1, HEAD: 1, FORM: 1, INPUT: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, SOURCE: 1, PICTURE: 1 };
  function safeHref(h) { h = String(h || "").trim(); return /^(https?:|mailto:|tel:)/i.test(h) ? h : ""; }
  function clean(src, out) {
    Array.prototype.forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toUpperCase();
      if (DROP[tag]) return;
      tag = RENAME[tag] || tag;
      if (!KEEP[tag]) {
        // 知らないタグ（span など）は中身だけ残す。Google ドキュメントなどの太字・斜体（style）は b・i などにする
        var target = out, st = n.getAttribute && (n.getAttribute("style") || "");
        if (st) {
          [[/font-weight:\s*(bold|[6-9]00)/i, "b"], [/font-style:\s*italic/i, "i"], [/text-decoration[^;]*underline/i, "u"], [/text-decoration[^;]*line-through/i, "s"]].forEach(function (r) {
            if (r[0].test(st)) { var w = document.createElement(r[1]); target.appendChild(w); target = w; }
          });
        }
        clean(n, target);
        return;
      }
      var e = document.createElement(tag.toLowerCase());
      if (tag === "A") {
        var href = safeHref(n.getAttribute("href"));
        if (!href) { clean(n, out); return; }
        e.setAttribute("href", href);
      } else if (tag === "IMG") {
        var id = n.getAttribute("data-img");
        if (!id || !/^[a-z0-9]{6,40}$/.test(id)) return; // ほかのサイトの画像は入れない
        e.setAttribute("data-img", id);
      } else if (tag === "UL" && n.classList && n.classList.contains("checklist")) {
        e.className = "checklist";
      } else if (tag === "LI" && n.classList && n.classList.contains("checked")) {
        e.className = "checked";
      }
      out.appendChild(e);
      if (tag !== "IMG" && tag !== "BR" && tag !== "HR") clean(n, e);
    });
  }
  function sanitize(html) {
    var parsed = new DOMParser().parseFromString("<body>" + (html || "") + "</body>", "text/html");
    var box = document.createElement("div");
    clean(parsed.body, box);
    return box.innerHTML;
  }

  // 本文の文字だけ（一覧・検索・ウィジェット用）
  var BLOCK = { DIV: 1, P: 1, H1: 1, H2: 1, H3: 1, LI: 1, PRE: 1, BLOCKQUOTE: 1, TR: 1, TABLE: 1, UL: 1, OL: 1, HR: 1 };
  function htmlToText(html) {
    var box = new DOMParser().parseFromString("<body>" + (html || "") + "</body>", "text/html").body;
    var out = "";
    (function walk(node) {
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) { out += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName;
        if (tag === "BR") { out += "\n"; return; }
        if (tag === "TD" || tag === "TH") { walk(n); out += "  "; return; }
        if (BLOCK[tag] && out && !/\n$/.test(out)) out += "\n";
        walk(n);
        if (BLOCK[tag] && !/\n$/.test(out)) out += "\n";
      });
    })(box);
    return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function textToHtml(text) {
    return String(text || "").split("\n").map(function (l) { return "<div>" + (l ? esc(l) : "<br>") + "</div>"; }).join("");
  }
  function imageIds(html) {
    var ids = [], re = /data-img="([a-z0-9]+)"/g, m;
    while ((m = re.exec(html || ""))) ids.push(m[1]);
    return ids;
  }

  // ================================================================
  // 保存（localStorage）
  // ================================================================
  var STORE = "sk_memo", DEFAULT_FOLDER = "notes", TRASH_DAYS = 30;
  var data = { version: 2, sort: "updated", view: "all", folders: [], notes: [], lock: null };
  function validNote(n) { return n && typeof n.id === "string" && (typeof n.html === "string" || typeof n.text === "string"); }
  function upgrade(n) {
    if (n.locked && n.enc && typeof n.enc.iv === "string" && typeof n.enc.ct === "string") {
      // ロックしたメモ（中身は enc の暗号文だけ）
      n.locked = true;
      n.html = "";
      n.text = "";
      n.imgs = Array.isArray(n.imgs) ? n.imgs.filter(function (x) { return typeof x === "string"; }) : [];
    } else {
      delete n.locked; delete n.enc; delete n.imgs;
      // 1 つ前の形（text だけ）のメモ
      if (typeof n.html !== "string") n.html = textToHtml(n.text);
      n.html = sanitize(n.html);
      n.text = htmlToText(n.html);
    }
    if (!n.folder) n.folder = DEFAULT_FOLDER;
    n.pinned = !!n.pinned;
    n.created = Number(n.created) || Date.now();
    n.updated = Number(n.updated) || n.created;
    if (n.deleted) n.deleted = Number(n.deleted) || Date.now();
    return n;
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}") || {};
      data.sort = ["updated", "created", "title"].indexOf(d.sort) >= 0 ? d.sort : "updated";
      data.view = typeof d.view === "string" ? d.view : "all";
      data.folders = Array.isArray(d.folders) ? d.folders.filter(function (f) { return f && typeof f.id === "string" && typeof f.name === "string"; }) : [];
      data.notes = Array.isArray(d.notes) ? d.notes.filter(validNote).map(upgrade) : [];
      data.lock = validLock(d.lock) ? d.lock : null;
    } catch (e) { /* 初期値のまま */ }
    if (!folderById(data.view) && ["all", "trash", DEFAULT_FOLDER].indexOf(data.view) < 0 && !/^tag:/.test(data.view)) data.view = "all";
  }
  function save() {
    if (embed) return true;
    try {
      data.version = 2;
      localStorage.setItem(STORE, JSON.stringify(data));
      return true;
    } catch (e) {
      say(t("保存できませんでした。端末の空き容量を確認してください"));
      return false;
    }
  }
  function find(id) { for (var i = 0; i < data.notes.length; i++) if (data.notes[i].id === id) return data.notes[i]; return null; }
  function folderById(id) { for (var i = 0; i < data.folders.length; i++) if (data.folders[i].id === id) return data.folders[i]; return null; }
  function folderName(id) {
    if (id === DEFAULT_FOLDER) return t("メモ");
    var f = folderById(id);
    return f ? f.name : t("メモ");
  }

  // ================================================================
  // ロック（パスワードで本文を暗号化する。Web Crypto: PBKDF2 → AES-GCM）
  //   data.lock = { salt, iv, check } … パスワードが合っているかを確かめるための暗号文
  //   ロックしたメモは enc = { iv, ct }（中身は { html, text } の JSON）。html・text は空にして保存し、画像の id だけ imgs に残す
  //   パスワードを入れたら、このページを開いているあいだだけ鍵を覚える（sessionKey）。開いた中身は unlocked に
  // ================================================================
  var sessionKey = null, unlocked = {};
  var te = new TextEncoder(), td = new TextDecoder();
  var CHECK = "sk-memo-lock";
  function b64(buf) { var u = new Uint8Array(buf), s = ""; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function deriveKey(pw, salt) {
    return crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function encryptJson(key, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, te.encode(JSON.stringify(obj))).then(function (ct) { return { iv: b64(iv), ct: b64(ct) }; });
  }
  function decryptJson(key, box) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct)).then(function (pt) { return JSON.parse(td.decode(pt)); });
  }
  function validLock(l) { return !!(l && typeof l.salt === "string" && typeof l.iv === "string" && typeof l.check === "string"); }
  function canLock() { return !!(window.crypto && crypto.subtle && window.TextEncoder); }
  function lockField(label, input) { var w = el("label", "m3-field"); w.append(el("span", "m3-field__label", label), input); return w; }
  // はじめてロックするとき: パスワードを作る
  function createPassword() {
    var p1 = el("input", "m3-field__input"); p1.type = "password"; p1.autocomplete = "new-password"; p1.maxLength = 200;
    var p2 = el("input", "m3-field__input"); p2.type = "password"; p2.autocomplete = "new-password"; p2.maxLength = 200;
    var body = el("div", "lock-form");
    body.append(el("p", "tbs-dialog__text", t("ロックしたメモを開くときのパスワードです。忘れると、ロックしたメモは二度と開けません（SK にも戻せません）。")),
      lockField(t("パスワード"), p1), lockField(t("もう一度"), p2),
      el("p", "tbs-dialog__text", t("暗号化されるのは文字だけです。画像は暗号化されません。")));
    return window.M3.dialog({ title: t("メモのパスワードを作成"), icon: "lock", body: body, actions: [{ label: t("キャンセル"), value: null }, { label: t("作成"), primary: true, value: function () { return p1.value; } }] }).then(function (pw) {
      if (pw === null || pw === undefined) return null;
      if (pw.length < 4) { say(t("パスワードは 4 文字以上にしてください")); return null; }
      if (pw !== p2.value) { say(t("パスワードが一致しません")); return null; }
      var salt = crypto.getRandomValues(new Uint8Array(16));
      return deriveKey(pw, salt).then(function (key) {
        return encryptJson(key, CHECK).then(function (box) {
          data.lock = { salt: b64(salt), iv: box.iv, check: box.ct };
          sessionKey = key;
          save();
          return key;
        });
      });
    });
  }
  // パスワードを聞いて鍵を作る（合っていなければ null）
  function askPassword() {
    if (sessionKey) return Promise.resolve(sessionKey);
    if (!data.lock) return createPassword();
    var pw = el("input", "m3-field__input"); pw.type = "password"; pw.autocomplete = "current-password"; pw.maxLength = 200;
    return window.M3.dialog({ title: t("パスワードを入力"), icon: "lock", body: lockField(t("メモのパスワード"), pw),
      actions: [{ label: t("キャンセル"), value: null }, { label: t("開く"), primary: true, value: function () { return pw.value; } }],
      onReady: function (close) { pw.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); close(pw.value); } }); }
    }).then(function (value) {
      if (!value) return null;
      return deriveKey(value, unb64(data.lock.salt)).then(function (key) {
        return decryptJson(key, { iv: data.lock.iv, ct: data.lock.check }).then(function (v) {
          if (v !== CHECK) throw new Error("wrong");
          sessionKey = key;
          return key;
        });
      }).catch(function () { say(t("パスワードがちがいます")); return null; });
    });
  }
  function unlockNote(n) {
    return askPassword().then(function (key) {
      if (!key) return false;
      return decryptJson(key, n.enc).then(function (obj) {
        unlocked[n.id] = { html: sanitize(obj.html || ""), text: String(obj.text || "") };
        return true;
      }).catch(function () { say(t("このメモを開けませんでした（パスワードがちがう可能性があります）")); return false; });
    });
  }
  function isClosed(n) { return !!(n && n.locked && !unlocked[n.id]); }
  function noteHtml(n) { return n.locked ? (unlocked[n.id] ? unlocked[n.id].html : "") : n.html; }
  function noteText(n) { return n.locked ? (unlocked[n.id] ? unlocked[n.id].text : "") : n.text; }
  function noteImages(n) { return n.locked ? (unlocked[n.id] ? imageIds(unlocked[n.id].html) : (n.imgs || [])) : imageIds(n.html); }
  // ロックしたメモを、暗号化してから保存する
  function sealNote(n) {
    var u = unlocked[n.id];
    if (!u || !sessionKey) return Promise.resolve();
    n.imgs = imageIds(u.html);
    return encryptJson(sessionKey, u).then(function (box) { n.enc = box; n.html = ""; n.text = ""; save(); });
  }
  // #タグ（ロックしたメモは、開いているときだけ）
  function tagsOf(n) {
    var out = [], re = /(^|\s)#([^\s#.,!?、。！？「」()（）]+)/g, m, tx = noteText(n);
    while ((m = re.exec(tx))) if (out.indexOf(m[2]) < 0) out.push(m[2]);
    return out;
  }

  // ================================================================
  // 画像（IndexedDB）
  // ================================================================
  var IDB_NAME = "sk_toolbox_memo", IMG = "images";
  var dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error("no idb")); return; }
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(IMG); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(IMG, mode), store = tx.objectStore(IMG), result;
        var req = fn(store);
        if (req) req.onsuccess = function () { result = req.result; };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
  }
  var urls = {};
  function imageUrl(id) {
    if (urls[id]) return Promise.resolve(urls[id]);
    return idb("readonly", function (s) { return s.get(id); }).then(function (blob) {
      if (!blob) return null;
      urls[id] = URL.createObjectURL(blob);
      return urls[id];
    }).catch(function () { return null; });
  }
  // 長い辺 1600px までに縮めて、WebP（だめなら JPEG）にする。小さい GIF はそのまま（動きを残す）
  function shrink(file) {
    if (file.type === "image/gif" && file.size < 2e6) return Promise.resolve(file);
    var load = window.createImageBitmap ? createImageBitmap(file) : new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    return load.then(function (bmp) {
      var max = 1600, w = bmp.width, h = bmp.height, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (resolve) {
        c.toBlob(function (b) {
          if (b && b.type === "image/webp") { resolve(b); return; }
          c.toBlob(function (j) { resolve(j || file); }, "image/jpeg", 0.85);
        }, "image/webp", 0.85);
      });
    });
  }
  function storeImage(file) {
    return shrink(file).then(function (blob) {
      var id = newId();
      return idb("readwrite", function (s) { return s.put(blob, id); }).then(function () {
        urls[id] = URL.createObjectURL(blob);
        return id;
      });
    });
  }
  // どのメモにも使われていない画像を消す（ゴミ箱のメモの画像は残す）
  function cleanupImages() {
    if (embed) return;
    var used = {};
    data.notes.forEach(function (n) { noteImages(n).forEach(function (id) { used[id] = 1; }); });
    idb("readonly", function (s) { return s.getAllKeys(); }).then(function (keys) {
      var unused = (keys || []).filter(function (k) { return !used[k]; });
      if (unused.length) return idb("readwrite", function (s) { unused.forEach(function (k) { s.delete(k); }); });
    }).catch(function () { /* 画像がないとき */ });
  }
  // 本文の <img data-img> に、画像を入れる
  function hydrate(box) {
    Array.prototype.forEach.call(box.querySelectorAll("img[data-img]"), function (img) {
      var id = img.getAttribute("data-img");
      img.alt = "";
      if (urls[id]) { img.src = urls[id]; return; }
      imageUrl(id).then(function (u) { if (u) img.src = u; else img.alt = t("画像が見つかりません"); });
    });
  }

  // ================================================================
  // 見本（?embed）・読み込み
  // ================================================================
  if (embed) {
    root.classList.add("is-embed");
    var now = Date.now();
    data.notes = [
      { id: "a", folder: DEFAULT_FOLDER, pinned: true, created: now, updated: now - 6e5,
        html: "<div>" + esc(t("週末の買い物")) + "</div><ul class=\"checklist\"><li class=\"checked\">" + esc(t("牛乳")) + "</li><li class=\"checked\">" + esc(t("食パン")) + "</li><li>" + esc(t("トマト")) + "</li><li>" + esc(t("コーヒー豆")) + "</li></ul><h2>" + esc(t("メモ")) + "</h2><div>" + esc(t("お店は")) + " <b>" + esc(t("10 時から")) + "</b>" + esc(t("。ポイントカードを忘れずに。")) + "</div>" },
      { id: "b", folder: DEFAULT_FOLDER, pinned: false, created: now, updated: now - 36e5, html: "<div>" + esc(t("週末にやりたいこと")) + "</div><ul><li>" + esc(t("映画を見る")) + "</li><li>" + esc(t("部屋の模様替え")) + "</li></ul>" },
      { id: "c", folder: DEFAULT_FOLDER, pinned: false, created: now, updated: now - 864e5, html: "<div>" + esc(t("アイデア")) + "</div><div>" + esc(t("Toolbox に入れたい道具を考える")) + "</div>" }
    ].map(upgrade);
  } else {
    load();
    // 30 日たった「最近削除した項目」を消す
    var limit = Date.now() - TRASH_DAYS * 864e5;
    var before = data.notes.length;
    data.notes = data.notes.filter(function (n) { return !n.deleted || n.deleted > limit; });
    if (data.notes.length !== before) save();
    setTimeout(cleanupImages, 3000);
  }

  // ================================================================
  // 文字（日付）
  // ================================================================
  var timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  var dayFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  var fullFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
  var longFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  function shortDate(time) {
    var d = new Date(time), now = new Date();
    if (d.toDateString() === now.toDateString()) return timeFmt.format(d);
    if (d.getFullYear() === now.getFullYear()) return dayFmt.format(d);
    return fullFmt.format(d);
  }
  function lines(text) { return String(text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean); }
  function title(n) {
    if (isClosed(n)) return t("ロックされたメモ");
    return lines(noteText(n))[0] || (noteImages(n).length ? t("画像") : t("新しいメモ"));
  }
  function snippet(n) {
    if (isClosed(n)) return t("ロックされています");
    return lines(noteText(n)).slice(1).join(" ").slice(0, 120) || t("追加のテキストはありません");
  }

  // ================================================================
  // 一覧とフォルダ
  // ================================================================
  var app = $("app"), listEl = $("list"), searchEl = $("search"), foldersEl = $("folders");
  var narrow = window.matchMedia("(max-width: 760px)");
  var currentId = null;

  function visibleNotes() {
    var q = searchEl.value.trim().toLowerCase();
    var notes = data.notes.filter(function (n) {
      if (q) return !n.deleted && noteText(n).toLowerCase().indexOf(q) >= 0;
      if (data.view === "trash") return !!n.deleted;
      if (n.deleted) return false;
      if (/^tag:/.test(data.view)) return tagsOf(n).indexOf(data.view.slice(4)) >= 0;
      return data.view === "all" || n.folder === data.view;
    });
    var by = data.sort;
    notes.sort(function (a, b) {
      if (data.view !== "trash" && !!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (by === "title") return title(a).localeCompare(title(b), locale);
      if (by === "created") return (b.created || 0) - (a.created || 0);
      return (b.updated || 0) - (a.updated || 0);
    });
    return notes;
  }
  function countIn(view) {
    return data.notes.filter(function (n) {
      if (view === "trash") return !!n.deleted;
      if (/^tag:/.test(view)) return !n.deleted && tagsOf(n).indexOf(view.slice(4)) >= 0;
      return !n.deleted && (view === "all" || n.folder === view);
    }).length;
  }

  function renderFolders() {
    foldersEl.textContent = "";
    var items = [{ id: "all", name: t("すべて"), icon: "notes" }, { id: DEFAULT_FOLDER, name: t("メモ"), icon: "folder" }]
      .concat(data.folders.map(function (f) { return { id: f.id, name: f.name, icon: "folder" }; }))
      .concat([{ id: "trash", name: t("最近削除した項目"), icon: "delete" }]);
    items.forEach(function (f) {
      var b = el("button", "chip m3-state");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(data.view === f.id));
      b.dataset.folder = f.id;
      b.append(icon(f.icon), el("span", "", f.name), el("small", "", String(countIn(f.id))));
      foldersEl.appendChild(b);
    });
    // #タグ
    var tags = [];
    data.notes.forEach(function (n) { if (!n.deleted) tagsOf(n).forEach(function (tg) { if (tags.indexOf(tg) < 0) tags.push(tg); }); });
    tags.sort(function (a, b) { return a.localeCompare(b, locale); }).forEach(function (tg) {
      var b = el("button", "chip chip--tag m3-state");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(data.view === "tag:" + tg));
      b.dataset.folder = "tag:" + tg;
      b.append(icon("tag"), el("span", "", tg), el("small", "", String(countIn("tag:" + tg))));
      foldersEl.appendChild(b);
    });
    if (/^tag:/.test(data.view) && tags.indexOf(data.view.slice(4)) < 0) data.view = "all";
    var add = el("button", "chip chip--add m3-state");
    add.type = "button";
    add.dataset.menu = "new-folder";
    add.setAttribute("aria-label", t("新しいフォルダ"));
    add.title = t("新しいフォルダ");
    add.appendChild(icon("create_new_folder"));
    foldersEl.appendChild(add);
    var q = searchEl.value.trim();
    var name = q ? t("検索") : data.view === "all" ? t("すべてのメモ") : data.view === "trash" ? t("最近削除した項目") : /^tag:/.test(data.view) ? "#" + data.view.slice(4) : folderName(data.view);
    $("folder-title").textContent = name;
    $("btn-new").hidden = data.view === "trash" && !q;
  }

  function renderList() {
    renderFolders();
    var notes = visibleNotes();
    var q = searchEl.value.trim();
    $("folder-count").textContent = notes.length ? t("{n} 件", { n: notes.length }) : "";
    listEl.textContent = "";
    var hasPinned = data.view !== "trash" && notes.some(function (n) { return n.pinned; });
    var section = null;
    notes.forEach(function (n) {
      var s = n.pinned && data.view !== "trash" ? "pin" : "all";
      if (hasPinned && s !== section) {
        section = s;
        listEl.appendChild(el("p", "list__head", s === "pin" ? t("ピン留め") : t("メモ")));
      }
      var b = el("button", "note m3-state");
      b.type = "button";
      b.dataset.id = n.id;
      if (n.id === currentId) b.setAttribute("aria-current", "true");
      var body = el("span", "note__body");
      var tt = el("span", "note__title");
      if (n.pinned && data.view !== "trash") tt.appendChild(icon("push_pin", "msr--fill"));
      if (n.locked) tt.appendChild(icon(isClosed(n) ? "lock" : "lock_open", "msr--fill"));
      tt.appendChild(el("span", "", title(n)));
      var meta = el("span", "note__meta");
      var time = el("time", "", shortDate(n.deleted || n.updated || 0));
      time.dateTime = new Date(n.updated || 0).toISOString();
      meta.append(time, el("span", "", snippet(n)));
      body.append(tt, meta);
      if (data.view === "all" || q || data.view === "trash") {
        var fl = el("span", "note__folder");
        fl.append(icon("folder"), document.createTextNode(folderName(n.folder)));
        body.appendChild(fl);
      }
      b.appendChild(body);
      var imgId = isClosed(n) ? null : noteImages(n)[0];
      if (imgId) {
        var th = el("img", "note__thumb");
        th.alt = "";
        b.appendChild(th);
        imageUrl(imgId).then(function (u) { if (u) th.src = u; else th.remove(); });
      }
      listEl.appendChild(b);
    });
    var empty = $("list-empty");
    empty.hidden = notes.length > 0;
    $("list-empty-text").textContent = q ? t("見つかりませんでした。")
      : data.view === "trash" ? t("最近削除した項目はありません。削除したメモは、ここに 30 日間残ります。")
      : t("メモはまだありません。「新しいメモ」から書きはじめましょう。");
  }

  // ================================================================
  // 本文
  // ================================================================
  var doc = $("doc"), statusEl = $("status"), pinBtn = $("btn-pin");

  function renderEditor() {
    var n = find(currentId);
    app.classList.toggle("has-note", !!n);
    app.classList.toggle("is-trash", !!(n && n.deleted));
    app.classList.toggle("is-locked", isClosed(n));
    if (!n) { doc.innerHTML = ""; return; }
    // 別のメモに切りかえたときだけ、本文を入れなおす（書いている途中の内容を消さないように）
    if (doc.dataset.id !== n.id) {
      doc.innerHTML = sanitize(noteHtml(n));
      doc.dataset.id = n.id;
      hydrate(doc);
    }
    doc.contentEditable = n.deleted || embed || isClosed(n) ? "false" : "true";
    var lockBtn = $("btn-lock");
    lockBtn.setAttribute("aria-pressed", String(!!n.locked));
    lockBtn.querySelector(".msr").textContent = n.locked ? "lock" : "lock_open";
    $("note-actions").hidden = !!n.deleted;
    $("trash-actions").hidden = !n.deleted;
    pinBtn.setAttribute("aria-pressed", String(!!n.pinned));
    renderInfo(n);
  }
  function renderInfo(n) {
    $("count").textContent = t("{n} 文字", { n: Array.from(noteText(n).replace(/\s/g, "")).length.toLocaleString(locale) });
    $("dates").textContent = t("作成 {date}", { date: longFmt.format(new Date(n.created || 0)) });
    $("date-line").textContent = n.deleted
      ? t("{date} に削除。{n} 日後に完全に削除されます", { date: longFmt.format(new Date(n.deleted)), n: Math.max(1, Math.ceil((n.deleted + TRASH_DAYS * 864e5 - Date.now()) / 864e5)) })
      : longFmt.format(new Date(n.updated || 0));
  }

  // 本文 → 保存する HTML（画像の src は入れない）
  function serialize() {
    var box = doc.cloneNode(true);
    Array.prototype.forEach.call(box.querySelectorAll("img"), function (img) { img.removeAttribute("src"); img.removeAttribute("alt"); img.removeAttribute("class"); });
    Array.prototype.forEach.call(box.querySelectorAll(".is-cell"), function (c) { c.classList.remove("is-cell"); });
    return sanitize(box.innerHTML);
  }

  // 書いたら少し待って保存
  var saveTimer = null, dirty = false;
  function flush() {
    if (!dirty) return;
    clearTimeout(saveTimer);
    dirty = false;
    var n = find(currentId);
    if (!n) return;
    var html = serialize(), text = htmlToText(html);
    if (n.locked) {
      // ロックしたメモは、暗号化してから保存
      if (isClosed(n)) return;
      unlocked[n.id] = { html: html, text: text };
      sealNote(n).then(function () { statusEl.textContent = t("保存しました"); });
      return;
    }
    n.html = html;
    n.text = text;
    if (save()) statusEl.textContent = t("保存しました");
  }
  function changed() {
    var n = find(currentId);
    if (!n || n.deleted || embed || isClosed(n)) return;
    n.updated = Date.now();
    dirty = true;
    statusEl.textContent = t("保存中…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { flush(); renderList(); var m = find(currentId); if (m) renderInfo(m); }, 400);
  }
  doc.addEventListener("input", function (e) {
    fixChecklist(e);
    changed();
    updateToolbar();
  });

  // 空のまま離れたメモは消す
  function dropIfEmpty(id) {
    var n = find(id);
    if (n && !n.deleted && !n.locked && !n.text.trim() && !imageIds(n.html).length) {
      data.notes = data.notes.filter(function (x) { return x.id !== id; });
      save();
    }
  }

  function open(id, push) {
    flush();
    if (currentId && currentId !== id) dropIfEmpty(currentId);
    currentId = id;
    statusEl.textContent = "";
    doc.dataset.id = "";
    app.classList.toggle("is-editing", !!id);
    if (push && id && narrow.matches && !embed) history.pushState({ memo: id }, "", "#" + id);
    else if (!embed) history.replaceState(id ? { memo: id } : null, "", id ? "#" + id : location.pathname + location.search);
    renderEditor();
    renderList();
    updateToolbar();
    // 動き: メモを開いたら本文が浮かび上がる
    if (id && window.M3) M3.enter($("scroll"));
  }
  function closeEditor() {
    if (history.state && history.state.memo) history.back();
    else open(null, false);
  }

  function newNote() {
    var now = Date.now();
    var folder = data.view === "all" || data.view === "trash" ? DEFAULT_FOLDER : data.view;
    var n = { id: newId(), html: "", text: "", folder: folder, pinned: false, created: now, updated: now };
    data.notes.push(n);
    if (data.view === "trash") data.view = "all";
    searchEl.value = "";
    open(n.id, true);
    doc.focus();
  }

  // ================================================================
  // 書式
  // ================================================================
  try { document.execCommand("defaultParagraphSeparator", false, "div"); document.execCommand("styleWithCSS", false, false); } catch (e) { /* 古いブラウザ */ }
  var savedRange = null;
  function inDoc(node) { return node && (node === doc || doc.contains(node)); }
  document.addEventListener("selectionchange", function () {
    var s = window.getSelection();
    if (s && s.rangeCount && inDoc(s.anchorNode)) {
      savedRange = s.getRangeAt(0).cloneRange();
      updateToolbar();
    }
  });
  function restore() {
    var s = window.getSelection();
    // いま本文の中に選択があれば、そのまま使う（ダイアログのあとなど、外れているときだけ覚えておいた選択に戻す）
    if (s.rangeCount && inDoc(s.anchorNode)) {
      if (document.activeElement !== doc) doc.focus({ preventScroll: true });
      return;
    }
    doc.focus({ preventScroll: true });
    if (savedRange && inDoc(savedRange.startContainer)) {
      s.removeAllRanges();
      s.addRange(savedRange);
    } else if (!s.rangeCount || !inDoc(s.anchorNode)) {
      var r = document.createRange();
      r.selectNodeContents(doc);
      r.collapse(false);
      s.removeAllRanges();
      s.addRange(r);
    }
  }
  function closest(sel) {
    var s = window.getSelection();
    if (!s || !s.rangeCount) return null;
    var n = s.anchorNode;
    if (!inDoc(n)) return null;
    var e = n.nodeType === 1 ? n : n.parentElement;
    var hit = e && e.closest(sel);
    return hit && doc.contains(hit) ? hit : null;
  }
  function exec(cmd, val) {
    restore();
    try { document.execCommand(cmd, false, val === undefined ? null : val); } catch (e) { /* 対応していない */ }
  }
  function insertHtml(html) {
    restore();
    document.execCommand("insertHTML", false, html);
  }

  var fmt = $("fmt"), styleMenu = $("style-menu"), tableTools = $("table-tools");
  // ツールバーを押しても、本文の選択が外れないように
  fmt.addEventListener("mousedown", function (e) { if (!e.target.closest("input")) e.preventDefault(); });

  function toggleChecklist() {
    var list = closest("ul, ol");
    if (list && list.tagName === "UL" && list.classList.contains("checklist")) { exec("insertUnorderedList"); return; }
    if (list && list.tagName === "UL") { list.classList.add("checklist"); return; }
    exec("insertUnorderedList");
    var ul = closest("ul");
    if (ul) ul.classList.add("checklist");
  }
  function toggleMark() {
    var m = closest("mark");
    if (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      return;
    }
    restore();
    var s = window.getSelection();
    if (!s.rangeCount || s.isCollapsed) { say(t("マーカーを付ける文字を選んでください")); return; }
    var r = s.getRangeAt(0), mark = document.createElement("mark");
    try { r.surroundContents(mark); }
    catch (e) { mark.appendChild(r.extractContents()); r.insertNode(mark); }
    s.removeAllRanges();
    var after = document.createRange();
    after.selectNodeContents(mark);
    s.addRange(after);
  }
  function insertTable() {
    var cells = function (tag) { return "<tr>" + new Array(4).join("<" + tag + "><br></" + tag + ">") + "</tr>"; };
    var mark = "t" + newId();
    insertHtml("<table data-new=\"" + mark + "\"><tbody>" + cells("td") + cells("td") + cells("td") + "</tbody></table><div><br></div>");
    // 入れた表の最初のマスにカーソルを置く
    var table = doc.querySelector('table[data-new="' + mark + '"]');
    if (table) { table.removeAttribute("data-new"); placeCaret(table.querySelector("td")); }
  }
  function tableCmd(cmd) {
    var cell = closest("td, th");
    if (!cell) return;
    var row = cell.parentElement, table = cell.closest("table"), index = Array.prototype.indexOf.call(row.children, cell);
    if (cmd === "row-add") {
      var r = document.createElement("tr");
      for (var i = 0; i < row.children.length; i++) { var c = document.createElement("td"); c.innerHTML = "<br>"; r.appendChild(c); }
      row.after(r);
      placeCaret(r.children[index] || r.firstChild);
    } else if (cmd === "col-add") {
      Array.prototype.forEach.call(table.rows, function (tr) {
        var ref = tr.children[index];
        var c = document.createElement(ref && ref.tagName === "TH" ? "th" : "td");
        c.innerHTML = "<br>";
        if (ref) ref.after(c); else tr.appendChild(c);
      });
      placeCaret(row.children[index + 1]);
    } else if (cmd === "row-del") {
      if (table.rows.length <= 1) { table.remove(); }
      else { var next = row.nextElementSibling || row.previousElementSibling; row.remove(); placeCaret(next.children[Math.min(index, next.children.length - 1)]); }
    } else if (cmd === "col-del") {
      if (row.children.length <= 1) { table.remove(); }
      else {
        Array.prototype.forEach.call(table.rows, function (tr) { if (tr.children[index]) tr.children[index].remove(); });
        placeCaret(row.children[Math.min(index, row.children.length - 1)]);
      }
    } else if (cmd === "table-del") {
      table.remove();
    }
    changed();
    updateToolbar();
  }
  function placeCaret(node) {
    if (!node) return;
    var r = document.createRange();
    r.selectNodeContents(node);
    r.collapse(true);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    savedRange = r.cloneRange();
  }
  function askLink() {
    var range = savedRange && savedRange.cloneRange();
    var selected = range ? range.toString() : "";
    var existing = closest("a");
    window.M3.prompt({ title: t("リンク"), label: t("URL"), value: existing ? existing.getAttribute("href") : "https://", type: "url", ok: t("リンクを付ける") }).then(function (url) {
      if (!url) return;
      url = safeHref(/^[a-z]+:/i.test(url) ? url : "https://" + url);
      if (!url) { say(t("https:// で始まる URL を入れてください")); return; }
      savedRange = range;
      if (existing) { existing.setAttribute("href", url); changed(); return; }
      if (selected) exec("createLink", url);
      else insertHtml('<a href="' + esc(url) + '">' + esc(url) + "</a>&nbsp;");
      changed();
    });
  }
  function pickImages() { $("image-file").click(); }
  function insertImages(files) {
    files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
    if (!files.length || !find(currentId)) return;
    say(t("画像を追加しています…"));
    files.reduce(function (p, f) {
      return p.then(function () {
        return storeImage(f).then(function (id) {
          insertHtml('<img data-img="' + id + '" src="' + urls[id] + '" alt=""><div><br></div>');
        });
      });
    }, Promise.resolve()).then(function () {
      changed();
      say(t("画像を追加しました"));
    }).catch(function () { say(t("画像を追加できませんでした")); });
  }
  $("image-file").addEventListener("change", function () { var f = this.files; insertImages(f); this.value = ""; });

  fmt.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cmd], [data-block]");
    if (!b || !find(currentId) || find(currentId).deleted) return;
    if (b.dataset.block) {
      styleMenu.hidden = true;
      exec("formatBlock", "<" + b.dataset.block + ">");
      changed();
      return;
    }
    var cmd = b.dataset.cmd;
    if (cmd === "style") { styleMenu.hidden = !styleMenu.hidden; return; }
    styleMenu.hidden = true;
    if (cmd === "checklist") toggleChecklist();
    else if (cmd === "insertUnorderedList") {
      var ul = closest("ul");
      if (ul && ul.classList.contains("checklist")) ul.classList.remove("checklist");
      else exec(cmd);
    }
    else if (cmd === "highlight") toggleMark();
    else if (cmd === "table") insertTable();
    else if (cmd === "image") { pickImages(); return; }
    else if (cmd === "link") { askLink(); return; }
    else if (cmd === "hr") insertHtml("<hr><div><br></div>");
    else if (cmd === "voice") { toggleVoice(b); return; }
    else if (cmd === "task") { toTask(); return; }
    else if (/^(row|col|table)-/.test(cmd)) { tableCmd(cmd); return; }
    else exec(cmd);
    changed();
    updateToolbar();
  });
  document.addEventListener("click", function (e) { if (!styleMenu.hidden && !e.target.closest(".fmt")) styleMenu.hidden = true; });

  function updateToolbar() {
    var n = find(currentId);
    if (!n) return;
    ["bold", "italic", "underline", "strikeThrough", "insertOrderedList"].forEach(function (c) {
      var b = fmt.querySelector('[data-cmd="' + c + '"]');
      var on = false;
      try { on = document.queryCommandState(c); } catch (e) { /* 対応していない */ }
      if (b) b.setAttribute("aria-pressed", String(!!on && inDoc(window.getSelection().anchorNode)));
    });
    var ul = closest("ul");
    fmt.querySelector('[data-cmd="insertUnorderedList"]').setAttribute("aria-pressed", String(!!ul && !ul.classList.contains("checklist")));
    fmt.querySelector('[data-cmd="checklist"]').setAttribute("aria-pressed", String(!!ul && ul.classList.contains("checklist")));
    fmt.querySelector('[data-cmd="highlight"]').setAttribute("aria-pressed", String(!!closest("mark")));
    var cell = closest("td, th");
    tableTools.hidden = !cell;
    Array.prototype.forEach.call(doc.querySelectorAll(".is-cell"), function (c) { if (c !== cell) c.classList.remove("is-cell"); });
    if (cell) cell.classList.add("is-cell");
  }

  // 画像を大きく表示（ダブルクリック。編集できないときはクリック）
  function openViewer(src) {
    var v = el("div", "viewer");
    v.setAttribute("role", "dialog");
    v.setAttribute("aria-modal", "true");
    v.setAttribute("aria-label", t("画像"));
    var img = el("img");
    img.src = src;
    img.alt = "";
    var close = el("button", "icon-btn m3-state viewer__close");
    close.type = "button";
    close.setAttribute("aria-label", t("閉じる"));
    close.appendChild(icon("close"));
    v.append(img, close);
    document.body.appendChild(v);
    close.focus();
    function done() { v.remove(); document.removeEventListener("keydown", onKey, true); }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); done(); } }
    document.addEventListener("keydown", onKey, true);
    v.addEventListener("click", function (e) { if (e.target !== img) done(); });
  }
  doc.addEventListener("dblclick", function (e) {
    if (e.target.tagName === "IMG" && e.target.src) { e.preventDefault(); openViewer(e.target.src); }
  });

  // 音声入力（Web Speech API。対応しているブラウザだけ）
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  function toggleVoice(btn) {
    if (!Recognition) { say(t("このブラウザは音声入力に対応していません")); return; }
    if (rec) { rec.stop(); return; }
    rec = new Recognition();
    rec.lang = locale;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        restore();
        document.execCommand("insertText", false, e.results[i][0].transcript);
        changed();
      }
    };
    rec.onerror = function (ev) { say(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? t("マイクが許可されていません") : t("音声入力を止めました")); };
    rec.onend = function () { rec = null; btn.setAttribute("aria-pressed", "false"); };
    try { rec.start(); btn.setAttribute("aria-pressed", "true"); say(t("話してください…（もう一度押すと止まります）")); }
    catch (e) { rec = null; say(t("音声入力を始められませんでした")); }
  }
  if (!Recognition) fmt.querySelector('[data-cmd="voice"]').hidden = true;

  // 選んだ文字（なければカーソルのある行）を、Todo のタスクにする（/toolbox/shared/remind.js）
  function toTask() {
    var n = find(currentId), R = window.SKReminders;
    if (!n || !R) return;
    var s = window.getSelection(), text = "";
    if (s.rangeCount && inDoc(s.anchorNode) && !s.isCollapsed) text = s.toString();
    else { var block = closest("li, div, p, h1, h2, h3, td"); text = block ? block.textContent : ""; }
    text = text.replace(/\s+/g, " ").trim().slice(0, 300);
    if (!text) { say(t("タスクにする文字を選んでください")); return; }
    var data2 = R.load(), now = Date.now();
    data2.tasks.push(R.upgradeTask({ id: newId(), list: data2.lists[0].id, text: text, memo: n.id, created: now, updated: now }, data2.lists));
    try { R.save(data2); } catch (e) { say(t("保存できませんでした")); return; }
    say(t("Todo に追加しました: {text}", { text: text.length > 24 ? text.slice(0, 24) + "…" : text }));
  }

  // チェックリスト: 丸を押すとチェック。チェックした行で改行したら、新しい行はチェックなし
  doc.addEventListener("click", function (e) {
    var li = e.target.closest && e.target.closest("ul.checklist > li");
    if (li && doc.contains(li) && doc.isContentEditable) {
      var x = e.clientX - li.getBoundingClientRect().left;
      if (x >= 0 && x < 30) {
        e.preventDefault();
        li.classList.toggle("checked");
        li.classList.remove("is-pop");
        void li.offsetWidth;
        li.classList.add("is-pop");
        setTimeout(function () { li.classList.remove("is-pop"); }, 400);
        if (window.SKToolbox) SKToolbox.vibrate();
        changed();
        return;
      }
    }
    // 画像を押したら選ぶ（Backspace で消せる）
    Array.prototype.forEach.call(doc.querySelectorAll("img.is-selected"), function (i) { i.classList.remove("is-selected"); });
    if (e.target.tagName === "IMG" && doc.contains(e.target)) {
      e.target.classList.add("is-selected");
      var r = document.createRange();
      r.selectNode(e.target);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    // リンク: Ctrl（Mac は ⌘）を押しながら、または編集できないときに押すと開く
    var a = e.target.closest && e.target.closest("a[href]");
    if (a && doc.contains(a) && (e.ctrlKey || e.metaKey || !doc.isContentEditable)) {
      e.preventDefault();
      window.open(a.getAttribute("href"), "_blank", "noopener");
    }
  });
  function fixChecklist(e) {
    if (!e || e.inputType !== "insertParagraph") return;
    var li = closest("ul.checklist > li");
    if (li && li.classList.contains("checked") && !li.textContent.trim()) li.classList.remove("checked");
  }

  // キー: Tab（表では次のマス・リストでは字下げ）、行のはじめの「- 」「1. 」「[] 」で自動でリストに
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      var cell = closest("td, th");
      if (cell) {
        e.preventDefault();
        var cells = Array.prototype.slice.call(cell.closest("table").querySelectorAll("td, th"));
        var i = cells.indexOf(cell) + (e.shiftKey ? -1 : 1);
        if (i >= cells.length) { tableCmd("row-add"); return; }
        placeCaret(cells[Math.max(0, i)]);
        return;
      }
      if (closest("li")) { e.preventDefault(); exec(e.shiftKey ? "outdent" : "indent"); changed(); }
      return;
    }
    if (e.key === " " && !e.isComposing) {
      var s = window.getSelection();
      if (!s.rangeCount || !s.isCollapsed) return;
      var block = closest("div, p, h1, h2, h3") || doc;
      if (closest("li, td, th, pre")) return;
      var r = document.createRange();
      r.setStart(block, 0);
      r.setEnd(s.anchorNode, s.anchorOffset);
      var before = r.toString();
      var kind = before === "-" || before === "*" || before === "・" ? "ul" : /^1[.)．]$/.test(before) ? "ol" : before === "[]" || before === "[ ]" ? "check" : "";
      if (!kind) return;
      e.preventDefault();
      r.deleteContents();
      if (kind === "ul") exec("insertUnorderedList");
      else if (kind === "ol") exec("insertOrderedList");
      else toggleChecklist();
      changed();
    }
    if ((e.key === "Backspace" || e.key === "Delete") && doc.querySelector("img.is-selected")) {
      e.preventDefault();
      doc.querySelector("img.is-selected").remove();
      changed();
    }
  });

  // 貼り付け: 画像はそのまま追加。HTML は sanitize してから
  doc.addEventListener("paste", function (e) {
    var cd = e.clipboardData;
    if (!cd || !doc.isContentEditable) return;
    var files = Array.prototype.filter.call(cd.files || [], function (f) { return /^image\//.test(f.type); });
    if (files.length) { e.preventDefault(); insertImages(files); return; }
    var html = cd.getData("text/html");
    e.preventDefault();
    if (html) document.execCommand("insertHTML", false, sanitize(html.replace(/<!--[\s\S]*?-->/g, "")));
    else document.execCommand("insertText", false, cd.getData("text/plain"));
    changed();
  });
  // ドラッグ＆ドロップで画像を追加
  doc.addEventListener("dragover", function (e) { if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.types || [], function (x) { return x === "Files"; })) e.preventDefault(); });
  doc.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length || !doc.isContentEditable) return;
    e.preventDefault();
    var r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (r) savedRange = r;
    insertImages(files);
  });

  // ================================================================
  // テーマ（ブラウザの上の帯の色）
  // ================================================================
  var themeColor = $("theme-color");
  function applyTheme() {
    var bar = narrow.matches ? "--md-surface" : "--md-surface-container";
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue(bar).trim() || "#faebe0";
  }

  // ================================================================
  // スナックバー（「元に戻す」つき）
  // ================================================================
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

  // ================================================================
  // ファイル
  // ================================================================
  function download(name, content, type) {
    var url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: type }));
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  function blobToDataUrl(blob) {
    return new Promise(function (resolve) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = function () { resolve(null); }; r.readAsDataURL(blob); });
  }
  function imagesAsDataUrls(ids) {
    var out = {};
    return ids.reduce(function (p, id) {
      return p.then(function () {
        return idb("readonly", function (s) { return s.get(id); }).then(function (b) { return b ? blobToDataUrl(b) : null; }).then(function (u) { if (u) out[id] = u; });
      });
    }, Promise.resolve()).then(function () { return out; }).catch(function () { return out; });
  }
  function fileName(n) { return title(n).replace(/[\\\/:*?"<>|]/g, "").slice(0, 40).trim() || "memo"; }

  // ================================================================
  // 起動
  // ================================================================
  if (window.SKToolbox) SKToolbox.onChange(applyTheme); else applyTheme();
  var startId = decodeURIComponent(location.hash.slice(1));
  if (embed) {
    currentId = "a";
    data.view = "all";
    app.classList.add("has-note");
    renderEditor();
    renderList();
    return;
  }
  if (startId && find(startId)) open(startId, false);
  else {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    renderList();
    renderEditor();
    if (window.M3) { M3.stagger(listEl); M3.stagger(foldersEl); }
    if (startId === "new") newNote();
  }
  // 横断検索の「メモにする」（/toolbox/shared/search.js が sessionStorage の sk_quick_memo に入れて、ここを開く）
  var quick = null;
  try { quick = sessionStorage.getItem("sk_quick_memo"); sessionStorage.removeItem("sk_quick_memo"); } catch (e) { /* 使えない */ }
  if (quick && quick.trim()) {
    var qText = quick.trim().slice(0, 5000), qNow = Date.now();
    var qn = { id: newId(), html: "<div>" + esc(qText) + "</div>", text: qText, folder: DEFAULT_FOLDER, pinned: false, created: qNow, updated: qNow };
    data.notes.push(qn);
    save();
    open(qn.id, true);
  }

  // ================================================================
  // 操作
  // ================================================================
  listEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-id]");
    if (b) open(b.dataset.id, true);
  });
  foldersEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-folder]");
    if (!b) return;
    data.view = b.dataset.folder;
    searchEl.value = "";
    save();
    renderList();
    if (window.M3) M3.stagger(listEl);
  });
  $("btn-new").addEventListener("click", newNote);
  $("btn-back").addEventListener("click", closeEditor);
  searchEl.addEventListener("input", renderList);

  pinBtn.addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    n.pinned = !n.pinned;
    save();
    renderEditor();
    renderList();
    say(n.pinned ? t("ピン留めしました") : t("ピン留めを外しました"));
  });

  function folderOptions() {
    return [{ value: DEFAULT_FOLDER, label: t("メモ"), icon: "folder" }].concat(data.folders.map(function (f) { return { value: f.id, label: f.name, icon: "folder" }; }));
  }
  $("btn-move").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    flush();
    window.M3.choose({ title: t("フォルダに移動"), options: folderOptions(), value: n.folder }).then(function (id) {
      if (!id || id === n.folder) return;
      n.folder = id;
      save();
      renderList();
      say(t("「{name}」に移動しました", { name: folderName(id) }));
    });
  });

  // 削除: 「最近削除した項目」へ（元に戻せる）
  $("btn-delete").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    flush();
    if (!n.text.trim() && !imageIds(n.html).length) {
      data.notes = data.notes.filter(function (x) { return x.id !== n.id; });
      save();
    } else {
      n.deleted = Date.now();
      n.pinned = false;
      save();
    }
    if (narrow.matches) closeEditor(); else open(null, false);
    say(t("メモを削除しました"), function () {
      if (find(n.id)) { delete n.deleted; } else { data.notes.push(n); }
      save();
      open(n.id, true);
    });
  });
  $("btn-restore").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    delete n.deleted;
    if (n.folder !== DEFAULT_FOLDER && !folderById(n.folder)) n.folder = DEFAULT_FOLDER;
    save();
    renderEditor();
    renderList();
    say(t("「{name}」に戻しました", { name: folderName(n.folder) }));
  });
  $("btn-destroy").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    window.M3.confirm({ title: t("このメモを完全に削除しますか？"), text: t("完全に削除したメモは、元に戻せません。"), ok: t("完全に削除"), danger: true }).then(function (ok) {
      if (!ok) return;
      data.notes = data.notes.filter(function (x) { return x.id !== n.id; });
      save();
      cleanupImages();
      if (narrow.matches) closeEditor(); else open(null, false);
    });
  });

  // 共有・書き出し（ロックしたメモは、開いているときだけ）
  function pageHtml(n) {
    var html = noteHtml(n);
    return imagesAsDataUrls(imageIds(html)).then(function (images) {
      var body = html.replace(/<img data-img="([a-z0-9]+)">/g, function (m, id) { return images[id] ? '<img src="' + images[id] + '" alt="">' : ""; });
      return "<!DOCTYPE html><html lang=\"" + esc(document.documentElement.lang || "ja") + "\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>" + esc(title(n)) + "</title>" +
        "<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:17px/1.8 system-ui,sans-serif}body>:first-child{font-size:26px;font-weight:700}img{max-width:100%;border-radius:12px;break-inside:avoid}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px}ul.checklist{list-style:none;padding-left:0}ul.checklist li::before{content:'○ '}ul.checklist li.checked::before{content:'● '}ul.checklist li.checked{text-decoration:line-through;color:#777}blockquote{border-left:4px solid #e5793f;margin:8px 0;padding-left:16px;color:#555}pre{background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap}mark{background:#ffe680}@page{margin:18mm}@media print{body{margin:0}}</style></head><body>" + body + "</body></html>";
    });
  }
  // PDF: 見えない iframe に入れて、印刷の画面を出す（「PDF に保存」を選ぶ）
  function printNote(n) {
    pageHtml(n).then(function (page) {
      var frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
      document.body.appendChild(frame);
      frame.srcdoc = page;
      frame.onload = function () {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { say(t("印刷できませんでした")); }
        setTimeout(function () { frame.remove(); }, 60000);
      };
    });
  }
  $("btn-share").addEventListener("click", function () {
    var n = find(currentId);
    if (!n || isClosed(n)) return;
    flush();
    var text = noteText(n);
    var options = [];
    if (navigator.share) options.push({ value: "share", label: t("共有"), icon: "share" });
    options.push({ value: "copy", label: t("テキストをコピー"), icon: "content_copy" });
    options.push({ value: "pdf", label: t("PDF で保存（印刷）"), icon: "picture_as_pdf" });
    options.push({ value: "txt", label: t("テキストファイルで保存"), icon: "description" });
    options.push({ value: "html", label: t("Web ページで保存（画像つき）"), icon: "html" });
    window.M3.choose({ title: t("共有・書き出し"), options: options }).then(function (how) {
      if (how === "share") navigator.share({ title: title(n), text: text }).catch(function () {});
      else if (how === "copy") navigator.clipboard.writeText(text).then(function () { say(t("コピーしました")); }, function () {});
      else if (how === "pdf") printNote(n);
      else if (how === "txt") download(fileName(n) + ".txt", text, "text/plain;charset=utf-8");
      else if (how === "html") pageHtml(n).then(function (page) { download(fileName(n) + ".html", page, "text/html;charset=utf-8"); });
    });
  });

  // ロック: ロックする・外す（パスワードは最初に作る）
  $("btn-lock").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    if (!canLock()) { say(t("このブラウザではロックを使えません")); return; }
    flush();
    if (!n.locked) {
      askPassword().then(function (key) {
        if (!key) return;
        unlocked[n.id] = { html: n.html, text: n.text };
        n.locked = true;
        return sealNote(n).then(function () {
          renderEditor();
          renderList();
          say(t("ロックしました"));
        });
      });
      return;
    }
    var openIt = isClosed(n) ? unlockNote(n) : Promise.resolve(true);
    openIt.then(function (ok) {
      if (!ok) return;
      window.M3.choose({ title: t("ロック"), options: [
        { value: "remove", label: t("このメモのロックを外す"), icon: "lock_open" },
        { value: "close", label: t("ロックしたメモをすべて閉じる"), icon: "lock" }
      ] }).then(function (v) {
        if (v === "remove") {
          var u = unlocked[n.id];
          n.html = u.html; n.text = u.text;
          delete n.locked; delete n.enc; delete n.imgs;
          delete unlocked[n.id];
          save();
          doc.dataset.id = "";
          renderEditor();
          renderList();
          say(t("ロックを外しました"));
        } else if (v === "close") lockAll();
      });
    });
  });
  function lockAll() {
    flush();
    sessionKey = null;
    unlocked = {};
    doc.dataset.id = "";
    renderEditor();
    renderList();
    say(t("ロックしたメモを閉じました"));
  }
  $("btn-unlock").addEventListener("click", function () {
    var n = find(currentId);
    if (!n) return;
    unlockNote(n).then(function (ok) {
      if (!ok) return;
      doc.dataset.id = "";
      renderEditor();
      renderList();
    });
  });

  // メニュー
  var menu = $("menu"), menuBtn = $("btn-menu");
  function setMenu(openIt) {
    menu.hidden = !openIt;
    menuBtn.setAttribute("aria-expanded", String(openIt));
    if (!openIt) return;
    var user = !!folderById(data.view);
    Array.prototype.forEach.call(menu.querySelectorAll("[data-user-folder]"), function (b) { b.hidden = !user; });
    Array.prototype.forEach.call(menu.querySelectorAll("[data-trash-only]"), function (b) { b.hidden = data.view !== "trash"; });
    menu.querySelector("button:not([hidden])").focus();
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".menu-wrap")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); return; }
    if (e.key === "Escape" && !styleMenu.hidden) { styleMenu.hidden = true; return; }
    if (e.key === "Escape" && narrow.matches && currentId && !document.querySelector(".tbs-dialog-scrim, .tbs-overlay")) closeEditor();
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-menu]");
    if (!b) return;
    var what = b.dataset.menu;
    setMenu(false);
    if (what === "new-folder") {
      window.M3.prompt({ title: t("新しいフォルダ"), label: t("フォルダの名前"), ok: t("作成"), maxLength: 40 }).then(function (name) {
        if (!name) return;
        var f = { id: newId(), name: name };
        data.folders.push(f);
        data.view = f.id;
        save();
        renderList();
      });
    } else if (what === "rename-folder") {
      var f = folderById(data.view);
      if (!f) return;
      window.M3.prompt({ title: t("フォルダの名前を変更"), label: t("フォルダの名前"), value: f.name, ok: t("変更"), maxLength: 40 }).then(function (name) {
        if (!name) return;
        f.name = name;
        save();
        renderList();
      });
    } else if (what === "delete-folder") {
      var g = folderById(data.view);
      if (!g) return;
      var inside = data.notes.filter(function (n) { return !n.deleted && n.folder === g.id; });
      window.M3.confirm({ title: t("「{name}」を削除しますか？", { name: g.name }), text: inside.length ? t("中のメモ（{n} 件）は「最近削除した項目」に移ります。", { n: inside.length }) : t("このフォルダは空です。"), ok: t("削除"), danger: true }).then(function (ok) {
        if (!ok) return;
        var now = Date.now();
        inside.forEach(function (n) { n.deleted = now; n.pinned = false; n.folder = DEFAULT_FOLDER; });
        data.folders = data.folders.filter(function (x) { return x.id !== g.id; });
        data.view = "all";
        save();
        if (currentId && find(currentId) && find(currentId).deleted) open(null, false);
        renderList();
      });
    } else if (what === "empty-trash") {
      var trash = data.notes.filter(function (n) { return n.deleted; });
      if (!trash.length) { say(t("最近削除した項目はありません。")); return; }
      window.M3.confirm({ title: t("最近削除した項目を空にしますか？"), text: t("{n} 件のメモを完全に削除します。元に戻せません。", { n: trash.length }), ok: t("すべて削除"), danger: true }).then(function (ok) {
        if (!ok) return;
        data.notes = data.notes.filter(function (n) { return !n.deleted; });
        save();
        cleanupImages();
        if (currentId && !find(currentId)) open(null, false);
        renderList();
      });
    } else if (what === "lock-all") {
      lockAll();
    } else if (what === "sort") {
      window.M3.choose({ title: t("並べ替え"), value: data.sort, options: [
        { value: "updated", label: t("編集した日"), icon: "edit_calendar" },
        { value: "created", label: t("作成した日"), icon: "calendar_today" },
        { value: "title", label: t("タイトル"), icon: "sort_by_alpha" }
      ] }).then(function (v) { if (!v) return; data.sort = v; save(); renderList(); });
    } else if (what === "export") {
      flush();
      var ids = [];
      data.notes.forEach(function (n) { ids = ids.concat(noteImages(n)); });
      imagesAsDataUrls(ids).then(function (images) {
        // ロックしたメモは暗号文のまま（読み込むときに同じパスワードが要る）
        var backup = { app: "sk-memo", version: 2, exportedAt: new Date().toISOString(), folders: data.folders, notes: data.notes, lock: data.lock, images: images };
        download("memo-backup-" + stamp() + ".json", JSON.stringify(backup), "application/json");
      });
    } else if (what === "import") {
      $("import-file").click();
    }
  });

  $("import-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    file.text().then(function (text) {
      var d = JSON.parse(text);
      var notes = ((Array.isArray(d) ? d : d && d.notes) || []).filter(validNote);
      if (!notes.length) throw new Error("empty");
      // 画像（data URL）を IndexedDB へ
      var images = (d && d.images) || {};
      return Object.keys(images).reduce(function (p, id) {
        return p.then(function () {
          if (!/^[a-z0-9]{6,40}$/.test(id) || !/^data:image\//.test(images[id])) return;
          return fetch(images[id]).then(function (r) { return r.blob(); }).then(function (b) { return idb("readwrite", function (s) { return s.put(b, id); }); });
        });
      }, Promise.resolve()).then(function () {
        if (validLock(d.lock) && !data.lock) data.lock = d.lock;
        else if (validLock(d.lock) && data.lock && d.lock.check !== data.lock.check) say(t("バックアップのロックしたメモは、この端末のパスワードとちがうため開けないことがあります"));
        (d.folders || []).forEach(function (f) {
          if (f && typeof f.id === "string" && typeof f.name === "string" && !folderById(f.id) && f.id !== DEFAULT_FOLDER) data.folders.push({ id: f.id, name: f.name });
        });
        var added = 0;
        notes.forEach(function (raw) {
          var n = upgrade({ id: raw.id, html: raw.html, text: raw.text, folder: raw.folder, pinned: raw.pinned, created: raw.created, updated: raw.updated, deleted: raw.deleted, locked: raw.locked, enc: raw.enc, imgs: raw.imgs });
          if (n.folder !== DEFAULT_FOLDER && !folderById(n.folder)) n.folder = DEFAULT_FOLDER;
          var mine = find(n.id);
          if (!mine) { data.notes.push(n); added++; }
          else if (n.updated > (mine.updated || 0)) { Object.assign(mine, n); added++; }
        });
        save();
        renderList();
        doc.dataset.id = "";
        renderEditor();
        say(t("{n} 件のメモを読み込みました", { n: added }));
      });
    }).catch(function () { say(t("読み込めませんでした。Memo のバックアップのファイルを選んでください")); });
  });

  narrow.addEventListener("change", applyTheme);

  // 端末の「戻る」
  window.addEventListener("popstate", function (e) {
    if (document.querySelector(".tbs-overlay")) return;
    var id = e.state && e.state.memo;
    open(id && find(id) ? id : null, false);
  });

  // 閉じる前に保存
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });

  // ほかのタブで書いたとき（いま書いているメモは、こちらを残す）
  window.addEventListener("storage", function (e) {
    if (e.key !== STORE) return;
    var editing = doc.contains(document.activeElement) || doc === document.activeElement;
    var mine = editing ? find(currentId) : null;
    load();
    if (mine) {
      var other = find(mine.id);
      if (other) Object.assign(other, mine); else data.notes.push(mine);
    }
    if (currentId && !find(currentId)) open(null, false);
    renderList();
    if (!editing) { doc.dataset.id = ""; renderEditor(); }
  });
})();
