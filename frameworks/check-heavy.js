// SK Hub Systems: check.js が読み込む通信部分（window.RedCheckOSSHeavy）。
// 元の check-oss-uuid.js は使わず、SK 用に独自に実装しています。
// Firebase SDK を使わず、Cloud Firestore の REST API に API キーで直接アクセスします（Spark プランで動作）。
// 読み書きできる範囲は Firestore のセキュリティルール（y-filter リポジトリの systems/firestore.rules）で制限しています。
(function() {
    "use strict";

    const LOG_PREFIX = "[SKHubCheck]";
    const TIMEOUT_MS = 6000;
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    function generateUUID() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function documentsUrl(hub, path) {
        return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(hub.FIREBASE_PROJECT_ID)}` +
            `/databases/(default)/documents/${path}?key=${encodeURIComponent(hub.FIREBASE_API_KEY)}`;
    }

    async function request(url, options) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            return await fetch(url, { ...options, signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
        } finally {
            window.clearTimeout(timer);
        }
    }

    // hub_blocklist/{uuid} が存在すればブロック。読めない（通信失敗・ルール未設定）ときは通す。
    async function isBlocked(uuid, hub) {
        try {
            const res = await request(documentsUrl(hub, `${hub.BLOCKLIST_COLLECTION}/${encodeURIComponent(uuid)}`), { method: "GET" });
            if (res.status === 200) return true;
            if (res.status !== 404) console.warn(`${LOG_PREFIX} ⚠️ blocklist check returned ${res.status}`);
        } catch (error) {
            console.warn(`${LOG_PREFIX} ⚠️ blocklist check failed:`, error);
        }
        return false;
    }

    function clip(value, max) {
        return String(value || "").slice(0, max);
    }

    function referrerOrigin() {
        try {
            return document.referrer ? new URL(document.referrer).origin : "";
        } catch (error) {
            return "";
        }
    }

    // 同じページ・同じ判定の記録は、ブラウザのタブを閉じるまで 1 回だけ送る（書き込みの回数を減らして、無料枠を守る）
    const SENT_KEY = "skhub_logged";
    function alreadySent(key) {
        try {
            const sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || "[]");
            if (sent.includes(key)) return true;
            sent.push(key);
            sessionStorage.setItem(SENT_KEY, JSON.stringify(sent.slice(-50)));
        } catch (error) { /* 保存できないときは毎回送る */ }
        return false;
    }

    // 記録を残す期間（SK プライバシーポリシー第七条: 1 年）。expireAt を過ぎると Firestore の TTL が自動で削除する
    const LOG_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

    // hub_access_logs に 1 件追加する。クエリ文字列・ハッシュは送らない。IP アドレスは記録しない。
    async function writeLog(uuid, status, hub) {
        const page = clip(location.origin + location.pathname, 512);
        if (alreadySent(`${page}|${status}`)) return;
        const now = Date.now();
        const fields = {
            uuid: { stringValue: uuid },
            page: { stringValue: page },
            referrer: { stringValue: clip(referrerOrigin(), 512) },
            userAgent: { stringValue: clip(navigator.userAgent, 512) },
            language: { stringValue: clip(navigator.language, 32) },
            status: { stringValue: status },
            createdAt: { timestampValue: new Date(now).toISOString() },
            expireAt: { timestampValue: new Date(now + LOG_RETENTION_MS).toISOString() }
        };
        try {
            const res = await request(documentsUrl(hub, hub.LOG_COLLECTION), {
                method: "POST",
                keepalive: true, // ブロック時にすぐ移動してもリクエストを送り切る
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields })
            });
            if (!res.ok) console.warn(`${LOG_PREFIX} ⚠️ access log returned ${res.status}`);
        } catch (error) {
            console.warn(`${LOG_PREFIX} ⚠️ access log failed:`, error);
        }
    }

    async function checkServerStatus(uuid, hub) {
        if (!hub || !hub.FIREBASE_PROJECT_ID || !hub.FIREBASE_API_KEY) {
            throw new Error("SK Hub Systems config is missing");
        }
        if (!UUID_PATTERN.test(uuid)) {
            console.warn(`${LOG_PREFIX} ⚠️ invalid UUID; skipped server check`);
            return { success: false, status: "normal" };
        }

        const status = (await isBlocked(uuid, hub)) ? "blocked" : "normal";
        // 記録は待たない（ページ表示を遅らせない）
        writeLog(uuid, status, hub);
        return { success: true, status };
    }

    window.RedCheckOSSHeavy = { generateUUID, checkServerStatus };
})();
