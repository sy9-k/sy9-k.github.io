// サポート（お知らせ・サポート記事）
// 記事は /support/articles.json。一覧は ?type=news|guide ・ #カテゴリ で絞り込み、記事は ?a=記事ID で開く。
(function () {
  "use strict";

  const root = document.querySelector("[data-help]");
  if (!root) return;

  const listView = root.querySelector("[data-help-list-view]");
  const listEl = root.querySelector("[data-help-list]");
  const countEl = root.querySelector("[data-help-count]");
  const catsEl = root.querySelector("[data-help-cats]");
  const articleEl = root.querySelector("[data-help-article]");
  const searchEl = document.querySelector("[data-help-search]");
  const typeBtns = [...root.querySelectorAll("[data-help-type]")];
  const heroEl = document.querySelector(".help-hero");
  const baseTitle = document.title;

  // 以前のページ内リンク（/support/#y-filter など）とカテゴリの対応
  const HASH_CATEGORY = { malu: "MALU", "y-filter": "Y-FILTER.", hub: "SK Hub Systems", account: "アカウント", lab: "SK's Lab", site: "このサイト", privacy: "情報と規約" };
  const CATEGORY_CLASS = { "MALU": "cat-malu", "Y-FILTER.": "cat-yf", "SK Hub Systems": "cat-hub", "アカウント": "cat-hub", "SK's Lab": "cat-lab", "このサイト": "cat-sk", "情報と規約": "cat-sk" };
  const TYPE_LABEL = { news: "お知らせ", guide: "サポート記事" };

  let articles = [];
  let categories = [];
  const state = { type: "", category: "", query: "" };

  const formatDate = (s) => { const [y, m, d] = s.split("-").map(Number); return `${y}年${m}月${d}日`; };

  // 文中の [文字](URL) をリンクにして、それ以外は文字として入れる
  function inline(parent, text) {
    const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement("a");
      a.href = m[2];
      a.textContent = m[1];
      if (/^https?:/.test(m[2])) { a.target = "_blank"; a.rel = "noopener"; }
      parent.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    return parent;
  }
  const el = (tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  };
  const articleUrl = (id) => `/support/?a=${encodeURIComponent(id)}`;
  const plainText = (a) => [a.title, a.summary, ...(a.body || []).map((b) => [b.p, b.h, b.note, ...(b.steps || []), ...(b.list || [])].filter(Boolean).join(" "))].join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").toLowerCase();

  function metaRow(a) {
    const meta = el("div", "help-meta");
    meta.appendChild(el("span", `help-type help-type--${a.type}`, TYPE_LABEL[a.type] || a.type));
    if (a.important) meta.appendChild(el("span", "news-tag", "重要"));
    meta.appendChild(el("span", `update-cat ${CATEGORY_CLASS[a.category] || ""}`, a.category));
    const time = el("time", null, formatDate(a.date));
    time.dateTime = a.date;
    meta.appendChild(time);
    return meta;
  }

  // ---------- 一覧 ----------
  function renderCats() {
    catsEl.replaceChildren(...["", ...categories].map((c) => {
      const b = el("button", null, c || "すべてのカテゴリ");
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.category === c));
      b.addEventListener("click", () => { state.category = c; syncUrl(); renderList(); });
      return b;
    }));
  }

  function renderList() {
    typeBtns.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.helpType === state.type)));
    renderCats();
    const q = state.query.trim().toLowerCase();
    let shown = articles.filter((a) =>
      (!state.type || a.type === state.type) &&
      (!state.category || a.category === state.category) &&
      (!q || plainText(a).includes(q)));
    // 重要なお知らせ → お知らせ → サポート記事の順に、それぞれ新しい順（同じ日はデータの順）
    const rank = (a) => (a.type === "news" ? (a.important ? 0 : 1) : 2);
    shown = shown.slice().sort((x, y) => (rank(x) - rank(y)) || y.date.localeCompare(x.date) || (x._i - y._i));

    countEl.textContent = q || state.type || state.category ? `${shown.length} 件の記事` : "";
    if (!shown.length) {
      const p = el("p", "faq-empty");
      inline(p, "見つかりませんでした。ほかの言葉で探すか、[お問い合わせ](/contact/) ください。");
      listEl.replaceChildren(p);
      return;
    }
    listEl.replaceChildren(...shown.map((a) => {
      const card = el("a", `help-card${a.type === "news" ? " help-card--news" : ""}${a.important ? " help-card--important" : ""}`);
      card.href = articleUrl(a.id);
      card.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openArticle(a.id, true);
      });
      card.append(metaRow(a), el("h2", null, a.title), el("p", null, a.summary || ""));
      return card;
    }));
  }

  // ---------- 記事 ----------
  function openArticle(id, push) {
    const a = articles.find((x) => x.id === id);
    if (!a) { showList(push); return; }
    if (push) history.pushState({ a: id }, "", articleUrl(id));

    const back = el("a", "help-back", "記事の一覧へ");
    back.href = "/support/";
    back.addEventListener("click", (e) => { e.preventDefault(); showList(true); });
    const crumbs = el("div", "help-crumbs");
    crumbs.append(back);

    const body = el("div", "help-body");
    (a.body || []).forEach((b) => {
      if (b.h) body.appendChild(el("h3", null, b.h));
      if (b.p) body.appendChild(inline(el("p"), b.p));
      if (b.note) body.appendChild(inline(el("p", "help-note"), b.note));
      if (b.steps) { const ol = el("ol", "help-steps"); b.steps.forEach((s) => ol.appendChild(inline(el("li"), s))); body.appendChild(ol); }
      if (b.list) { const ul = el("ul", "help-bullets"); b.list.forEach((s) => ul.appendChild(inline(el("li"), s))); body.appendChild(ul); }
    });

    // 同じカテゴリの記事
    const related = articles.filter((x) => x.id !== a.id && x.category === a.category).slice(0, 4);
    const nodes = [crumbs, metaRow(a), el("h1", null, a.title), body];
    if (related.length) {
      const box = el("div", "help-related");
      box.appendChild(el("h2", null, `${a.category} の記事`));
      const ul = el("ul");
      related.forEach((r) => {
        const li = el("li");
        const link = el("a", null, r.title);
        link.href = articleUrl(r.id);
        link.addEventListener("click", (e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openArticle(r.id, true); });
        li.appendChild(link);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      nodes.push(box);
    }
    const help = el("div", "help-solved");
    inline(help, "解決しないときは、下のサポートIDを添えて [お問い合わせ](/contact/) ください。");
    nodes.push(help);

    articleEl.replaceChildren(...nodes);
    articleEl.hidden = false;
    listView.hidden = true;
    if (heroEl) heroEl.hidden = true;
    document.title = `${a.title} | サポート | SK`;
    window.scrollTo({ top: 0 });
  }

  function showList(push) {
    articleEl.hidden = true;
    listView.hidden = false;
    if (heroEl) heroEl.hidden = false;
    document.title = baseTitle;
    if (push) syncUrl(true);
    renderList();
  }

  // 一覧の絞り込みを URL に反映する（?type=news など）
  function syncUrl(push) {
    const params = new URLSearchParams();
    if (state.type) params.set("type", state.type);
    const url = `/support/${params.toString() ? `?${params}` : ""}${state.category ? `#${Object.keys(HASH_CATEGORY).find((k) => HASH_CATEGORY[k] === state.category) || ""}` : ""}`;
    if (push) history.pushState({}, "", url); else history.replaceState({}, "", url);
  }

  function route() {
    const params = new URLSearchParams(location.search);
    const id = params.get("a");
    state.type = ["news", "guide"].includes(params.get("type")) ? params.get("type") : "";
    state.category = HASH_CATEGORY[location.hash.slice(1)] || "";
    if (id) openArticle(id, false); else showList(false);
  }

  typeBtns.forEach((b) => b.addEventListener("click", () => { state.type = b.dataset.helpType; syncUrl(); renderList(); }));
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      state.query = searchEl.value;
      if (!listView.hidden) renderList(); else { showList(true); }
    });
  }
  window.addEventListener("popstate", route);

  fetch("/support/articles.json", { cache: "no-cache" })
    .then((res) => res.json())
    .then((data) => {
      articles = (data.articles || []).map((a, i) => ({ ...a, _i: i }));
      categories = data.categories || [...new Set(articles.map((a) => a.category))];
      route();
    })
    .catch(() => {
      listEl.innerHTML = "<p class=\"faq-empty\">記事を読み込めませんでした。時間をおいて再度お試しください。</p>";
    });
})();
