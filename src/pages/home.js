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

  // 카메라/갤러리
  function handlePhoto(file) {
    if (!file) return;
    CN.openPhotoSearchSheet();
    setTimeout(function () {
      var galEl = document.getElementById("fileGallery");
      var camEl = document.getElementById("fileCamera");
      if (!galEl && !camEl) { return; }
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        var inputEl = galEl || camEl;
        inputEl.files = dt.files;
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (ex) {
        CN.showToast("이미지를 다시 선택해주세요.");
      }
    }, 200);
  }

  function showAnalyzing() {
    var ol = document.getElementById("aiOverlay");
    if (!ol) return;
    ol.innerHTML = '<div style="text-align:center;color:#fff"><div class="ai-spinner"></div><p style="font-size:18px;font-weight:600;margin-top:20px">이미지 분석 중...</p><p style="font-size:13px;opacity:.5;margin-top:8px">잠시만 기다려주세요</p></div>';
    ol.style.display = "flex";
  }
  function hideAnalyzing() { var ol = document.getElementById("aiOverlay"); if (ol) ol.style.display = "none"; }

  function showAiResult(ai, photoUrl) {
    var flavors = (ai.predictedFlavors || []).slice(0, 5);
    var flavorTags = flavors.map(function (f) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:14px"><span style="width:8px;height:8px;border-radius:50%;background:' + getCatColor(f.category) + '"></span>' + esc(f.ko) + '</span>';
    }).join("&nbsp;&nbsp;");
    var scores = ai.predictedScores || {};
    var scoreList = ["아로마","산미","단맛","바디감","여운"].map(function (k) {
      return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span style="opacity:.6">' + k + '</span><span style="font-weight:600">' + esc(scores[k] || "—") + '</span></div>';
    }).join("");

    var h = '<div style="max-width:360px;width:100%;max-height:90vh;overflow-y:auto;background:#1a1812;color:#fff;padding:28px 24px">';
    if (photoUrl) h += '<img src="' + esc(photoUrl) + '" style="width:100%;height:160px;object-fit:cover;margin-bottom:16px"/>';
    h += '<p style="font-size:11px;opacity:.4;margin-bottom:4px">AI 분석 결과</p>';
    h += '<p style="font-size:22px;font-weight:700;line-height:1.3;margin-bottom:4px">' + esc(ai.name || "알 수 없는 원두") + '</p>';
    h += '<p style="font-size:13px;opacity:.5;margin-bottom:16px">' + esc(ai.roaster || "") + (ai.country ? " · " + esc(ai.country) : "") + '</p>';

    if (ai.confidence) {
      var confPct = Math.max(0, Math.min(100, parseInt(ai.confidence) || 0));
      h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px"><div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px"><div style="height:100%;width:' + confPct + '%;background:#8C7355;border-radius:2px"></div></div><span style="font-size:11px;opacity:.5">신뢰도 ' + confPct + '%</span></div>';
    }

    h += '<p style="font-size:12px;opacity:.4;margin-bottom:8px;font-weight:500">AI의 맛 예측</p>';
    h += '<div style="margin-bottom:16px">' + flavorTags + '</div>';
    h += '<div style="margin-bottom:20px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">' + scoreList + '</div>';

    if (ai.description) h += '<p style="font-size:13px;opacity:.5;line-height:1.6;margin-bottom:20px">' + esc(ai.description) + '</p>';

    h += '<div style="display:flex;gap:10px">';
    h += '<button onclick="goTasting()" style="flex:1;padding:16px;background:#fff;color:#121212;border:none;font-size:15px;font-weight:600;cursor:pointer">마시고 기록하기</button>';
    h += '<button onclick="hideAnalyzing()" style="padding:16px 20px;background:none;border:1px solid rgba(255,255,255,.2);color:#fff;font-size:14px;cursor:pointer">닫기</button>';
    h += '</div></div>';

    document.getElementById("aiOverlay").innerHTML = h;
  }

  function getCatColor(cat) {
    var c = { "Fruity":"#E83D51","Floral":"#E75480","Sweet":"#F19A38","Nutty/Cocoa":"#8B6A3E","Spices":"#A0522D","Roasted":"#7B5B3A","Green/Vegetative":"#5A9E6F","Sour/Fermented":"#E8A836","Other":"#7BAFB0" };
    return c[cat] || "#999";
  }

  window.goTasting = function () {
    hideAnalyzing();
    location.href = "tasting.html";
  };

  document.getElementById("camInput").addEventListener("change", function () { handlePhoto(this.files[0]); });
  document.getElementById("galInput").addEventListener("change", function () { handlePhoto(this.files[0]); });

  document.addEventListener("coffeeNote:ocrText", function (e) {
    var detail = e.detail || {};
    var coffee = detail.coffee || null;
    if (coffee && coffee.name) {
      try { sessionStorage.setItem("ocr_pending", JSON.stringify({ coffee: coffee, text: coffee.name })); } catch (ex) {}
    }
    CN.closePhotoSearchSheet();
    location.href = "index.html?from=ocr";
  });

  // 미니 커피카드
  var records = CN.getTastingRecords();
  var scroll = document.getElementById("cardsScroll");
  var cardImages = {};
  try { cardImages = JSON.parse(localStorage.getItem("cardImages") || "{}"); } catch (e) {}

  if (!records.length) {
    scroll.innerHTML =
      '<div class="empty-card" onclick="location.href=\'tasting.html\'">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<span class="empty-card-label">첫 번째 커피를<br/>기록해보세요</span></div>' +
      '<div class="empty-card" style="border-style:dotted;opacity:.5"></div>' +
      '<div class="empty-card" style="border-style:dotted;opacity:.3"></div>';
  } else {
    var html = records.slice(0, 10).map(function (r, i) {
      var hasImg = !!cardImages[i];
      if (hasImg) {
        return '<div class="mini-card" data-ri="' + i + '" style="padding:0"><img src="' + cardImages[i] + '" style="width:100%;height:100%;object-fit:cover;display:block"/></div>';
      }
      var color = CN.getDominantColor(r);
      var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "";
      var flavors = (r.flavorSelections || []).slice(0, 3);
      return '<div class="mini-card" data-ri="' + i + '">' +
        '<div class="mc-wheel-ring" style="border:8px solid ' + color + ';border-radius:50%"></div>' +
        '<div class="mc-content"><div class="mc-top"><div class="mc-date">' + esc(date) + '</div></div>' +
        '<div class="mc-bottom"><div class="mc-flavors">' + flavors.map(function (f) { return '<div class="mc-fdot" style="background:' + (f.color || color) + '"></div>'; }).join("") + '</div>' +
        '<div class="mc-name">' + esc(r.coffeeName) + '</div>' +
        '</div></div></div>';
    }).join("");
    html += '<div class="empty-card" onclick="location.href=\'tasting.html\'" style="background:var(--bg)">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<span class="empty-card-label">새 기록</span></div>';
    scroll.innerHTML = html;
    scroll.querySelectorAll("[data-ri]").forEach(function (el) {
      el.addEventListener("click", function () { location.href = "note-detail.html?idx=" + el.getAttribute("data-ri"); });
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
