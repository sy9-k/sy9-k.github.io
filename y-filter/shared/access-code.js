// アクセスコード（設定画面などを開くためのコード）
//
// コードそのものは保存しない。PBKDF2（SHA-256）で作ったハッシュだけを chrome.storage.sync の
// accessCodeHash に保存し、入力されたコードを同じ方法で計算して比べる。
// 管理コンソール（Y-FILTER. Systems）もこのファイルを使い、新しいコードのハッシュを作って配信する。
// （拡張機能・Service Worker・管理コンソールのどこでも動くよう、Web Crypto だけを使う）

export const ACCESS_CODE_HASH_KEY = "accessCodeHash";
// 以前はコードをそのまま保存していた（見つけたらハッシュに置き換えて消す）
export const LEGACY_ACCESS_CODE_KEY = "accessCode";
// 以前の初期値。このコードのままなら「未設定」と同じ扱いにして、変更をうながす
export const DEFAULT_ACCESS_CODE = "0000";
export const ACCESS_CODE_MIN_LENGTH = 4;
export const ACCESS_CODE_MAX_LENGTH = 32;

const ITERATIONS = 150000;

function toBase64(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(text) {
  const s = atob(String(text || ""));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(code, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(code)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toBase64(bits);
}

export function isValidAccessCodeRecord(record) {
  return !!record && typeof record === "object"
    && record.alg === "PBKDF2-SHA256"
    && typeof record.salt === "string" && record.salt.length > 0
    && typeof record.hash === "string" && record.hash.length > 0
    && Number.isInteger(record.iter) && record.iter > 0;
}

// 新しいコードのハッシュを作る（保存・配信用）
export async function hashAccessCode(code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    alg: "PBKDF2-SHA256",
    iter: ITERATIONS,
    salt: toBase64(salt),
    hash: await derive(String(code).trim(), salt, ITERATIONS),
    updatedAt: Date.now()
  };
}

export async function verifyAccessCode(code, record) {
  if (!isValidAccessCodeRecord(record)) return false;
  const actual = await derive(String(code ?? "").trim(), fromBase64(record.salt), record.iter);
  // 長さが同じ文字列を最後まで比べる
  let diff = actual.length ^ record.hash.length;
  for (let i = 0; i < Math.min(actual.length, record.hash.length); i++) diff |= actual.charCodeAt(i) ^ record.hash.charCodeAt(i);
  return diff === 0;
}

// 未設定、または初期値（0000）のままか
export async function isDefaultAccessCode(record) {
  return !isValidAccessCodeRecord(record) || verifyAccessCode(DEFAULT_ACCESS_CODE, record);
}

// 新しいコードとして使えるか（使えなければ理由を返す）
export function validateNewAccessCode(code) {
  const value = String(code ?? "").trim();
  if (value.length < ACCESS_CODE_MIN_LENGTH) return `アクセスコードは ${ACCESS_CODE_MIN_LENGTH} 文字以上にしてください。`;
  if (value.length > ACCESS_CODE_MAX_LENGTH) return `アクセスコードは ${ACCESS_CODE_MAX_LENGTH} 文字以内にしてください。`;
  if (value === DEFAULT_ACCESS_CODE) return "初期値（0000）以外のコードにしてください。";
  if (/^(.)\1+$/.test(value)) return "同じ文字だけのコードは使えません。";
  if ("0123456789".includes(value) || "9876543210".includes(value)) return "連番のコードは使えません。";
  return "";
}
