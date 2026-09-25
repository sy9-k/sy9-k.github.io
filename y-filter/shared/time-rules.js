// 時間の制限の判定（content.js・newtab.js・background.js で共通）
//
// コンテンツスクリプトとして読み込めるよう export は使わず、globalThis.YFilterTime に関数を置く
// （background.js は `import "./time-rules.js"` で読み込む）。
//   timeConfig   … 毎日の時間帯（{ enabled, start, end }。start > end は日をまたぐ）
//   timeSchedule … 曜日ごとの時間帯（{ enabled, rules: [{ days: [0..6], start, end }] }）。複数の時間帯を組み合わせられる
//   dailyLimit   … 1 日の利用時間の上限（{ enabled, weekday, weekend, extra: { date, minutes } }）
(() => {
  if (globalThis.YFilterTime) return;

  const DAY_MIN = 24 * 60;
  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  const toMin = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const nowMin = (d) => d.getHours() * 60 + d.getMinutes();
  const pad = (n) => String(n).padStart(2, "0");
  const localDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // 1 つの時間帯（days が null なら毎日）が now を含むか
  function windowActive(days, start, end, now) {
    const s = toMin(start);
    const e = toMin(end);
    if (s === null || e === null) return false;
    const today = now.getDay();
    const yesterday = (today + 6) % 7;
    const cur = nowMin(now);
    const on = (day) => !days || days.includes(day);
    if (s === e) return on(today); // 開始と終了が同じ → その曜日は一日中
    if (s < e) return on(today) && cur >= s && cur < e;
    return (on(today) && cur >= s) || (on(yesterday) && cur < e); // 日をまたぐ
  }

  function scheduleRules(timeConfig, timeSchedule) {
    const rules = [];
    if (timeConfig?.enabled) rules.push({ days: null, start: timeConfig.start, end: timeConfig.end });
    if (timeSchedule?.enabled) {
      for (const r of timeSchedule.rules || []) {
        if (Array.isArray(r?.days) && r.days.length) rules.push({ days: r.days.map(Number), start: r.start, end: r.end });
      }
    }
    return rules;
  }

  // 時間帯の制限中か
  function isTimeLocked(timeConfig, timeSchedule, now = new Date()) {
    return scheduleRules(timeConfig, timeSchedule).some((r) => windowActive(r.days, r.start, r.end, now));
  }

  // 次に時間帯の制限が始まるまでの分数（7 日以内に始まらない・制限中なら null）
  function minutesUntilLock(timeConfig, timeSchedule, now = new Date()) {
    if (isTimeLocked(timeConfig, timeSchedule, now)) return null;
    let best = null;
    const cur = nowMin(now);
    for (const r of scheduleRules(timeConfig, timeSchedule)) {
      const s = toMin(r.start);
      if (s === null) continue;
      for (let offset = 0; offset <= 7; offset++) {
        const day = (now.getDay() + offset) % 7;
        if (r.days && !r.days.includes(day)) continue;
        const diff = offset * DAY_MIN + s - cur;
        if (diff > 0) {
          if (best === null || diff < best) best = diff;
          break;
        }
      }
    }
    return best;
  }

  // 今の制限が終わる時刻（"07:00" など。複数の時間帯が重なるときは、いちばん遅いもの）
  function lockEndText(timeConfig, timeSchedule, now = new Date()) {
    let latest = null;
    let text = "";
    const cur = nowMin(now);
    for (const r of scheduleRules(timeConfig, timeSchedule)) {
      if (!windowActive(r.days, r.start, r.end, now)) continue;
      const s = toMin(r.start);
      const e = toMin(r.end);
      let left = s === e ? DAY_MIN - cur : (e - cur + DAY_MIN) % DAY_MIN;
      if (left === 0) left = DAY_MIN;
      if (latest === null || left > latest) {
        latest = left;
        text = s === e ? "明日" : r.end;
      }
    }
    return text;
  }

  // 今日の上限（分）。上限なしなら null。延長（extra）は今日の分だけ足す
  function dailyLimitMinutes(dailyLimit, now = new Date()) {
    if (!dailyLimit?.enabled) return null;
    const day = now.getDay();
    const base = Number(day === 0 || day === 6 ? dailyLimit.weekend : dailyLimit.weekday);
    if (!Number.isFinite(base)) return null;
    const extra = dailyLimit.extra?.date === localDateKey(now) ? Number(dailyLimit.extra.minutes || 0) : 0;
    return Math.min(DAY_MIN, base + (Number.isFinite(extra) ? extra : 0));
  }

  // 今日の利用時間（{ date, minutes }）が上限に達しているか
  function isDailyLimitReached(dailyLimit, usage, now = new Date()) {
    const limit = dailyLimitMinutes(dailyLimit, now);
    if (limit === null) return false;
    const used = usage?.date === localDateKey(now) ? Number(usage.minutes || 0) : 0;
    return used >= limit;
  }

  // ルールの説明（例: "月〜金 09:00〜15:00"）
  function describeRule(rule) {
    const days = [...(rule.days || [])].sort((a, b) => a - b);
    let label = days.map((d) => DAY_LABELS[d]).join("・");
    if (days.join() === "1,2,3,4,5") label = "月〜金";
    else if (days.join() === "0,6") label = "土日";
    else if (days.length === 7) label = "毎日";
    return `${label} ${rule.start}〜${rule.end}`;
  }

  globalThis.YFilterTime = Object.freeze({
    DAY_LABELS, localDateKey, isTimeLocked, minutesUntilLock, lockEndText, dailyLimitMinutes, isDailyLimitReached, describeRule
  });
})();
