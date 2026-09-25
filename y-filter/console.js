// Y-FILTER. Systems 管理コンソール
// Google ログインした管理者が、自分のアカウントに接続した端末の設定をまとめて管理する。
// データ構造・権限は systems/firestore.rules を参照。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  Timestamp, collection, deleteDoc, doc, getFirestore, increment, onSnapshot, query,
  serverTimestamp, setDoc, updateDoc, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { NEWTAB_MODES, REMOTE_SETTING_KEYS, buildDefaultSettings, normalizeSettings } from "./shared/settings-schema.js";

const CATEGORIES_URL = "https://sy9-k.github.io/y-filter-system/categories.json";
const ONLINE_WINDOW_MS = 15 * 60 * 1000; // 端末は最長 10 分ごとに報告する
const PAIRING_TTL_MS = 30 * 60 * 1000;
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 読み間違えやすい I O 0 1 を除く
const EXTENSIONS = ["exe", "msi", "zip", "rar", "7z", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "apk"];

const $ = (id) => document.getElementById(id);
const show = (id, visible) => { $(id).hidden = !visible; };

// ---------- 起動 ----------

const configured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);
show("loading", false);
if (!configured) {
  show("unconfigured", true);
  throw new Error("firebase-config.js が未設定です");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  devices: [],          // { id, ...data }
  selected: new Set(),
  pairingCodes: [],
  categories: {},
  unsubscribers: []
};

// ---------- 共通 ----------

let toastTimer = null;
function toast(message, isError = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const toMillis = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : Number(v || 0));

