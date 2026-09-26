// 言語を選ぶページ（/lang/?next=戻り先）。選んだ言語は localStorage の sk_lang に保存し、戻り先の同じ言語のページへ移る
(function () {
  "use strict";

  const card = document.querySelector("[data-lang-card]");
  if (!card || !window.SKI18N) return;
  const title = card.querySelector("[data-lang-title]");
  const desc = card.querySelector("[data-lang-desc]");
  const globe = card.querySelector("[data-lang-globe]");
  const next = card.querySelector("[data-lang-continue]");
  const items = [...card.querySelectorAll("[data-lang]")];

  // 選んだ言語で、確かめの文を出す
  const TEXT = {
    ja: { title: "言語", desc: "日本語でよろしいですか？", btn: "続行" },
    en: { title: "Language", desc: "Is English correct?", btn: "Continue" },
    "zh-CN": { title: "语言", desc: "确定使用简体中文吗？", btn: "继续" },
    "zh-TW": { title: "語言", desc: "確定使用繁體中文嗎？", btn: "繼續" },
    ko: { title: "언어", desc: "한국어로 설정할까요?", btn: "계속" }
  };

  // 戻り先（このサイトの中だけ）
  const raw = new URLSearchParams(location.search).get("next") || "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

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
      title.lang = desc.lang = next.lang = code;
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
