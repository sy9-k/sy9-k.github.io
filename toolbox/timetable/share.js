// Timetable の配信（ES モジュール。/toolbox/timetable/timetable.js が、ログインしているときだけ読み込む）
//   管理者（SK Hub Systems の開発者。config/developers に UID がある人）が、メールアドレスを入れた人に時間割を配信する。受け取る人は読むだけ
//   ・timetables/{ID}                  … { title, json: 時間割の JSON, ownerUid, updatedAt }。管理者と、配信先の人だけが読める
//   ・timetables/{ID}/private/members  … { emails: [配信先のメールアドレス], updatedAt }。管理者だけ（受け取る人どうしには見えない）
//   ・timetableInbox/{メールアドレス}   … { tids: [受け取る時間割の ID], updatedAt }。本人（Google のメールアドレスが一致し、確認済み）だけが読める
//   権限は y-filter リポジトリの systems/firestore.rules（「SK's Toolbox の時間割の配信」）
import { ACCOUNT_TERMS_VERSION, currentUser, db } from "/assets/hub/account.js";
import {
  arrayRemove, arrayUnion, deleteDoc, doc, getDoc, serverTimestamp, setDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function fail(code) { const e = new Error(code); e.code = code; return e; }
function newTid() {
  const b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20);
}
// たくさんの書き込みを、少しずつ並べて行う（1 回の書き込みごとに権限を確かめるため、まとめて 1 回にはしない）
async function inChunks(items, size, fn) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}
const inbox = (email) => doc(db, "timetableInbox", email);
const membersRef = (tid) => doc(db, "timetables", tid, "private", "members");

// 管理者か（config/developers は、登録された本人だけが読める）
export async function isAdmin() {
  const user = await currentUser();
  if (!user) return false;
  try { await getDoc(doc(db, "config", "developers")); return true; } catch (e) { return false; }
}

// 自分に配信された時間割
// 戻り値: { status: "signed-out" | "unregistered" | "ready", items: [{ tid, title, json, updatedAt }] }
export async function receive() {
  const user = await currentUser();
  if (!user) return { status: "signed-out", items: [] };
  const acc = await getDoc(doc(db, "accounts", user.uid));
  if (!acc.exists() || acc.data().termsVersion !== ACCOUNT_TERMS_VERSION) return { status: "unregistered", items: [] };
  const email = (user.email || "").toLowerCase();
  if (!email) return { status: "ready", items: [] };
  let box;
  try { box = await getDoc(inbox(email)); } catch (e) { return { status: "ready", items: [] }; }
  if (!box.exists()) return { status: "ready", items: [] };
  const tids = Array.isArray(box.data().tids) ? box.data().tids.filter((x) => typeof x === "string") : [];
  const items = await Promise.all(tids.map(async (tid) => {
    try {
      const snap = await getDoc(doc(db, "timetables", tid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { tid, title: String(d.title || ""), json: String(d.json || ""), updatedAt: d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0 };
    } catch (e) { return null; }
  }));
  return { status: "ready", items: items.filter(Boolean) };
}

// 管理者: 配信先のメールアドレス
export async function loadMembers(tid) {
  const snap = await getDoc(membersRef(tid));
  return snap.exists() && Array.isArray(snap.data().emails) ? snap.data().emails : [];
}

// 管理者: 配信する（tid があれば更新）。配信先から外した人の受け取り箱からは、この時間割を消す
// 戻り値: 時間割の ID
export async function publish({ tid, title, json, emails }) {
  const user = await currentUser();
  if (!user) throw fail("signed-out");
  const id = tid || newTid();
  const before = tid ? await loadMembers(tid).catch(() => []) : [];
  const batch = writeBatch(db);
  batch.set(doc(db, "timetables", id), { title, json, ownerUid: user.uid, updatedAt: serverTimestamp() });
  batch.set(membersRef(id), { emails, updatedAt: serverTimestamp() });
  await batch.commit();
  await inChunks(emails, 20, (email) => setDoc(inbox(email), { tids: arrayUnion(id), updatedAt: serverTimestamp() }, { merge: true }));
  const removed = before.filter((e) => !emails.includes(e));
  await inChunks(removed, 20, (email) => setDoc(inbox(email), { tids: arrayRemove(id), updatedAt: serverTimestamp() }, { merge: true }));
  return id;
}

// 管理者: 配信をやめる（受け取り箱から消し、時間割と配信先を削除する）
export async function unpublish(tid) {
  const emails = await loadMembers(tid).catch(() => []);
  await inChunks(emails, 20, (email) => setDoc(inbox(email), { tids: arrayRemove(tid), updatedAt: serverTimestamp() }, { merge: true }));
  await deleteDoc(membersRef(tid));
  await deleteDoc(doc(db, "timetables", tid));
}
