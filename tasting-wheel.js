/**
 * Coffee Note — 2-Stage SCA Flavor Wheel (Redraw approach)
 * Stage 1: 대분류 + 중분류 (회전 가능)
 * Stage 2: 중분류 탭 → 소분류를 큰 원형으로 새로 그림 (스케일 없음!)
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var SCA = (global.CoffeeNote && global.CoffeeNote.SCA_WHEEL) || [];

  var CAT_COLORS = {
    Fruity: "#E24B4A", Floral: "#D4537E", Sweet: "#EF9F27",
    "Nutty/Cocoa": "#854F0B", Spices: "#993C1D", Roasted: "#5F5E5A",
    "Green/Vegetative": "#639922", "Sour/Fermented": "#D85A30", Other: "#888888",
  };

  var CX = 200, CY = 200;
  var R1_IN = 42, R1_OUT = 100;
  var R2_IN = 104, R2_OUT = 192;
  var APPLE_EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";

  var state = {
    rotation: 0, velocity: 0, dragging: false,
    startAngle: 0, lastAngle: 0, lastTime: 0,
    zoomed: false, zoomedCatIdx: -1, zoomedSubIdx: -1,
    selectedFlavors: [],
    onSelectionChange: null,
    rafId: 0, tapStart: null,
  };

  var svgEl, wheelGroup, detailGroup, backBtn, viewport;
  var wheelLayout = null;

  /* ── SVG Helpers ── */
  function arc(cx, cy, rIn, rOut, sa, ea) {
    var gap = 0.008; sa += gap; ea -= gap;
    if (ea <= sa) ea = sa + 0.001;
    var c1 = Math.cos(sa), s1 = Math.sin(sa), c2 = Math.cos(ea), s2 = Math.sin(ea);
    var lg = ea - sa > Math.PI ? 1 : 0;
    return "M"+(cx+rOut*c1)+","+(cy+rOut*s1)+" A"+rOut+","+rOut+" 0 "+lg+" 1 "+(cx+rOut*c2)+","+(cy+rOut*s2)+
      " L"+(cx+rIn*c2)+","+(cy+rIn*s2)+" A"+rIn+","+rIn+" 0 "+lg+" 0 "+(cx+rIn*c1)+","+(cy+rIn*s1)+" Z";
  }

  function mid(sa, ea) { return (sa + ea) / 2; }
  function tpos(cx, cy, r, a) { return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }

  function mkPath(d, fill, opacity, extra) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", fill);
    p.setAttribute("opacity", String(opacity));
    p.setAttribute("stroke", "#fff"); p.setAttribute("stroke-width", "0.8");
    if (extra) for (var k in extra) p.setAttribute(k, extra[k]);
    return p;
  }

  function mkText(x, y, txt, size, weight, fill, angleDeg) {
    var t = document.createElementNS(NS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("font-size", String(size));
    t.setAttribute("font-weight", String(weight));
    t.setAttribute("fill", fill);
    t.setAttribute("font-family", "'Pretendard Variable', sans-serif");
    t.setAttribute("pointer-events", "none");
    var rot = angleDeg;
    if (rot > 90 && rot < 270) rot += 180;
    t.setAttribute("transform", "rotate(" + rot + "," + x + "," + y + ")");
    t.textContent = txt;
    return t;
  }

  /* ── Layout ── */
  function computeLayout() {
    var totalSubs = 0;
    SCA.forEach(function (c) { totalSubs += c.subs.length; });
    var anglePerSub = (Math.PI * 2) / totalSubs;
    var layout = [], cursor = -Math.PI / 2;
    SCA.forEach(function (cat, ci) {
      var catStart = cursor, catColor = CAT_COLORS[cat.category] || "#888", subs = [];
      cat.subs.forEach(function (sub, si) {
        var subStart = cursor, subEnd = cursor + anglePerSub;
        subs.push({ name: sub.nameKo, nameEn: sub.name, startAngle: subStart, endAngle: subEnd, items: sub.items, catIdx: ci, subIdx: si });
        cursor = subEnd;
      });
      layout.push({ category: cat.category, categoryKo: cat.categoryKo, color: catColor, startAngle: catStart, endAngle: cursor, subs: subs, catIdx: ci });
    });
    return layout;
  }

  /* ══════════════════════════════════════
     Stage 1: 대분류 + 중분류
     ══════════════════════════════════════ */
  function renderStage1() {
    if (!wheelLayout) wheelLayout = computeLayout();
    wheelGroup.innerHTML = "";

    // 중앙 원
    var cc = document.createElementNS(NS, "circle");
    cc.setAttribute("cx", CX); cc.setAttribute("cy", CY); cc.setAttribute("r", R1_IN - 2);
    cc.setAttribute("fill", "#F4F3F0"); cc.setAttribute("stroke", "#E0E0E0"); cc.setAttribute("stroke-width", "0.5");
    wheelGroup.appendChild(cc);

    var ct = mkText(CX, CY, "SCA", 9, 600, "#888", 0);
    ct.setAttribute("transform", "rotate(0)");
    wheelGroup.appendChild(ct);

    wheelLayout.forEach(function (cat) {
      var catPath = mkPath(arc(CX, CY, R1_IN, R1_OUT, cat.startAngle, cat.endAngle), cat.color, 0.3);
      wheelGroup.appendChild(catPath);

      var catMid = mid(cat.startAngle, cat.endAngle);
      var catR = (R1_IN + R1_OUT) / 2;
      var cp = tpos(CX, CY, catR, catMid);
      wheelGroup.appendChild(mkText(cp.x, cp.y, cat.categoryKo, 11, 600, "#fff", catMid * 180 / Math.PI));

      cat.subs.forEach(function (sub) {
        var subPath = mkPath(arc(CX, CY, R2_IN, R2_OUT, sub.startAngle, sub.endAngle), cat.color, 0.55, { cursor: "pointer" });
        subPath.addEventListener("click", function () { handleSubTap(sub.catIdx, sub.subIdx); });
        wheelGroup.appendChild(subPath);

        var subMid = mid(sub.startAngle, sub.endAngle);
        var sp = tpos(CX, CY, (R2_IN + R2_OUT) / 2, subMid);
        var st = mkText(sp.x, sp.y, sub.name, 10, 500, "#fff", subMid * 180 / Math.PI);
        st.setAttribute("pointer-events", "none");
        wheelGroup.appendChild(st);
      });
    });
  }

  /* ══════════════════════════════════════
     Stage 2: 소분류를 새 원형으로 그림 (스케일 없음!)
     ══════════════════════════════════════ */
  function handleSubTap(catIdx, subIdx) {
    if (state.zoomed || state.dragging) return;

    var cat = wheelLayout[catIdx];
    var sub = cat.subs[subIdx];
    state.zoomed = true;
    state.zoomedCatIdx = catIdx;
    state.zoomedSubIdx = subIdx;

    // Stage 1 fade out
    wheelGroup.style.transition = "opacity 0.3s ease";
    wheelGroup.style.opacity = "0";
    wheelGroup.style.pointerEvents = "none";

    // Stage 2: 소분류를 별도 그룹에 큰 원형으로 그림
    setTimeout(function () {
      renderDetailWheel(cat, sub);
      backBtn.classList.add("visible");
    }, 250);
  }

  function renderDetailWheel(cat, sub) {
    if (detailGroup) detailGroup.remove();
    detailGroup = document.createElementNS(NS, "g");
    detailGroup.setAttribute("class", "wheel-detail-group");
    svgEl.appendChild(detailGroup);

    var items = sub.items;
    var n = items.length;
    var anglePerItem = (Math.PI * 2) / Math.max(n, 1);

    // 중앙: 카테고리 + 서브 라벨
    var cc = document.createElementNS(NS, "circle");
    cc.setAttribute("cx", CX); cc.setAttribute("cy", CY); cc.setAttribute("r", 50);
    cc.setAttribute("fill", "#F4F3F0"); cc.setAttribute("stroke", cat.color); cc.setAttribute("stroke-width", "2");
    cc.setAttribute("cursor", "pointer");
    cc.addEventListener("click", function () { zoomOut(); });
    detailGroup.appendChild(cc);

    var labelLine1 = mkText(CX, CY - 8, cat.categoryKo, 12, 600, cat.color, 0);
    labelLine1.setAttribute("transform", "rotate(0)");
    detailGroup.appendChild(labelLine1);
    var labelLine2 = mkText(CX, CY + 10, sub.name, 10, 400, "#888", 0);
    labelLine2.setAttribute("transform", "rotate(0)");
    detailGroup.appendChild(labelLine2);

    // 소분류 아이템들 — 넓은 부채꼴로
    var R_IN = 56, R_OUT = 190;

    items.forEach(function (item, i) {
      var sa = -Math.PI / 2 + anglePerItem * i;
      var ea = -Math.PI / 2 + anglePerItem * (i + 1);
      var isSel = isFlavorSelected(item.en);

      var ip = mkPath(arc(CX, CY, R_IN, R_OUT, sa, ea), item.color || cat.color, isSel ? 1 : 0.7, {
        cursor: "pointer",
        "data-type": "item",
        "data-en": item.en,
        "data-ko": item.ko,
      });
      if (isSel) { ip.setAttribute("stroke", "#fff"); ip.setAttribute("stroke-width", "3"); }

      ip.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleFlavor(item, cat, sub);
        refreshDetail(cat, sub);
      });
      detailGroup.appendChild(ip);

      // 텍스트 — 큰 사이즈!
      var itemMid = mid(sa, ea);
      var itemR = (R_IN + R_OUT) / 2;
      var tp = tpos(CX, CY, itemR, itemMid);
      var deg = itemMid * 180 / Math.PI;
      var txt = mkText(tp.x, tp.y, item.ko, 13, 600, "#fff", deg);
      detailGroup.appendChild(txt);

      // 선택 표시: 체크마크
      if (isSel) {
        var checkPos = tpos(CX, CY, R_OUT - 16, itemMid);
        var chk = mkText(checkPos.x, checkPos.y, "✓", 11, 700, "#fff", 0);
        chk.setAttribute("transform", "rotate(0)");
        chk.setAttribute("class", "sel-check");
        detailGroup.appendChild(chk);
      }
    });

    // Fade in
    detailGroup.style.opacity = "0";
    detailGroup.style.transition = "opacity 0.35s " + APPLE_EASE;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        detailGroup.style.opacity = "1";
      });
    });
  }

  function refreshDetail(cat, sub) {
    // 간단히 리드로우
    renderDetailWheel(cat, sub);
    detailGroup.style.opacity = "1";
  }

  /* ══════════════════════════════════════
     Stage 2 → Stage 1 (줌 아웃)
     ══════════════════════════════════════ */
  function zoomOut() {
    if (!state.zoomed) return;

    // Detail fade out
    if (detailGroup) {
      detailGroup.style.transition = "opacity 0.25s ease";
      detailGroup.style.opacity = "0";
      setTimeout(function () {
        if (detailGroup && detailGroup.parentNode) detailGroup.parentNode.removeChild(detailGroup);
        detailGroup = null;
      }, 260);
    }

    backBtn.classList.remove("visible");

    // Stage 1 fade in
    setTimeout(function () {
      wheelGroup.style.transition = "opacity 0.35s " + APPLE_EASE;
      wheelGroup.style.opacity = "1";
      wheelGroup.style.pointerEvents = "";
    }, 200);

    setTimeout(function () {
      state.zoomed = false;
      state.zoomedCatIdx = -1;
      state.zoomedSubIdx = -1;
    }, 500);
  }

  /* ── 향미 선택/해제 ── */
  function isFlavorSelected(en) {
    return state.selectedFlavors.some(function (f) { return f.en === en; });
  }

  function toggleFlavor(item, cat, sub) {
    var idx = -1;
    state.selectedFlavors.forEach(function (f, i) { if (f.en === item.en) idx = i; });
    if (idx >= 0) {
      state.selectedFlavors.splice(idx, 1);
    } else {
      if (state.selectedFlavors.length >= 8) {
        if (global.CoffeeNote) global.CoffeeNote.showToast("최대 8개까지 선택 가능합니다");
        return;
      }
      state.selectedFlavors.push({
        en: item.en, ko: item.ko,
        category: cat.category, sub: sub.nameEn,
        color: item.color || cat.color,
      });
    }
    renderTags();
    if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors);
  }

  function removeFlavorByEn(en) {
    state.selectedFlavors = state.selectedFlavors.filter(function (f) { return f.en !== en; });
    renderTags();
    if (state.onSelectionChange) state.onSelectionChange(state.selectedFlavors);
  }

  /* ── Tags ── */
  function renderTags() {
    var container = document.getElementById("selectedFlavors");
    if (!container) return;
    if (!state.selectedFlavors.length) {
      container.innerHTML = '<p class="empty-flavors" id="emptyFlavorsMsg">휠에서 향미를 탭하여 선택하세요</p>';
      return;
    }
    container.innerHTML = state.selectedFlavors.map(function (f) {
      return '<div class="flavor-tag" data-en="' + f.en + '">' +
        '<span class="flavor-color" style="background:' + f.color + '"></span>' + f.ko +
        '<button class="flavor-remove" data-remove="' + f.en + '">&times;</button></div>';
    }).join("");
    container.querySelectorAll(".flavor-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeFlavorByEn(btn.getAttribute("data-remove"));
      });
    });
  }

  /* ── 회전 (Stage 1만) ── */
  function getAngle(cx, cy) {
    var rect = svgEl.getBoundingClientRect();
    return Math.atan2(cy - rect.top - rect.height / 2, cx - rect.left - rect.width / 2) * (180 / Math.PI);
  }

  function onDown(e) {
    if (state.zoomed) return;
    var pt = e.touches ? e.touches[0] : e;
    state.dragging = true;
    state.startAngle = getAngle(pt.clientX, pt.clientY) - state.rotation;
    state.lastAngle = getAngle(pt.clientX, pt.clientY);
    state.lastTime = Date.now();
    state.velocity = 0;
    state.tapStart = { x: pt.clientX, y: pt.clientY, time: Date.now() };
    viewport.classList.add("grabbing");
    cancelAnimationFrame(state.rafId);
  }

  function onMove(e) {
    if (!state.dragging || state.zoomed) return;
    e.preventDefault();
    var pt = e.touches ? e.touches[0] : e;
    var angle = getAngle(pt.clientX, pt.clientY);
    var now = Date.now();
    state.velocity = (angle - state.lastAngle) / Math.max(1, now - state.lastTime) * 16;
    state.lastAngle = angle;
    state.lastTime = now;
    state.rotation = angle - state.startAngle;
    wheelGroup.setAttribute("transform", "rotate(" + state.rotation + "," + CX + "," + CY + ")");
  }

  function onUp(e) {
    if (!state.dragging) return;
    state.dragging = false;
    viewport.classList.remove("grabbing");
    if (state.tapStart) {
      var pt = e.changedTouches ? e.changedTouches[0] : e;
      var dx = pt.clientX - state.tapStart.x, dy = pt.clientY - state.tapStart.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - state.tapStart.time < 300) {
        state.tapStart = null; return;
      }
    }
    state.tapStart = null;
    doInertia();
  }

  function doInertia() {
    if (Math.abs(state.velocity) < 0.05) return;
    state.velocity *= 0.96;
    state.rotation += state.velocity;
    wheelGroup.setAttribute("transform", "rotate(" + state.rotation + "," + CX + "," + CY + ")");
    state.rafId = requestAnimationFrame(doInertia);
  }

  /* ── Init ── */
  function init(options) {
    svgEl = document.getElementById(options.svgId || "wheelSvg");
    viewport = document.getElementById(options.viewportId || "wheelViewport");
    if (!svgEl || !viewport) return;

    svgEl.setAttribute("viewBox", "0 0 400 400");

    wheelGroup = document.createElementNS(NS, "g");
    wheelGroup.setAttribute("class", "wheel-group");
    svgEl.appendChild(wheelGroup);

    backBtn = document.createElement("button");
    backBtn.className = "wheel-back-btn";
    backBtn.type = "button";
    backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
    backBtn.addEventListener("click", zoomOut);
    viewport.appendChild(backBtn);

    wheelLayout = computeLayout();
    renderStage1();

    viewport.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    viewport.addEventListener("touchstart", onDown, { passive: false });
    viewport.addEventListener("touchmove", onMove, { passive: false });
    viewport.addEventListener("touchend", onUp);

    state.onSelectionChange = options.onSelectionChange || null;
    renderTags();
  }

  global.CoffeeWheel = {
    init: init,
    getSelectedFlavors: function () { return state.selectedFlavors.slice(); },
    setSelectedFlavors: function (arr) { state.selectedFlavors = (arr || []).slice(); renderTags(); },
    zoomOut: zoomOut,
  };
})(typeof window !== "undefined" ? window : globalThis);
