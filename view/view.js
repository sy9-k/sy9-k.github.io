// SK Share（/view/）: パスワード → ページの ID を作って、Cloud Firestore の viewPages/{ID} を読む
// パスワードはサーバーに送らない（送るのは PBKDF2 で作った ID だけ）。ログインは不要
// 中身: YouTube の限定公開動画（youtube-nocookie で埋め込み）と HTML 文書（スクリプトを動かさない iframe）
// データの形は /view/view-core.js
import { db } from "/assets/hub/account.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { PAGES, makeHtmlFrame, normalizePassword, pageIdOf, youtubeEmbedUrl } from "/view/view-core.js";

const t = window.SKI18N ? window.SKI18N.t : (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
const $ = (sel) => document.querySelector(sel);
const el = (tag, className, text) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
};
const icon = (name, fill) => {
  const s = el("span", fill ? "msr msr--fill" : "msr", name);
  s.setAttribute("aria-hidden", "true");
  return s;
};

const gate = $("[data-vw-view=gate]");
const content = $("[data-vw-view=content]");
const form = $("[data-vw-form]");
const input = form.elements.password;
const field = $("[data-vw-field]");
const support = $("[data-vw-support]");
const submit = $("[data-vw-submit]");
const closeBtn = $("[data-vw-close]");
const SUPPORT_TEXT = support.textContent;

let failures = 0;     // 続けて間違えた回数（間違えるほど、次に試せるまで少し待つ）
let lockedUntil = 0;