function timeAgo(ms) {
  if (!ms) return "-";
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return "たった今";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}時間前`;
  return new Date(ms).toLocaleString();
}

// キーの順番に左右されない比較用の文字列
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

// 配信設定と端末の設定の違い（learningModeUntil は時間で変わるので比較しない）
function diffKeys(a, b) {
  const x = normalizeSettings(a || {});
  const y = normalizeSettings(b || {});
  return REMOTE_SETTING_KEYS.filter((k) => k !== "learningModeUntil" && stable(x[k]) !== stable(y[k]));
}

function deviceStatus(d) {
  const lastSeen = toMillis(d.reported?.lastSeenAt);
  const online = lastSeen && Date.now() - lastSeen < ONLINE_WINDOW_MS;
  const pending = Number(d.reported?.appliedRev || 0) < Number(d.settingsRev || 0);
  const changed = !pending && d.reported?.settings && diffKeys(d.settings, d.reported.settings).length > 0;
  return { lastSeen, online, pending, changed };
}

const OS_LABEL = { win: "Windows", mac: "Mac", cros: "Chromebook", linux: "Linux", android: "Android" };

// ---------- ログイン ----------

$("signin-btn").addEventListener("click", async () => {
  $("signin-msg").textContent = "";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    $("signin-msg").textContent = `ログインできませんでした（${e.code || e.message}）`;
  }
});
$("signout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  state.unsubscribers.forEach((fn) => fn());
  state.unsubscribers = [];
  state.user = user;
  state.devices = [];
  state.selected.clear();
  show("signin", !user);
  show("app", !!user);
  if (!user) return;
  $("user-email").textContent = user.email || "";
  subscribe();
  loadCategories();
});

function subscribe() {
  const uid = state.user.uid;
  state.unsubscribers.push(onSnapshot(
    query(collection(db, "devices"), where("ownerUid", "==", uid)),
    (snap) => {
      state.devices = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ja"));
      for (const id of [...state.selected]) if (!state.devices.some((d) => d.id === id)) state.selected.delete(id);
      renderDevices();
    },
    (err) => toast(`端末一覧を読み込めません: ${err.code || err.message}`, true)
  ));
  state.unsubscribers.push(onSnapshot(
    query(collection(db, "pairingCodes"), where("ownerUid", "==", uid)),
    (snap) => {
      state.pairingCodes = snap.docs.map((d) => ({ code: d.id, ...d.data() }));
      renderPairingList();
    },
    () => {}
  ));
}

// カテゴリ一覧は JSON のほか `export const CATEGORY_DATA = {...}` 形式のこともある
// （拡張機能の categories-provider.js と同じ読み方。eval は使わない）
function parseCategoryData(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const m = text.match(/CATEGORY_DATA\s*=\s*({[\s\S]*})\s*;?\s*$/m);
    if (!m) return {};
    const src = m[1]
      .replace(/^﻿/, "")
      .replace(/([{,]\s*)(domains|keywords)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(src);
    } catch (err) {
      return {};
    }
  }
}

async function loadCategories() {
  try {
    state.categories = parseCategoryData(await fetch(CATEGORIES_URL, { cache: "no-store" }).then((r) => r.text()));
  } catch (e) {
    state.categories = {};
  }
}

// ---------- 端末一覧 ----------

function renderDevices() {
  const rows = $("device-rows");
  rows.replaceChildren();
  let online = 0, pending = 0, changed = 0;
  for (const d of state.devices) {
    const st = deviceStatus(d);
    if (st.online) online++;
    if (st.pending) pending++;
    if (st.changed) changed++;
    const info = d.reported?.info || {};
    const tr = document.createElement("tr");
    tr.classList.toggle("selected", state.selected.has(d.id));
    tr.innerHTML = `
      <td class="cb"><input type="checkbox" ${state.selected.has(d.id) ? "checked" : ""} aria-label="選択"></td>
      <td><div class="dev-name">${escapeHtml(d.name || "名前なし")}</div><div class="dev-sub">${escapeHtml(d.id.slice(0, 10))}…</div></td>
      <td><span class="pill ${st.online ? "on" : "off"}">${st.online ? "オンライン" : "オフライン"}</span></td>
      <td>${st.pending ? '<span class="pill warn">反映待ち</span>' : st.changed ? '<span class="pill info">端末側で変更あり</span>' : '<span class="pill on">最新</span>'}</td>
      <td>${escapeHtml(timeAgo(st.lastSeen))}</td>
      <td class="hint">${escapeHtml(OS_LABEL[info.os] || info.os || "-")}${info.extensionVersion ? ` · v${escapeHtml(info.extensionVersion)}` : ""}</td>
      <td><button class="link-btn" type="button">詳細</button></td>`;
    tr.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.selected.add(d.id);
      else state.selected.delete(d.id);
      renderDevices();
    });
    tr.querySelector(".link-btn").addEventListener("click", () => openDetail(d.id));
    rows.appendChild(tr);
  }
  show("empty", state.devices.length === 0);
  $("sum-total").textContent = `${state.devices.length} 台`;
  $("sum-online").textContent = `${online} 台`;
  $("sum-pending").textContent = `${pending} 台`;
  $("sum-changed").textContent = `${changed} 台`;
  $("sum-online").dataset.state = online ? "on" : "off";

  const n = state.selected.size;
  $("sel-count").textContent = `${n} 台を選択中`;
  $("select-all").checked = n > 0 && n === state.devices.length;
  $("select-all").indeterminate = n > 0 && n < state.devices.length;
  ["bulk-edit", "bulk-copy", "bulk-learning", "bulk-remove"].forEach((id) => { $(id).disabled = n === 0; });
}

$("select-all").addEventListener("change", (e) => {
  state.selected = new Set(e.target.checked ? state.devices.map((d) => d.id) : []);
  renderDevices();
});

const selectedDevices = () => state.devices.filter((d) => state.selected.has(d.id));

// 選んだ端末へ設定を配信する（端末ごとの設定に patch を重ねて、配信番号を 1 つ進める）
async function deliver(devices, makeSettings) {
  const batch = writeBatch(db);
  for (const d of devices) {
    const next = normalizeSettings(makeSettings(d));
    batch.update(doc(db, "devices", d.id), {
      settings: next,
      settingsRev: increment(1),
      settingsUpdatedAt: serverTimestamp(),
      settingsUpdatedBy: state.user.email || state.user.uid
    });
  }
  await batch.commit();
}

// ---------- 学習モード・接続解除 ----------

$("bulk-learning").addEventListener("change", async (e) => {
  const value = e.target.value;
  e.target.value = "";
  if (!value) return;
  const until = value === "stop" ? 0 : Date.now() + Number(value) * 60 * 1000;
  const targets = selectedDevices();
  try {
    await deliver(targets, (d) => ({ ...d.settings, learningModeUntil: until }));
    toast(value === "stop" ? `${targets.length} 台の学習モードを終了します` : `${targets.length} 台で学習モードを ${value} 分開始します`);
  } catch (err) {
    toast(`配信に失敗しました: ${err.code || err.message}`, true);
  }
});

$("bulk-remove").addEventListener("click", async () => {
  const targets = selectedDevices();
  if (!confirm(`${targets.length} 台の接続を解除します。解除した端末は管理できなくなります（端末の設定はそのまま残ります）。よろしいですか？`)) return;
  try {
    const batch = writeBatch(db);
    targets.forEach((d) => batch.delete(doc(db, "devices", d.id)));
    await batch.commit();
    state.selected.clear();
    toast(`${targets.length} 台の接続を解除しました`);
  } catch (err) {
    toast(`解除に失敗しました: ${err.code || err.message}`, true);
  }
});

// ---------- 設定エディタ（変更した項目だけを一斉に適用） ----------

const SECTIONS = [
  { title: "基本", fields: [
    { key: "systemEnabled", type: "switch", label: "Y-FILTER を有効にする" },
    { key: "uiMode", type: "select", label: "ユーザーモード", options: [["admin", "管理者モード"], ["user", "ユーザーモード（閲覧のみ）"]] },
    { key: "accessMode", type: "select", label: "設定画面へのアクセス", number: true, options: [["0", "通常（アクセスコードで開ける）"], ["1", "完全ブロック（開けない）"], ["2", "利用者表示（ステータスのみ）"]] },
    { key: "accessCode", type: "text", label: "アクセスコード" }
  ] },
  { title: "ブロック", fields: [
    { key: "safeSearchEnabled", type: "switch", label: "セーフサーチ", desc: "検索結果の安全フィルタと YouTube の制限付きモード" },
    { key: "enabledCategories", type: "categories", label: "ブロックするカテゴリ" },
    { key: "blockRules", type: "rules", label: "個別URLブロック", desc: "1行に1件、ドメイン,カテゴリ の形式" },
    { key: "allowList", type: "lines", label: "許可リスト", desc: "常に許可するドメイン（1行1件）" },
    { key: "timeConfig", type: "time", label: "時間制限" },
    { key: "blockPageStyle", type: "select", label: "ブロック画面のデザイン", options: [["modern", "新しいデザイン"], ["classic", "従来のデザイン"], ["kids", "子供向け"]] }
  ] },
  { title: "広告ブロック", fields: [
    { key: "adBlockEnabled", type: "switch", label: "広告ブロックを有効にする" },
    { key: "adBlockLevel", type: "select", label: "ブロックレベル", options: [["low", "弱"], ["medium", "中（推奨）"], ["high", "強"]] },
    { key: "adBlockBadge", type: "switch", label: "ツールバーのアイコンにブロック数を表示" }
  ] },
  { title: "ファイル", fields: [
    { key: "blockAllDownloads", type: "switch", label: "すべてのダウンロードをブロック" },
    { key: "downloadExtensions", type: "exts", label: "ブロックする拡張子（ダウンロード）" },
    { key: "downloadBlockedDomains", type: "lines", label: "ダウンロードをブロックするドメイン", desc: "1行1件" },
    { key: "blockAllUploads", type: "switch", label: "すべてのアップロードをブロック" },
    { key: "uploadExtensions", type: "exts", label: "ブロックする拡張子（アップロード）" }
  ] },
  { title: "Newtab", fields: [
    { key: "newTabConfig", type: "newtab", label: "Newtab", desc: "端末側で Newtab の規約に同意している場合に有効になります" }
  ] },
  { title: "Chromebook", fields: [
    { key: "chromeOsLiteMode", type: "switch", label: "軽量化モード" },
    { key: "chromeOsOfflineScreen", type: "switch", label: "オフライン画面" },
    { key: "chromeOsReportHardwareStats", type: "switch", label: "端末情報（バッテリー・メモリ・資産ID・ログインユーザー）を送信", desc: "端末側の同意が前提です" }
  ] }
];

const editor = { fields: new Map(), dirty: new Set() };

// 設定項目の表示名（エディタにない項目も含む）
const KEY_LABELS = new Map([
  ...SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
  ["blockKeywords", "ブロックするキーワード"],
  ["blockedExtensions", "ブロックする拡張子（旧設定）"],
  ["learningModeUntil", "学習モード"]
]);
const keyLabel = (key) => KEY_LABELS.get(key) || key;

function fieldControl(field, value) {
  const wrap = document.createElement("div");
  switch (field.type) {
    case "switch":
      wrap.innerHTML = `<input type="checkbox" class="switch" ${value ? "checked" : ""}>`;
      return { el: wrap, get: () => wrap.querySelector("input").checked };
    case "select": {
      wrap.innerHTML = `<select>${field.options.map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join("")}</select>`;
      wrap.querySelector("select").value = String(value);
      return { el: wrap, get: () => (field.number ? Number(wrap.querySelector("select").value) : wrap.querySelector("select").value) };
    }
    case "text":
      wrap.innerHTML = `<input type="text" value="${escapeHtml(value)}">`;
      return { el: wrap, get: () => wrap.querySelector("input").value.trim() };
    case "lines":
      wrap.innerHTML = `<textarea spellcheck="false">${escapeHtml((value || []).join("\n"))}</textarea>`;
      return { el: wrap, get: () => wrap.querySelector("textarea").value.split("\n").map((s) => s.trim()).filter(Boolean) };
    case "rules":
      wrap.innerHTML = `<textarea spellcheck="false" placeholder="example.com,SNS">${escapeHtml((value || []).map((r) => `${r.pattern},${r.category}`).join("\n"))}</textarea>`;
      return {
        el: wrap,
        get: () => wrap.querySelector("textarea").value.split("\n").filter((l) => l.includes(",")).map((l) => {
          const [p, ...c] = l.split(",");
          return { pattern: p.trim(), category: c.join(",").trim() || "未分類" };
        })
      };
    case "time":
      wrap.className = "inline";
      wrap.innerHTML = `<input type="checkbox" class="switch" ${value?.enabled ? "checked" : ""}>
        <input type="time" value="${escapeHtml(value?.start || "21:00")}"><span class="hint">〜</span><input type="time" value="${escapeHtml(value?.end || "07:00")}">`;
      return {
        el: wrap,
        get: () => {
          const [on, s, e] = wrap.querySelectorAll("input");
          return { enabled: on.checked, start: s.value || "21:00", end: e.value || "07:00" };
        }
      };
    case "categories":
    case "exts": {
      const names = field.type === "exts" ? EXTENSIONS : Object.keys(state.categories);
      const set = new Set(value || []);
      wrap.className = `chips${field.type === "exts" ? " mono" : " grid"}`;
      wrap.innerHTML = names.length
        ? names.map((n) => `<label class="chip"><input type="checkbox" value="${escapeHtml(n)}" ${set.has(n) ? "checked" : ""}><span>${escapeHtml(n)}</span></label>`).join("")
        : '<span class="hint">カテゴリ一覧を読み込めませんでした。</span>';
      return { el: wrap, get: () => Array.from(wrap.querySelectorAll("input:checked")).map((i) => i.value) };
    }
    case "newtab":
      wrap.className = "inline";
      wrap.innerHTML = `<input type="checkbox" class="switch" ${value?.enabled ? "checked" : ""}>
        <select>${NEWTAB_MODES.map((m) => `<option value="${m}">${m === "normal" ? "v7（通常）" : m === "lite" ? "Simple" : m === "beta" ? "v7 Beta" : m}</option>`).join("")}</select>`;
      wrap.querySelector("select").value = value?.mode || "normal";
      return {
        el: wrap,
        get: () => ({ enabled: wrap.querySelector("input").checked, agreed: !!value?.agreed, mode: wrap.querySelector("select").value })
      };
    default:
      return { el: wrap, get: () => value };
  }
}

function openEditor() {
  const targets = selectedDevices();
  if (!targets.length) return;
  const base = normalizeSettings(targets[0].settings || buildDefaultSettings());
  editor.fields.clear();
  editor.dirty.clear();
  $("edit-title").textContent = `設定を変更（${targets.length} 台）`;
  $("edit-note").textContent = targets.length > 1
    ? `「${targets[0].name || "名前なし"}」の配信設定を表示しています。変更した項目だけが、選んだ ${targets.length} 台すべてに適用されます（ほかの項目は端末ごとの設定のまま）。`
    : `「${targets[0].name || "名前なし"}」の配信設定です。変更した項目が適用されます。`;
  const form = $("edit-form");
  form.replaceChildren();
  for (const section of SECTIONS) {
    const sec = document.createElement("div");
    sec.className = "ed-section";
    sec.innerHTML = `<h3>${escapeHtml(section.title)}</h3>`;
    for (const field of section.fields) {
      const control = fieldControl(field, base[field.key]);
      const row = document.createElement("div");
      const stacked = ["lines", "rules", "categories", "exts"].includes(field.type);
      row.className = `ed-field${stacked ? " stack" : ""}`;
      row.innerHTML = `<div><div class="ed-label">${escapeHtml(field.label)}<span class="ed-badge">変更</span></div>${field.desc ? `<div class="ed-desc">${escapeHtml(field.desc)}</div>` : ""}</div>`;
      row.appendChild(control.el);
      const initial = stable(control.get());
      const markDirty = () => {
        const isDirty = stable(control.get()) !== initial;
        row.classList.toggle("dirty", isDirty);
        if (isDirty) editor.dirty.add(field.key);
        else editor.dirty.delete(field.key);
        $("edit-dirty").textContent = `変更した項目: ${editor.dirty.size}`;
        $("edit-apply").disabled = editor.dirty.size === 0;
      };
      row.addEventListener("input", markDirty);
      row.addEventListener("change", markDirty);
      editor.fields.set(field.key, control);
      sec.appendChild(row);
    }
    form.appendChild(sec);
  }
  $("edit-dirty").textContent = "変更した項目: 0";
  $("edit-apply").disabled = true;
  $("dlg-edit").showModal();
}

// カテゴリに対応するキーワード（拡張機能の設定画面と同じく、カテゴリ選択から作る）
function keywordsFor(categories) {
  return categories.flatMap((c) => state.categories[c]?.keywords || []);
}

$("edit-apply").addEventListener("click", async () => {
  const patch = {};
  for (const key of editor.dirty) patch[key] = editor.fields.get(key).get();
  if (patch.enabledCategories) patch.blockKeywords = keywordsFor(patch.enabledCategories);
  const targets = selectedDevices();
  try {
    await deliver(targets, (d) => ({ ...d.settings, ...patch }));
    $("dlg-edit").close();
    toast(`${targets.length} 台に ${editor.dirty.size} 項目を配信しました`);
  } catch (err) {
    toast(`配信に失敗しました: ${err.code || err.message}`, true);
  }
});
$("bulk-edit").addEventListener("click", openEditor);

// ---------- ほかの端末の設定をコピー ----------

function updateCopyNote() {
  const src = state.devices.find((d) => d.id === $("copy-source").value);
  const targets = selectedDevices().filter((d) => d.id !== src?.id);
  const kind = document.querySelector('input[name="copy-kind"]:checked').value;
  const has = kind === "reported" ? !!src?.reported?.settings : !!src?.settings;
  $("copy-note").textContent = !src ? "" : !has
    ? "この端末にはまだその設定がありません。"
    : `「${src.name || "名前なし"}」の設定をまるごと、選んだ ${targets.length} 台に適用します（アクセスコードなども含めてすべて上書きします）。`;
  $("copy-apply").disabled = !src || !has || targets.length === 0;
}

$("bulk-copy").addEventListener("click", () => {
  const select = $("copy-source");
  select.innerHTML = state.devices.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name || "名前なし")}</option>`).join("");
  const firstUnselected = state.devices.find((d) => !state.selected.has(d.id));
  if (firstUnselected) select.value = firstUnselected.id;
  updateCopyNote();
  $("dlg-copy").showModal();
});
$("copy-source").addEventListener("change", updateCopyNote);
document.querySelectorAll('input[name="copy-kind"]').forEach((r) => r.addEventListener("change", updateCopyNote));

