// SK Share（/view/）と、作るページ（/view/editor/）で共通に使うもの
// データは Cloud Firestore の viewPages（くわしくは y-filter リポジトリの systems/firestore.rules）
//   viewPages/{ID}              … ページ本体 { title, note, items, enabled, expiresAt, createdAt, updatedAt }
//                                  ID = パスワードから PBKDF2 で作った 64 文字。ID を知っている人（= パスワードを知っている人）だけが読める。一覧は開発者だけ
//   viewPages/{ID}/docs/{docId} … HTML 文書の中身 { html, updatedAt }（1 件 900KB まで。ページ本体と分けて 1MB の上限に当たらないように）
//   viewPages/{ID}/private/admin … パスワードと管理用のメモ { password, memo, updatedAt }（開発者だけ）
//   items … [{ type: "youtube", title, videoId } | { type: "html", title, docId }]

export const PAGES = "viewPages";
export const ITEMS_MAX = 30;
export const TITLE_MAX = 120;
export const NOTE_MAX = 3000;
export const HTML_MAX = 900000;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

// 入力のゆれをなくす: 全角→半角（NFKC）・大文字→小文字・空白とハイフンを取る（「AB3K-7MNP」も「ab3k7mnp」も同じ）
export function normalizePassword(raw) {
  return String(raw || "").normalize("NFKC").toLowerCase().replace(/[\s\-‐-―ー−]/g, "");
}

// パスワード → ページの ID（PBKDF2・SHA-256・10 万回 → 16 進 64 文字）。パスワードはサーバーに送らない
const ID_SALT = "sk-hub-systems/view/v1";
const ID_ITERATIONS = 100000;
export async function pageIdOf(password) {
  const te = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", te.encode(normalizePassword(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: te.encode(ID_SALT), iterations: ID_ITERATIONS, hash: "SHA-256" }, base, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// まぎらわしい文字（0/o・1/l/i）を除いた 31 文字から 12 文字（約 59 ビット）。4 文字ずつハイフンで区切って見せる
const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
export function generatePassword() {
  const out = [];
  const buf = new Uint8Array(1);
  while (out.length < 12) {
    crypto.getRandomValues(buf);
    if (buf[0] < 248) out.push(PASSWORD_CHARS[buf[0] % 31]); // 248 = 31 × 8（かたよりをなくす）
  }
  return out.join("").replace(/(.{4})(?=.)/g, "$1-");
}

export function randomId(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const buf = crypto.getRandomValues(new Uint8Array(length));
  return [...buf].map((b) => chars[b % 36]).join("");
}

// YouTube の URL（watch?v=・youtu.be・shorts・embed・live）か動画 ID から、11 文字の動画 ID を取り出す
export function youtubeIdOf(input) {
  const s = String(input || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url;
  try { url = new URL(s); } catch (e) { return ""; }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") || (url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/) || [])[1] || "";
  }
  return /^[\w-]{11}$/.test(id) ? id : "";
}

export function youtubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&playsinline=1`;
}

// HTML 文書を、スクリプトを動かさない iframe（sandbox）で見せるための srcdoc を作る
//   ・リンクは新しいタブで開く（<base target="_blank">）
//   ・文書の中のスクリプト・フォームは sandbox で止まる（allow-scripts・allow-forms を付けない）
export function htmlSrcdoc(html) {
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank">'
    + "<style>html{-webkit-text-size-adjust:100%}body{margin:16px;font-family:system-ui,-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;line-height:1.75;color:#0d1014;background:#fff;overflow-wrap:anywhere}img,video,table{max-width:100%;height:auto}</style>";
  const src = String(html || "");
  return /<head[^>]*>/i.test(src) ? src.replace(/<head[^>]*>/i, (m) => m + head) : head + src;
}

// sandbox の iframe の高さを中身に合わせる（allow-same-origin なので親から中身の高さが読める。スクリプトは動かない）
export function fitFrame(frame) {
  const fit = () => {
    try {
      // html の高さは iframe の高さより小さくならないので、body の高さ（と上下の余白）で測る
      const b = frame.contentDocument && frame.contentDocument.body;
      if (!b) return;
      const cs = frame.contentWindow.getComputedStyle(b);
      frame.style.height = Math.max(120, Math.ceil(b.scrollHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom))) + "px";
    } catch (e) { /* 読めないときは CSS の高さのまま */ }
  };
  frame.addEventListener("load", () => {
    fit();
    // 画像が後から読み込まれて高さが変わる分
    try { frame.contentDocument.querySelectorAll("img").forEach((img) => img.addEventListener("load", fit)); } catch (e) {}
    setTimeout(fit, 600);
  });
  window.addEventListener("resize", fit);
}

export function makeHtmlFrame(html, title) {
  const frame = document.createElement("iframe");
  frame.className = "vw-doc-frame";
  frame.setAttribute("sandbox", "allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.title = title || "";
  fitFrame(frame);
  frame.srcdoc = htmlSrcdoc(html);
  return frame;
}
