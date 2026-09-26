// SK Hub Systems アカウント（ログインは Google のみ）
// sy9-k.github.io のページ（管理コンソール・これからのサービス）で共通に使うモジュール。
//   ・ログイン状態は同じサイトの中で共有される（Firebase Authentication がブラウザに保存する）
//   ・アカウントの登録 = accounts/{UID} に規約への同意を記録すること。名前・メールアドレスは Firebase Authentication にだけある
//   ・データ構造と権限は y-filter リポジトリの systems/firestore.rules を参照
// 使い方（サービスのページ）:
//   import { watchAccount, accountPageUrl } from "/assets/hub/account.js";
//   watchAccount(({ status, user }) => { if (status !== "ready") location.href = accountPageUrl(); ... });
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  GoogleAuthProvider, deleteUser, getAuth, onAuthStateChanged, reauthenticateWithPopup, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// 管理コンソールと同じ設定を使う（同じ設定なら initializeApp は同じアプリを返す）
import { firebaseConfig } from "/y-filter/firebase-config.js";

export const ACCOUNT_NAME = "SK Hub Systems アカウント";
// アカウント規約（/policies/docs/sk-hub-account.txt）の版。変えると、次に使うときに同意し直してもらう
export const ACCOUNT_TERMS_VERSION = "2026-09-26";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ヘッダーに出す名前とアイコン（このブラウザの中だけに保存。site.js が読む）
const HINT_KEY = "skhub_account";

// 変えたら、同じページのヘッダー（site.js）に知らせて表示を更新してもらう
function saveHint(user) {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify({ name: user.displayName || "", photo: user.photoURL || "" }));
  } catch (e) { /* 保存できなくても動く */ }
  document.dispatchEvent(new CustomEvent("skhub:account"));
}
function clearHint() {
  try { localStorage.removeItem(HINT_KEY); } catch (e) { /* 同上 */ }
  document.dispatchEvent(new CustomEvent("skhub:account"));
}

// サービスのページで、アカウントが使える（ready）と確かめたときに呼ぶ（ヘッダーにログイン中と出す）
export function rememberAccount(user) {
  saveHint(user);
}

function provider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}

export function signIn() {
  return signInWithPopup(auth, provider());
}

export function signOutAccount() {
  clearHint();
  return signOut(auth);
}

// 大事な操作（アカウントの削除）の前に、もう一度 Google で確認する
export function confirmWithGoogle(user) {
  return reauthenticateWithPopup(user, provider());
}

export async function deleteLogin(user) {
  await deleteUser(user);
  clearHint();
}

const accountRef = (uid) => doc(db, "accounts", uid);

// ログイン状態とアカウントの状態を知らせる
//   status: "signed-out"   … ログインしていない
//           "unregistered" … Google でログインしたが、まだアカウントを作っていない（規約に未同意）
//           "outdated"     … アカウント規約が変わり、同意し直す必要がある
//           "ready"        … 使える
//           "error"        … 読み込めなかった（error に理由）
export function watchAccount(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      clearHint();
      callback({ status: "signed-out", user: null, account: null });
      return;
    }
    try {
      const snap = await getDoc(accountRef(user.uid));
      if (!snap.exists()) {
        callback({ status: "unregistered", user, account: null });
        return;
      }
      const account = snap.data();
      saveHint(user);
      callback({ status: account.termsVersion === ACCOUNT_TERMS_VERSION ? "ready" : "outdated", user, account });
    } catch (error) {
      callback({ status: "error", user, account: null, error });
    }
  });
}

// アカウントを作る（規約に同意する）
export async function register(user) {
  await setDoc(accountRef(user.uid), {
    createdAt: serverTimestamp(),
    termsVersion: ACCOUNT_TERMS_VERSION,
    termsAgreedAt: serverTimestamp()
  });
  saveHint(user);
}

// 新しいアカウント規約に同意し直す
export async function agreeLatestTerms(user) {
  await updateDoc(accountRef(user.uid), { termsVersion: ACCOUNT_TERMS_VERSION, termsAgreedAt: serverTimestamp() });
}

// サービスのページから、ログイン・アカウントの作成を頼むときの URL（終わったら戻ってくる）
export function accountPageUrl(next = location.pathname + location.search + location.hash) {
  return `/account/?next=${encodeURIComponent(next)}`;
}

// ?next= で受け取った戻り先。このサイトの中のページだけ許可する
export function safeNext(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "";
  return raw;
}