$("copy-apply").addEventListener("click", async () => {
  const src = state.devices.find((d) => d.id === $("copy-source").value);
  const kind = document.querySelector('input[name="copy-kind"]:checked').value;
  const settings = kind === "reported" ? src.reported.settings : src.settings;
  const targets = selectedDevices().filter((d) => d.id !== src.id);
  try {
    await deliver(targets, () => ({ ...settings }));
    $("dlg-copy").close();
    toast(`「${src.name || "名前なし"}」の設定を ${targets.length} 台に配信しました`);
  } catch (err) {
    toast(`配信に失敗しました: ${err.code || err.message}`, true);
  }
});

// ---------- 端末の詳細 ----------

let detailId = "";
function openDetail(id) {
  const d = state.devices.find((x) => x.id === id);
  if (!d) return;
  detailId = id;
  const st = deviceStatus(d);
  const info = d.reported?.info || {};
  $("detail-name").value = d.name || "";
  const rows = [
    ["端末 ID", `<span class="mono">${escapeHtml(d.id)}</span>`],
    ["状態", st.online ? "オンライン" : "オフライン"],
    ["最終接続", escapeHtml(timeAgo(st.lastSeen))],
    ["接続した日時", escapeHtml(d.pairedAt ? new Date(toMillis(d.pairedAt)).toLocaleString() : "-")],
    ["配信番号（反映済み / 最新）", `${Number(d.reported?.appliedRev || 0)} / ${Number(d.settingsRev || 0)}`],
    ["OS", escapeHtml(OS_LABEL[info.os] || info.os || "-")],
    ["Y-FILTER のバージョン", escapeHtml(info.extensionVersion || "-")]
  ];
  if (info.assetId) rows.push(["資産 ID", escapeHtml(info.assetId)]);
  if (info.loginEmail) rows.push(["ログインユーザー", escapeHtml(info.loginEmail)]);
  if (info.memoryUsage !== undefined) rows.push(["メモリ使用率", `${escapeHtml(info.memoryUsage)}%`]);
  $("detail-kv").innerHTML = rows.map(([k, v]) => `<div class="row"><div class="k">${escapeHtml(k)}</div><div class="v">${v}</div></div>`).join("");

  const changedKeys = d.reported?.settings ? diffKeys(d.settings, d.reported.settings) : [];
  show("detail-diff", !st.pending && changedKeys.length > 0);
  show("detail-adopt", !st.pending && changedKeys.length > 0);
  $("detail-diff").textContent = `端末側で変更された項目: ${changedKeys.map(keyLabel).join("、")}。「取り込む」を押すと、端末の今の設定を配信設定にします（次の配信でこの内容が使われます）。`;
  $("dlg-detail").showModal();
}

