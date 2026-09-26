// お問い合わせの受信箱（/inbox/）。開発者（config/developers に UID がある SK Hub Systems アカウント）だけが読める
// 届いたものは contacts。対応済みにすると expireAt（1 年後）が入る。
// 開くたびに、保存期間を過ぎたもの（対応から 1 年のお問い合わせ・1 年を過ぎたアクセスチェックの記録）を削除する
// （SK プライバシーポリシー第七条。Firestore の TTL は有料プランが必要なので、ここで行う）
import { db, signIn, signOutAccount, watchAccount } from "/assets/hub/account.js";
import {
  Timestamp, collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const KIND = { bug: "不具合の報告", question: "質問", request: "要望・アイデア", data: "データの確認・削除", other: "その他" };
const PRODUCT = { "y-filter": "Y-FILTER.", malu: "MALU", hub: "SK Hub Systems・管理コンソール", account: "SK Hub Systems アカウント", lab: "SK's Lab", site: "このサイト", other: "その他" };
const PRODUCT_CLASS = { "y-filter": "cat-yf", malu: "cat-malu", hub: "cat-hub", account: "cat-hub", lab: "cat-lab", site: "cat-sk", other: "" };

const root = document.querySelector("[data-inbox]");
const $ = (sel) => root.querySelector(sel);
const listEl = $("[data-inbox-list]");
const baseTitle = document.title;
let items = [];
let filter = "new";
let unsubscribe = null;

const el = (tag, className, text) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
};
const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : null);
const receipt = (id) => id.slice(0, 8).toUpperCase();

function showView(name) {
  root.querySelectorAll("[data-inbox-view]").forEach((v) => { v.hidden = v.dataset.inboxView !== name; });
}

