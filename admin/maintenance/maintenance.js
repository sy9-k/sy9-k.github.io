// メンテナンスの告知（/admin/maintenance/）。config/maintenance を変えると、sk-hub.jp の各ページの上に帯が出る（/assets/maintenance.js）
//   { active, level: info|warning|maintenance, message, services: [], startsAt, endsAt, updatedAt, updatedBy（管理者の UID） }
//   ページ側は 5 分だけ覚えておくので、変えてから出る・消えるまで最大 5 分かかる
import {
  Timestamp, doc, getDoc, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  $, NEW_ORIGIN, badge, busy, button, card, db, el, errorNote, explain, fmtDateTime, logAction, me, note, startAdmin, toMillis, toast
} from "/admin/shared/admin.js";

const MESSAGE_MAX = 500;
const LEVELS = [["maintenance", "メンテナンス", "construction"], ["warning", "障害", "warning"], ["info", "お知らせ", "info"]];
const SERVICES = [["y-filter", "Y-FILTER."], ["malu", "MALU"], ["nagi", "Nagi"], ["toolbox", "SK's Toolbox"], ["account", "アカウント"], ["lab", "SK's Lab"], ["view", "SK Share"]];
const TEMPLATES = [
  ["メンテナンスの予定", "maintenance", "○月○日 ○:○○〜○:○○ にメンテナンスを行います。この間、ログインと同期が使えません。"],
  ["障害が起きている", "warning", "現在、一部の機能が使えなくなっています。原因を調べています。ご迷惑をおかけしてすみません。"],
  ["障害が直った", "info", "○時ごろから起きていた障害は直りました。ご迷惑をおかけしました。"]
];

const root = $("[data-page]");
const state = { active: false, level: "maintenance", message: "", services: [], startsAt: null, endsAt: null };

const current = el("div", "ad-stack");
const form = el("form", "ad-form");
const activeRow = el("label", "ad-switch-row");
const active = el("input", "tbs-switch");
active.type = "checkbox";
activeRow.append(el("span", null, "帯を出す"), active);
const levelTabs = el("div", "ad-tabs");
LEVELS.forEach(([v, label, ic]) => {
  const b = el("button", "tbs-chip m3-state");
  b.type = "button";
  b.dataset.level = v;
  const i = el("span", "msr", ic);
  i.setAttribute("aria-hidden", "true");
  b.append(i, document.createTextNode(label));
  b.addEventListener("click", () => { state.level = v; sync(); });
  levelTabs.append(b);
});
const msgField = el("label", "m3-field");
const msg = el("textarea");
msg.rows = 3;
msg.maxLength = MESSAGE_MAX;
msgField.append(el("span", "m3-field__label", `お知らせの文（${MESSAGE_MAX} 文字まで）`), msg);
const templates = el("div", "ad-row");
templates.append(el("span", "ad-hint", "ひな形:"));
TEMPLATES.forEach(([label, level, text]) => templates.append(button(label, { kind: "text-btn", onClick: () => { state.level = level; msg.value = text; sync(); msg.focus(); } })));
const svcBox = el("div", "ad-tabs");
SERVICES.forEach(([v, label]) => {
  const b = el("button", "tbs-chip m3-state", label);
  b.type = "button";
  b.dataset.service = v;
  b.addEventListener("click", () => {
    state.services = state.services.includes(v) ? state.services.filter((s) => s !== v) : [...state.services, v];
    sync();
  });
  svcBox.append(b);
});
const svcHint = el("p", "ad-hint");
const times = el("div", "ad-fields");
const timeField = (label) => {
  const f = el("label", "m3-field");
  const i = el("input", "m3-field__input");
  i.type = "datetime-local";
  f.append(el("span", "m3-field__label", label), i);
  times.append(f);
  return i;
};
const startsAt = timeField("出し始める日時（空ならすぐ）");
const endsAt = timeField("消す日時（空なら消すまで）");
const preview = el("div");
const save = button("保存する", { iconName: "save", type: "submit" });
const saveRow = el("div", "ad-row ad-row--end");
saveRow.append(save);
form.append(activeRow, levelTabs, msgField, templates, el("p", "ad-hint", "出すページ（選ばなければすべてのページ。選んだときも、ホーム・稼働状況・サポートには出ます）"), svcBox, svcHint, times, el("p", "ad-hint", "プレビュー"), preview, saveRow);

