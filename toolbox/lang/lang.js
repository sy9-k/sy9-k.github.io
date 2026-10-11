// SK's Toolbox の言語の画面（/toolbox/lang/?next=戻り先）。サイトの /lang/lang.js の Toolbox 版
//   言語を選ぶと、その言語で「〜でよろしいですか？」と出し、下の「続行」で保存して戻り先へ（SKI18N.setLang。localStorage の sk_lang）
(function () {
  "use strict";

  var I18N = window.SKI18N;
  var page = document.querySelector("[data-lang-page]");
  if (!page || !I18N) return;
  function t(s) { return I18N.t(s); }
  var title = page.querySelector("[data-lang-title]");
  var lead = page.querySelector("[data-lang-lead]");
  var list = page.querySelector("[data-lang-list]");
  var bottom = document.querySelector("[data-lang-bottom]");
  var next = document.querySelector("[data-lang-continue]");
  var backLink = page.querySelector("[data-lang-back]");

  // 選んだ言語で、確かめの文を出す（/lang/lang.js と同じ）
  var TEXT = {
    ja: { title: "言語", desc: "日本語でよろしいですか？", btn: "続行" },
    en: { title: "Language", desc: "Is English correct?", btn: "Continue" },
    "zh-CN": { title: "语言", desc: "确定使用简体中文吗？", btn: "继续" },
    "zh-TW": { title: "語言", desc: "確定使用繁體中文嗎？", btn: "繼續" },
    ko: { title: "언어", desc: "한국어로 설정할까요?", btn: "계속" }
  };

  // 戻り先（このサイトの中だけ。「//」「/\」で始まるものは、ほかのサイトに出てしまうので使わない）
  var raw = new URLSearchParams(location.search).get("next") || "/toolbox/";
  var back = /^\/(?![\/\\])/.test(raw) ? raw : "/toolbox/";

  // 戻る: このサイトの中から来たときは履歴を戻る（アプリの画面をそのまま戻す）。直接開いたときは戻り先へ
  function goBack() {
    var sameSite = false;
    try { sameSite = new URL(document.referrer).origin === location.origin; } catch (e) { /* referrer がない */ }
    if (sameSite && history.length > 1) history.back();
    else location.replace(back);
  }
  backLink.href = back;
  backLink.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    goBack();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("dialog[open], .tbt-menu.is-open")) goBack();
  });

  // 言語の一覧。下の行に、いまの言語での名前（Intl.DisplayNames。使えないブラウザでは出さない）
  var current = I18N.stored() || I18N.lang;
  var names = null;
  try { names = new Intl.DisplayNames([I18N.lang], { type: "language" }); } catch (e) { /* 出さない */ }
  var chosen = "";
  var timer = null;
  var items = I18N.LANGS.map(function (l) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lang m3-state";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(l.code === current));
    b.dataset.lang = l.code;
    var radio = document.createElement("span");
    radio.className = "radio";
    radio.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.className = "lang__text";
    var name = document.createElement("span");
    name.className = "lang__name";
    name.lang = l.code;
    name.textContent = l.name;
    var sub = document.createElement("span");
    sub.className = "lang__sub";
    // 中国語は「簡体字・繁体字」で出す（zh-CN・zh-TW のままだと「中国語 (中国)」「中国語 (台湾)」になる）
    var local = names ? names.of({ "zh-CN": "zh-Hans", "zh-TW": "zh-Hant" }[l.code] || l.code) : "";
    if (local && local !== l.name) sub.textContent = local;
    text.append(name, sub);
    b.append(radio, text);
    if (l.code === current) {
      var now = document.createElement("span");
      now.className = "lang__now";
      now.textContent = t("使用中");
      b.appendChild(now);
    }
    b.addEventListener("click", function () { choose(l.code); });
    list.appendChild(b);
    return b;
  });

  function choose(code) {
    chosen = code;
    items.forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.lang === code)); });
    var text = TEXT[code];
    page.classList.add("is-switching");
    clearTimeout(timer);
    timer = setTimeout(function () {
      title.textContent = text.title;
      lead.textContent = text.desc;
      title.lang = lead.lang = next.lang = code;
      next.textContent = text.btn;
      page.classList.remove("is-switching");
      bottom.classList.add("is-shown");
    }, 150);
  }

  // ↑↓ で選ぶ（ラジオボタンのグループ）
  list.addEventListener("keydown", function (e) {
    var i = items.indexOf(document.activeElement);
    if (i < 0 || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    var n = items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
    n.focus();
    choose(n.dataset.lang);
  });

  next.addEventListener("click", function () {
    if (!chosen) return;
    if (chosen === I18N.lang && chosen === I18N.stored()) goBack();
    else I18N.setLang(chosen, back);
  });
})();
