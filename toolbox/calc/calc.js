// Calc（SK's Toolbox）
//   ・式は文字列（input）で持つ。中身は 0-9 . + - * / ^ ( ) % ! と、関数 sin cos tan ln log √・定数 π e。
//     表示のときに × ÷ − と 3 桁ごとの「,」にする
//   ・計算は eval を使わず、字句に分けて（tokenize）逆ポーランド記法にして（toRpn）計算する（run）
//     累乗が先、次にかけ算・わり算。マイナスの数（-3、5×-2）。閉じていないかっこは最後に閉じる
//     % は iPhone と同じ: 「A + B%」「A − B%」は A の B%（200 + 10% = 220）、それ以外は 100 で割る
//   ・関数電卓のキー（sin・√ など）は、上のボタンで出す（data.sci）。角度は度とラジアンを切りかえ（data.angle）
//   ・小数の誤差（0.1 + 0.2 など）は有効数字 14 桁で丸める
//   ・履歴は localStorage の sk_calc に保存する（オンライン同期をオンにしたときだけ、暗号化して SK Hub Systems アカウントにも保存する。/toolbox/shared/sync.js）。テーマなどは共通の設定（/toolbox/shared/settings.js）
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
  var data = { history: [], sci: false, angle: "deg" };
  function load() {
    if (embed) return;
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "{}");
      data.history = Array.isArray(d.history) ? d.history.filter(function (h) { return h && typeof h.e === "string" && typeof h.r === "string"; }) : [];
      data.sci = !!d.sci;
      data.angle = d.angle === "rad" ? "rad" : "deg";
    } catch (e) { /* 初期値のまま */ }
  }
  function save() {
    if (embed) return;
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { say(t("保存できませんでした")); }
  }
  load();
  if (embed) root.classList.add("is-embed");

  // ---- 計算 ----
  //   字句: 数 { n }・演算子 + - * / ^・かっこ・後ろにつく % と !・関数 { f }（sin cos tan ln log と √）・定数 π e
  var OPS = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
  var RIGHT = { "^": 1 };
  var angle = "deg"; // 三角関数の角度（deg: 度 / rad: ラジアン）
  function isNum(tk) { return tk !== undefined && typeof tk === "object" && tk.n !== undefined; }
  function isFn(tk) { return tk !== undefined && typeof tk === "object" && !!tk.f; }
  function isValue(tk) { return isNum(tk) || tk === ")" || tk === "%" || tk === "!"; }

  function tokenize(s) {
    var out = [], i = 0, m;
    while (i < s.length) {
      var rest = s.slice(i), c = s[i];
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?/i.exec(rest))) { out.push({ n: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^(sin|cos|tan|ln|log)/.exec(rest))) { out.push({ f: m[1] }); i += m[0].length; continue; }
      if (c === "√") { out.push({ f: "sqrt" }); i++; continue; }
      if (c === "π") { out.push({ n: Math.PI }); i++; continue; }
      if (c === "e") { out.push({ n: Math.E }); i++; continue; }
      if ("+-*/^()%!".indexOf(c) < 0) throw new Error("bad char");
      out.push(c);
      i++;
    }
    // マイナスの数と、省略されたかけ算（2(3) → 2*(3)、2π、3sin(…)）
    var res = [];
    out.forEach(function (tk) {
      var pv = isValue(res[res.length - 1]);
      if (tk === "-" && !pv) { res.push("neg"); return; }
      if (tk === "+" && !pv) return;
      if ((tk === "(" || typeof tk === "object") && pv) res.push("*");
      res.push(tk);
    });
    return percentOf(res);
  }

  // iPhone と同じ %: 「A + B%」「A − B%」は A の B%（200 + 10% = 220）。× ÷ のときや、% だけのときは 100 で割る
  function percentOf(tk) {
    for (var i = 0; i < tk.length; i++) {
      if (tk[i] !== "%") continue;
      // % の前の数（かっこや関数ごと）の始まり j
      var j = i - 1;
      if (tk[j] === ")") {
        for (var depth = 0; j >= 0; j--) {
          if (tk[j] === ")") depth++;
          else if (tk[j] === "(" && --depth === 0) break;
        }
        if (j > 0 && isFn(tk[j - 1])) j--;
      }
      if (j > 0 && tk[j - 1] === "neg") j--;
      var op = tk[j - 1];
      if (op !== "+" && op !== "-") continue;
      // 同じかっこの中で、その演算子より前（A）
      var g = j - 2;
      for (var d = 0; g >= 0; g--) {
        if (tk[g] === ")") d++;
        else if (tk[g] === "(") { if (d === 0) break; d--; }
      }
      var A = tk.slice(g + 1, j - 1), B = tk.slice(j, i);
      if (!A.length || !B.length) continue;
      var rep = ["(", "("].concat(A, [")", "*", "("], B, [")", "/", { n: 100 }, ")"]);
      Array.prototype.splice.apply(tk, [j, i - j + 1].concat(rep));
      i = j + rep.length - 1;
    }
    return tk;
  }

  function toRpn(tokens) {
    var out = [], stack = [];
    tokens.forEach(function (tk) {
      if (isNum(tk)) out.push(tk);
      else if (isFn(tk) || tk === "neg" || tk === "(") stack.push(tk);
      else if (tk === "%" || tk === "!") out.push(tk);
      else if (tk === ")") {
        while (stack.length && stack[stack.length - 1] !== "(") out.push(stack.pop());
        if (!stack.length) throw new Error("paren");
        stack.pop();
        if (isFn(stack[stack.length - 1])) out.push(stack.pop());
      } else {
        while (stack.length) {
          var top = stack[stack.length - 1];
          if (top === "(" || isFn(top) || OPS[top] < OPS[tk] || (OPS[top] === OPS[tk] && RIGHT[tk])) break;
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

  function fact(x) {
    if (x < 0 || x !== Math.floor(x) || x > 170) throw new Error("fact");
    for (var r = 1, i = 2; i <= x; i++) r *= i;
    return r;
  }
  function apply1(tk, x) {
    if (tk === "neg") return -x;
    if (tk === "%") return x / 100;
    if (tk === "!") return fact(x);
    var f = tk.f;
    if (f === "sqrt") { if (x < 0) throw new Error("sqrt"); return Math.sqrt(x); }
    if (f === "ln" || f === "log") { if (x <= 0) throw new Error("log"); return f === "ln" ? Math.log(x) : Math.log(x) / Math.LN10; }
    if (angle === "deg") {
      if (f === "tan" && Math.abs((((x % 180) + 180) % 180) - 90) < 1e-9) throw new Error("tan");
      x = x * Math.PI / 180;
    }
    var r = Math[f](x);
    return Math.abs(r) < 1e-12 ? 0 : r; // sin(180°) などの誤差
  }
  function run(rpn) {
    var st = [];
    rpn.forEach(function (tk) {
      if (isNum(tk)) { st.push(tk.n); return; }
      if (isFn(tk) || tk === "neg" || tk === "%" || tk === "!") {
        if (!st.length) throw new Error("operand");
        st.push(apply1(tk, st.pop()));
        return;
      }
      if (st.length < 2) throw new Error("operand");
      var b = st.pop(), a = st.pop();
      if (tk === "/" && b === 0) throw new Error("div0");
      st.push(tk === "+" ? a + b : tk === "-" ? a - b : tk === "*" ? a * b : tk === "^" ? Math.pow(a, b) : a / b);
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
  function isOp(c) { return c === "+" || c === "-" || c === "*" || c === "/" || c === "^"; }
  // いまの式が「値」で終わっているか（数・閉じかっこ・% ・!・π・e）
  function endsWithValue() { return /[\d.)%!πe]$/.test(input); }
  function isPlain(s) { return !/[^\d.]/.test(String(s).replace(/^-/, "")); }
  var TAIL = /(?:[+\-*\/^]|(?:sin|cos|tan|ln|log|√)?\()+$/; // 最後の演算子や開きかっこ（式としてはまだ途中）
  function openParens() { return (input.match(/\(/g) || []).length - (input.match(/\)/g) || []).length; }
  function trailingNumber() { return (/[\d.]*$/.exec(input) || [""])[0]; }

  // 途中の式でも答えを見せる（最後の演算子や「(」は無視する）
  function preview() {
    var s = input.replace(TAIL, "");
    if (isPlain(s)) return "";
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
      if (/[)%!πe]$/.test(input)) input += "*";
      var num = trailingNumber();
      if (num.replace(".", "").length >= 15) return;
      if (num === "0") input = input.slice(0, -1);
      input += k;
    } else if (k === ".") {
      if (done) { input = "0."; done = false; render(); return; }
      var cur = trailingNumber();
      if (cur.indexOf(".") >= 0) return;
      if (/[)%!πe]$/.test(input)) input += "*0.";
      else input += cur === "" ? "0." : ".";
    } else if (isOp(k)) {
      continueFromResult();
      var l3 = last();
      if (input === "") input = k === "-" ? "-" : "0" + k;
      else if (l3 === "(") { if (k === "-") input += "-"; }
      else if (isOp(l3)) {
        if (k === "-" && (l3 === "*" || l3 === "/" || l3 === "^")) input += "-";
        else {
          input = input.replace(/[+\-*\/^]+$/, "");
          if (input === "" || last() === "(") { if (k === "-") input += "-"; }
          else input += k;
        }
      } else input += k;
    } else if (k === "%") {
      continueFromResult();
      if (/[\d.)!πe]$/.test(input)) input += "%";
    } else if (k === "paren") {
      continueFromResult();
      var l4 = last();
      if (input === "" || isOp(l4) || l4 === "(") input += "(";
      else if (openParens() > 0) input += ")";
      else input += "*(";
    } else if (k === "(") {
      continueFromResult();
      input += endsWithValue() ? "*(" : "(";
    } else if (k === ")") {
      if (done) return;
      if (openParens() > 0 && endsWithValue()) input += ")";
    } else if (/^fn:/.test(k)) {
      // 関数（sin・cos・tan・ln・log・√）。「=」のあとなら、答えにかける
      var name = k.slice(3);
      if (done) { input = name + "(" + raw(doneValue) + ")"; done = false; }
      else { if (endsWithValue()) input += "*"; input += name + "("; }
    } else if (k === "π" || k === "e") {
      if (done) { input = ""; done = false; }
      if (endsWithValue()) input += "*";
      input += k;
    } else if (k === "x2" || k === "^" || k === "!") {
      continueFromResult();
      if (!endsWithValue()) return;
      input += k === "x2" ? "^2" : k;
    } else if (k === "inv") {
      continueFromResult();
      if (input === "") return;
      input = "1/(" + input.replace(TAIL, "") + ")";
    } else if (k === "angle") {
      data.angle = data.angle === "deg" ? "rad" : "deg";
      angle = data.angle;
      save();
      updateSci();
    } else if (k === "back") {
      continueFromResult();
      // 関数は「sin(」ごと消す
      var fn = /(sin|cos|tan|ln|log)\($/.exec(input);
      input = fn ? input.slice(0, -fn[0].length) : input.slice(0, -1);
    } else if (k === "clear") {
      input = ""; done = false;
    } else if (k === "=") {
      if (done || input === "") return;
      try {
        var v = evaluate(input);
        // 数だけ（演算子なし）のときは、履歴に入れない
        var plain = isPlain(input) && openParens() === 0;
        doneExpr = input.replace(TAIL, "");
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
      li.className = "h-item";
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
      // 答えをコピー
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "icon-btn m3-state h-copy";
      copy.dataset.copy = String(i);
      copy.setAttribute("aria-label", t("答えをコピー") + ": " + fmtNum(Number(h.r)));
      copy.title = t("答えをコピー");
      var ci = document.createElement("span");
      ci.className = "msr";
      ci.setAttribute("aria-hidden", "true");
      ci.textContent = "content_copy";
      copy.appendChild(ci);
      li.append(b, copy);
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

  // ---- 関数電卓のキー ----
  angle = data.angle;
  function updateSci() {
    document.body.classList.toggle("is-sci", !!data.sci);
    $("btn-sci").setAttribute("aria-pressed", String(!!data.sci));
    var a = document.querySelector('[data-k="angle"]');
    if (a) { a.textContent = data.angle === "deg" ? "DEG" : "RAD"; a.title = data.angle === "deg" ? t("度（DEG）。押すとラジアン") : t("ラジアン（RAD）。押すと度"); }
    render();
  }

  if (window.SKToolbox) SKToolbox.onChange(applyTheme); else applyTheme();
  renderHistory();
  updateSci();
  // 動き: 開いたときに表示とキーが浮かび上がる
  if (window.M3) { M3.enter(document.querySelector(".display")); M3.stagger($("keys")); if (data.sci) M3.stagger($("sci-keys")); }

  if (embed) {
    input = "1280*1.08+(350-120)/4";
    render();
    return;
  }
  render();

  // ---- 操作 ----
  $("btn-sci").addEventListener("click", function () {
    data.sci = !data.sci;
    save();
    updateSci();
    if (data.sci && window.M3) M3.stagger($("sci-keys"));
    say(data.sci ? t("関数電卓のキーを出しました") : t("関数電卓のキーをしまいました"));
  });
  $("sci-keys").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]");
    if (!b) return;
    if (window.SKToolbox) SKToolbox.vibrate();
    press(b.dataset.k);
  });
  $("keys").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]");
    if (!b) return;
    if (window.SKToolbox) SKToolbox.vibrate();
    press(b.dataset.k);
  });

  var KEYMAP = { Enter: "=", "=": "=", Backspace: "back", Escape: "clear", Delete: "clear", ",": ".", x: "*", X: "*", p: "π" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest("input, textarea, select"))) return;
    var k = KEYMAP[e.key] || e.key;
    if (!/^(\d|[.+\-*\/()%=^!π]|back|clear)$/.test(k)) return;
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
  historyBtn.addEventListener("click", function () {
    setHistory(!historyEl.classList.contains("is-open"));
    if (historyEl.classList.contains("is-open") && window.M3) M3.stagger(listEl);
  });
  $("btn-history-close").addEventListener("click", function () { setHistory(false); });
  listEl.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) {
      var hc = data.history[Number(c.dataset.copy)];
      if (hc && navigator.clipboard) navigator.clipboard.writeText(hc.r).then(function () { say(t("コピーしました")); }, function () {});
      return;
    }
    var b = e.target.closest("[data-i]");
    if (!b) return;
    var h = data.history[Number(b.dataset.i)];
    if (!h) return;
    // 答えを式に入れる（=のあとや空なら置きかえ、演算子のあとならつなげる）
    if (done || input === "" || !/[+\-*\/^(]$/.test(input)) input = h.r;
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
