// システム稼働状況（/status/）
// このページを開いているブラウザから各システムに接続して、応答と速さを確かめる。
(function () {
  "use strict";

  // SK Hub Systems（Firebase プロジェクト）。値は frameworks/check.js の CONFIG.HUB と同じ
  const HUB = {
    projectId: "y-filter-systems",
    apiKey: "AIzaSyB4gqzPEPyP0NrEJw33-OTAxUrF48MmiuI"
  };
  const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${HUB.projectId}/databases/(default)/documents`;
  const TIMEOUT_MS = 10000;
  const SLOW_MS = 2500;
  const INTERVAL_MS = 5 * 60 * 1000;

  const LABELS = { checking: "確認中", ok: "正常", slow: "遅延", down: "停止", setup: "準備中", unknown: "確認できません" };

  async function timed(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const start = performance.now();
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer-when-downgrade", ...options, signal: controller.signal });
      return { res, ms: Math.round(performance.now() - start) };
    } finally {
      clearTimeout(timer);
    }
  }

  const speed = (ms) => (ms > SLOW_MS ? "slow" : "ok");

  // Firestore のエラーが「API キーの制限」によるものか（その場合はこの環境からは確かめられない）
  async function isKeyRestricted(res) {
    try {
      const body = await res.clone().json();
      return /referer|referrer|API key/i.test(JSON.stringify(body.error || {}));
    } catch (e) {
      return false;
    }
  }

  const CHECKS = {
    // 同じサイトのページが返ってくるか
    async site() { const { res, ms } = await timed("/"); return { state: res.ok ? speed(ms) : "down", ms }; },
    async malu() { const { res, ms } = await timed("/dictionary/"); return { state: res.ok ? speed(ms) : "down", ms }; },
    async console() { const { res, ms } = await timed("/y-filter/"); return { state: res.ok ? speed(ms) : "down", ms }; },

    // Firestore が応答するか（ブロックリストの版番号だけを読む）
    async database() {
      const { res, ms } = await timed(`${FIRESTORE}/config/categories?mask.fieldPaths=version&key=${HUB.apiKey}`);
      if (res.status >= 500) return { state: "down", ms };
      if (res.status === 403 && await isKeyRestricted(res)) return { state: "unknown", ms, note: "この場所からは確認できません" };
      return { state: speed(ms), ms };
    },
    async blocklist() {
      const { res, ms } = await timed(`${FIRESTORE}/config/categories?mask.fieldPaths=version&key=${HUB.apiKey}`);
      if (res.ok) {
        const doc = await res.json();
        const version = doc.fields?.version?.integerValue;
        return { state: speed(ms), ms, note: version ? `ブロックリスト 第 ${version} 版を配信中` : null };
      }
      if (res.status === 403 && await isKeyRestricted(res)) return { state: "unknown", ms };
      return { state: res.status === 404 ? "setup" : "down", ms };
    },
    // 存在しないサポートIDを問い合わせて、404（＝ルールどおり読めた）が返るか
    async accesscheck() {
      const id = crypto.randomUUID();
      const { res, ms } = await timed(`${FIRESTORE}/hub_blocklist/${id}?key=${HUB.apiKey}`);
      if (res.status === 404 || res.ok) return { state: speed(ms), ms };
      if (res.status === 403) return { state: await isKeyRestricted(res) ? "unknown" : "setup", ms };
      return { state: "down", ms };
    },
    // ログインの仕組み（Firebase Authentication）が応答するか。Firebase の SDK がログインの前に読むプロジェクトの設定を取得する
    async login() {
      const { res, ms } = await timed(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${HUB.apiKey}`);
      if (res.ok) return { state: speed(ms), ms };
      if (res.status === 403 && await isKeyRestricted(res)) return { state: "unknown", ms, note: "この場所からは確認できません" };
      return { state: res.status >= 500 ? "down" : "unknown", ms };
    },
    // お問い合わせの受け付け。中身は読めないルールなので、存在しないものを読んで 403（＝ルールどおり断られた）が返るか
    async contact() {
      const { res, ms } = await timed(`${FIRESTORE}/contacts/${crypto.randomUUID()}?key=${HUB.apiKey}`);
      if (res.status === 403 && !(await isKeyRestricted(res))) return { state: speed(ms), ms };
      if (res.status === 403) return { state: "unknown", ms };
      return { state: res.status >= 500 ? "down" : speed(ms), ms };
    },
    // 他のサイトなので中身は読めない（no-cors）。接続できたかだけを見る
    async newtab() {
      const { ms } = await timed("https://search3958.github.io/newtab/", { mode: "no-cors" });
      return { state: speed(ms), ms };
    }
  };

  const rows = [...document.querySelectorAll("[data-check]")];
  const summary = document.querySelector("[data-status-summary]");
  const summaryText = document.querySelector("[data-status-summary-text]");
  const checkedAt = document.querySelector("[data-status-checked]");
  const refreshBtn = document.querySelector("[data-status-refresh]");
  const defaultNotes = new Map(rows.map((row) => [row, row.querySelector("[data-note]")?.textContent || null]));
  if (!summary || !rows.length) return;

  function setRow(row, { state, ms, note }) {
    row.dataset.state = state;
    const pill = row.querySelector("[data-pill]");
    const msEl = row.querySelector("[data-ms]");
    pill.textContent = LABELS[state] || state;
    msEl.textContent = typeof ms === "number" && state !== "checking" ? `${ms} ms` : "";
    const noteEl = row.querySelector("[data-note]");
    if (noteEl) noteEl.textContent = note || defaultNotes.get(row);
  }

  async function runAll() {
    refreshBtn.disabled = true;
    summary.dataset.state = "checking";
    summaryText.textContent = "確認しています…";
    rows.forEach((row) => setRow(row, { state: "checking" }));

    const results = await Promise.all(rows.map(async (row) => {
      let result;
      try {
        result = await CHECKS[row.dataset.check]();
      } catch (e) {
        result = { state: "down" }; // 接続できない・時間切れ
      }
      setRow(row, result);
      return result.state;
    }));

    const has = (s) => results.includes(s);
    if (has("down")) { summary.dataset.state = "down"; summaryText.textContent = "一部のシステムで問題が起きています"; }
    else if (has("slow")) { summary.dataset.state = "slow"; summaryText.textContent = "一部のシステムの応答が遅くなっています"; }
    else if (has("setup") || has("unknown")) { summary.dataset.state = "ok"; summaryText.textContent = "主なシステムは正常に動いています"; }
    else { summary.dataset.state = "ok"; summaryText.textContent = "すべてのシステムは正常に動いています"; }
    // 結果の文字をふわっと入れ直す（CSS の .is-in）
    summaryText.classList.remove("is-in");
    void summaryText.offsetWidth;
    summaryText.classList.add("is-in");
    checkedAt.textContent = new Date().toLocaleString("ja-JP");
    refreshBtn.disabled = false;
  }

  refreshBtn.addEventListener("click", runAll);
  runAll();
  setInterval(() => { if (!document.hidden) runAll(); }, INTERVAL_MS);
})();