$("detail-rename").addEventListener("click", async () => {
  const name = $("detail-name").value.trim().slice(0, 60);
  if (!name) return;
  try {
    await updateDoc(doc(db, "devices", detailId), { name });
    toast("端末名を変更しました");
  } catch (err) {
    toast(`変更に失敗しました: ${err.code || err.message}`, true);
  }
});

$("detail-adopt").addEventListener("click", async () => {
  const d = state.devices.find((x) => x.id === detailId);
  if (!d?.reported?.settings) return;
  try {
    await deliver([d], () => ({ ...d.reported.settings }));
    $("dlg-detail").close();
    toast("端末の設定を配信設定として取り込みました");
  } catch (err) {
    toast(`取り込みに失敗しました: ${err.code || err.message}`, true);
  }
});

// ---------- ペアリングコード ----------

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => PAIRING_ALPHABET[b % PAIRING_ALPHABET.length]).join("");
}
const formatCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

let shownCode = null;
let pairTimer = null;

async function issueCode() {
  $("pair-msg").textContent = "";
  const code = generateCode();
  const expiresAt = Date.now() + PAIRING_TTL_MS;
  try {
    await setDoc(doc(db, "pairingCodes", code), {
      ownerUid: state.user.uid,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(expiresAt)
    });
    shownCode = { code, expiresAt };
    renderShownCode();
  } catch (err) {
    $("pair-msg").textContent = `コードを発行できませんでした（${err.code || err.message}）`;
  }
}

