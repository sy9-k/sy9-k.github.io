// SK Hub Systems アカウントのページ（/account/）
// ログイン → アカウントの作成（規約への同意）→ アカウントの確認・データのダウンロード・削除
// サービスのページから ?next=/y-filter/ のように来たときは、使えるようになったら戻す。
import {
  agreeLatestTerms, confirmWithGoogle, db, deleteLogin, register, safeNext, signIn,
  signOutAccount, watchAccount
} from "/assets/hub/account.js";
import {
  arrayRemove, collection, deleteDoc, deleteField, doc, getCountFromServer, getDoc, getDocs, query, updateDoc, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const root = document.querySelector("[data-acct]");
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const next = safeNext(new URLSearchParams(location.search).get("next"));

let current = { status: "loading", user: null, account: null };
let busy = false;

const errText = (err) => {
  const code = err?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "ログインの画面が閉じられました。";
  if (code === "auth/popup-blocked") return "ポップアップがブロックされました。ブラウザの設定でこのサイトのポップアップを許可してください。";
  if (code === "auth/network-request-failed" || code === "unavailable") return "通信できませんでした。インターネットの接続を確認してください。";
  if (code === "permission-denied") return "SK Hub Systems がこの操作を受け付けませんでした。時間をおいて再度お試しください。";
  return `うまくいきませんでした（${code || err?.message || err}）`;
};
const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v ? new Date(v) : null);
const formatDate = (d) => (d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : "-");

function showView(name) {
  root.querySelectorAll("[data-acct-view]").forEach((el) => { el.hidden = el.dataset.acctView !== name; });
  message("");
}

// 表示中の画面のメッセージ欄に出す
function message(text) {
  root.querySelectorAll("[data-acct-msg]").forEach((el) => {
    el.textContent = el.closest("[data-acct-view]")?.hidden ? "" : text;
  });
}

function setBusy(on, button) {
  busy = on;
  if (button) button.disabled = on;
  root.classList.toggle("is-busy", on);
}

function userChip(user) {
  const wrap = document.createElement("div");
  wrap.className = "acct-user-chip";
  if (user.photoURL) {
    const img = document.createElement("img");
    img.src = user.photoURL;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    wrap.appendChild(img);
  }
  const text = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = user.displayName || "（名前なし）";
  const mail = document.createElement("small");
  mail.textContent = user.email || "";
  text.append(name, mail);
  wrap.appendChild(text);
  return wrap;
}

// ---------- 画面 ----------

function render(state) {
  current = state;
  const { status, user, account } = state;
  if (status === "signed-out") { showView("signed-out"); return; }
  if (status === "error") {
    showView("error");
    $("[data-acct-error]").textContent = errText(state.error);
    return;
  }
  if (status === "unregistered" || status === "outdated") {
    showView("register");
    $("[data-acct-user]").replaceChildren(userChip(user));
    const outdated = status === "outdated";
    $("[data-acct-register-title]").textContent = outdated ? "規約が新しくなりました" : "アカウントを作成";
    $("[data-acct-register-lead]").textContent = outdated
      ? "SK Hub Systems アカウント規約が新しくなりました。引き続き使うには、内容を確認して同意してください。"
      : "この Google アカウントで SK Hub Systems アカウントを作成します。内容を確認して、同意してください。";
    $("[data-acct-register]").textContent = outdated ? "同意して続ける" : "アカウントを作成";
    $("[data-acct-agree]").checked = false;
    $("[data-acct-register]").disabled = true;
    return;
  }

  // ready
  if (next) {
    $("[data-acct-next]").hidden = false;
    location.replace(next);
  }
  showView("ready");
  const photo = $("[data-acct-photo]");
  const letter = $("[data-acct-letter]");
  photo.hidden = !user.photoURL;
  letter.hidden = !!user.photoURL;
  if (user.photoURL) photo.src = user.photoURL;
  letter.textContent = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  $("[data-acct-name]").textContent = user.displayName || "（名前なし）";
  $("[data-acct-email]").textContent = user.email || "";
  $("[data-acct-uid]").textContent = user.uid;
  $("[data-acct-created]").textContent = formatDate(toDate(account.createdAt) || toDate(user.metadata?.creationTime));
  $("[data-acct-terms]").textContent = `SK Hub Systems アカウント規約（${account.termsVersion} 版）に ${formatDate(toDate(account.termsAgreedAt))} に同意しています。`;
  renderConsole(user);
  // ヘッダーのメニューの「データのダウンロード・削除」（/account/#privacy）から来たとき
  if (location.hash === "#privacy") document.getElementById("privacy")?.scrollIntoView({ block: "start" });
}

// 管理コンソールを使っているか（自分の管理グループの端末の数・参加しているグループ）
async function renderConsole(user) {
  const el = $("[data-acct-console]");
  try {
    const [own, joined] = await Promise.all([
      getCountFromServer(query(collection(db, "devices"), where("ownerUid", "==", user.uid))),
      getDocs(query(collection(db, "teams"), where("members", "array-contains", user.uid)))
    ]);
    const devices = own.data().count;
    const others = joined.docs.filter((d) => d.id !== user.uid).length;
    const parts = [];
    if (devices) parts.push(`端末 ${devices} 台を管理中`);
    if (others) parts.push(`ほかの ${others} グループの共同管理者`);
    el.textContent = parts.length ? parts.join("・") : "端末の設定をまとめて管理できます";
  } catch (e) {
    el.textContent = "端末の設定をまとめて管理できます";
  }
}

