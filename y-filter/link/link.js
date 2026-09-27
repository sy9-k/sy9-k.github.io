// 自分の端末としてつなぐ（/y-filter/link/?n=合言葉）
// Y-FILTER. の設定画面の「自分の端末としてつなぐ」から開く。
//   1. SK Hub Systems アカウントでログイン（アカウントの作成・管理コンソールへの接続がまだなら /account/ で済ませて戻ってくる）
//   2. 「つなぐ」を押すと、自分の管理グループに「自分の端末」のペアリングコード（mode: personal・10 分）を発行する
//   3. コードと合言葉を拡張機能の site-bridge.js に渡す → background.js が合言葉を確かめてつなぐ
//   4. 結果が返ってきたら、コードをすぐ消す
// 設計: y-filter リポジトリの docs/PERSONAL_USE_DESIGN_JA.md。権限: systems/firestore.rules（pairingCodes の mode）
import { accountPageUrl, db, isConnected, profileOf, watchAccount } from "/assets/hub/account.js";
import {
  Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const REPLY_TIMEOUT_MS = 20 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const params = new URLSearchParams(location.search);
const nonce = /^[0-9a-f]{32}$/.test(params.get("n") || "") ? params.get("n") : "";
const hasExtension = !!document.documentElement.dataset.yfilterVersion;

const $ = (sel) => document.querySelector(sel);
let current = null;
let busy = false;

function showView(name) {
  document.querySelectorAll("[data-link-view]").forEach((el) => { el.hidden = el.dataset.linkView !== name; });
}

function message(text) {
  $("#link-msg").textContent = text || "";
}

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// 端末名の初期値（例: Chrome（Windows））
function defaultDeviceName() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : "ブラウザ";
  const os = /CrOS/.test(ua) ? "Chromebook" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser}（${os}）` : browser;
}

function userChip(user, account) {
  const p = profileOf(user, account);
  const box = document.createElement("div");
  box.className = "link-user";
  let avatar;
  if (p.photo) {
    avatar = document.createElement("img");
    avatar.src = p.photo;
    avatar.alt = "";
    avatar.referrerPolicy = "no-referrer";
  } else {
    avatar = document.createElement("span");
    avatar.className = "link-letter";
    avatar.style.background = p.colorValue;
    avatar.textContent = p.letter;
  }
  const text = document.createElement("div");
  text.textContent = p.name || user.email || "";
  const small = document.createElement("small");
  small.textContent = user.email || "";
  text.appendChild(small);
  box.append(avatar, text);
  return box;
}

// 自分の管理グループ（ID = 自分の UID）がなければ作る（管理コンソールの ensureOwnTeam と同じ内容）
async function ensureOwnTeam(user, account) {
  const ref = doc(db, "teams", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    ownerUid: user.uid,
    members: [user.uid],
    memberInfo: { [user.uid]: { email: user.email || "", name: profileOf(user, account).name, joinedAt: serverTimestamp() } },
    createdAt: serverTimestamp()
  });
}

// 拡張機能（site-bridge.js）の返事を待つ
function waitForExtensionReply() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve({ ok: false, error: "Y-FILTER. から返事がありませんでした。Y-FILTER. を新しい版に更新してから、もう一度お試しください。" });
    }, REPLY_TIMEOUT_MS);
    function onMessage(event) {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data;
      if (!data || data.source !== "yfilter-extension" || data.type !== "link-result") return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve({ ok: !!data.ok, error: String(data.error || "") });
    }
    window.addEventListener("message", onMessage);
  });
}

$("#link-go").addEventListener("click", async (e) => {
  if (busy || !current) return;
  const { user, account } = current;
  const btn = e.currentTarget;
  const name = $("#link-name").value.trim().slice(0, 60) || defaultDeviceName();
  busy = true;
  btn.disabled = true;
  message("つないでいます…");
  let code = "";
  try {
    await ensureOwnTeam(user, account);
    code = generateCode();
    await setDoc(doc(db, "pairingCodes", code), {
      ownerUid: user.uid,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
      mode: "personal"
    });
    const reply = waitForExtensionReply();
    window.postMessage({ source: "sk-yfilter-link", type: "complete", nonce, code, name }, location.origin);
    const result = await reply;
    if (!result.ok) {
      message(result.error === "FORBIDDEN" ? "このページからはつなげませんでした。" : result.error || "つなげませんでした。");
      return;
    }
    message("");
    history.replaceState(null, "", location.pathname);
    showView("done");
  } catch (err) {
    message(`つなげませんでした（${err?.code || err?.message || err}）`);
  } finally {
    // コードは使い終わったらすぐ消す（端末は登録の瞬間にだけ使う）
    if (code) deleteDoc(doc(db, "pairingCodes", code)).catch(() => {});
    busy = false;
    btn.disabled = false;
  }
});

if (!nonce) {
  showView("start");
} else if (!hasExtension) {
  showView("noext");
} else {
  watchAccount((state) => {
    // ログイン・アカウントの作成・規約の同意・管理コンソールへの接続がまだなら、アカウントのページで済ませて戻ってくる
    if (state.status === "error") {
      showView("loading");
      message(`アカウントを確認できませんでした（${state.error?.code || state.error?.message || state.error}）`);
      return;
    }
    if (state.status !== "ready" || !isConnected(state.account, "yfilter")) {
      location.replace(accountPageUrl(location.pathname + location.search, "yfilter"));
      return;
    }
    current = state;
    $("[data-link-user]").replaceChildren(userChip(state.user, state.account));
    if (!$("#link-name").value) $("#link-name").value = defaultDeviceName();
    showView("confirm");
  });
}
