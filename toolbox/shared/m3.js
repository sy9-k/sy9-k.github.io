// SK's Toolbox の共通（マテリアルデザイン）: 押したところから広がる波紋
//   .m3-state の付いた要素を押すと、中に .ripple を足す（見た目は /toolbox/shared/m3.css）
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
})();
