// SK Hub Systems の紹介ページ（/sk-hub-systems/）の動き
//   ・data-reveal のついたものを、画面に入ったときに浮かび上がらせる
//   ・「ひとつの基盤が、…」の文を、スクロールに合わせて 1 つずつ光らせる
//   ・数字を 0 から数え上げる
//   ・「しくみ」の図を、いま読んでいる手順に合わせて変える
//   ・上の帯（ローカルナビ）で、いま見ている場所を示す
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  document.documentElement.classList.add("hx-js");

  // ---------- 浮かび上がる ----------
  var reveals = document.querySelectorAll("[data-reveal]");
  if (!hasIO || reduced) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // ---------- 文を 1 つずつ光らせる ----------
  var statement = document.querySelector("[data-hx-statement]");
  var parts = statement ? statement.querySelectorAll("span") : [];
  function lightStatement() {
    var line = window.innerHeight * 0.66;
    parts.forEach(function (s) {
      s.classList.toggle("is-lit", reduced || s.getBoundingClientRect().top < line);
    });
  }

  // ---------- 数え上げ ----------
  function countUp(el) {
    var to = parseInt(el.textContent, 10);
    if (!to || reduced) return;
    var start = null;
    var dur = 1200;
    el.textContent = "0";
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (hasIO) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });
  }

  // ---------- しくみの図 ----------
  var flow = document.querySelector("[data-hx-flow]");
  var steps = document.querySelectorAll(".hx-step");
  function setStep(n) {
    if (!flow) return;
    flow.dataset.step = n;
    steps.forEach(function (s) { s.classList.toggle("is-active", s.dataset.step === n); });
  }
  if (flow && steps.length) {
    setStep("1");
    if (hasIO) {
      // 画面のまん中あたりを通った手順を、いまの手順にする
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setStep(e.target.dataset.step); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach(function (s) { sio.observe(s); });
    } else {
      steps.forEach(function (s) { s.classList.add("is-active"); });
    }
  }

  // ---------- ローカルナビ ----------
  var navLinks = document.querySelectorAll(".hx-localnav-links a");
  var sections = [];
  navLinks.forEach(function (a) {
    var el = document.querySelector(a.getAttribute("href"));
    if (el) sections.push([a, el]);
  });
  function markNav() {
    var current = null;
    sections.forEach(function (pair) {
      if (pair[1].getBoundingClientRect().top < window.innerHeight * 0.4) current = pair[0];
    });
    navLinks.forEach(function (a) {
      if (a === current) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      lightStatement();
      markNav();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
