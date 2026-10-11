// 言語を選ぶページ（/lang/?next=戻り先）。選んだ言語は localStorage の sk_lang に保存し、戻り先の同じ言語のページへ移る
//   どこから開いたかは、<head> の小さなスクリプト（_build/build.py の EXTRA）が <html> に付けている
//     data-lang-from="toolbox|malu|nagi|lab" … 戻り先のアプリ
//     data-lang-app … アプリ（Toolbox・MALU・Nagi・SK's Lab・LINE の中・アプリとして入れたもの）から開いた。
//                     サイトのヘッダー・フッター・お知らせを隠し、上に戻るボタンとアプリの名前の帯を出す（/assets/site.css）
(function () {
  "use strict";

  const card = document.querySelector("[data-lang-card]");
  if (!card || !window.SKI18N) return;
  const root = document.documentElement;
  const title = card.querySelector("[data-lang-title]");
  const desc = card.querySelector("[data-lang-desc]");
  const note = card.querySelector("[data-lang-note]");
  const globe = card.querySelector("[data-lang-globe]");
  const next = card.querySelector("[data-lang-continue]");
  const items = [...card.querySelectorAll("[data-lang]")];
  const backs = [...document.querySelectorAll("[data-lang-back]")];

  // 選んだ言語で、確かめの文を出す
  const TEXT = {
    ja: { title: "言語", desc: "日本語でよろしいですか？", btn: "続行", back: "戻る", note: "SK のサイトとすべてのアプリの言語が変わります" },
    en: { title: "Language", desc: "Is English correct?", btn: "Continue", back: "Back", note: "Applies to the SK website and all SK apps" },
    "zh-CN": { title: "语言", desc: "确定使用简体中文吗？", btn: "继续", back: "返回", note: "将应用于 SK 网站和所有 SK 应用" },
    "zh-TW": { title: "語言", desc: "確定使用繁體中文嗎？", btn: "繼續", back: "返回", note: "將套用至 SK 網站與所有 SK 應用程式" },
    ko: { title: "언어", desc: "한국어로 설정할까요?", btn: "계속", back: "뒤로", note: "SK 웹사이트와 모든 SK 앱에 적용됩니다" }
  };

  // 開いていたアプリ（上の帯に出す）
  const APPS = {
    toolbox: { name: "SK's Toolbox", icon: "/toolbox/icon.svg" },
    malu: { name: "MALU", icon: "/dictionary/ico/icon-192.png" },
    nagi: { name: "Nagi", icon: "/nagi/ico/apple-touch-icon.png" },
    lab: { name: "SK's Lab", icon: "/assets/logo.svg" }
  };
  const inApp = root.hasAttribute("data-lang-app");
  const app = APPS[root.getAttribute("data-lang-from")];
  if (inApp && app) {
    document.querySelector("[data-lang-app-name]").textContent = app.name;
    document.querySelector("[data-lang-app-icon]").src = app.icon;
  }

  // 戻り先（このサイトの中だけ）
  const raw = new URLSearchParams(location.search).get("next") || "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  // 戻る: 戻り先から来たときは履歴を戻る（アプリの画面をそのまま戻す）。直接開いたときは戻り先へ
  function goBack() {
    let fromBack = false;
    try {
      const ref = new URL(document.referrer);
      fromBack = ref.origin === location.origin && ref.pathname === new URL(back, location.origin).pathname;
    } catch (e) { /* referrer がない */ }
    if (fromBack && history.length > 1) history.back();
    else location.replace(back);
  }
  const backLabel = (TEXT[window.SKI18N.lang] || TEXT.en).back;
  backs.forEach((a) => {
    a.href = back;
    if (a.getAttribute("aria-label")) a.setAttribute("aria-label", backLabel);
    else a.textContent = backLabel;
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      goBack();
    });
  });
  // アプリから開いたときは Esc でも戻る
  if (inApp) document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.defaultPrevented) goBack(); });

  let chosen = "";
  let timer = null;

  function choose(code) {
    chosen = code;
    items.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === code)));
    const text = TEXT[code];
    card.classList.add("is-switching");
    clearTimeout(timer);
    timer = setTimeout(() => {
      title.textContent = text.title;
      desc.textContent = text.desc;
      note.textContent = text.note;
      title.lang = desc.lang = note.lang = next.lang = code;
      next.textContent = text.btn;
      next.disabled = false;
      card.classList.remove("is-switching");
      card.classList.add("is-chosen");
    }, 220);
  }

  items.forEach((b) => b.addEventListener("click", () => choose(b.dataset.lang)));
  next.addEventListener("click", () => { if (chosen) window.SKI18N.setLang(chosen, back); });

  // いま使っている言語を選んだ状態から始める（選んだことがある人だけ）
  const current = window.SKI18N.stored();
  if (current && TEXT[current]) {
    items.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === current)));
  }
  globe.classList.add("is-in");
})();
