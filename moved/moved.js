// 古いアドレスのページ（/moved/。旧ドメインのサポートを終えたあとは、どのページを開いてもこの中身＝404.html・index.html）の動き
//   残っていない人（none）: 5 秒数えて sk-hub.jp の同じページへ。「移動しない」で止められる
//   残っている人（left）: 自動では移動しない。残っているアプリを出し、ファイルに書き出す・/move/ でそのまま移す・このアドレスのデータを消す
//   古いデータ = この端末のこのアドレスに、アプリで使う人が作ったデータ（Todo・記録・履歴など）があるか
//     調べ方・書き出し・消し方は /assets/move-data.js（window.SKMove。/move/ と sk-hub.jp/move/ と同じ部品）
//     表示の設定・同意の記録（site）だけなら「残っていない」とする
(function () {
  "use strict";
  var I18N = window.SKI18N;
  var M = window.SKMove;
  var APPS = ["toolbox", "nagi", "malu", "lab"]; // 「残っている」と数えるアプリ
  function t(s) { return I18N ? I18N.t(s) : s; }

  var page = document.getElementById("page");
  // sk-hub.jp の同じページ（このページ自体のときはトップ）
  var path = location.pathname === "/moved/" ? "/" : location.pathname;
  var dest = "https://sk-hub.jp" + path + location.search + location.hash;
  document.querySelectorAll(".to-new").forEach(function (a) { a.href = dest; });
  document.querySelectorAll(".path").forEach(function (p) { p.textContent = path; });

  var snack = document.getElementById("snack"), snackTimer;
  function toast(text) {
    document.getElementById("snack-text").textContent = text;
    snack.classList.add("is-on");
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { snack.classList.remove("is-on"); }, 3000);
  }

  var fg = document.getElementById("fg"), sec = document.getElementById("sec"), secText = document.getElementById("sec-text");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, timer;
  function countdown() {
    clearInterval(timer);
    page.classList.remove("stopped");
    var n = 5;
    sec.textContent = secText.textContent = n;
    fg.style.transition = "none"; fg.style.strokeDashoffset = "0";
    fg.getBoundingClientRect();
    if (!reduce) { fg.style.transition = "stroke-dashoffset 5s linear"; fg.style.strokeDashoffset = "126"; }
    timer = setInterval(function () {
      n--;
      sec.textContent = secText.textContent = Math.max(n, 0);
      if (n > 0) return;
      clearInterval(timer);
      location.replace(dest);
    }, 1000);
  }
  document.getElementById("stay").addEventListener("click", function () { clearInterval(timer); page.classList.add("stopped"); });

  var left = []; // 古いデータが残っているアプリ
  function show(state) {
    page.setAttribute("data-state", state);
    document.querySelectorAll("#chips [data-group]").forEach(function (c) { c.hidden = left.indexOf(c.dataset.group) < 0; });
    if (state === "none") countdown(); else clearInterval(timer);
  }

  function check() {
    if (!M) return Promise.resolve([]);
    return Promise.all(APPS.map(function (id) { return M.hasData(id).catch(function () { return false; }); }))
      .then(function (has) { return APPS.filter(function (id, i) { return has[i]; }); });
  }

  // ファイルに書き出す（/move/ の「ファイルに書き出す」と同じ形。sk-hub.jp/move/ で読み込める）
  document.getElementById("export").addEventListener("click", function () {
    if (!M) return;
    var btn = this;
    btn.disabled = true;
    M.collect(left.concat(["site"])).then(M.toFile).then(function (blob) {
      var d = new Date();
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sk-move-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast(t("書き出しました。sk-hub.jp/move/ で読み込んでください"));
    }, function () { toast(t("書き出せませんでした")); }).then(function () { btn.disabled = false; });
  });

  // このアドレスのデータを消す（アプリのデータだけ。表示の設定などは残す）
  document.getElementById("erase").addEventListener("click", function () {
    var ask = window.M3 && M3.confirm
      ? M3.confirm({ title: t("このアドレスのデータを消しますか？"), text: t("sy9-k.github.io に残っている SK's Toolbox・Nagi・MALU のデータを、この端末から消します。元に戻すことはできません。"), ok: t("消す"), danger: true, icon: "delete" })
      : Promise.resolve(confirm(t("このアドレスのデータを消しますか？")));
    ask.then(function (ok) {
      if (!ok || !M) return;
      Promise.all(APPS.map(function (id) { return M.apply(id, { ls: {}, idb: [] }).catch(function () {}); })).then(check).then(function (rest) {
        left = rest;
        if (rest.length) { toast(t("消せなかったデータがあります")); show("left"); return; }
        toast(t("消しました"));
        show("none");
      });
    });
  });

  check().then(function (found) {
    left = found;
    show(found.length ? "left" : "none");
  }, function () { show("none"); });
})();