function render() {
  const counts = { new: items.filter((i) => i.status !== "done").length, done: items.filter((i) => i.status === "done").length };
  root.querySelectorAll("[data-inbox-count]").forEach((c) => { c.textContent = counts[c.dataset.inboxCount] || ""; });
  root.querySelectorAll("[data-inbox-filter]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.inboxFilter === filter)));
  document.title = counts.new ? `(${counts.new}) ${baseTitle}` : baseTitle;

  const shown = items.filter((i) => !filter || (filter === "done" ? i.status === "done" : i.status !== "done"));
  if (!shown.length) {
    listEl.replaceChildren(el("p", "faq-empty", filter === "new" ? "未対応のお問い合わせはありません。" : "お問い合わせはありません。"));
    return;
  }
  listEl.replaceChildren(...shown.map(card));
}

function card(item) {
  const box = el("article", `card inbox-item${item.status === "done" ? " is-done" : ""}`);
  const meta = el("div", "help-meta");
  meta.append(
    el("span", `help-type ${item.status === "done" ? "help-type--guide" : "help-type--news"}`, item.status === "done" ? "対応済み" : "未対応"),
    el("span", "update-cat cat-sk", KIND[item.kind] || item.kind),
    el("span", `update-cat ${PRODUCT_CLASS[item.product] || ""}`, PRODUCT[item.product] || item.product)
  );
  const created = toDate(item.createdAt);
  const time = el("time", null, created ? created.toLocaleString("ja-JP") : "-");
  meta.appendChild(time);

  const body = el("p", "inbox-message", item.message || "");

  const info = el("dl", "inbox-info");
  const addInfo = (label, node) => {
    const row = el("div");
    row.append(el("dt", null, label));
    const dd = el("dd");
    dd.append(node);
    row.appendChild(dd);
    info.appendChild(row);
  };
  addInfo("受付番号", el("code", null, receipt(item.id)));
  if (item.email) {
    const a = el("a", null, item.email);
    a.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(`お問い合わせについて（受付番号 ${receipt(item.id)}）`)}`;
    addInfo("返信先", a);
  } else {
    addInfo("返信先", el("span", "inbox-muted", "なし（返信不要）"));
  }
  if (item.supportId) addInfo("サポートID", el("code", null, item.supportId));
  if (item.userAgent) addInfo("ブラウザ", el("span", "inbox-muted", `${item.userAgent}${item.language ? `（${item.language}）` : ""}`));
  const handled = toDate(item.handledAt);
  if (item.status === "done" && handled) addInfo("対応", el("span", "inbox-muted", `${handled.toLocaleDateString("ja-JP")} に対応済み（1 年後に自動で削除）`));

  const actions = el("div", "btn-row inbox-actions");
  const toggle = el("button", "btn btn-tonal", item.status === "done" ? "未対応に戻す" : "対応済みにする");
  toggle.type = "button";
  toggle.addEventListener("click", () => setDone(item, item.status !== "done", toggle));
  const del = el("button", "btn btn-tonal inbox-delete", "削除");
  del.type = "button";
  del.addEventListener("click", async () => {
    if (!confirm(`受付番号 ${receipt(item.id)} を削除します。元に戻せません。`)) return;
    try { await deleteDoc(doc(db, "contacts", item.id)); } catch (err) { alert(`削除できませんでした（${err.code || err.message}）`); }
  });
  actions.append(toggle, del);

  box.append(meta, body, info, actions);
  return box;
}

async function setDone(item, isDone, button) {
  button.disabled = true;
  try {
    await updateDoc(doc(db, "contacts", item.id), isDone
      ? { status: "done", handledAt: serverTimestamp(), expireAt: Timestamp.fromMillis(Date.now() + RETENTION_MS) }
      : { status: "new", handledAt: deleteField(), expireAt: deleteField() });
  } catch (err) {
    alert(`変更できませんでした（${err.code || err.message}）`);
    button.disabled = false;
  }
}

// 保存期間を過ぎたものを削除する（1 回に最大 2000 件）
async function deleteWhere(q) {
  let total = 0;
  for (let round = 0; round < 5; round += 1) {
    const snap = await getDocs(q);
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 400) break;
  }
  return total;
}

async function cleanup() {
  const hint = root.querySelector(".inbox-hint");
  const now = Timestamp.now();
  const yearAgo = Timestamp.fromMillis(Date.now() - RETENTION_MS);
  try {
    const [contacts, logs] = await Promise.all([
      deleteWhere(query(collection(db, "contacts"), where("expireAt", "<", now), limit(400))),
      deleteWhere(query(collection(db, "hub_access_logs"), where("createdAt", "<", yearAgo), limit(400)))
    ]);
    if (contacts || logs) hint.textContent = `保存期間を過ぎたものを削除しました（お問い合わせ ${contacts} 件・アクセスチェックの記録 ${logs} 件）。`;
  } catch (err) {
    hint.textContent = `保存期間を過ぎたものを削除できませんでした（${err.code || err.message}）。`;
  }
}

root.querySelectorAll("[data-inbox-filter]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.inboxFilter; render(); }));
root.querySelector("[data-inbox-signin]").addEventListener("click", async () => {
  try { await signIn(); } catch (err) { $("[data-inbox-msg]").textContent = `ログインできませんでした（${err.code || err.message}）`; }
});
root.querySelector("[data-inbox-signout]").addEventListener("click", () => signOutAccount());

watchAccount(async ({ status, user }) => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (status === "signed-out" || !user) { showView("signed-out"); return; }
  // 開発者かどうか（config/developers は、登録された本人だけが読める）
  try {
    await getDoc(doc(db, "config", "developers"));
  } catch (err) {
    $("[data-inbox-email]").textContent = user.email || "";
    showView("denied");
    return;
  }
  showView("ready");
  cleanup();
  unsubscribe = onSnapshot(
    query(collection(db, "contacts"), orderBy("createdAt", "desc"), limit(300)),
    (snap) => { items = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => { listEl.replaceChildren(el("p", "faq-empty", `読み込めませんでした（${err.code || err.message}）`)); }
  );
});
