// アカウントを探す（/admin/accounts/）。UID かサポート ID で調べる
//   見てよいのは、障害・不正利用・本人や管理者からの依頼のときだけ（SK Hub Systems 規約 第六条4）。
//   そのため出すのは必要最小限（作成日・規約の版・接続しているサービス・端末とリクエストの数・最後の接続）にして、
//   端末のログインメール・設定・OS などは出さない。調べたら操作の記録（account.view）に残す
//   ?uid=… / ?sid=… で開くと、すぐに調べる（お問い合わせから来るとき）
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ACCOUNT_TERMS_VERSION } from "/assets/hub/account.js";
import {
  $, badge, busy, button, card, confirmDialog, copyText, db, el, empty, errorNote, explain, fmtAgo, fmtDate, fmtDateTime,
  listItem, logAction, note, num, promptDialog, startAdmin, toMillis, toast
} from "/admin/shared/admin.js";
import { SUPPORT_ID, block, isBlocked, unblock } from "/admin/shared/blocklist.js";

const SERVICE_LABEL = { yfilter: "Y-FILTER.", malu: "MALU", nagi: "Nagi" };
const KIND = { bug: "不具合", question: "質問", request: "要望", data: "データ", other: "その他" };
const ONLINE_MS = 15 * 60 * 1000;

const root = $("[data-page]");
const form = el("form", "ad-search");
const field = el("label", "m3-field");
const input = el("input", "m3-field__input ad-mono");
input.name = "q";
input.autocomplete = "off";
input.spellcheck = false;
input.placeholder = "UID（英数字 28 文字ほど）か、サポート ID（8-4-4-4-12）";
field.append(el("span", "m3-field__label", "UID かサポート ID"), input);
const go = button("調べる", { iconName: "search", type: "submit" });
form.append(field, go);
const result = el("div", "ad-stack");
const recent = el("div");

root.append(
  note("アカウントの中身を見るのは、障害・不正利用・本人や管理者からの依頼のときだけです（SK Hub Systems 規約 第六条4）。調べると操作の記録に残ります。", "warn", "policy"),
  form, result, card("person_add", "最近できたアカウント", recent)
);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  const isSid = SUPPORT_ID.test(q);
  history.replaceState(null, "", `?${isSid ? "sid" : "uid"}=${encodeURIComponent(q)}`);
  busy(go, () => (isSid ? showSupportId(q.toLowerCase()) : showAccount(q)));
});

function row(label, value) {
  const r = el("div");
  r.append(el("dt", null, label));
  const dd = el("dd");
  dd.append(value instanceof Node ? value : document.createTextNode(value == null ? "-" : String(value)));
  r.append(dd);
  return r;
}
function dl(...rows) {
  const d = el("dl", "ad-dl");
  rows.forEach((r) => d.append(...r.childNodes));
  return d;
}