function toast(text) {
  const box = $("[data-vw-toast]");
  $("[data-vw-toast-text]").textContent = text;
  box.classList.add("is-on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("is-on"), 4000);
}

function setError(text) {
  field.classList.toggle("is-error", !!text);
  support.textContent = text || SUPPORT_TEXT;
  if (text) {
    gate.classList.remove("is-shake");
    void gate.offsetWidth;
    gate.classList.add("is-shake");
  }
}

function setBusy(busy) {
  submit.classList.toggle("is-busy", busy);
  submit.disabled = busy;
  input.disabled = busy;
}

// ---------- パスワードを確かめる ----------
async function open(password) {
  const normalized = normalizePassword(password);
  if (!normalized) { setError(t("パスワードを入力してください。")); input.focus(); return; }
  const wait = lockedUntil - Date.now();
  if (wait > 0) { setError(t("{n} 秒待ってから、もう一度試してください。", { n: Math.ceil(wait / 1000) })); return; }
  setError("");
  setBusy(true);
  try {
    const id = await pageIdOf(normalized);
    const snap = await getDoc(doc(db, PAGES, id));
    if (!snap.exists()) throw Object.assign(new Error("not-found"), { code: "permission-denied" });
    failures = 0;
    render(id, snap.data());
  } catch (err) {
    if (err && (err.code === "permission-denied" || err.code === "not-found")) {
      failures += 1;
      lockedUntil = Date.now() + (failures >= 3 ? Math.min(30, 2 ** (failures - 2)) * 1000 : 0);
      setError(t("パスワードが違うか、公開が終わっています。"));
    } else {
      setError(t("読み込めませんでした。インターネットにつながっているか確かめてください。"));
    }
    input.select();
  } finally {
    setBusy(false);
  }
}

// ---------- 中身を出す ----------
function formatDate(ts) {
  const d = ts && ts.toDate ? ts.toDate() : null;
  if (!d) return "";
  return d.toLocaleDateString(window.SKI18N ? window.SKI18N.locale : "ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function itemHead(item, kindIcon, kindLabel) {
  const head = el("div", "vw-item__head");
  const ico = el("span", "vw-item__icon");
  ico.append(icon(kindIcon, true));
  const title = el("h2", "vw-item__title");
  title.append(el("span", "vw-item__kind", kindLabel), document.createTextNode(item.title || ""));
  title.setAttribute("data-i18n-skip", "");
  head.append(ico, title);
  return head;
}

function videoItem(item) {
  const box = el("article", "vw-item");
  box.append(itemHead(item, "play_circle", t("動画")));
  const wrap = el("div", "vw-video");
  const frame = document.createElement("iframe");
  frame.src = youtubeEmbedUrl(item.videoId);
  frame.title = item.title || t("動画");
  frame.loading = "lazy";
  frame.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  wrap.append(frame);
  box.append(wrap);
  return box;
}

function docItem(pageId, item) {
  const box = el("article", "vw-item");
  const head = itemHead(item, "description", t("文書"));
  const full = el("button", "icon-btn m3-state");
  full.type = "button";
  full.setAttribute("aria-label", t("大きく見る"));
  full.title = t("大きく見る");
  full.append(icon("open_in_full"));
  full.disabled = true;
  head.append(full);
  box.append(head);
  const body = el("div", "vw-loading");
  body.append(el("span", "vw-spinner"));
  box.append(body);

  getDoc(doc(db, PAGES, pageId, "docs", item.docId)).then((snap) => {
    const html = snap.exists() ? snap.data().html : "";
    if (!html) throw new Error("empty");
    const wrap = el("div", "vw-doc");
    wrap.append(makeHtmlFrame(html, item.title));
    body.replaceWith(wrap);
    full.disabled = false;
    full.addEventListener("click", () => openFull(item.title, html));
  }).catch(() => {
    body.replaceWith(el("p", "vw-item__error", t("この文書を読み込めませんでした。ページを開き直してください。")));
  });
  return box;
}

function render(pageId, page) {
  $("[data-vw-title]").textContent = page.title || "";
  $("[data-vw-note]").textContent = page.note || "";
  document.title = `${page.title ? `${page.title} | ` : ""}SK Share`;
  const expires = $("[data-vw-expires]");
  const until = formatDate(page.expiresAt);
  expires.hidden = !until;
  if (until) expires.replaceChildren(icon("schedule"), document.createTextNode(t("{date} まで公開しています", { date: until })));

  const items = Array.isArray(page.items) ? page.items : [];
  const list = $("[data-vw-items]");
  const chips = $("[data-vw-chips]");
  const boxes = items.map((item) => {
    if (item.type === "youtube" && item.videoId) return videoItem(item);
    if (item.type === "html" && item.docId) return docItem(pageId, item);
    return null;
  });
  list.replaceChildren(...boxes.filter(Boolean));
  if (!list.children.length) list.append(el("p", "vw-foot", t("まだ何も公開されていません。")));

  // 2 つ以上あるときは上に目次
  chips.hidden = items.length < 2;
  chips.replaceChildren(...items.map((item, i) => {
    if (!boxes[i]) return null;
    boxes[i].id = `item-${i + 1}`;
    const chip = el("button", "vw-chip m3-state");
    chip.type = "button";
    chip.append(icon(item.type === "youtube" ? "play_circle" : "description", true), el("span", "", item.title || `${i + 1}`));
    chip.setAttribute("data-i18n-skip", "");
    chip.addEventListener("click", () => boxes[i].scrollIntoView({ behavior: "smooth", block: "start" }));
    return chip;
  }).filter(Boolean));

  gate.hidden = true;
  content.hidden = false;
  closeBtn.hidden = false;
  input.value = "";
  scrollTo(0, 0);
}

function close() {
  $("[data-vw-items]").replaceChildren();
  content.hidden = true;
  gate.hidden = false;
  closeBtn.hidden = true;
  document.title = "SK Share";
  input.focus();
}

// ---------- 文書を全画面で ----------
const fullDialog = $("[data-vw-full]");
function openFull(title, html) {
  $("[data-vw-full-title]").textContent = title || "";
  const wrap = el("div", "vw-doc");
  wrap.append(makeHtmlFrame(html, title));
  $("[data-vw-full-body]").replaceChildren(wrap);
  fullDialog.showModal();
}
$("[data-vw-full-close]").addEventListener("click", () => fullDialog.close());
fullDialog.addEventListener("close", () => $("[data-vw-full-body]").replaceChildren());

// ---------- 操作 ----------
form.addEventListener("submit", (e) => { e.preventDefault(); open(input.value); });
input.addEventListener("input", () => { if (field.classList.contains("is-error")) setError(""); });
closeBtn.addEventListener("click", close);
$("[data-vw-reveal]").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.setAttribute("aria-pressed", String(show));
  const label = show ? t("パスワードを隠す") : t("パスワードを表示");
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.querySelector(".msr").textContent = show ? "visibility_off" : "visibility";
});

// QR コードから来たとき（<head> で URL から外して sessionStorage に入れたパスワード）
let fromQr = "";
try { fromQr = sessionStorage.getItem("sk_view_p") || ""; sessionStorage.removeItem("sk_view_p"); } catch (e) {}
const openFromQr = (password) => open(password).then(() => { if (!content.hidden) toast(t("QR コードのパスワードでひらきました")); });
if (fromQr) openFromQr(fromQr);
else input.focus({ preventScroll: true });
// このページを開いたまま QR コードの URL に移ったとき（読み込み直さず # だけが変わる）
window.addEventListener("hashchange", () => {
  const m = /^#p=([^&]*)/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  let password = "";
  try { password = decodeURIComponent(m[1]); } catch (e) { return; }
  openFromQr(password);
});
