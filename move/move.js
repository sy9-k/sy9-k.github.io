// データの引っ越し（/move/）の動き: 画面の切り替えと、移している様子
//   画面は履歴に積むので、左上の ← でもブラウザの「戻る」でも戻れる（移している途中は戻れない）
//   いまは形だけ（PREVIEW）: データは読まず・送らない。sk-hub.jp へのリンクも開かずにスナックバーで知らせる
//   本番にするときは PREVIEW を false にし、run() の中で端末のデータを集めて sk-hub.jp/move/ に渡す（postMessage）
(function () {
  "use strict";
  var PREVIEW = true;
  var I18N = window.SKI18N;
  function t(s, v) { return I18N ? I18N.t(s, v) : s.replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }

  var screens = {};
  document.querySelectorAll(".screen").forEach(function (s) { screens[s.dataset.screen] = s; });
  var bar = document.getElementById("bar"), current = "choose", busy = false;
  var NO_BACK = { choose: true, moving: true, done: true };

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

  // この端末から: 選ぶ
  var checks = document.querySelectorAll("#pick .check"), start = document.getElementById("start");
  function picked() { return Array.prototype.filter.call(checks, function (c) { return c.checked; }); }
  function update() {
    var n = picked().length;
    start.disabled = n === 0;
    start.textContent = n ? t("{n} 件を移す", { n: n }) : t("移すものを選んでください");
  }
  checks.forEach(function (c) { c.addEventListener("change", update); });
  update();

  // 移している（いまは 1 件ずつ待つだけ）
  start.addEventListener("click", function () {
    var list = document.getElementById("progress"), linear = document.getElementById("linear");
    list.innerHTML = "";
    picked().forEach(function (c) {
      var li = document.createElement("li");
      li.className = "item";
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
    busy = true;
    history.replaceState({ screen: "moving" }, "");
    show("moving", "fwd");
    var rows = list.querySelectorAll(".item"), i = 0;
    (function next() {
      if (i > 0) { rows[i - 1].classList.remove("is-busy"); rows[i - 1].classList.add("is-done"); }
      linear.style.width = (i / rows.length * 100) + "%";
      if (i === rows.length) {
        setTimeout(function () {
          busy = false;
          document.getElementById("done-sub").textContent = t("{n} 件のデータを移しました。sk-hub.jp で、いつものように使えます。", { n: rows.length });
          history.replaceState({ screen: "done" }, "");
          show("done", "fwd");
        }, 500);
        return;
      }
      rows[i].classList.add("is-busy");
      i++;
      setTimeout(next, 700);
    })();
  });

  // 準備中は sk-hub.jp を開かない
  if (PREVIEW) {
    var snack = document.getElementById("snack"), timer;
    document.querySelectorAll('a[href^="https://sk-hub.jp"]').forEach(function (a) {
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
