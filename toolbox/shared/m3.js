// SK's Toolbox の共通（マテリアルデザイン）
//   ・押したところから広がる波紋: .m3-state の付いた要素を押すと、中に .ripple を足す（見た目は /toolbox/shared/m3.css）
//   ・ダイアログ（window.M3）: 文字を入れる・ひとつ選ぶ・確かめる。どれも Promise を返す
//       M3.prompt({ title, label, value, placeholder, ok })        → 入れた文字（やめたら null）
//       M3.choose({ title, options: [{ value, label, icon, color }], value }) → 選んだ value（やめたら null）
//       M3.confirm({ title, text, ok, danger, icon })               → true / false
//   ・動き: M3.enter(要素)（画面に入る）・M3.stagger(要素)（中を少しずつずらして登場）・M3.countUp(要素, 数, 書式)
(function () {
  "use strict";
  document.addEventListener("pointerdown", function (e) {
    var el = e.target.closest && e.target.closest(".m3-state");
    if (!el || el.disabled) return;
    var r = el.getBoundingClientRect();
    var d = Math.hypot(r.width, r.height) * 2;
    var w = document.createElement("span");
    w.className = "ripple";
    w.style.width = w.style.height = d + "px";
    w.style.left = (e.clientX - r.left - d / 2) + "px";
    w.style.top = (e.clientY - r.top - d / 2) + "px";
    el.appendChild(w);
    w.addEventListener("animationend", function () { w.remove(); });
  });

  var I18N = window.SKI18N;
  function t(s) { return I18N ? I18N.t(s) : s; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function icon(name) { var s = el("span", "msr", name); s.setAttribute("aria-hidden", "true"); return s; }

  // 基本のダイアログ。body は中身の要素、actions は [{ label, value, danger, primary }]
  function dialog(opts) {
    return new Promise(function (resolve) {
      var scrim = el("div", "tbs-dialog-scrim");
      var box = el("div", "tbs-dialog m3-dialog");
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      if (opts.icon) box.appendChild(icon(opts.icon));
      var h = el("h2", "tbs-dialog__title", opts.title || "");
      h.id = "m3-dialog-title-" + Date.now();
      box.setAttribute("aria-labelledby", h.id);
      box.appendChild(h);
      if (opts.body) box.appendChild(opts.body);
      var actions = el("div", "tbs-dialog__actions");
      var buttons = (opts.actions || []).map(function (a) {
        var b = el("button", (a.primary ? "m3-btn" : "text-btn") + (a.danger ? " tbs-danger" : "") + " m3-state", a.label);
        b.type = "button";
        b.addEventListener("click", function () { close(typeof a.value === "function" ? a.value() : a.value); });
        actions.appendChild(b);
        return b;
      });
      box.appendChild(actions);
      scrim.appendChild(box);
      document.body.appendChild(scrim);
      var before = document.activeElement;
      var first = box.querySelector("input, textarea, select, [data-autofocus]") || buttons[0];
      if (first) first.focus();
      function focusables() { return Array.prototype.slice.call(box.querySelectorAll("button, input, textarea, select, [tabindex='0']")).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(opts.cancelValue === undefined ? null : opts.cancelValue); }
        else if (e.key === "Tab") {
          var f = focusables(), i = f.indexOf(document.activeElement);
          if (!f.length) return;
          e.preventDefault();
          f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      }
      document.addEventListener("keydown", onKey, true);
      scrim.addEventListener("click", function (e) { if (e.target === scrim) close(opts.cancelValue === undefined ? null : opts.cancelValue); });
      var done = false;
      function close(v) {
        if (done) return;
        done = true;
        scrim.remove();
        document.removeEventListener("keydown", onKey, true);
        if (before && before.focus) before.focus();
        resolve(v);
      }
      if (opts.onReady) opts.onReady(close, box);
    });
  }

  function prompt(opts) {
    var wrap = el("label", "m3-field");
    wrap.appendChild(el("span", "m3-field__label", opts.label || ""));
    var input = el("input", "m3-field__input");
    input.type = opts.type || "text";
    input.value = opts.value || "";
    input.placeholder = opts.placeholder || "";
    input.maxLength = opts.maxLength || 200;
    wrap.appendChild(input);
    return dialog({
      title: opts.title, icon: opts.icon, body: wrap,
      actions: [{ label: t("キャンセル"), value: null }, { label: opts.ok || t("OK"), primary: true, value: function () { return input.value.trim() || null; } }],
      onReady: function (close) {
        input.select();
        input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); close(input.value.trim() || null); } });
      }
    });
  }

  function choose(opts) {
    var list = el("div", "m3-choice");
    list.setAttribute("role", "radiogroup");
    var chosen = opts.value;
    var closeFn = null;
    (opts.options || []).forEach(function (o) {
      var b = el("button", "m3-choice__item m3-state");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(o.value === chosen));
      if (o.icon) {
        var ic = icon(o.icon);
        if (o.color) { ic.style.color = o.color; }
        b.appendChild(ic);
      }
      b.appendChild(el("span", "", o.label));
      var mark = icon("check");
      mark.classList.add("m3-choice__check");
      b.appendChild(mark);
      b.addEventListener("click", function () { if (closeFn) closeFn(o.value); });
      list.appendChild(b);
    });
    return dialog({
      title: opts.title, icon: opts.icon, body: list,
      actions: [{ label: t("キャンセル"), value: null }],
      onReady: function (close, box) {
        closeFn = close;
        var cur = box.querySelector('[aria-checked="true"]');
        if (cur) cur.focus();
      }
    });
  }

  function confirm(opts) {
    var p = el("p", "tbs-dialog__text", opts.text || "");
    return dialog({
      title: opts.title, icon: opts.icon || (opts.danger ? "delete" : null), body: p, cancelValue: false,
      actions: [{ label: t("キャンセル"), value: false }, { label: opts.ok || t("OK"), danger: !!opts.danger, value: true }]
    });
  }

  // ---- 動き（MALU・Nagi と同じ雰囲気。見た目は /toolbox/shared/m3.css。動きを減らす設定のときは CSS が止める）----
  function reduced() {
    return document.documentElement.getAttribute("data-motion") === "reduce" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  // 画面に入る（下から浮かび上がる）。同じ要素でも、呼ぶたびにもう一度動かす
  function enter(node, cls) {
    if (!node) return;
    cls = cls || "m3-enter";
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(function () { node.classList.remove(cls); }, 700);
  }
  // 中の要素を、少しずつずらして登場させる
  function stagger(node) {
    if (!node) return;
    Array.prototype.forEach.call(node.children, function (c, i) { c.style.setProperty("--i", String(i)); });
    node.classList.remove("m3-stagger");
    void node.offsetWidth;
    node.classList.add("m3-stagger");
    clearTimeout(node._m3st);
    node._m3st = setTimeout(function () { node.classList.remove("m3-stagger"); }, Math.min(node.children.length, 14) * 35 + 600);
  }
  // 数字を 0 から数え上げる（表示の文字は format で）
  function countUp(node, to, format, ms) {
    if (!node) return;
    format = format || String;
    if (reduced() || !isFinite(to) || to <= 0) { node.textContent = format(to); return; }
    ms = ms || 700;
    var start = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
      node.textContent = format(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  window.M3 = { dialog: dialog, prompt: prompt, choose: choose, confirm: confirm, enter: enter, stagger: stagger, countUp: countUp };
})();