function renderShownCode() {
  if (!shownCode) return;
  const left = Math.max(0, shownCode.expiresAt - Date.now());
  $("pair-code").textContent = left > 0 ? formatCode(shownCode.code) : "期限切れ";
  $("pair-exp").textContent = left > 0
    ? `有効期限まで ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`
    : "「新しいコードを発行」を押してください";
}

function renderPairingList() {
  const list = $("pair-list");
  const active = state.pairingCodes.filter((p) => toMillis(p.expiresAt) > Date.now());
  if (!active.length) {
    list.innerHTML = '<div class="hint">有効なコードはありません。</div>';
    return;
  }
  list.replaceChildren(...active.map((p) => {
    const row = document.createElement("div");
    row.className = "pair-row";
    row.innerHTML = `<b>${escapeHtml(formatCode(p.code))}</b><span class="hint">${escapeHtml(new Date(toMillis(p.expiresAt)).toLocaleTimeString())} まで</span><button class="link-btn" type="button">無効にする</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "pairingCodes", p.code));
        if (shownCode?.code === p.code) shownCode = { ...shownCode, expiresAt: 0 };
        renderShownCode();
      } catch (err) {
        toast(`無効にできませんでした: ${err.code || err.message}`, true);
      }
    });
    return row;
  }));
}

$("add-device").addEventListener("click", async () => {
  $("dlg-pair").showModal();
  if (!shownCode || shownCode.expiresAt < Date.now()) await issueCode();
  else renderShownCode();
  clearInterval(pairTimer);
  pairTimer = setInterval(() => { renderShownCode(); renderPairingList(); }, 1000);
});
$("pair-new").addEventListener("click", issueCode);
$("dlg-pair").addEventListener("close", () => clearInterval(pairTimer));

// ---------- ダイアログ共通 ----------

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => btn.closest("dialog").close());
});

// 最終接続の表示を定期的に更新する
setInterval(() => { if (state.user) renderDevices(); }, 30 * 1000);
