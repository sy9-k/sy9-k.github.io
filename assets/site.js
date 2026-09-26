// SK — サイト共通スクリプト（ヘッダーメニュー・お問い合わせフォーム・サポートID）
(function () {
  "use strict";

  // お問い合わせ用 Google フォームの URL。空のあいだはボタンが「準備中」になります。
  const CONTACT_FORM_URL = "";

  const UUID_KEY = "skhub_uuid"; // frameworks/check.js の CONFIG.UUID_KEY と同じ

  // ---------- ヘッダーメニュー（search3958 の headerv2 と同じ動き） ----------
  // PC: 項目にマウスを乗せると白いパネルが下に開く。スマホ: 2 本線ボタン → 一覧 → 項目を選ぶとロゴが「戻る」になる。
  const MENUS = {
    products: {
      title: "プロダクト",
      items: [
        ["プロダクト一覧", "/#products"],
        ["Y-FILTER.", "/products/y-filter/"],
        ["MALU", "/products/malu/"],
        ["SK's Lab", "/lab/"]
      ]
    },
    support: {
      title: "サポートと情報",
      items: [
        ["サポート", "/support/"],
        ["私のGitHub", "https://github.com/sy9-k"],
        ["お問い合わせ", "/contact/"],
        ["利用規約とプライバシーポリシー", "/policies/"],
        ["システム稼働状況", "/status/"],
        ["Link & Credit", "/credits/"]
      ]
    }
  };
  const MOBILE_BREAKPOINT = 680;

  const header = document.querySelector(".site-header");
  const menu = document.getElementById("hd-menu");
  const backdrop = document.getElementById("hd-backdrop");

  if (header && menu && backdrop) {
    const inner = menu.querySelector(".hd-menu-inner");
    const content = menu.querySelector(".hd-menu-content");
    const menuBtn = header.querySelector(".hd-menu-btn");
    const logo = header.querySelector(".hd-logo");
    const headerItems = Array.from(header.children);
    const navItems = headerItems.filter(el => el.matches("a.hd-item"));
    const triggers = navItems.filter(el => el.dataset.menu);

    let activeType = null;
    let mobileLevel = "root";
    let closeTimer = null;
    let switchTimer = null;

    const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
    const fitHeight = () => { menu.style.height = `${inner.scrollHeight + 52}px`; };
    const setExpanded = active => triggers.forEach(t => t.setAttribute("aria-expanded", String(t === active)));

    function makeList(entries) {
      const list = document.createElement("ul");
      list.className = "hd-menu-list";
      entries.forEach(([label, href, onClick], i) => {
        const li = document.createElement("li");
        li.style.setProperty("--i", String(i));
        const a = document.createElement("a");
        a.className = "hd-menu-link";
        a.href = href;
        a.textContent = label;
        if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
        if (onClick) a.addEventListener("click", onClick);
        li.appendChild(a);
        list.appendChild(li);
      });
      return list;
    }

    function renderMenu(type) {
      const data = MENUS[type];
      const title = document.createElement("div");
      title.className = "hd-menu-title";
      title.textContent = data.title;
      content.replaceChildren(title, makeList(data.items));
    }

    function renderMobileRoot() {
      content.replaceChildren(makeList(navItems.map(item => {
        const type = item.dataset.menu;
        if (!type) return [item.textContent.trim(), item.getAttribute("href")];
        return [item.textContent.trim(), "#", e => { e.preventDefault(); openMobileSubmenu(type); }];
      })));
    }

    // 中身を入れ替えるときは一度フェードしてから高さを合わせ直す
    function swapContent(render) {
      clearTimeout(switchTimer);
      content.classList.add("is-fading");
      switchTimer = setTimeout(() => {
        render();
        fitHeight();
        requestAnimationFrame(() => content.classList.remove("is-fading"));
      }, 180);
    }

    function showPanel() {
      menu.classList.add("is-open");
      backdrop.classList.add("is-open");
      fitHeight();
    }

    function setMobileState(open, submenu) {
      if (menuBtn) {
        menuBtn.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "閉じる" : "メニュー");
      }
      logo.classList.toggle("is-back", submenu);
      logo.setAttribute("aria-label", submenu ? "戻る" : "ホーム");
    }

    function openMenu(type, trigger) {
      if (isMobile() || !MENUS[type]) return;
      clearTimeout(closeTimer);
      setExpanded(trigger);
      if (activeType === type) return;
      if (activeType === null) {
        renderMenu(type);
        activeType = type;
        showPanel();
      } else {
        activeType = type;
        swapContent(() => renderMenu(type));
      }
    }

    function closeMenu() {
      clearTimeout(closeTimer);
      clearTimeout(switchTimer);
      activeType = null;
      mobileLevel = "root";
      setExpanded(null);
      menu.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      menu.style.height = "0px";
      content.classList.remove("is-fading");
      setMobileState(false, false);
    }

    function scheduleClose() {
      if (isMobile()) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        const hovering = headerItems.some(el => el.matches(":hover")) || menu.matches(":hover");
        if (!hovering) closeMenu();
      }, 80);
    }

    function openMobileRoot() {
      renderMobileRoot();
      activeType = null;
      mobileLevel = "root";
      showPanel();
      setMobileState(true, false);
    }

    function openMobileSubmenu(type) {
      mobileLevel = "submenu";
      activeType = type;
      swapContent(() => renderMenu(type));
      setMobileState(true, true);
    }

    function backToMobileRoot() {
      mobileLevel = "root";
      activeType = null;
      swapContent(renderMobileRoot);
      setMobileState(true, false);
    }

    headerItems.forEach(item => {
      item.addEventListener("pointerenter", () => {
        if (isMobile()) return;
        clearTimeout(closeTimer);
        if (item.dataset.menu) openMenu(item.dataset.menu, item);
        else closeMenu();
      });
      item.addEventListener("pointerleave", scheduleClose);
    });

    triggers.forEach(trigger => {
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-controls", "hd-menu");
      // キーボード操作でも開けるように
      trigger.addEventListener("focus", () => openMenu(trigger.dataset.menu, trigger));
      if (trigger.dataset.noNavigation === "true") {
        trigger.addEventListener("click", e => {
          e.preventDefault();
          openMenu(trigger.dataset.menu, trigger);
        });
      }
    });

    // 何もないところにマウスが来たら閉じる
    header.addEventListener("pointermove", e => {
      if (!isMobile() && e.target === header) closeMenu();
    });
    menu.addEventListener("pointerenter", () => { if (!isMobile()) clearTimeout(closeTimer); });
    menu.addEventListener("pointerleave", scheduleClose);
    menu.addEventListener("focusout", e => {
      if (!isMobile() && !menu.contains(e.relatedTarget) && !header.contains(e.relatedTarget)) closeMenu();
    });
    backdrop.addEventListener("pointerenter", scheduleClose);
    backdrop.addEventListener("click", closeMenu);

    if (menuBtn) {
      menuBtn.addEventListener("click", e => {
        if (!isMobile()) return;
        e.preventDefault();
        if (menu.classList.contains("is-open")) closeMenu();
        else openMobileRoot();
      });
    }

    logo.addEventListener("click", e => {
      if (!isMobile() || mobileLevel !== "submenu" || !menu.classList.contains("is-open")) return;
      e.preventDefault();
      backToMobileRoot();
    });

    document.addEventListener("keydown", e => {
      if (e.key !== "Escape" || !menu.classList.contains("is-open")) return;
      const focusBack = triggers.find(t => t.getAttribute("aria-expanded") === "true") || menuBtn;
      closeMenu();
      if (focusBack && !isMobile()) focusBack.focus({ preventScroll: true });
    });

    let lastMobile = isMobile();
    window.addEventListener("resize", () => {
      if (isMobile() !== lastMobile) {
        lastMobile = isMobile();
        closeMenu();
      } else if (menu.classList.contains("is-open")) {
        fitHeight();
      }
    }, { passive: true });

    window.addEventListener("scroll", () => {
      if (menu.classList.contains("is-open") && !menu.contains(document.activeElement)) closeMenu();
    }, { passive: true });

    setMobileState(false, false);
  }

  // ---------- お問い合わせフォーム ----------
  document.querySelectorAll("[data-contact-form]").forEach(el => {
    if (CONTACT_FORM_URL) {
      el.href = CONTACT_FORM_URL;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.removeAttribute("href");
      el.setAttribute("aria-disabled", "true");
      el.textContent = "フォーム準備中";
    }
  });

  // ---------- サポートID ----------
  const idEls = document.querySelectorAll("[data-support-id]");
  const copyBtns = document.querySelectorAll("[data-copy-id]");

  function readId() {
    try { return localStorage.getItem(UUID_KEY) || ""; } catch (e) { return ""; }
  }

  function renderId() {
    const id = readId();
    idEls.forEach(el => { el.textContent = id || "まだ発行されていません（利用規約に同意すると発行されます）"; });
    copyBtns.forEach(btn => { btn.hidden = !id; });
  }

  copyBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = readId();
      if (!id) return;
      try {
        await navigator.clipboard.writeText(id);
        btn.textContent = "コピーしました";
      } catch (e) {
        btn.textContent = "コピーできませんでした";
      }
      setTimeout(() => { btn.textContent = "コピー"; }, 1800);
    });
  });

  if (idEls.length) {
    renderId();
    document.addEventListener("skhub:ready", renderId);
  }

  // ---------- 利用規約ページ ----------
  // 本文は /policies/docs/*.txt（Y-FILTER. の個別規約は拡張機能のリポジトリから systems/sync-console.mjs でコピーされる）
  const viewer = document.querySelector("[data-policy-viewer]");
  if (viewer) {
    const DOCS = {
      "sk-terms": "sk-terms.txt",
      "sk-privacy": "sk-privacy.txt",
      "y-filter": "y-filter.txt",
      "sk-hub-systems": "sk-hub-systems.txt",
      "newtab": "newtab.txt"
    };
    // 以前のページ内リンク
    const ALIASES = { terms: "sk-terms", privacy: "sk-privacy", products: "y-filter" };
    const links = document.querySelectorAll("[data-policy-link]");
    const layout = document.getElementById("policy-docs");
    let current = null;

    // URL をリンクにした段落を作る（本文は textContent で入れる）
    function paragraph(text, className) {
      const p = document.createElement("p");
      if (className) p.className = className;
      text.split(/(https?:\/\/[^\s）)」、。]+)/).forEach((part, i) => {
        if (i % 2 === 1) {
          const a = document.createElement("a");
          a.href = part;
          a.textContent = part;
          if (!part.startsWith(location.origin)) { a.target = "_blank"; a.rel = "noopener"; }
          p.appendChild(a);
        } else if (part) {
          p.appendChild(document.createTextNode(part));
        }
      });
      return p;
    }

    function render(text, file) {
      const nodes = [];
      let titled = false;
      text.split(/\r?\n/).forEach(raw => {
        const line = raw.trim();
        if (!line) return;
        if (!titled) {
          const h = document.createElement("h2");
          h.className = "doc-title";
          h.textContent = line;
          nodes.push(h);
          titled = true;
        } else if (/^制定日/.test(line)) {
          nodes.push(paragraph(line, "meta"));
        } else if (/^(第[一二三四五六七八九十]+条|附則)/.test(line)) {
          const h = document.createElement("h3");
          h.textContent = line;
          nodes.push(h);
        } else if (/^\([a-z]\)/.test(line)) {
          nodes.push(paragraph(line, "sub"));
        } else {
          nodes.push(paragraph(line));
        }
      });
      const raw = document.createElement("p");
      raw.className = "raw-link";
      const a = document.createElement("a");
      a.href = `/policies/docs/${file}`;
      a.textContent = "テキストファイルで見る";
      raw.appendChild(a);
      nodes.push(raw);
      viewer.replaceChildren(...nodes);
    }

    async function show(id, scroll) {
      if (current === id) return;
      current = id;
      links.forEach(l => l.classList.toggle("active", l.dataset.policyLink === id));
      viewer.setAttribute("aria-busy", "true");
      try {
        const res = await fetch(`/policies/docs/${DOCS[id]}`, { cache: "no-cache" });
        if (!res.ok) throw new Error(String(res.status));
        render(await res.text(), DOCS[id]);
      } catch (e) {
        viewer.replaceChildren(paragraph("規約を読み込めませんでした。時間をおいて再度お試しください。"));
        current = null;
      } finally {
        viewer.removeAttribute("aria-busy");
      }
      if (scroll && layout) layout.scrollIntoView({ block: "start" });
    }

    function route(scroll) {
      const hash = decodeURIComponent(location.hash.slice(1));
      const id = ALIASES[hash] || hash;
      if (DOCS[id]) show(id, scroll);
      else if (!current) show("sk-terms", false);
    }

    window.addEventListener("hashchange", () => route(true));
    route(!!location.hash);
  }
})();
