// SK's Toolbox のオンライン同期: 端末のデータとアカウントのデータをまとめる（暗号化や通信はしない。/toolbox/shared/sync-core.js が使う）
//   ・アプリごとに「スナップショット」を作る: { l: { リスト名: [項目…] }, f: { 名前: 値 } }
//       l … ID のある項目の並び（Todo のタスク・Memo のメモなど）。項目ごとにまとめる
//       f … まとめて 1 つの値（Memo のロック・Toolbox の設定など）
//   ・前回そろえたときの各項目の「指紋」（base）と比べる 3 方向のまとめ方:
//       両方にある … 同じならそのまま。片方だけ変わっていたら、変わったほう。両方変わっていたら updated が新しいほう
//                    （updated がなければ、この端末。ただし、この端末ではじめて同期するときはアカウントのほう）
//       片方にだけある … 前回もあった（= もう片方で削除した）なら、こちらで変えていなければ削除する。前回なかった（= 新しく足した）なら残す
//   ・アプリの画面の状態（表示中のリスト・並べ方など）は同期しない。端末ごとのまま
export const SYNC_APPS = {
  settings: {
    // Toolbox の設定（sk_toolbox）とホームの並び（sk_toolbox_home）。localStorage の値をそのまま 1 つずつ
    keys: { theme: "sk_toolbox", home: "sk_toolbox_home" }
  },
  todo: { storage: "sk_todo", lists: ["lists", "tasks"] },
  memo: { storage: "sk_memo", lists: ["folders", "notes"], fields: ["lock"] },
  countdown: { storage: "sk_countdown", lists: ["events"] },
  // 自分の時間割（まとめて 1 つ）。配信された時間割は端末ごとに受け取るので同期しない
  timetable: { storage: "sk_timetable", fields: ["table"] },
  roulette: { storage: "sk_roulette", lists: ["wheels", "history"] },
  calc: {
    storage: "sk_calc",
    lists: ["history"],
    // 計算の履歴には ID がないので、計算した時刻と式で見分ける
    id: (h) => (h.t ? String(h.t) : "") + "|" + h.e + "=" + h.r,
    // 新しい順に 100 件まで（Calc と同じ）
    finish: (list) => list.slice().sort((a, b) => (Number(b.t) || 0) - (Number(a.t) || 0)).slice(0, 100)
  }
};
export const APP_KEYS = Object.keys(SYNC_APPS);

