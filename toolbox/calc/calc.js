// Calc（SK's Toolbox）
//   ・式は文字列（input）で持つ。中身は 0-9 . + - * / ( ) % だけ。表示のときに × ÷ − と 3 桁ごとの「,」にする
//   ・計算は eval を使わず、字句に分けて（tokenize）逆ポーランド記法にして（toRpn）計算する（run）
//     かけ算・わり算が先、かっこ、マイナスの数（-3、5×-2）、% は 100 で割る。閉じていないかっこは最後に閉じる
//   ・小数の誤差（0.1 + 0.2 など）は有効数字 14 桁で丸める
//   ・履歴は localStorage の sk_calc に保存する（SK Hub Systems には送らない）。テーマなどは共通の設定（/toolbox/shared/settings.js）
//   ・?embed のときは /toolbox/ の見本として表示だけする
(function () {
  "use strict";

  var root = document.documentElement;
  var embed = /[?&]embed\b/.test(location.search);
  var I18N = window.SKI18N;
  var locale = (I18N && I18N.locale) || "ja-JP";
  function t(s) { return I18N ? I18N.t(s) : s; }
  function $(id) { return document.getElementById(id); }

  // ---- 保存 ----
  var STORE = "sk_calc";
  var MAX_HISTORY = 100;
  var data = { history: [] };
  function load() {
    if (embed) return;
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}");
      data.history = Array.isArray(d.history) ? d.history.filter(function (h) { return h && typeof h.e === "string" && typeof h.r === "string"; }) : [];
    } catch (e) { /* 初期値のまま */ }
  }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { say(t("保存できませんでした")); }
  }
  load();
  if (embed) root.classList.add("is-embed");

  // ---- 計算 ----
  var OPS = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3 };

  function tokenize(s) {
    var out = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?/i.exec(s.slice(i)))) {
        out.push({ n: parseFloat(m[0]) });
        i += m[0].length;
        continue;
      }
      if ("+-*/()%".indexOf(c) < 0) throw new Error("bad char");
      out.push(c);
      i++;
    }
    // マイナスの数と、かっこの前後の省略されたかけ算（2(3) → 2*(3)）
    var res = [];
    out.forEach(function (tk) {
      var prev = res[res.length - 1];
      var prevIsValue = prev !== undefined && (typeof prev === "object" || prev === ")" || prev === "%");
      if (tk === "-" && !prevIsValue) { res.push("neg"); return; }
      if (tk === "+" && !prevIsValue) return;
      if ((tk === "(" || typeof tk === "object") && prevIsValue) res.push("*");
      res.push(tk);
    });
    return res;
  }

  function toRpn(tokens) {
    var out = [], stack = [];
    tokens.forEach(function (tk) {
      if (typeof tk === "object") out.push(tk);
      else if (tk === "%") out.push("%");
      else if (tk === "neg") stack.push(tk);
      else if (tk === "(") stack.push(tk);
      else if (tk === ")") {
        while (stack.length && stack[stack.length - 1] !== "(") out.push(stack.pop());
        if (!stack.length) throw new Error("paren");
        stack.pop();
      } else {
        while (stack.length) {
          var top = stack[stack.length - 1];
          if (top === "(" || OPS[top] < OPS[tk]) break;
          out.push(stack.pop());
        }
        stack.push(tk);
      }
    });
    while (stack.length) {
      var op = stack.pop();
      if (op !== "(") out.push(op); // 閉じていないかっこは閉じたことにする
    }
    return out;
  }

  function run(rpn) {
    var st = [];
    rpn.forEach(function (tk) {
      if (typeof tk === "object") { st.push(tk.n); return; }
      if (tk === "neg" || tk === "%") {
        if (!st.length) throw new Error("operand");
        var x = st.pop();
        st.push(tk === "neg" ? -x : x / 100);
        return;
      }
      if (st.length < 2) throw new Error("operand");
      var b = st.pop(), a = st.pop();
      if (tk === "/" && b === 0) throw new Error("div0");
      st.push(tk === "+" ? a + b : tk === "-" ? a - b : tk === "*" ? a * b : a / b);
    });
    if (st.length !== 1 || !isFinite(st[0])) throw new Error("result");
    return round(st[0]);
  }

  function round(v) { var r = Number(v.toPrecision(14)); return r === 0 ? 0 : r; }
  function evaluate(s) { return run(toRpn(tokenize(s))); }

  // ---- 表示用の文字 ----
  var SYM = { "*": "×", "/": "÷", "-": "−" };
  function group(intPart) { return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtExpr(s) {
    return s.replace(/(\d+)(\.\d*)?(e[+\-]?\d+)?|[*\/\-]/gi, function (m, int, frac, exp) {
      return int !== undefined ? group(int) + (frac || "") + (exp || "") : SYM[m];
    });
  }
  // 計算結果を、式に戻せる文字（3 桁区切りなし）にする
  function raw(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e16 || a < 1e-6)) return v.toExponential(10).replace(/\.?0+e/, "e");
    return String(v);
  }
  function fmtNum(v) {
    var s = raw(v);
    if (/e/.test(s)) return s.replace("-", "−");
    var neg = s[0] === "-";
    var parts = (neg ? s.slice(1) : s).split(".");
    return (neg ? "−" : "") + group(parts[0]) + (parts[1] ? "." + parts[1] : "");
  }

  // ---- 状態 ----
  var input = "";       // いまの式
  var done = false;     // 「=」を押したあと（答えを大きく出している）
  var doneExpr = "";    // 「=」を押したときの式
  var doneValue = 0;
  var error = false;

  var display = document.querySelector(".display");
  var exprEl = $("expr"), resultEl = $("result");

  function last() { return input.slice(-1); }
  function isOp(c) { return c === "+" || c === "-" || c === "*" || c === "/"; }
  function openParens() { return (input.match(/\(/g) || []).length - (input.match(/\)/g) || []).length; }
  function trailingNumber() { return (/[\d.]*$/.exec(input) || [""])[0]; }

  // 途中の式でも答えを見せる（最後の演算子や「(」は無視する）
  function preview() {
    var s = input.replace(/[+\-*\/(]+$/, "");
    if (!/[+\-*\/%]/.test(s.replace(/^-/, ""))) return "";
    try { return fmtNum(evaluate(s)); } catch (e) { return ""; }
  }

  function fit(len) {
    var base = Math.min(64, Math.max(40, window.innerWidth * 0.15));
    var size = len <= 8 ? base : Math.max(26, base * 8 / len);
    display.style.setProperty("--fs", size.toFixed(1) + "px");
  }

  function render() {
    display.classList.toggle("is-done", done);
    display.classList.toggle("is-error", error);
    if (error) {
      exprEl.textContent = fmtExpr(input);
      resultEl.textContent = t("計算できません");
      fit(exprEl.textContent.length);
      return;
    }
    if (done) {
      exprEl.textContent = fmtExpr(doneExpr) + " =";
      resultEl.textContent = fmtNum(doneValue);
      fit(resultEl.textContent.length);
    } else {
      exprEl.textContent = fmtExpr(input);
      resultEl.textContent = preview();
      fit(exprEl.textContent.length);
      exprEl.scrollTop = exprEl.scrollHeight;
    }
  }

  // 「=」のあとに続けて入力するとき、答えから始める
  function continueFromResult() {
    if (!done) return;
    input = raw(doneValue);
    done = false;
  }

  function press(k) {
    error = false;
    if (/^\d$/.test(k)) {
      if (done) { input = ""; done = false; }
      var l = last();
      if (l === ")" || l === "%") input += "*";
      var num = trailingNumber();
      if (num.replace(".", "").length >= 15) return;
      if (num === "0") input = input.slice(0, -1);
      input += k;
    } else if (k === ".") {
      if (done) { input = "0."; done = false; render(); return; }
      var cur = trailingNumber();
      if (cur.indexOf(".") >= 0) return;
      var l2 = last();
      if (l2 === ")" || l2 === "%") input += "*0.";
      else input += cur === "" ? "0." : ".";
    } else if (isOp(k)) {
      continueFromResult();
      var l3 = last();
      if (input === "") input = k === "-" ? "-" : "0" + k;
      else if (l3 === "(") { if (k === "-") input += "-"; }
      else if (isOp(l3)) {
        if (k === "-" && (l3 === "*" || l3 === "/")) input += "-";
        else {
          input = input.replace(/[+\-*\/]+$/, "");
          if (input === "" || last() === "(") { if (k === "-") input += "-"; }
          else input += k;
        }
      } else input += k;
    } else if (k === "%") {
      continueFromResult();
      if (/[\d.)]$/.test(input)) input += "%";
    } else if (k === "paren") {
      continueFromResult();
      var l4 = last();
      if (input === "" || isOp(l4) || l4 === "(") input += "(";
      else if (openParens() > 0) input += ")";
      else input += "*(";
    } else if (k === "(") {
      continueFromResult();
      input += /[\d.)%]$/.test(input) ? "*(" : "(";
    } else if (k === ")") {
      if (done) return;
      if (openParens() > 0 && /[\d.)%]$/.test(input)) input += ")";
    } else if (k === "back") {
      continueFromResult();
      input = input.slice(0, -1);
    } else if (k === "clear") {
      input = ""; done = false;
    } else if (k === "=") {
      if (done || input === "") return;
      try {
        var v = evaluate(input);
        // 数だけ（演算子なし）のときは、履歴に入れない
        var plain = !/[+\-*\/%]/.test(input.replace(/^-/, "")) && openParens() === 0;
        doneExpr = input.replace(/[+\-*\/(]+$/, "");
        // 閉じていないかっこは、閉じた形で見せる（12×(3+4 → 12×(3+4)）
        var open = (doneExpr.match(/\(/g) || []).length - (doneExpr.match(/\)/g) || []).length;
        if (open > 0) doneExpr += new Array(open + 1).join(")");
        doneValue = v;
        done = true;
        if (!plain) addHistory(doneExpr, raw(v));
      } catch (e) {
        error = true;
      }
    }
    render();
  }

  // ---- 履歴 ----
  var listEl = $("history-list"), emptyEl = $("history-empty"), clearBtn = $("btn-clear-history");
  var dayFmt = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" });

  function addHistory(e, r) {
    data.history.unshift({ e: e, r: r, t: Date.now() });
    if (data.history.length > MAX_HISTORY) data.history.length = MAX_HISTORY;
    save();
    renderHistory();
  }
  function dayLabel(time) {
    var d = new Date(time), today = new Date();
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (time >= start) return t("今日");
    if (time >= start - 864e5) return t("昨日");
    return dayFmt.format(d);
  }
  function renderHistory() {
    listEl.textContent = "";
    var lastDay = "";
    data.history.forEach(function (h, i) {
      var day = dayLabel(h.t || 0);
      if (day !== lastDay) {
        lastDay = day;
        var head = document.createElement("li");
        head.className = "h-day";
        head.textContent = day;
        listEl.appendChild(head);
      }
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "m3-state";
      b.dataset.i = String(i);
      var e = document.createElement("span");
      e.className = "h-expr";
      e.textContent = fmtExpr(h.e);
      var r = document.createElement("span");
      r.className = "h-res";
      r.textContent = "= " + fmtNum(Number(h.r));
      b.append(e, r);
      li.appendChild(b);
      listEl.appendChild(li);
    });
    emptyEl.hidden = data.history.length > 0;
    clearBtn.disabled = data.history.length === 0;
  }

  // ---- テーマ・テーマカラー（共通の設定。/toolbox/shared/settings.js が <html> と --md-* に入れる）----
  // ここでは、ブラウザの上の帯の色（theme-color）だけ合わせる
  var themeColor = $("theme-color");
  function applyTheme() {
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue("--md-surface").trim() || "#f9f9ff";
  }

  // ---- 通知 ----
  var toast = $("toast"), toastTimer;
  function say(text) {
    $("toast-text").textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 1800);
  }

  if (window.SKToolbox) SKToolbox.onChange(applyTheme); else applyTheme();
  renderHistory();

  if (embed) {
    input = "1280*1.08+(350-120)/4";
    render();
    return;
  }
  render();

  // ---- 操作 ----
  $("keys").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]");
    if (!b) return;
    if (window.SKToolbox) SKToolbox.vibrate();
    press(b.dataset.k);
  });

  var KEYMAP = { Enter: "=", "=": "=", Backspace: "back", Escape: "clear", Delete: "clear", ",": ".", x: "*", X: "*" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = KEYMAP[e.key] || e.key;
    if (!/^(\d|[.+\-*\/()%=]|back|clear)$/.test(k)) return;
    // ボタンにフォーカスがあるときの Enter は、そのボタンを押す動きのままにする
    if (e.key === "Enter" && e.target.closest("button") && !e.target.closest("[data-k]")) return;
    e.preventDefault();
    press(k);
    var key = document.querySelector('[data-k="' + (k === "(" || k === ")" ? "paren" : k) + '"]');
    if (key) {
      key.classList.add("is-pressed");
      setTimeout(function () { key.classList.remove("is-pressed"); }, 120);
    }
  });

  resultEl.title = t("押すとコピー");
  resultEl.addEventListener("click", function () {
    var text = done ? raw(doneValue) : resultEl.textContent.replace(/,/g, "").replace("−", "-");
    if (!text || error) return;
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () { say(t("コピーしました")); }, function () {});
  });


  // 履歴（せまい画面ではボトムシート）
  var historyEl = $("history"), historyBtn = $("btn-history"), scrim = $("scrim");
  function setHistory(open) {
    historyEl.classList.toggle("is-open", open);
    historyBtn.setAttribute("aria-expanded", String(open));
    scrim.hidden = !open;
  }
  scrim.addEventListener("click", function () { setHistory(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && historyEl.classList.contains("is-open")) { e.stopImmediatePropagation(); setHistory(false); historyBtn.focus(); }
  }, true);
  historyBtn.addEventListener("click", function () { setHistory(!historyEl.classList.contains("is-open")); });
  $("btn-history-close").addEventListener("click", function () { setHistory(false); });
  listEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]");
    if (!b) return;
    var h = data.history[Number(b.dataset.i)];
    if (!h) return;
    // 答えを式に入れる（=のあとや空なら置きかえ、演算子のあとならつなげる）
    if (done || input === "" || !/[+\-*\/(]$/.test(input)) input = h.r;
    else input += h.r;
    done = false;
    error = false;
    render();
    setHistory(false);
  });
  clearBtn.addEventListener("click", function () {
    if (!confirm(t("履歴をすべて消去しますか？"))) return;
    data.history = [];
    save();
    renderHistory();
  });

  // ほかのタブで計算したとき
  window.addEventListener("storage", function (e) {
    if (e.key !== STORE) return;
    load();
    applyTheme();
    renderHistory();
  });
  window.addEventListener("resize", render);
})();
