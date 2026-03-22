/**
 * Coffee Note — 5-Pentagon Radar Chart
 * - 드래그 핸들로 강도 설정 (tasting)
 * - 읽기전용 미니 버전 (note-detail)
 * - 커뮤니티 비교 오버레이
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var AXES = ["아로마", "산미", "단맛", "바디감", "여운"];
  var N = 5;
  var COMMUNITY = { 아로마: 6.5, 산미: 6.0, 단맛: 5.8, 바디감: 5.5, 여운: 6.2 };
  var WARM = "#8C7355";

  /* ── 좌표 헬퍼 ── */
  function aFor(i, total) {
    return (Math.PI * 2 * i) / (total || N) - Math.PI / 2;
  }
  function pol(cx, cy, r, a) {
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function vToR(val, min, max) {
    return min + ((max - min) * (Math.max(1, Math.min(10, val)) - 1)) / 9;
  }
  function pts(cx, cy, rfn, n) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      var p = pol(cx, cy, rfn(i), aFor(i, n));
      arr.push(p[0] + "," + p[1]);
    }
    return arr.join(" ");
  }

  /* ══════════════════════════════════════
     Interactive Pentagon (tasting.html)
     ══════════════════════════════════════ */
  function createInteractive(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;

    var CX = 160, CY = 160, MAX_R = 120, MIN_R = 20;
    svgEl.setAttribute("viewBox", "0 0 320 320");

    var vals = [5, 5, 5, 5, 5];
    var showCommunity = false;
    var dragIdx = -1;
    var onChange = options.onChange || null;
    var onAxisClick = options.onAxisClick || null;

    function draw() {
      svgEl.innerHTML = "";

      // 가이드 다각형 (5단계)
      for (var ring = 1; ring <= 5; ring++) {
        var r = MIN_R + ((MAX_R - MIN_R) * ring) / 5;
        var pg = document.createElementNS(NS, "polygon");
        pg.setAttribute("points", pts(CX, CY, function () { return r; }, N));
        pg.setAttribute("fill", ring === 5 ? "rgba(140,115,85,0.02)" : "none");
        pg.setAttribute("stroke", "#E8E5E0");
        pg.setAttribute("stroke-width", "0.8");
        svgEl.appendChild(pg);
      }

      // 축 라인
      for (var i = 0; i < N; i++) {
        var ep = pol(CX, CY, MAX_R + 4, aFor(i));
        var ln = document.createElementNS(NS, "line");
        ln.setAttribute("x1", CX);
        ln.setAttribute("y1", CY);
        ln.setAttribute("x2", ep[0]);
        ln.setAttribute("y2", ep[1]);
        ln.setAttribute("stroke", "#E8E5E0");
        ln.setAttribute("stroke-width", "0.8");
        svgEl.appendChild(ln);
      }

      // 커뮤니티 비교 (옵션)
      if (showCommunity) {
        var cp = document.createElementNS(NS, "polygon");
        cp.setAttribute("points", pts(CX, CY, function (j) {
          return vToR(COMMUNITY[AXES[j]] || 5, MIN_R, MAX_R);
        }, N));
        cp.setAttribute("fill", "rgba(18,18,18,0.04)");
        cp.setAttribute("stroke", "#CCC");
        cp.setAttribute("stroke-width", "1.5");
        cp.setAttribute("stroke-dasharray", "6 4");
        cp.setAttribute("stroke-linejoin", "round");
        svgEl.appendChild(cp);
      }

      // 내 값 다각형
      var fp = document.createElementNS(NS, "polygon");
      fp.setAttribute("points", pts(CX, CY, function (j) {
        return vToR(vals[j], MIN_R, MAX_R);
      }, N));
      fp.setAttribute("fill", "rgba(140,115,85,0.08)");
      fp.setAttribute("stroke", WARM);
      fp.setAttribute("stroke-width", "2");
      fp.setAttribute("stroke-linejoin", "round");
      svgEl.appendChild(fp);

      // 핸들 + 값 라벨 + 축 이름
      for (var i = 0; i < N; i++) {
        var angle = aFor(i);
        var hr = vToR(vals[i], MIN_R, MAX_R);
        var hp = pol(CX, CY, hr, angle);

        // 값 라벨
        var vlp = pol(CX, CY, hr - 18, angle);
        var vt = document.createElementNS(NS, "text");
        vt.setAttribute("x", vlp[0]);
        vt.setAttribute("y", vlp[1]);
        vt.setAttribute("text-anchor", "middle");
        vt.setAttribute("dominant-baseline", "central");
        vt.setAttribute("font-size", "12");
        vt.setAttribute("font-weight", "600");
        vt.setAttribute("fill", WARM);
        vt.setAttribute("font-family", "'Pretendard Variable',sans-serif");
        vt.setAttribute("pointer-events", "none");
        vt.textContent = vals[i];
        svgEl.appendChild(vt);

        // 핸들
        var hc = document.createElementNS(NS, "circle");
        hc.setAttribute("cx", hp[0]);
        hc.setAttribute("cy", hp[1]);
        hc.setAttribute("r", "10");
        hc.setAttribute("fill", WARM);
        hc.setAttribute("stroke", "#fff");
        hc.setAttribute("stroke-width", "3");
        hc.setAttribute("cursor", "grab");
        hc.setAttribute("data-idx", i);
        svgEl.appendChild(hc);

        // 축 이름 라벨
        var nlp = pol(CX, CY, MAX_R + 22, angle);
        var nt = document.createElementNS(NS, "text");
        nt.setAttribute("x", nlp[0]);
        nt.setAttribute("y", nlp[1]);
        nt.setAttribute("text-anchor", "middle");
        nt.setAttribute("dominant-baseline", "central");
        nt.setAttribute("font-size", "12");
        nt.setAttribute("font-weight", "500");
        nt.setAttribute("fill", "#121212");
        nt.setAttribute("font-family", "'Pretendard Variable',sans-serif");
        nt.setAttribute("cursor", "pointer");
        nt.setAttribute("data-axis", AXES[i]);
        nt.textContent = AXES[i];
        if (onAxisClick) {
          (function (axis) {
            nt.addEventListener("click", function () { onAxisClick(axis); });
          })(AXES[i]);
        }
        svgEl.appendChild(nt);
      }
    }

    // 드래그 이벤트
    var container = svgEl.parentElement;

    function startDrag(e) {
      var pt = e.touches ? e.touches[0] : e;
      var rect = svgEl.getBoundingClientRect();
      var sx = ((pt.clientX - rect.left) / rect.width) * 320;
      var sy = ((pt.clientY - rect.top) / rect.height) * 320;
      var best = -1, bestD = 9999;
      for (var i = 0; i < N; i++) {
        var hp = pol(CX, CY, vToR(vals[i], MIN_R, MAX_R), aFor(i));
        var d = Math.hypot(sx - hp[0], sy - hp[1]);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (bestD < 30) {
        dragIdx = best;
        e.preventDefault();
      }
    }

    function moveDrag(e) {
      if (dragIdx < 0) return;
      e.preventDefault();
      var pt = e.touches ? e.touches[0] : e;
      var rect = svgEl.getBoundingClientRect();
      var sx = ((pt.clientX - rect.left) / rect.width) * 320;
      var sy = ((pt.clientY - rect.top) / rect.height) * 320;
      var angle = aFor(dragIdx);
      var dx = sx - CX, dy = sy - CY;
      var proj = dx * Math.cos(angle) + dy * Math.sin(angle);
      var v = Math.round(Math.max(1, Math.min(10, ((proj - MIN_R) / (MAX_R - MIN_R)) * 9 + 1)));
      if (vals[dragIdx] !== v) {
        vals[dragIdx] = v;
        draw();
        if (onChange) onChange(getValues());
      }
    }

    function endDrag() { dragIdx = -1; }

    container.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("mouseup", endDrag);
    container.addEventListener("touchstart", startDrag, { passive: false });
    container.addEventListener("touchmove", moveDrag, { passive: false });
    container.addEventListener("touchend", endDrag);

    function getValues() {
      var obj = {};
      AXES.forEach(function (a, i) { obj[a] = vals[i]; });
      return obj;
    }

    function setValues(obj) {
      AXES.forEach(function (a, i) {
        if (obj && obj[a] != null) vals[i] = Number(obj[a]) || 5;
      });
      draw();
    }

    function setShowCommunity(v) {
      showCommunity = !!v;
      draw();
    }

    draw();

    return {
      draw: draw,
      getValues: getValues,
      setValues: setValues,
      setShowCommunity: setShowCommunity,
    };
  }

  /* ══════════════════════════════════════
     Readonly Mini Pentagon (note-detail)
     ══════════════════════════════════════ */
  function createReadonly(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;

    var size = options.size || 200;
    var CX = size / 2, CY = size / 2;
    var MAX_R = size * 0.37, MIN_R = size * 0.06;
    svgEl.setAttribute("viewBox", "0 0 " + size + " " + size);

    var vals = options.values || {};
    var showCommunity = !!options.showCommunity;
    var onAxisClick = options.onAxisClick || null;

    function draw() {
      svgEl.innerHTML = "";

      // 가이드
      for (var ring = 1; ring <= 5; ring++) {
        var r = MIN_R + ((MAX_R - MIN_R) * ring) / 5;
        var pg = document.createElementNS(NS, "polygon");
        pg.setAttribute("points", pts(CX, CY, function () { return r; }, N));
        pg.setAttribute("fill", ring === 5 ? "rgba(140,115,85,0.02)" : "none");
        pg.setAttribute("stroke", "#E8E5E0");
        pg.setAttribute("stroke-width", "0.5");
        svgEl.appendChild(pg);
      }

      // 축
      for (var i = 0; i < N; i++) {
        var ep = pol(CX, CY, MAX_R + 2, aFor(i));
        var ln = document.createElementNS(NS, "line");
        ln.setAttribute("x1", CX);
        ln.setAttribute("y1", CY);
        ln.setAttribute("x2", ep[0]);
        ln.setAttribute("y2", ep[1]);
        ln.setAttribute("stroke", "#E8E5E0");
        ln.setAttribute("stroke-width", "0.5");
        svgEl.appendChild(ln);
      }

      // 커뮤니티
      if (showCommunity) {
        var cp = document.createElementNS(NS, "polygon");
        cp.setAttribute("points", pts(CX, CY, function (j) {
          return vToR(COMMUNITY[AXES[j]] || 5, MIN_R, MAX_R);
        }, N));
        cp.setAttribute("fill", "rgba(18,18,18,0.04)");
        cp.setAttribute("stroke", "#CCC");
        cp.setAttribute("stroke-width", "1");
        cp.setAttribute("stroke-dasharray", "4 3");
        cp.setAttribute("stroke-linejoin", "round");
        svgEl.appendChild(cp);
      }

      // 값 다각형
      var fp = document.createElementNS(NS, "polygon");
      fp.setAttribute("points", pts(CX, CY, function (j) {
        return vToR(vals[AXES[j]] || 5, MIN_R, MAX_R);
      }, N));
      fp.setAttribute("fill", "rgba(140,115,85,0.08)");
      fp.setAttribute("stroke", WARM);
      fp.setAttribute("stroke-width", "1.5");
      fp.setAttribute("stroke-linejoin", "round");
      svgEl.appendChild(fp);

      // 점 + 라벨
      for (var i = 0; i < N; i++) {
        var angle = aFor(i);
        var v = vals[AXES[i]] || 5;
        var hp = pol(CX, CY, vToR(v, MIN_R, MAX_R), angle);

        // 점
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("cx", hp[0]);
        dot.setAttribute("cy", hp[1]);
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", WARM);
        dot.setAttribute("stroke", "#fff");
        dot.setAttribute("stroke-width", "2");
        svgEl.appendChild(dot);

        // 축 라벨
        var nlp = pol(CX, CY, MAX_R + 16, angle);
        var nt = document.createElementNS(NS, "text");
        nt.setAttribute("x", nlp[0]);
        nt.setAttribute("y", nlp[1]);
        nt.setAttribute("text-anchor", "middle");
        nt.setAttribute("dominant-baseline", "central");
        nt.setAttribute("font-size", "10");
        nt.setAttribute("font-weight", "500");
        nt.setAttribute("fill", "#121212");
        nt.setAttribute("font-family", "'Pretendard Variable',sans-serif");
        if (onAxisClick) {
          nt.setAttribute("cursor", "pointer");
          (function (axis) {
            nt.addEventListener("click", function () { onAxisClick(axis); });
          })(AXES[i]);
        }
        nt.textContent = AXES[i] + " " + v;
        svgEl.appendChild(nt);
      }
    }

    draw();
    return { draw: draw };
  }

  /* ── Export ── */
  global.CoffeeRadar = {
    createInteractive: createInteractive,
    createReadonly: createReadonly,
    AXES: AXES,
  };
})(typeof window !== "undefined" ? window : globalThis);