// キーの順番によらない JSON（同じ中身なら同じ文字列）
export function stable(v) {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}
// 指紋（FNV-1a 32 ビット）
export function hashOf(v) {
  const s = stable(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const idOf = (app, x) => (SYNC_APPS[app].id ? SYNC_APPS[app].id(x) : x && x.id);

function readJson(storage, key) {
  try { return JSON.parse(storage.getItem(key) || "null"); } catch (e) { return null; }
}

// この端末のスナップショット
export function readLocal(app, storage = localStorage) {
  const def = SYNC_APPS[app];
  const snap = { l: {}, f: {} };
  if (def.keys) {
    Object.keys(def.keys).forEach((name) => { snap.f[name] = readJson(storage, def.keys[name]); });
    return snap;
  }
  const d = readJson(storage, def.storage) || {};
  (def.lists || []).forEach((name) => {
    snap.l[name] = (Array.isArray(d[name]) ? d[name] : []).filter((x) => x && typeof x === "object" && idOf(app, x));
  });
  (def.fields || []).forEach((name) => { snap.f[name] = d[name] === undefined ? null : d[name]; });
  return snap;
}

// まとめた結果をこの端末に書く。変わった localStorage のキーを返す
export function writeLocal(app, snap, storage = localStorage) {
  const def = SYNC_APPS[app];
  const changed = [];
  if (def.keys) {
    Object.keys(def.keys).forEach((name) => {
      const key = def.keys[name], v = snap.f[name];
      if (stable(readJson(storage, key)) === stable(v)) return;
      if (v === null || v === undefined) storage.removeItem(key); else storage.setItem(key, JSON.stringify(v));
      changed.push(key);
    });
    return changed;
  }
  const d = readJson(storage, def.storage) || {};
  (def.lists || []).forEach((name) => { d[name] = snap.l[name] || []; });
  (def.fields || []).forEach((name) => { d[name] = snap.f[name] === undefined ? null : snap.f[name]; });
  storage.setItem(def.storage, JSON.stringify(d));
  changed.push(def.storage);
  return changed;
}

export function isEmpty(snap) {
  return !snap || (Object.values(snap.l || {}).every((list) => !list.length) && Object.values(snap.f || {}).every((v) => v === null || v === undefined));
}

export function sameSnap(a, b) {
  return stable(a) === stable(b);
}

// 指紋の一覧（次にまとめるときの base）
export function baseOf(app, snap) {
  const base = { l: {}, f: {} };
  Object.keys(snap.l).forEach((name) => {
    base.l[name] = {};
    snap.l[name].forEach((x) => { base.l[name][idOf(app, x)] = hashOf(x); });
  });
  Object.keys(snap.f).forEach((name) => { base.f[name] = hashOf(snap.f[name]); });
  return base;
}

class Conflict extends Error {
  constructor(code) { super(code); this.code = code; }
}
export { Conflict };

// local・remote … スナップショット（remote はアカウントにまだなければ null）
// base … 前回そろえたときの指紋（この端末ではじめて同期するときは null）
// 戻り値: まとめたスナップショット
export function merge(app, local, remote, base) {
  if (!remote) return local;
  const def = SYNC_APPS[app];
  const first = !base;
  const out = { l: {}, f: {} };

  // ID のある項目
  Object.keys(local.l).concat(Object.keys(remote.l)).forEach((name) => {
    if (out.l[name]) return;
    const L = new Map((local.l[name] || []).map((x) => [idOf(app, x), x]));
    const R = new Map((remote.l[name] || []).map((x) => [idOf(app, x), x]));
    const B = (base && base.l[name]) || {};
    const decide = (id) => {
      const l = L.get(id), r = R.get(id), b = B[id];
      if (l && r) {
        const hl = hashOf(l), hr = hashOf(r);
        if (hl === hr || hr === b) return l;
        if (hl === b) return r;
        const ul = Number(l.updated) || 0, ur = Number(r.updated) || 0;
        if (ul !== ur) return ur > ul ? r : l;
        return first ? r : l;
      }
      if (l) return b === undefined || hashOf(l) !== b ? l : null;
      if (r) return b === undefined || hashOf(r) !== b ? r : null;
      return null;
    };
    const list = [];
    const seen = new Set();
    L.forEach((x, id) => { seen.add(id); const v = decide(id); if (v) list.push(v); });
    R.forEach((x, id) => { if (seen.has(id)) return; const v = decide(id); if (v) list.push(v); });
    out.l[name] = def.finish ? def.finish(list) : list;
  });

  // まとめて 1 つの値
  Object.keys(local.f).concat(Object.keys(remote.f)).forEach((name) => {
    if (name in out.f) return;
    const l = local.f[name] === undefined ? null : local.f[name];
    const r = remote.f[name] === undefined ? null : remote.f[name];
    const b = base && base.f[name];
    const hl = hashOf(l), hr = hashOf(r);
    let v;
    if (hl === hr || hr === b) v = l;
    else if (hl === b) v = r;
    else v = first ? r : l;
    // Memo のロック: パスワードの確認用の値がちがうと、片方のロックしたメモが開けなくなる。まとめずに止める
    if (app === "memo" && name === "lock" && l && r && hl !== hr) throw new Conflict("memo-lock");
    if (app === "memo" && name === "lock") v = l || r;
    out.f[name] = v;
  });
  return out;
}
