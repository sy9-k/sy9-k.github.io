// sk-hub.jp への引っ越しのお知らせ（すべてのページの右上に出す小さなカード。詳しくは /domain/）
//   ・サイトのページはヘッダーのすぐ下、アプリ（SK's Toolbox・Nagi・MALU など）は画面の上（アプリとして開いているときはタイトルバーの下）
//   ・閉じるか「詳しく」を押したら、同じ段階（STAGE）のあいだは出さない（localStorage の sk_domain_notice）
//   ・日程が決まったとき・切り替えたときは STAGE と文を変えると、閉じた人にももう一度出る
//   ・出さないところ: /domain/ のページ・iframe の中・LINE のミニアプリ・?embed
(function () {
  "use strict";
  var STAGE = "prep";
  var KEY = "sk_domain_notice";
  if (window.top !== window.self) return;
  if (/^\/domain\//.test(location.pathname)) return;
  if (/[?&](embed|line)\b|[?&]liff\./.test(location.search)) return;
  try {
    if (sessionStorage.getItem("sk_line")) return;
    if (localStorage.getItem(KEY) === STAGE) return;
  } catch (e) { return; }

  var I18N = window.SKI18N;
  function t(s) { return I18N && I18N.t ? I18N.t(s) : s; }

  var CSS =
    ".skdn{--skdn-bg:#fff;--skdn-ink:#0d1014;--skdn-muted:#5a6371;--skdn-line:#e1e4e9;--skdn-a:#2563eb;--skdn-a-soft:#eaf1ff;" +
    "position:fixed;z-index:990;right:16px;top:var(--skdn-top,16px);width:min(400px,calc(100vw - 32px));box-sizing:border-box;" +
    "display:flex;align-items:center;gap:12px;padding:12px 10px 12px 14px;border-radius:18px;background:var(--skdn-bg);color:var(--skdn-ink);" +
    "border:1px solid var(--skdn-line);box-shadow:0 1px 2px rgba(13,16,20,.06),0 12px 32px rgba(13,16,20,.14);" +
    "font:14px/1.45 Inter,\"Noto Sans JP\",\"Hiragino Sans\",\"Yu Gothic UI\",Meiryo,system-ui,sans-serif;" +
    "animation:skdn-in .45s cubic-bezier(.22,1,.36,1) both}" +
    ".skdn.is-out{animation:skdn-out .25s ease both}" +
    ".skdn *{box-sizing:border-box}" +
    ".skdn-ico{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:var(--skdn-a-soft);color:var(--skdn-a)}" +
    ".skdn-ico svg{width:20px;height:20px}" +
    ".skdn-text{flex:1;min-width:0}" +
    ".skdn-text strong{display:block;font-size:14px;font-weight:700}" +
    ".skdn-text span{display:block;font-size:12.5px;color:var(--skdn-muted)}" +
    ".skdn-text .skdn-domain{display:inline;font-size:inherit;color:inherit;white-space:nowrap}" +
    ".skdn-more{flex:none;padding:7px 12px;border-radius:999px;background:var(--skdn-a);color:#fff;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}" +
    ".skdn-more:hover{filter:brightness(1.08)}" +
    ".skdn-close{flex:none;display:grid;place-items:center;width:32px;height:32px;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:var(--skdn-muted);cursor:pointer}" +
    ".skdn-close:hover{background:rgba(127,127,127,.14)}" +
    ".skdn-close svg{width:18px;height:18px}" +
    ".skdn a:focus-visible,.skdn button:focus-visible{outline:2px solid var(--skdn-a);outline-offset:2px}" +
    "@media (max-width:480px){.skdn{right:8px;width:calc(100vw - 16px)}.skdn-text>span{display:none}}" +
    "@keyframes skdn-in{from{opacity:0;transform:translateY(-12px)}}" +
    "@keyframes skdn-out{to{opacity:0;transform:translateY(-12px)}}" +
    "@media (prefers-reduced-motion:reduce){.skdn,.skdn.is-out{animation:none}}" +
    "@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]) .skdn{--skdn-bg:#1d232c;--skdn-ink:#e8ecf1;--skdn-muted:#9aa4b2;--skdn-line:#2f3742;--skdn-a:#3b82f6;--skdn-a-soft:#16233a}}" +
    ":root[data-theme=\"dark\"] .skdn{--skdn-bg:#1d232c;--skdn-ink:#e8ecf1;--skdn-muted:#9aa4b2;--skdn-line:#2f3742;--skdn-a:#3b82f6;--skdn-a-soft:#16233a}" +
    "html.in-line .skdn{display:none}";

  var SVG_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>';
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  // ヘッダーが見えていればその下、なければ画面（タイトルバー）の上
  function placeTop(card) {
    var hd = document.querySelector(".site-header");
    var r = hd && getComputedStyle(hd).display !== "none" && hd.offsetHeight ? hd.getBoundingClientRect() : null;
    card.style.setProperty("--skdn-top", r && r.bottom > 0 ? Math.round(r.bottom + 12) + "px" : "calc(env(titlebar-area-y, 0px) + env(titlebar-area-height, 0px) + 12px)");
  }

  function show() {
    if (document.querySelector(".skdn")) return;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var card = document.createElement("aside");
    card.className = "skdn";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", t("お知らせ"));
    card.innerHTML = '<span class="skdn-ico">' + SVG_ICO + '</span><div class="skdn-text"><strong></strong><span></span></div><a class="skdn-more" href="/domain/"></a><button class="skdn-close" type="button">' + SVG_CLOSE + "</button>";
    // 「sk-hub.jp」の途中で改行しない
    var title = card.querySelector("strong");
    t("SK のサイトは sk-hub.jp に引っ越します").split("sk-hub.jp").forEach(function (part, i) {
      if (i) { var d = document.createElement("span"); d.className = "skdn-domain"; d.textContent = "sk-hub.jp"; title.appendChild(d); }
      title.appendChild(document.createTextNode(part));
    });
    card.querySelector(".skdn-text > span").textContent = t("いまは準備中です。日程は決まりしだいお知らせします。");
    card.querySelector(".skdn-more").textContent = t("詳しく");
    var close = card.querySelector(".skdn-close");
    close.setAttribute("aria-label", t("閉じる"));

    function done() { try { localStorage.setItem(KEY, STAGE); } catch (e) { /* 保存できない */ } }
    close.addEventListener("click", function () {
      done();
      card.classList.add("is-out");
      setTimeout(function () { card.remove(); }, 260);
    });
    card.querySelector(".skdn-more").addEventListener("click", done);

    placeTop(card);
    window.addEventListener("resize", function () { placeTop(card); });
    document.body.appendChild(card);
  }

  function later() { setTimeout(show, 700); }
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later);
})();