// ---------- UID で調べる ----------
async function showAccount(uid) {
  result.replaceChildren(el("p", "ad-hint", "調べています…"));
  logAction("account.view", uid, "UID で調べた");
  const parts = [];
  const head = el("div", "ad-row");
  head.append(el("code", "ad-mono", uid), button("コピー", { kind: "text-btn", iconName: "content_copy", onClick: () => copyText(uid) }));
  const sendLink = el("a", "m3-btn m3-btn--tonal m3-state ad-btn-sm", "お知らせを送る");
  sendLink.href = `/admin/notices/?uid=${encodeURIComponent(uid)}`;
  head.append(el("span", "ad-grow"), sendLink);

  // アカウント
  const acctBody = el("div", "ad-stack");
  try {
    const snap = await getDoc(doc(db, "accounts", uid));
    if (!snap.exists()) {
      acctBody.append(note("この UID のアカウントはありません（作っていないか、削除されています）。"));
    } else {
      const a = snap.data();
      const services = Object.keys(a.services || {}).filter((k) => SERVICE_LABEL[k]);
      const terms = el("span", "ad-row");
      terms.append(document.createTextNode(`${a.termsVersion || "-"}（${fmtDate(a.termsAgreedAt)} に同意）`), a.termsVersion === ACCOUNT_TERMS_VERSION ? badge("最新", "ok") : badge("同意し直しが必要", "warn"));
      const svc = el("span", "ad-row");
      if (services.length) services.forEach((k) => svc.append(badge(`${SERVICE_LABEL[k]}（${fmtDate(a.services[k].connectedAt)}〜）`, "info")));
      else svc.append(document.createTextNode("なし"));
      acctBody.append(dl(
        row("表示名", (a.profile && a.profile.name) || "（Google の名前のまま）"),
        row("作成", fmtDateTime(a.createdAt)),
        row("規約の版", terms),
        row("接続しているサービス", svc),
        row("お知らせを開いた", a.noticesSeenAt ? fmtAgo(a.noticesSeenAt) : "まだ")
      ));
    }
  } catch (err) {
    acctBody.append(errorNote(err));
  }
  parts.push(card("account_circle", "アカウント", head, acctBody));

  // Y-FILTER.（管理グループ・端末・リクエスト）
  const yf = el("div", "ad-stack");
  try {
    const [team, memberOf, devices, requests] = await Promise.all([
      getDoc(doc(db, "teams", uid)),
      getDocs(query(collection(db, "teams"), where("members", "array-contains", uid))),
      getDocs(query(collection(db, "devices"), where("ownerUid", "==", uid))),
      getDocs(query(collection(db, "requests"), where("ownerUid", "==", uid)))
    ]);
    const others = memberOf.docs.filter((d) => d.id !== uid);
    const pending = requests.docs.filter((d) => d.data().status === "pending").length;
    const now = Date.now();
    yf.append(dl(
      row("管理グループ", team.exists() ? `持ち主（メンバー ${num((team.data().members || []).length)} 人）` : "持っていない"),
      row("共同管理者として", others.length ? `${num(others.length)} グループ` : "なし"),
      row("端末", `${num(devices.size)} 台（いまオンライン ${num(devices.docs.filter((d) => now - (toMillis(d.data().reported && d.data().reported.lastSeenAt) || 0) < ONLINE_MS).length)} 台）`),
      row("リクエスト", `${num(requests.size)} 件（未処理 ${num(pending)} 件）`)
    ));
    if (devices.size) {
      const list = el("ul", "ad-list");
      devices.docs
        .map((d) => d.data())
        .sort((x, y) => (toMillis(y.reported && y.reported.lastSeenAt) || 0) - (toMillis(x.reported && x.reported.lastSeenAt) || 0))
        .forEach((d) => {
          const seen = toMillis(d.reported && d.reported.lastSeenAt);
          list.append(listItem({
            iconName: d.mode === "personal" ? "person" : "computer",
            title: d.name || "（名前なし）",
            sub: `${d.mode === "personal" ? "自分の端末" : "管理する端末"}・つないだ日 ${fmtDate(d.pairedAt)}`,
            end: seen ? (now - seen < ONLINE_MS ? badge("オンライン", "ok") : badge(`最後 ${fmtAgo(seen)}`)) : badge("報告なし")
          }));
        });
      yf.append(list);
    }
  } catch (err) {
    yf.append(errorNote(err));
  }
  parts.push(card("shield", "Y-FILTER.", yf));

  // お問い合わせ
  const contacts = el("ul", "ad-list");
  try {
    const snap = await getDocs(query(collection(db, "contacts"), where("uid", "==", uid), limit(20)));
    if (snap.empty) contacts.append(empty("このアカウントからのお問い合わせはありません。", "mail"));
    snap.docs.sort((a, b) => (toMillis(b.data().createdAt) || 0) - (toMillis(a.data().createdAt) || 0)).forEach((d) => {
      const x = d.data();
      contacts.append(listItem({ iconName: "mail", title: (x.message || "").slice(0, 80), sub: `${KIND[x.kind] || x.kind}・${fmtDateTime(x.createdAt)}`, end: x.status === "done" ? badge("対応済み") : badge("未対応", "error"), href: "/admin/inbox/" }));
    });
  } catch (err) {
    contacts.append(errorNote(err));
  }
  parts.push(card("mail", "お問い合わせ", contacts));
  result.replaceChildren(...parts);
}

