// 古いアドレスのお知らせ（アプリ用。SK's Toolbox の各アプリ・Nagi・MALU・SK's Lab・SK Share）
//   ・SK は sk-hub.jp に引っ越したので、アプリを開いたら、画面の中にダイアログを出して知らせる
//     「データを移す」（/move/）・「sk-hub.jp で開く」（同じページ）・「あとで」
//     この端末のデータをもう移した人（/move/ が付ける localStorage の sk_moved）には「sk-hub.jp で開く」をいちばん上に出す
//   ・アプリにはサイトのヘッダーがないので、サイトの帯（index.html の #sk-dn）の代わり。ファイル名はスナックバーだったころのまま
//   ・同じアプリでは、1 日に 1 回まで（localStorage の sk_move_dialog に、アプリ（パスの最初）ごとの最後に出した時刻）
//   ・出さないところ: iframe の中・LINE のミニアプリ・?embed
//   ・MALU・Nagi・Toolbox は Service Worker がこのファイルを保存するので、直したら各 sw.js の CACHE_NAME も上げる
(function () {
  "use strict";
  var KEY = "sk_move_dialog", EVERY = 24 * 60 * 60 * 1000;
  if (window.top !== window.self) return;
  if (/[?&](embed|line)\b|[?&]liff\./.test(location.search)) return;
  var app = location.pathname.split("/").filter(Boolean)[0] || "home";
  var seen = {}, moved = false;
  try {
    if (sessionStorage.getItem("sk_line")) return;
    seen = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    if (Date.now() - Number(seen[app] || 0) < EVERY) return;
    moved = !!localStorage.getItem("sk_moved");
  } catch (e) { return; }

  var I18N = window.SKI18N;
  function t(s) { return I18N && I18N.t ? I18N.t(s) : s; }

  var CSS =
    ".sk-mv{--mv-bg:#fff;--mv-ink:#1b1b1f;--mv-muted:#46464f;--mv-a:#2563eb;--mv-a-ink:#fff;--mv-tonal:#e6efff;--mv-tonal-ink:#1a3e8f;--mv-warn:#fff1cf;--mv-warn-ink:#6b4a00;" +
    "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px 16px;background:rgba(0,0,0,.45);" +
    "font:15px/1.6 Inter,\"Noto Sans JP\",\"Hiragino Sans\",\"Yu Gothic UI\",Meiryo,system-ui,sans-serif;animation:sk-mv-fade .2s ease both}" +
    ".sk-mv *{box-sizing:border-box}" +
    ".sk-mv-card{width:100%;max-width:400px;max-height:calc(100dvh - 48px);overflow:auto;padding:24px;border-radius:28px;background:var(--mv-bg);color:var(--mv-ink);" +
    "box-shadow:0 12px 40px rgba(0,0,0,.25);animation:sk-mv-in .3s cubic-bezier(.2,0,0,1) both}" +
    ".sk-mv-ico{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:var(--mv-warn);color:var(--mv-warn-ink)}" +
    ".sk-mv-ico svg{width:26px;height:26px}" +
    ".sk-mv h2{margin:16px 0 0;font-size:22px;line-height:1.35;font-weight:700;letter-spacing:-.01em}" +
    ".sk-mv p{margin:10px 0 0;color:var(--mv-muted);font-size:14.5px}" +
    ".sk-mv-addr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;font:600 13.5px/1.4 ui-monospace,\"SF Mono\",Menlo,Consolas,monospace}" +
    ".sk-mv-addr s{color:var(--mv-muted)}.sk-mv-addr b{color:var(--mv-a)}" +
    ".sk-mv-btns{display:flex;flex-direction:column;gap:8px;margin-top:20px}" +
    ".sk-mv-btns a,.sk-mv-btns button{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border:0;border-radius:999px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}" +
    ".sk-mv-1{background:var(--mv-a);color:var(--mv-a-ink)}.sk-mv-2{background:var(--mv-tonal);color:var(--mv-tonal-ink)}.sk-mv-3{background:transparent;color:var(--mv-muted)}" +
    ".sk-mv-btns a:hover,.sk-mv-btns button:hover{filter:brightness(1.06)}" +
    ".sk-mv-btns a:focus-visible,.sk-mv-btns button:focus-visible{outline:2px solid var(--mv-a);outline-offset:2px}" +
    "@keyframes sk-mv-fade{from{opacity:0}}@keyframes sk-mv-in{from{opacity:0;transform:translateY(16px) scale(.98)}}" +
    "@media (prefers-reduced-motion:reduce){.sk-mv,.sk-mv-card{animation:none}}" +
    "@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]) .sk-mv{--mv-bg:#1f1f23;--mv-ink:#e4e1e6;--mv-muted:#c7c5d0;--mv-a:#a8c7fa;--mv-a-ink:#062e6f;--mv-tonal:#26324a;--mv-tonal-ink:#d6e3ff;--mv-warn:#2a2112;--mv-warn-ink:#f5c86b}}" +
    ":root[data-theme=\"dark\"] .sk-mv{--mv-bg:#1f1f23;--mv-ink:#e4e1e6;--mv-muted:#c7c5d0;--mv-a:#a8c7fa;--mv-a-ink:#062e6f;--mv-tonal:#26324a;--mv-tonal-ink:#d6e3ff;--mv-warn:#2a2112;--mv-warn-ink:#f5c86b}" +
    "html.in-line .sk-mv{display:none}";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function show() {
    if (document.querySelector(".sk-mv")) return;
    seen[app] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { return; }
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var scrim = el("div", "sk-mv");
    var card = el("div", "sk-mv-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "sk-mv-h");
    var ico = el("div", "sk-mv-ico");
    ico.setAttribute("aria-hidden", "true");
    ico.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>';
    var h = el("h2", null, t("SK は sk-hub.jp に引っ越しました"));
    h.id = "sk-mv-h";
    var addr = el("div", "sk-mv-addr");
    addr.appendChild(el("s", null, "sy9-k.github.io"));
    addr.appendChild(el("span", null, "→"));
    addr.appendChild(el("b", null, "sk-hub.jp"));
    var p = el("p", null, moved
      ? t("この端末のデータは、もう sk-hub.jp に移しています。これからは sk-hub.jp をお使いください。ここ（古いアドレス）は更新を止めています。")
      : t("ここは古いアドレスで、更新を止めています。この端末のデータを移してから、新しいアドレスでお使いください。しばらくすると、古いアドレスは使えなくなります。"));
    var btns = el("div", "sk-mv-btns");
    var here = "https://sk-hub.jp" + location.pathname + location.search + location.hash;
    var moveBtn = el("a", moved ? "sk-mv-2" : "sk-mv-1", t("データを移す"));
    moveBtn.href = "/move/";
    var openBtn = el("a", moved ? "sk-mv-1" : "sk-mv-2", t("sk-hub.jp で開く"));
    openBtn.href = here;
    var later = el("button", "sk-mv-3", t("あとで"));
    later.type = "button";
    if (moved) { btns.appendChild(openBtn); btns.appendChild(moveBtn); }
    else { btns.appendChild(moveBtn); btns.appendChild(openBtn); }
    btns.appendChild(later);
    card.appendChild(ico);
    card.appendChild(h);
    card.appendChild(addr);
    card.appendChild(p);
    card.appendChild(btns);
    scrim.appendChild(card);

    var before = document.activeElement;
    function close() {
      scrim.remove();
      document.removeEventListener("keydown", onKey, true);
      if (before && before.focus) try { before.focus(); } catch (e) { /* 戻せなくてもよい */ }
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") {
        // ダイアログの中でフォーカスを回す
        var f = btns.querySelectorAll("a,button"), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    later.addEventListener("click", close);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(scrim);
    btns.firstChild.focus({ preventScroll: true });
  }

  function later() { setTimeout(show, 800); }
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later);
})();
