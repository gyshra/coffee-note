/**
 * src/pages/home.js
 * home.html 인라인 스크립트 → ES Module
 */

import { esc } from '../modules/utils.js';

(function () {
  var CN = window.CoffeeNote;
  CN.renderBottomNav("home");

  // 오늘 날짜
  var now = new Date();
  var days = ["일","월","화","수","목","금","토"];
  document.getElementById("todayDate").textContent =
    now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일 " + days[now.getDay()] + "요일";

  // ── 최근 원두 다시내리기 ───────────────────────────────
  var records = CN.getTastingRecords();
  var recentBeans = document.getElementById("recentBeans");
  if (recentBeans && records.length) {
    var coffees = CN.getCoffees();
    // coffeeIndex 기준으로 가장 최근 기록 1개씩
    var seen = {};
    var recentGroups = [];
    records.forEach(function (r) {
      var key = r.coffeeIndex != null ? String(r.coffeeIndex) : "unknown";
      if (!seen[key]) {
        seen[key] = true;
        recentGroups.push({ idx: r.coffeeIndex, name: r.coffeeName || "알 수 없는 원두", coffee: coffees[r.coffeeIndex] || null });
      }
    });
    recentGroups.slice(0, 3).forEach(function (g) {
      var row = document.createElement("div");
      row.className = "recent-bean-row";
      var method = "";
      var methodRecords = records.filter(function (r) { return r.coffeeIndex === g.idx; });
      if (methodRecords.length && methodRecords[0].brewMethod) method = " · " + methodRecords[0].brewMethod;
      row.innerHTML =
        '<div class="recent-bean-info">' +
        '<div class="recent-bean-name">' + esc(g.name) + '</div>' +
        '<div class="recent-bean-meta">' + esc(methodRecords.length + "회 추출" + method) + '</div>' +
        '</div>' +
        '<button class="recent-bean-rebrew">다시내리기</button>';
      row.querySelector(".recent-bean-rebrew").addEventListener("click", function () {
        location.href = "brew.html" + (g.idx != null ? "?coffeeId=" + g.idx : "");
      });
      recentBeans.appendChild(row);
    });
  }

  // ── 미니 커피카드 ─────────────────────────────────────
  var scroll = document.getElementById("cardsScroll");

  if (!records.length) {
    scroll.innerHTML =
      '<div class="empty-card" onclick="location.href=\'brew.html\'">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<span class="empty-card-label">첫 번째 커피를<br/>내려보세요</span></div>' +
      '<div class="empty-card" style="border-style:dotted;opacity:.5"></div>' +
      '<div class="empty-card" style="border-style:dotted;opacity:.3"></div>';
  } else {
    var html = records.slice(0, 10).map(function (r, i) {
      var color = CN.getDominantColor(r);
      var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "";
      var flavors = (r.flavorSelections || []).slice(0, 3);
      var starNum = r.starRating ? Number(r.starRating) : 0;
      var starLabel = starNum > 0 ? '★' + starNum.toFixed(1) : '';
      var coffeeId = r.coffeeIndex != null ? r.coffeeIndex : "";
      return '<div class="mini-card" data-coffeeId="' + esc(String(coffeeId)) + '">' +
        '<div class="mc-wheel-ring" style="border:8px solid ' + color + ';border-radius:50%"></div>' +
        '<div class="mc-content"><div class="mc-top"><div class="mc-date">' + esc(date) + '</div>' +
        (starLabel ? '<span class="mc-star-label">' + esc(starLabel) + '</span>' : '') +
        '</div>' +
        '<div class="mc-bottom"><div class="mc-flavors">' + flavors.map(function (f) { return '<div class="mc-fdot" style="background:' + (typeof f === 'object' ? (f.color || color) : color) + '"></div>'; }).join("") + '</div>' +
        '<div class="mc-name">' + esc(r.coffeeName) + '</div>' +
        '</div></div></div>';
    }).join("");
    html += '<div class="empty-card" onclick="location.href=\'brew.html\'" style="background:var(--bg)">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<span class="empty-card-label">내리기</span></div>';
    scroll.innerHTML = html;
    scroll.querySelectorAll("[data-coffeeId]").forEach(function (el) {
      el.addEventListener("click", function () {
        var cid = el.getAttribute("data-coffeeId");
        location.href = "brew.html" + (cid !== "" ? "?coffeeId=" + cid : "");
      });
    });
  }

  // 달력
  var calYear = now.getFullYear(), calMonth = now.getMonth();

  function renderCalendar() {
    var yr = calYear, mo = calMonth;
    document.getElementById("calMonthLabel").textContent = yr + "." + (mo < 9 ? "0" : "") + (mo + 1);
    var firstDay = new Date(yr, mo, 1).getDay();
    var daysInMonth = new Date(yr, mo + 1, 0).getDate();
    var today = (yr === now.getFullYear() && mo === now.getMonth()) ? now.getDate() : -1;

    var dayColors = {}, dayCount = 0;
    records.forEach(function (r) {
      if (!r.createdAt) return;
      var d = new Date(r.createdAt);
      if (d.getFullYear() === yr && d.getMonth() === mo) {
        dayColors[d.getDate()] = CN.getDominantColor(r);
        dayCount++;
      }
    });
    document.getElementById("calCupCount").textContent = dayCount ? dayCount + " cups" : "";

    var grid = document.getElementById("calGrid");
    var dayLabels = ["일","월","화","수","목","금","토"];
    var h = dayLabels.map(function (d) { return '<div class="cal-day-label">' + d + '</div>'; }).join("");
    for (var b = 0; b < firstDay; b++) h += '<div class="cal-cell empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var has = !!dayColors[d];
      var cls = "cal-cell" + (has ? " has-record" : "") + (d === today ? " today" : "");
      h += '<div class="' + cls + '"' + (has ? ' style="background:' + dayColors[d] + '"' : "") + '>' + d + '</div>';
    }
    grid.innerHTML = h;

    var dna = document.getElementById("calDna");
    if (!dayCount) { dna.innerHTML = ""; return; }
    var catCount = {};
    records.forEach(function (r) {
      if (!r.createdAt) return;
      var d = new Date(r.createdAt);
      if (d.getFullYear() !== yr || d.getMonth() !== mo) return;
      var sels = r.flavorSelections || [];
      sels.forEach(function (f) { var c = f.category || "Other"; catCount[c] = (catCount[c] || 0) + 1; });
    });
    var CAT_COLORS = { "Fruity":"#E83D51","Floral":"#E75480","Sweet":"#F19A38","Nutty/Cocoa":"#8B6A3E","Spices":"#A0522D","Roasted":"#7B5B3A","Green/Vegetative":"#5A9E6F","Sour/Fermented":"#E8A836","Other":"#7BAFB0" };
    var CAT_KO = { "Fruity":"과일","Floral":"꽃","Sweet":"단맛","Nutty/Cocoa":"견과","Spices":"향신료","Roasted":"로스팅","Green/Vegetative":"풀","Sour/Fermented":"산미","Other":"기타" };
    var total = 0; for (var c in catCount) total += catCount[c];
    if (!total) { dna.innerHTML = ""; return; }

    var sorted = Object.keys(catCount).sort(function (a, b) { return catCount[b] - catCount[a]; });
    var barHtml = '<div class="cal-dna-bar">' + sorted.map(function (c) {
      var pct = Math.round(catCount[c] / total * 100);
      return '<div class="cal-dna-seg" style="background:' + (CAT_COLORS[c] || "#999") + ';width:' + pct + '%"></div>';
    }).join("") + '</div>';
    var legHtml = '<div class="cal-dna-legend">' + sorted.slice(0, 4).map(function (c) {
      var pct = Math.round(catCount[c] / total * 100);
      return '<span class="cal-dna-item"><span class="cal-dna-dot" style="background:' + (CAT_COLORS[c] || "#999") + '"></span>' + (CAT_KO[c] || c) + ' ' + pct + '%</span>';
    }).join("") + '</div>';
    dna.innerHTML = barHtml + legHtml;
  }

  document.getElementById("calPrev").addEventListener("click", function () { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  document.getElementById("calNext").addEventListener("click", function () { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
  renderCalendar();
})();
