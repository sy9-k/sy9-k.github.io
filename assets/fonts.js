// Google Fonts の読み込み（SK プライバシーポリシー 第九条(c)）
//   ・EU・英国・スイスなどのタイムゾーンでは、文字のフォント（data-fonts）を読み込まず、端末にある文字で表示する
//     （読み込むと IP アドレスが Google に送られ、ドイツでは同意なしの読み込みが GDPR 違反とされた判決がある）
//   ・アイコンのフォント（data-icons）は、ないとボタンの絵が出ないので、どの地域でも読み込む
// 使い方: <head> の中に <script src="/assets/fonts.js" data-fonts="URL URL" data-icons="URL"></script>
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;

  var zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* 判定できなければ読み込む */ }
  var strict = /^(Europe\/|Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe)|Africa\/Ceuta|Asia\/(Nicosia|Famagusta)|Arctic\/)/.test(zone);

  function add(list) {
    (list || "").split(/\s+/).forEach(function (href) {
      if (!href) return;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }

  if (!strict) add(script.getAttribute("data-fonts"));
  add(script.getAttribute("data-icons"));
})();