const toLocal = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (v) => (v ? new Date(v).getTime() : null);

function sync() {
  levelTabs.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === state.level)));
  svcBox.querySelectorAll("[data-service]").forEach((b) => b.setAttribute("aria-pressed", String(state.services.includes(b.dataset.service))));
  svcHint.textContent = state.services.length ? `出すページ: ${state.services.map((s) => SERVICES.find((x) => x[0] === s)[1]).join("・")}（とホーム・稼働状況・サポート）` : "すべてのページに出します。";
  renderPreview();
}
function renderPreview() {
  const data = { level: state.level, message: msg.value.trim() || "（お知らせの文）", startsAt: fromLocal(startsAt.value), endsAt: fromLocal(endsAt.value) };
  preview.replaceChildren(window.SKMaintenance ? window.SKMaintenance.render(data, true) : el("p", "ad-hint", "プレビューを読み込めませんでした"));
  const box = preview.firstChild;
  if (box && box.style) { box.style.borderRadius = "12px"; box.querySelector("button") && (box.querySelector("button").disabled = true); }
}
msg.addEventListener("input", renderPreview);
startsAt.addEventListener("input", renderPreview);
endsAt.addEventListener("input", renderPreview);

function renderCurrent(m) {
  const now = Date.now();
  const r = el("div", "ad-row");
  if (!m) { r.append(badge("まだ一度も出していません")); current.replaceChildren(r); return; }
  const live = window.SKMaintenance ? window.SKMaintenance.live(m, now) : m.active;
  const scheduled = m.active && !live && m.startsAt && toMillis(m.startsAt) > now;
  r.append(live ? badge("いま出ています", "warn") : scheduled ? badge(`${fmtDateTime(m.startsAt)} から出ます`, "info") : badge("出していません", "ok"));
  r.append(el("span", "ad-hint", `最後に変えた日時 ${fmtDateTime(m.updatedAt)}${m.updatedBy && me() && m.updatedBy === me().uid ? "（自分）" : ""}`));
  const open = el("a", "text-btn m3-state", "sk-hub.jp で見る");
  open.href = `${NEW_ORIGIN}/`;
  open.target = "_blank";
  open.rel = "noopener";
  r.append(el("span", "ad-grow"), open);
  current.replaceChildren(r);
  if (m.active && m.message) current.append(el("p", "ad-msg", m.message));
}

async function load() {
  try {
    const snap = await getDoc(doc(db, "config", "maintenance"));
    const m = snap.exists() ? snap.data() : null;
    if (m) {
      state.active = !!m.active;
      state.level = m.level || "maintenance";
      state.services = Array.isArray(m.services) ? m.services : [];
      msg.value = m.message || "";
      startsAt.value = toLocal(toMillis(m.startsAt));
      endsAt.value = toLocal(toMillis(m.endsAt));
    }
    active.checked = state.active;
    renderCurrent(m);
  } catch (err) {
    current.replaceChildren(err.code === "permission-denied" ? note("まだ一度も出していないか、Firestore のルールが反映されていません。") : errorNote(err));
  }
  sync();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  busy(save, async () => {
    const message = msg.value.trim();
    const start = fromLocal(startsAt.value);
    const end = fromLocal(endsAt.value);
    if (active.checked && !message) { toast("お知らせの文を入れてください"); msg.focus(); return; }
    if (start && end && end <= start) { toast("消す日時は、出し始める日時より後にしてください"); endsAt.focus(); return; }
    const data = {
      active: active.checked,
      level: state.level,
      message: message.slice(0, MESSAGE_MAX),
      services: state.services,
      startsAt: start ? Timestamp.fromMillis(start) : null,
      endsAt: end ? Timestamp.fromMillis(end) : null,
      updatedAt: serverTimestamp(),
      updatedBy: me().uid
    };
    try {
      await setDoc(doc(db, "config", "maintenance"), data);
      logAction("maintenance.save", state.level, `${data.active ? "出す" : "出さない"}「${message.slice(0, 60)}」`);
      toast(data.active ? "保存しました。5 分ほどで各ページに出ます" : "保存しました。5 分ほどで消えます");
      load();
    } catch (err) {
      toast(explain(err));
    }
  });
});

root.append(card("campaign", "いまの状態", current), card("edit", "告知を変える", form));

startAdmin({ page: "maintenance", onReady: load });
