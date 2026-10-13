// データの引っ越し（/move/）の動き: 画面の切り替えと、データを sk-hub.jp に送る（古いアドレス側）
//   画面は履歴に積むので、左上の ← でもブラウザの「戻る」でも戻れる（移している途中は戻れない）
//   送り方（/assets/move-data.js）:
//     1.「移す」で sk-hub.jp/move/?from=old を別のタブで開く（押したときにすぐ開かないとポップアップがブロックされる）
//     2. そのタブから sk-move:ready が来たら、集めたデータを sk-move:data で渡す（相手のオリジンを決めて送る）
//     3. sk-move:progress（アプリごと）・sk-move:conflict（向こうにもデータがある）・sk-move:done / sk-move:error を受け取って表示する
//     タブを開けない・返事がないときは「移せませんでした」→ ファイルに書き出す
//   ?file で開いたとき（sk-hub.jp 側でタブがつながらなかったときの案内）は、選ぶ画面から直接ファイルに書き出す
//   本当に送る。sk-hub.jp の公開（SKMove.LAUNCH）の前は、受け取るページを ?preview で開く（Coming Soon を通らずに受け取れる）
//   PREVIEW を true にすると形だけ（データは読まず・送らない。sk-hub.jp へのリンクも開かずにスナックバーで知らせる）
(function () {
  "use strict";
  var M = window.SKMove;
  var EARLY = Date.now() < M.LAUNCH;
  var FILE = /[?&]file\b/.test(location.search);
  var PREVIEW = false;
  var I18N = window.SKI18N;
  function t(s, v) { return I18N ? I18N.t(s, v) : s.replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }

  var screens = {};
  document.querySelectorAll(".screen").forEach(function (s) { screens[s.dataset.screen] = s; });
  var bar = document.getElementById("bar"), current = "choose", busy = false;
  var NO_BACK = { choose: true, moving: true, done: true, file: false };

  // 画面が変わった直後のタップが、新しい画面の同じ場所のボタンに届かないように（タップの貫通）、少しのあいだ押せなくする
  var lockUntil = 0;
  document.addEventListener("click", function (e) {
    if (Date.now() < lockUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // 下のバー: 下にまだ続きがあるときだけ線を出す
  function raise() {
    var b = screens[current].querySelector(".bottom");
    if (b) b.classList.toggle("is-raised", document.documentElement.scrollHeight - scrollY - innerHeight > 4);
  }
  addEventListener("scroll", raise, { passive: true });
  addEventListener("resize", raise);

  function show(name, dir) {
    if (!screens[name] || name === current) return;
    lockUntil = Date.now() + 450;
    screens[current].classList.remove("is-on", "in-fwd", "in-back");
    var el = screens[name];
    el.classList.remove("in-fwd", "in-back");
    el.classList.add("is-on", dir === "back" ? "in-back" : "in-fwd");
    current = name;
    bar.classList.toggle("has-back", !NO_BACK[name]);
    scrollTo(0, 0);
    raise();
    var h = el.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function go(name) { history.pushState({ screen: name }, ""); show(name, "fwd"); }
  history.replaceState({ screen: "choose" }, "");
  addEventListener("popstate", function (e) {
    if (busy) { history.pushState({ screen: current }, ""); return; }
    var name = (e.state && e.state.screen) || "choose";
    if (name === "moving") name = "device";
    show(name, "back");
  });
  document.getElementById("back").addEventListener("click", function () { history.back(); });
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go); }); });
  raise();

  // sk-hub.jp へのリンクは、手元で確かめるときは localhost:8766 に
  document.querySelectorAll('a[href^="https://sk-hub.jp"]').forEach(function (a) { a.href = a.href.replace("https://sk-hub.jp", M.NEW); });
  var prep = document.getElementById("prep");
  if (prep) prep.hidden = !PREVIEW;

  // この端末から: 選ぶ（データがないアプリは選べなくする）
  var checks = document.querySelectorAll("#pick .check"), start = document.getElementById("start");
  function picked() { return Array.prototype.filter.call(checks, function (c) { return c.checked && !c.disabled; }); }
  function update() {
    var n = picked().length;
    start.disabled = n === 0;
    start.textContent = n ? t(FILE ? "{n} 件をファイルに書き出す" : "{n} 件を移す", { n: n }) : t("移すものを選んでください");
  }
  checks.forEach(function (c) { c.addEventListener("change", update); });
  update();
  if (!PREVIEW) {
    M.collect(M.GROUPS.map(function (g) { return g.id; })).then(function (all) {
      checks.forEach(function (c) {
        var n = M.count(all.groups[c.dataset.group]);
        if (n) return;
        c.checked = false;
        c.disabled = true;
        var item = c.closest(".item");
        item.classList.add("is-empty");
        item.querySelector("small").textContent = t("この端末にはデータがありません");
      });
      update();
    });
  }

  var list = document.getElementById("progress"), linear = document.getElementById("linear");
  function makeRows(cs) {
    list.innerHTML = "";
    cs.forEach(function (c) {
      var li = document.createElement("li");
      li.className = "item";
      li.dataset.group = c.dataset.group;
      li.appendChild(c.closest(".item").querySelector(".avatar").cloneNode(true));
      var text = document.createElement("span");
      text.className = "item-text";
      var b = document.createElement("b");
      b.textContent = t(c.dataset.name);
      text.appendChild(b);
      li.appendChild(text);
      var st = document.createElement("span");
      st.className = "status";
      st.innerHTML = '<span class="wait"></span><span class="spin" aria-hidden="true"></span><span class="msr msr--fill">check_circle</span>';
      st.querySelector(".wait").textContent = t("待機中");
      st.querySelector(".msr").setAttribute("aria-label", t("完了"));
      li.appendChild(st);
      list.appendChild(li);
    });
    linear.style.width = "0";
    return list.querySelectorAll(".item");
  }
  function progress() {
    var rows = list.querySelectorAll(".item"), done = list.querySelectorAll(".item.is-done, .item.is-skip").length;
    linear.style.width = (rows.length ? done / rows.length * 100 : 0) + "%";
  }
  function mark(id, state) {
    var row = list.querySelector('.item[data-group="' + id + '"]');
    if (!row) return;
    row.classList.remove("is-busy", "is-done", "is-skip");
    row.classList.add("is-" + state);
    if (state === "skip") row.querySelector(".wait").textContent = t("そのまま");
    progress();
  }
  var movingSub = document.querySelector('[data-screen="moving"] .sub');
  var MOVING_SUB = movingSub.textContent;
  function enter(name) {
    busy = name === "moving";
    history.replaceState({ screen: name }, "");
    show(name, "fwd");
  }
  function finished(n) {
    busy = false;
    document.getElementById("done-sub").textContent = t("{n} 件のデータを sk-hub.jp に移しました。開いた sk-hub.jp のタブで、続きをどうぞ。", { n: n });
    enter("done");
  }

  // 形だけ（公開の前）: 1 件ずつ待つだけ
  function fake() {
    var rows = makeRows(picked()), i = 0;
    enter("moving");
    (function next() {
      if (i > 0) { rows[i - 1].classList.remove("is-busy"); rows[i - 1].classList.add("is-done"); }
      linear.style.width = (i / rows.length * 100) + "%";
      if (i === rows.length) {
        setTimeout(function () {
          busy = false;
          document.getElementById("done-sub").textContent = t("{n} 件のデータを移しました。sk-hub.jp で、いつものように使えます。", { n: rows.length });
          enter("done");
        }, 500);
        return;
      }
      rows[i].classList.add("is-busy");
      i++;
      setTimeout(next, 700);
    })();
  }

  // 本当に送る
  var ERR = {
    popup: "新しいタブを開けませんでした。ポップアップを許可してから、もう一度お試しください。",
    timeout: "sk-hub.jp のタブから返事がありませんでした。",
    closed: "sk-hub.jp のタブが閉じられました。",
    write: "sk-hub.jp に書き込めませんでした。"
  };
  function fail(why) {
    busy = false;
    document.getElementById("error-sub").textContent = t(ERR[why] || ERR.timeout);
    enter("error");
  }
  function real() {
    var cs = picked(), ids = cs.map(function (c) { return c.dataset.group; });
    var w = window.open(M.NEW + "/move/?from=old" + (EARLY ? "&preview" : ""), "sk-move");
    if (!w || w === window) return fail("popup");
    makeRows(cs);
    movingSub.textContent = t(MOVING_SUB);
    enter("moving");
    var payload = null, ready = false, sent = false, over = false;
    function stop() { over = true; clearTimeout(timer); clearInterval(watch); removeEventListener("message", onMsg); }
    function send() {
      if (!ready || !payload || sent) return;
      sent = true;
      clearTimeout(timer);
      w.postMessage({ type: "sk-move:data", payload: payload }, M.NEW);
    }
    function onMsg(e) {
      if (over || e.origin !== M.NEW || e.source !== w || !e.data || typeof e.data.type !== "string") return;
      var d = e.data;
      if (d.type === "sk-move:ready") { ready = true; send(); }
      else if (d.type === "sk-move:conflict") movingSub.textContent = t("sk-hub.jp のタブで、いまあるデータを置きかえるかどうかを選んでください。");
      else if (d.type === "sk-move:progress") { movingSub.textContent = t(MOVING_SUB); mark(d.id, d.state); }
      else if (d.type === "sk-move:done") {
        stop();
        try { localStorage.setItem("sk_moved", JSON.stringify({ at: Date.now(), groups: d.moved || ids })); } catch (err) { /* 記録できなくても移せている */ }
        setTimeout(function () { finished(d.count || 0); }, 400);
      } else if (d.type === "sk-move:error") { stop(); fail("write"); }
    }
    addEventListener("message", onMsg);
    var timer = setTimeout(function () { if (!sent) { stop(); fail("timeout"); } }, 30000);
    var watch = setInterval(function () { if (w.closed && !over) { stop(); fail(sent ? "closed" : "timeout"); } }, 800);
    M.collect(ids).then(function (p) { payload = p; send(); }, function () { stop(); fail("timeout"); });
  }

  start.addEventListener("click", function () { if (PREVIEW) fake(); else if (FILE) toFile(); else real(); });
  document.getElementById("retry").addEventListener("click", function () { history.replaceState({ screen: "device" }, ""); show("device", "back"); });

  // ファイルで移す
  document.getElementById("to-file").addEventListener("click", toFile);
  function toFile() {
    var ids = picked().map(function (c) { return c.dataset.group; });
    if (!ids.length) ids = M.GROUPS.map(function (g) { return g.id; });
    M.collect(ids).then(M.toFile).then(function (blob) {
      var a = document.createElement("a"), d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = "sk-move-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      go("file");
    });
  }
  if (FILE && !PREVIEW) go("device");

  // 公開の前は sk-hub.jp を開かない
  if (PREVIEW) {
    var snack = document.getElementById("snack"), timer;
    document.querySelectorAll('a[href^="' + M.NEW + '"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("snack-text").textContent = t("準備中なので、sk-hub.jp には移動しません");
        snack.classList.add("is-on");
        clearTimeout(timer);
        timer = setTimeout(function () { snack.classList.remove("is-on"); }, 2200);
      });
    });
  }
})();
