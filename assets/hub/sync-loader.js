// SK Hub Systems アカウントの設定の同期（アカウントを使わないページ用。トップ・サポート・MALU・QR Drop など）
// ログイン中（ヘッダーの表示用の情報がある）のときだけ、ページを開いてしばらくしてから assets/hub/account.js を読み込み、
//   ・表示言語・MALU・QR Drop の設定をアカウントとそろえる
//   ・お知らせの未読の数を更新する（ヘッダーに出る）
//   ・ほかの端末でログアウトしていたら、ヘッダーの表示を消す
// Firebase を毎回読み込まないように、同期は 10 分に 1 回まで。
// アカウントの設定を読み込んだときは、画面の下に「再読み込み」を出す（表示言語が変わったときは、すぐに開き直す）。
(function () {
  "use strict";

  var INTERVAL = 10 * 60 * 1000;
  var hint = null, last = 0;
  try {
    hint = localStorage.getItem("skhub_account");
    last = Number(localStorage.getItem("skhub_sync_at") || 0);
  } catch (e) { return; }
  if (!hint || Date.now() - last < INTERVAL) return;

  var t = window.SKI18N ? window.SKI18N.t : function (s) { return s; };

  function toast() {
    var box = document.createElement("div");
    box.setAttribute("role", "status");
    box.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:14px;" +
      "max-width:calc(100% - 32px);padding:12px 14px 12px 18px;border-radius:14px;background:#1f2937;color:#fff;font:500 14px/1.5 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)";
    var text = document.createElement("span");
    text.textContent = t("SK Hub Systems アカウントの設定を読み込みました。");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t("再読み込み");
    btn.style.cssText = "flex:none;border:0;border-radius:999px;padding:7px 14px;background:#fff;color:#1f2937;font:600 13px system-ui,sans-serif;cursor:pointer";
    btn.addEventListener("click", function () { location.reload(); });
    box.append(text, btn);
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 12000);
  }

  function run() {
    try { localStorage.setItem("skhub_sync_at", String(Date.now())); } catch (e) { /* 間隔をあけられないだけ */ }
    import("/assets/hub/account.js")
      .then(function (m) { return m.backgroundSync(); })
      .then(function (result) {
        if (!result) return;
        if (result.languageChanged) { location.reload(); return; }
        // このページのアプリの設定が変わったときだけ知らせる
        var app = { malu: "/dictionary/", qrdrop: "/qr-prj/" };
        if (result.pulled.some(function (k) { return app[k] && location.pathname.indexOf(app[k]) === 0; })) toast();
      })
      .catch(function () { /* オフラインなど。次の機会に */ });
  }

  function later() { setTimeout(run, 1500); }
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later);
})();
