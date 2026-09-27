// アクセス解析（Google アナリティクス 4）。SK プライバシーポリシー 第四条の二
//   ・「許可する」を選んだ人だけ、Google アナリティクスを読み込む（選ぶまで・「許可しない」なら、何も読み込まない）
//   ・聞くのは、最初の「利用規約・プライバシーポリシーのお知らせ」（frameworks/check.js の同意カード）が済んでから
//   ・Google シグナルと広告のための機能は使わない。IP アドレスは GA4 が匿名化する
//   ・アカウントのページ・開発者用のページ・同意の画面は測らない（EXCLUDE）
//   ・選んだ結果はこのブラウザの localStorage（sk_analytics = granted / denied）。フッターの「アクセス解析の設定」で変えられる
// 使い方: <script src="/assets/analytics.js" defer></script>（サイトのテンプレート・MALU・SK's Lab のツール）
(function () {
  "use strict";

  // Google アナリティクスの測定 ID（G-XXXXXXXXXX）。空のあいだは何もしない
  // （Firebase と一緒に作られたアカウント「Default Account for Firebase」のプロパティ、データストリーム「SK」）
  var MEASUREMENT_ID = "G-LLN7RGHRTE";
  var KEY = "sk_analytics";
  var EXCLUDE = /^\/(account|inbox|studio|y-filter|usercheck)\//;

  var t = window.SKI18N ? window.SKI18N.t : function (s) { return s; };

  function read() {
    try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  }
  function write(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* 保存できなければ、次に開いたときにもう一度聞く */ }
  }

  // ---------- Google アナリティクスの読み込み ----------
  var loaded = false;
  function load() {
    if (loaded || !MEASUREMENT_ID) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // # 以降（アカウントのページの項目など）は送らない
      page_location: location.origin + location.pathname + location.search
    });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(s);
  }

  // 取り消したとき: 測定をやめ、Google アナリティクスの Cookie（_ga・_ga_XXXX）を消す
  function stop() {
    if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_ga(_|$)/.test(name)) {
        document.cookie = name + "=; Max-Age=0; path=/";
        document.cookie = name + "=; Max-Age=0; path=/; domain=" + location.hostname;
      }
    });
  }

  // ---------- 許可をたずねるカード ----------
  var box = null;
  function ask() {
    if (box) return;
    box = document.createElement("div");
    box.className = "sk-analytics";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", t("アクセス解析"));
    box.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:2147482000;width:min(360px,calc(100% - 32px));" +
      "padding:18px 18px 14px;border-radius:18px;background:#fff;color:#1d1d1f;box-shadow:0 12px 40px rgba(0,0,0,.18);" +
      "font:14px/1.6 system-ui,-apple-system,'Segoe UI','Noto Sans JP',sans-serif";
    var title = document.createElement("strong");
    title.textContent = t("アクセス解析へのご協力のお願い");
    title.style.cssText = "display:block;font-size:15px;margin-bottom:4px";
    var text = document.createElement("p");
    text.style.cssText = "margin:0;color:#48484d";
    text.textContent = t("サイトをよりよくするため、Google アナリティクスで、見られたページなどを集計してもいいですか？広告には使いません。");
    var more = document.createElement("a");
    more.href = "/policies/#sk-privacy";
    more.textContent = t("詳しく");
    more.style.cssText = "color:#0066cc";
    text.append(" ", more);
    var row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:12px";
    function button(label, primary, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "border:0;border-radius:999px;padding:8px 16px;font:600 13.5px system-ui,sans-serif;cursor:pointer;" +
        (primary ? "background:#0071e3;color:#fff" : "background:#f0f0f3;color:#1d1d1f");
      b.addEventListener("click", onClick);
      return b;
    }
    row.append(
      button(t("許可しない"), false, function () { choose("denied"); }),
      button(t("許可する"), true, function () { choose("granted"); })
    );
    box.append(title, text, row);
    document.body.appendChild(box);
  }

  function choose(value) {
    write(value);
    if (box) { box.remove(); box = null; }
    if (value === "granted") load();
    else stop();
  }

  // 最初の同意カード（check.js）が出ていないときだけ聞く
  function termsCardShown() {
    return !!document.querySelector("[data-RedCheckOSS-consent-card], .RedCheckOSS-consent-card");
  }
  function termsNoticeDone() {
    try {
      return localStorage.getItem("skhub_terms_notice_shown") === "true" || localStorage.getItem("skhub_terms_accepted") !== null;
    } catch (e) { return false; }
  }

  function start() {
    if (!MEASUREMENT_ID || EXCLUDE.test(location.pathname)) return;
    var choice = read();
    if (choice === "granted") { load(); return; }
    if (choice === "denied") return;
    // まだ選んでいない: 同意カードが済んでから（済んでいなければ、次に開いたページで聞く）
    setTimeout(function () {
      if (termsNoticeDone() && !termsCardShown()) ask();
    }, 1500);
  }

  // フッターの「アクセス解析の設定」などから開く
  window.SKAnalytics = {
    enabled: function () { return !!MEASUREMENT_ID; },
    choice: read,
    open: function () {
      if (!MEASUREMENT_ID) return;
      if (box) { box.remove(); box = null; }
      ask();
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