// ---------- 操作 ----------

root.querySelectorAll("[data-acct-signin]").forEach((btn) => btn.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true, btn);
  try {
    await signIn();
  } catch (err) {
    message(errText(err));
  } finally {
    setBusy(false, btn);
  }
}));

$$("[data-acct-signout], [data-acct-cancel]").forEach((btn) => btn.addEventListener("click", () => signOutAccount()));
$("[data-acct-retry]").addEventListener("click", () => location.reload());

$("[data-acct-agree]").addEventListener("change", (e) => { $("[data-acct-register]").disabled = !e.target.checked || busy; });

$("[data-acct-register]").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  if (busy || !$("[data-acct-agree]").checked || !current.user) return;
  setBusy(true, btn);
  try {
    if (current.status === "outdated") await agreeLatestTerms(current.user);
    else await register(current.user);
    const snap = await getDoc(doc(db, "accounts", current.user.uid));
    render({ status: "ready", user: current.user, account: snap.data() });
  } catch (err) {
    message(errText(err));
  } finally {
    setBusy(false, btn);
  }
});

// データのダウンロード
$("[data-acct-export]").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const { user, account } = current;
  if (busy || !user) return;
  setBusy(true, btn);
  try {
    const [teams, devices] = await Promise.all([
      getDocs(query(collection(db, "teams"), where("members", "array-contains", user.uid))),
      getDocs(query(collection(db, "devices"), where("ownerUid", "==", user.uid)))
    ]);
    const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x.toDate === "function" ? x.toDate().toISOString() : x)));
    const data = {
      exportedAt: new Date().toISOString(),
      service: "SK Hub Systems アカウント",
      login: {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        provider: "google.com",
        createdAt: user.metadata?.creationTime,
        lastSignInAt: user.metadata?.lastSignInTime
      },
      account: plain(account),
      yFilterConsole: {
        teams: teams.docs.map((d) => ({ id: d.id, role: d.id === user.uid ? "owner" : "co-admin", ...plain(d.data()) })),
        devices: devices.docs.map((d) => ({ id: d.id, ...plain(d.data()) }))
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sk-hub-account-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (err) {
    message(errText(err));
  } finally {
    setBusy(false, btn);
  }
});

// ---------- 削除 ----------
const dialog = document.querySelector("[data-acct-delete-dialog]");
const deleteAgree = dialog.querySelector("[data-acct-delete-agree]");
const deleteConfirm = dialog.querySelector("[data-acct-delete-confirm]");
deleteAgree.addEventListener("change", () => { deleteConfirm.disabled = !deleteAgree.checked; });

$("[data-acct-delete]").addEventListener("click", () => {
  if (busy || !current.user) return;
  deleteAgree.checked = false;
  deleteConfirm.disabled = true;
  dialog.returnValue = "";
  dialog.showModal();
});

dialog.addEventListener("close", async () => {
  if (dialog.returnValue !== "delete" || !deleteAgree.checked || !current.user) return;
  const btn = $("[data-acct-delete]");
  const user = current.user;
  setBusy(true, btn);
  btn.textContent = "削除しています…";
  try {
    // 途中で止まらないように、データを消す前に Google で本人を確認する
    await confirmWithGoogle(user);
    await deleteServiceData(user.uid);
    await deleteDoc(doc(db, "accounts", user.uid));
    await deleteLogin(user);
    showView("signed-out");
    message("アカウントを削除しました。ご利用ありがとうございました。");
  } catch (err) {
    message(`削除できませんでした。${errText(err)}`);
  } finally {
    btn.textContent = "アカウントを削除する";
    setBusy(false, btn);
  }
});

// 管理コンソールのデータ: 自分の管理グループ（端末・リクエスト・コード）を消し、ほかのグループからは抜ける
async function deleteServiceData(uid) {
  const owned = await Promise.all([
    getDocs(query(collection(db, "devices"), where("ownerUid", "==", uid))),
    getDocs(query(collection(db, "requests"), where("ownerUid", "==", uid))),
    getDocs(query(collection(db, "pairingCodes"), where("ownerUid", "==", uid))),
    getDocs(query(collection(db, "teamInvites"), where("teamId", "==", uid)))
  ]);
  const refs = owned.flatMap((snap) => snap.docs.map((d) => d.ref));
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  const teams = await getDocs(query(collection(db, "teams"), where("members", "array-contains", uid)));
  for (const team of teams.docs) {
    if (team.id === uid) continue;
    await updateDoc(team.ref, { members: arrayRemove(uid), [`memberInfo.${uid}`]: deleteField() });
  }
  const own = await getDoc(doc(db, "teams", uid));
  if (own.exists()) await deleteDoc(own.ref);
}

// ヘッダーのメニューの「ログアウト」（/account/?signout=1）
if (new URLSearchParams(location.search).has("signout")) {
  history.replaceState(null, "", "/account/");
  signOutAccount().finally(() => watchAccount(render));
} else {
  watchAccount(render);
}