// ---------- サポート ID で調べる ----------
async function showSupportId(sid) {
  result.replaceChildren(el("p", "ad-hint", "調べています…"));
  logAction("account.view", sid, "サポート ID で調べた");
  const parts = [];

  const state = el("div", "ad-stack");
  const head = el("div", "ad-row");
  head.append(el("code", "ad-mono", sid), button("コピー", { kind: "text-btn", iconName: "content_copy", onClick: () => copyText(sid) }));
  state.append(head);
  try {
    const blocked = await isBlocked(sid);
    const r = el("div", "ad-row");
    r.append(blocked ? badge("制限中", "error") : badge("制限していません", "ok"), el("span", "ad-grow"));
    if (blocked) {
      r.append(button("制限を解除", { kind: "m3-btn m3-btn--tonal", iconName: "lock_open", small: true, onClick: async () => {
        if (!(await confirmDialog({ title: "制限を解除しますか？", text: "このサポート ID のブラウザから、また SK のサイトを使えるようになります。", ok: "解除", icon: "lock_open" }))) return;
        try { await unblock(sid); toast("解除しました"); showSupportId(sid); } catch (err) { toast(explain(err)); }
      } }));
    } else {
      r.append(button("アクセスを制限", { kind: "m3-btn ad-danger-btn", iconName: "block", small: true, onClick: async () => {
        const reason = await promptDialog({ title: "アクセスを制限します", label: "理由（自分用のメモ）", placeholder: "例: いたずらのお問い合わせを繰り返す", ok: "制限する", maxLength: 200 });
        if (reason == null) return;
        try { await block(sid, reason); toast("制限しました"); showSupportId(sid); } catch (err) { toast(explain(err)); }
      } }));
    }
    state.append(r, el("p", "ad-hint", "サポート ID はブラウザごとの ID です。sy9-k.github.io と sk-hub.jp では別の ID になります（同じ人でも ID が 2 つあることがあります）。"));
  } catch (err) {
    state.append(errorNote(err));
  }
  parts.push(card("fingerprint", "サポート ID", state));

  // アクセスチェックの記録
  const logs = el("div");
  try {
    const snap = await getDocs(query(collection(db, "hub_access_logs"), where("uuid", "==", sid), limit(300)));
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
    if (!rows.length) logs.append(empty("記録はありません（1 年より前のものは消えています）。", "receipt_long"));
    else {
      const first = rows[rows.length - 1];
      logs.append(el("p", "ad-hint", `${num(rows.length)} 件（${fmtDate(first.createdAt)} 〜 ${fmtDate(rows[0].createdAt)}）・言語 ${[...new Set(rows.map((r) => r.language))].join("・")}`));
      const list = el("ul", "ad-list");
      rows.slice(0, 30).forEach((r) => list.append(listItem({
        iconName: r.status === "blocked" ? "block" : "public",
        title: (r.page || "").replace(/^https?:\/\//, ""),
        sub: `${fmtDateTime(r.createdAt)}${r.referrer ? `・${r.referrer} から` : ""}`,
        end: r.status === "blocked" ? badge("制限中に開いた", "error") : null
      })));
      logs.append(list);
    }
  } catch (err) {
    logs.append(errorNote(err));
  }
  parts.push(card("receipt_long", "アクセスチェックの記録", logs));

  // お問い合わせ
  const contacts = el("ul", "ad-list");
  try {
    const snap = await getDocs(query(collection(db, "contacts"), where("supportId", "==", sid), limit(20)));
    if (snap.empty) contacts.append(empty("このサポート ID からのお問い合わせはありません。", "mail"));
    snap.docs.forEach((d) => {
      const x = d.data();
      const end = [x.status === "done" ? badge("対応済み") : badge("未対応", "error")];
      contacts.append(listItem({ iconName: "mail", title: (x.message || "").slice(0, 80), sub: `${KIND[x.kind] || x.kind}・${fmtDateTime(x.createdAt)}${x.uid ? "・アカウントあり" : ""}`, end, href: x.uid ? `/admin/accounts/?uid=${encodeURIComponent(x.uid)}` : "/admin/inbox/" }));
    });
  } catch (err) {
    contacts.append(errorNote(err));
  }
  parts.push(card("mail", "お問い合わせ", contacts));
  result.replaceChildren(...parts);
}

// ---------- 最近できたアカウント（UID と日付だけ） ----------
async function loadRecent() {
  try {
    const snap = await getDocs(query(collection(db, "accounts"), orderBy("createdAt", "desc"), limit(20)));
    if (snap.empty) { recent.replaceChildren(empty("まだアカウントはありません。", "group")); return; }
    const list = el("ul", "ad-list");
    snap.docs.forEach((d) => {
      const a = d.data();
      const services = Object.keys(a.services || {}).filter((k) => SERVICE_LABEL[k]).map((k) => SERVICE_LABEL[k]);
      const li = listItem({
        iconName: "person",
        title: d.id,
        sub: `${fmtDateTime(a.createdAt)}${services.length ? `・${services.join("・")}` : ""}`,
        end: a.termsVersion === ACCOUNT_TERMS_VERSION ? null : badge("規約が古い", "warn"),
        href: `?uid=${encodeURIComponent(d.id)}`
      });
      li.querySelector(".ad-li__title").classList.add("ad-mono");
      li.addEventListener("click", (e) => { e.preventDefault(); input.value = d.id; form.requestSubmit(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      list.append(li);
    });
    recent.replaceChildren(list, el("p", "ad-hint", "一覧は UID と日付だけです。中身は、調べたいアカウントを選んだときだけ読みます。"));
  } catch (err) {
    recent.replaceChildren(errorNote(err));
  }
}

startAdmin({
  page: "accounts",
  onReady: () => {
    loadRecent();
    const params = new URLSearchParams(location.search);
    const q = params.get("uid") || params.get("sid");
    if (q) { input.value = q; form.requestSubmit(); }
  }
});
