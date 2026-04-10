/**
 * src/pages/mypage.js
 * mypage.html 인라인 스크립트 → ES Module
 */

import { esc } from '../modules/utils.js';

(function () {
  var CN = window.CoffeeNote;
  CN.renderBottomNav("mypage");

  var currentTab = "favorites";
  var SLIDER_ORDER = ["아로마", "산미", "단맛", "바디감", "여운"];

  function openSheet(el) {
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
  }
  function closeSheet(el) {
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
  }

  // ─── 프로필 UI 업데이트 ────────────────────────────
  async function updateProfileUI() {
    var user = await SupaAuth.getUser();
    if (user) {
      document.getElementById("profileGuest").style.display = "none";
      document.getElementById("profileLoggedIn").style.display = "";

      var name = (user.user_metadata && user.user_metadata.full_name)
        ? user.user_metadata.full_name
        : (user.email || "사용자");
      document.getElementById("nickDisplay").textContent = name;
      document.getElementById("profileEmail").textContent = user.email || "";

      // 프로필 사진
      var avatarPic = user.user_metadata && user.user_metadata.avatar_url;
      if (avatarPic) {
        document.getElementById("profileAvatar").innerHTML =
          '<img src="' + avatarPic + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />';
      }

      // 로컬 → Supabase 마이그레이션 (첫 로그인 시)
      SupaDB.migrateFromLocalStorage();

    } else {
      // 비로그인 상태: 닉네임 설정 시트 표시 (기존 동작)
      document.getElementById("profileGuest").style.display = "";
      document.getElementById("profileLoggedIn").style.display = "none";
      if (!CN.getNickname() && !window.SupaAuth) {
        openSheet(document.getElementById("nickOverlay"));
      }
    }
  }

  // 페이지 로드 시 프로필 확인
  updateProfileUI();

  // 인증 상태 변경 감지
  if (window.SupaAuth) {
    SupaAuth.onAuthChange(function (user) {
      updateProfileUI();
    });
  }

  // Google 로그인 버튼
  document.getElementById("btnGoogleLogin").addEventListener("click", function () {
    SupaAuth.loginWithGoogle();
  });

  // 로그아웃 버튼
  document.getElementById("btnLogout").addEventListener("click", function () {
    if (confirm("로그아웃 하시겠어요?")) {
      SupaAuth.logout();
    }
  });

  document.getElementById("nickSave").addEventListener("click", function () {
    var v = document.getElementById("nickInput").value.trim();
    if (!v) {
      CN.showToast("닉네임을 입력해 주세요.");
      return;
    }
    CN.setNickname(v);
    document.getElementById("nickDisplay").textContent = v;
    closeSheet(document.getElementById("nickOverlay"));
  });

  function renderStats() {
    var records = CN.getTastingRecords();
    var total = records.length;
    var originCount = {}, methodCount = {}, flavorCount = {};
    var sumAvg = 0, countAvg = 0;

    records.forEach(function (r) {
      // 산지
      var idx = r.coffeeIndex !== undefined ? r.coffeeIndex : Number(r.coffeeId);
      var coffee = CN.getCoffeeByIndex(idx);
      var origin = coffee && (coffee.region || coffee.country) ? coffee.region || coffee.country : "기타";
      originCount[origin] = (originCount[origin] || 0) + 1;

      // 평점
      var star = Number(r.starRating || r.rating || 0);
      if (star > 0) { sumAvg += star; countAvg++; }

      // 주 추출법
      if (r.brewMethod) methodCount[r.brewMethod] = (methodCount[r.brewMethod] || 0) + 1;

      // 향미 빈도
      (r.flavorSelections || []).forEach(function (f) {
        var label = (typeof f === "string" ? f : f.ko) || "";
        if (label) flavorCount[label] = (flavorCount[label] || 0) + 1;
      });
    });

    function topKey(obj) {
      var best = "—", max = 0;
      for (var k in obj) { if (obj[k] > max) { max = obj[k]; best = k; } }
      return best;
    }

    var avgLabel = countAvg ? (sumAvg / countAvg).toFixed(1) + " / 5" : "—";
    var topMethod = topKey(methodCount);
    var topFlavor = topKey(flavorCount);

    // 추출 정확도: brewMetrics가 있는 기록의 timeVariancePct 평균
    var brewAccuracyLabel = "—";
    var bmRecs = records.filter(function (r) { return r.brewMetrics && r.brewMetrics.timeVariancePct != null; });
    if (bmRecs.length) {
      var avgVariance = bmRecs.reduce(function (s, r) { return s + r.brewMetrics.timeVariancePct; }, 0) / bmRecs.length;
      brewAccuracyLabel = Math.max(0, Math.round(100 - avgVariance)) + "%";
    }

    document.getElementById("statsRow").innerHTML =
      '<div class="statCard card"><div class="label caption">총 기록 수</div><div class="value">' + total + '</div></div>' +
      '<div class="statCard card"><div class="label caption">가장 많이 마신 산지</div><div class="value" style="font-size:15px">' + esc(topKey(originCount)) + '</div></div>' +
      '<div class="statCard card"><div class="label caption">평균 평점</div><div class="value">' + esc(avgLabel) + '</div></div>' +
      '<div class="statCard card"><div class="label caption">주 추출법</div><div class="value" style="font-size:15px">' + esc(topMethod) + '</div></div>' +
      '<div class="statCard card"><div class="label caption">즐겨찾는 향미</div><div class="value" style="font-size:15px">' + esc(topFlavor) + '</div></div>' +
      '<div class="statCard card"><div class="label caption">추출 정확도</div><div class="value" style="font-size:15px">' + esc(brewAccuracyLabel) + '</div></div>';
  }

  function formatYMD(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "." + m + "." + day;
  }

  function getRecordFlavorsText(r) {
    var tags = (r.flavorSelections || []).map(function (f) {
      return f.ko;
    });
    if (!tags.length && Array.isArray(r.tasteTags)) tags = r.tasteTags;
    tags = tags.filter(Boolean);
    return tags.slice(0, 3).join(" · ");
  }

  function renderTab() {
    renderStats();
    var el = document.getElementById("tabContent");
    if (currentTab === "sensory") {
      var recs = CN.getTastingRecords();
      if (!recs.length) {
        el.innerHTML = '<div class="empty">아직 센서리노트가 없습니다.</div>';
        return;
      }
      el.innerHTML = recs
        .map(function (r, i) {
          var coffee = CN.getCoffeeByIndex(r.coffeeIndex);
          var country = coffee && coffee.country ? coffee.country : "기타";
          var dominant = CN.getDominantColor(r);
          var tags = getRecordFlavorsText(r);
          var location = r.location ? r.location : "—";
          var dateStr = formatYMD(r.createdAt);
          return (
            '<div class="sensory-card" data-record-idx="' +
            i +
            '" role="button" tabindex="0">' +
            '  <div class="sc-color-bar" style="background:' +
            dominant +
            '"></div>' +
            '  <div class="sc-content">' +
            '    <div class="sc-title-row">' +
            "      <span class=\"sc-title\">" +
            esc(r.coffeeName || "원두") +
            "</span>" +
            '      <img class="sc-flag" src="' +
            CN.getFlagUrl(country) +
            '" alt="' +
            esc(country) +
            '" width="16" />' +
            "    </div>" +
            '    <div class="sc-flavors">' +
            esc(tags || "") +
            "</div>" +
            '    <div class="sc-location">' +
            esc(location) +
            "</div>" +
            '    <div class="sc-date">' +
            esc(dateStr) +
            "</div>" +
            "  </div>" +
            '  <div class="sc-country-map">' +
            CN.getCountrySilhouette(country) +
            "</div>" +
            "</div>"
          );
        })
        .join("");
      el.querySelectorAll("[data-record-idx]").forEach(function (node) {
        function go() {
          var idx = Number(node.getAttribute("data-record-idx"));
          location.href = "note-detail.html?idx=" + encodeURIComponent(idx);
        }
        node.addEventListener("click", function () {
          go();
        });
        node.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") go();
        });
      });
    } else if (currentTab === "beans") {
      var coffees = CN.getCoffees();
      var mine = coffees
        .map(function (c, i) {
          return { c: c, i: i };
        })
        .filter(function (x) {
          return x.c.source === "user_created";
        });
      if (!mine.length) {
        el.innerHTML = '<div class="empty">직접 등록한 원두가 없습니다.</div>';
        return;
      }
      el.innerHTML = mine
        .map(function (x) {
          return (
            '<div class="listCard" data-edit-idx="' +
            x.i +
            '"><strong class="card-title" style="display:block">' +
            esc(x.c.name) +
            "</strong><span class='caption' style='display:block;margin-top:6px'>" +
            esc(x.c.roaster || "") +
            " · " +
            esc(CN.formatProcessDisplay(x.c)) +
            "</span></div>"
          );
        })
        .join("");
      el.querySelectorAll("[data-edit-idx]").forEach(function (node) {
        node.addEventListener("click", function () {
          var idx = node.getAttribute("data-edit-idx");
          location.href = "register-coffee.html?edit=" + encodeURIComponent(idx);
        });
      });
    } else if (currentTab === "recipes") {
      var recs2 = CN.getTastingRecords();
      var withRecipe = recs2
        .map(function (r, i) {
          return { r: r, i: i };
        })
        .filter(function (x) {
          return Boolean(x.r.recipe);
        });
      if (!withRecipe.length) {
        el.innerHTML = '<div class="empty">레시피가 있는 기록이 없습니다.</div>';
        return;
      }
      el.innerHTML = withRecipe
        .map(function (x) {
          var rr = x.r;
          var recipe = rr.recipe || {};
          var metaBits = [recipe.temp, recipe.water, recipe.dose, recipe.time].filter(function (v) {
            return v != null && String(v).trim().length > 0;
          });
          var dateStr = formatYMD(rr.createdAt);
          return (
            '<div class="recipe-card" data-record-idx="' +
            x.i +
            '" role="button" tabindex="0">' +
            '  <div class="rc-title">' +
            esc(rr.coffeeName || "원두") +
            "</div>" +
            '  <div class="rc-meta">' +
            esc(metaBits.join(" · ") || "—") +
            "</div>" +
            '  <div class="rc-date">' +
            esc(dateStr) +
            "</div>" +
            "</div>"
          );
        })
        .join("");
      el.querySelectorAll("[data-record-idx]").forEach(function (node) {
        function go() {
          var idx = Number(node.getAttribute("data-record-idx"));
          location.href = "note-detail.html?idx=" + encodeURIComponent(idx);
        }
        node.addEventListener("click", go);
        node.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") go();
        });
      });
    } else if (currentTab === "favorites") {
      // 취향 프로파일 레이더 (baseScores 평균)
      var allRecs = CN.getTastingRecords();
      var AXES = ["아로마", "산미", "단맛", "바디감", "여운"];
      var axisSum = {}, axisCount = {};
      AXES.forEach(function (a) { axisSum[a] = 0; axisCount[a] = 0; });
      allRecs.forEach(function (r) {
        var s = r.baseScores || r.scores || {};
        AXES.forEach(function (a) { if (s[a] != null) { axisSum[a] += Number(s[a]); axisCount[a]++; } });
      });
      var hasRadarData = AXES.some(function (a) { return axisCount[a] > 0; });
      var radarHtml = "";
      if (hasRadarData) {
        radarHtml = '<div class="card" style="padding:16px;margin-bottom:12px">' +
          '<div style="font-size:12px;font-weight:700;color:var(--text-sub);letter-spacing:0.08em;margin-bottom:12px">취향 프로파일</div>' +
          '<div style="display:flex;justify-content:center"><svg id="mypageRadarSvg" xmlns="http://www.w3.org/2000/svg"></svg></div>' +
          '</div>';
      }

      var favs = CN.getFavorites();
      var favsHtml = '';
      if (!favs.length) {
        favsHtml = '<div class="empty">즐겨찾기한 원두가 없습니다.</div>';
      } else {
        favsHtml = favs
          .map(function (idx) {
            var c = CN.getCoffeeByIndex(idx);
            if (!c) return "";
            return (
              '<div class="listCard" data-fav-idx="' + idx + '"><strong class="card-title" style="display:block">' +
              esc(c.name) + "</strong><span class='caption' style='display:block;margin-top:6px'>" +
              esc(c.roaster) + "</span></div>"
            );
          })
          .filter(Boolean)
          .join("");
      }
      el.innerHTML = radarHtml + favsHtml;

      if (hasRadarData) {
        var avgScores = {};
        AXES.forEach(function (a) { avgScores[a] = axisCount[a] ? Math.round(axisSum[a] / axisCount[a] * 10) / 10 : 5; });
        if (window.CoffeeRadar) {
          CoffeeRadar.createReadonly({ svgId: "mypageRadarSvg", size: 180, values: avgScores });
        }
      }

      el.querySelectorAll("[data-fav-idx]").forEach(function (node) {
        node.addEventListener("click", function () {
          var idx = node.getAttribute("data-fav-idx");
          location.href = "index.html?coffeeId=" + encodeURIComponent(idx) + "&expand=1";
        });
      });
    } else if (currentTab === "history") {
      var hist = CN.getSearchHistory();
      if (!hist.length) {
        el.innerHTML = '<div class="empty">검색 기록이 없습니다.</div>';
        return;
      }
      el.innerHTML = hist
        .map(function (h, i) {
          var d = new Date(h.ts);
          var dateStr = isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR");
          return (
            '<div class="listCard" data-history-i="' +
            i +
            '"><strong class="card-title" style="display:block">' +
            esc(h.query) +
            "</strong><span class='caption' style='display:block;margin-top:6px'>" +
            esc(dateStr) +
            "</span></div>"
          );
        })
        .join("");
      el.querySelectorAll("[data-history-i]").forEach(function (node) {
        node.addEventListener("click", function () {
          var i = Number(node.getAttribute("data-history-i"));
          var q = hist[i] && hist[i].query ? hist[i].query : "";
          location.href = "index.html?q=" + encodeURIComponent(q);
        });
      });
    }
  }

  function showRecordDetail(r) {
    if (!r) return;
    document.getElementById("detailTitle").textContent = r.coffeeName || "기록 상세";
    var scores = r.baseScores || r.scores;
    var scoreLines = SLIDER_ORDER.map(function (k) {
      return "<div class='detailRow'><strong>" + esc(k) + "</strong> " + (scores && scores[k] != null ? scores[k] : "—") + "</div>";
    }).join("");
    var tagSource = (r.flavorSelections || []).map(function (f) {
      return f.ko;
    });
    if (!tagSource.length) tagSource = r.tasteTags || [];
    var tags = tagSource.length ? tagSource.map(esc).join(", ") : "—";
    var koByEn = {};
    (r.flavorSelections || []).forEach(function (f) {
      koByEn[f.en] = f.ko;
    });
    var fiLine = "";
    if (r.flavorIntensities && Object.keys(r.flavorIntensities).length) {
      fiLine =
        "<div class='detailRow'><strong>향미 강도</strong> " +
        Object.keys(r.flavorIntensities)
          .map(function (en) {
            return esc(koByEn[en] || en) + " " + r.flavorIntensities[en];
          })
          .join(", ") +
        "</div>";
    }
    document.getElementById("detailBody").innerHTML =
      "<div class='detailRow'><strong>날짜</strong> " +
      esc(new Date(r.createdAt).toLocaleString("ko-KR")) +
      "</div>" +
      scoreLines +
      "<div class='detailRow'><strong>향미</strong> " +
      tags +
      "</div>" +
      fiLine +
      "<div class='detailRow'><strong>추출 방법</strong> " +
      esc(r.brewMethod || r.method || "—") +
      "</div>" +
      "<div class='detailRow'><strong>메모</strong> " +
      esc(r.memo || "—") +
      "</div>";
    openSheet(document.getElementById("detailOverlay"));
  }

  document.getElementById("detailClose").addEventListener("click", function () {
    closeSheet(document.getElementById("detailOverlay"));
  });
  document.getElementById("detailOverlay").addEventListener("click", function (e) {
    if (e.target.id === "detailOverlay") closeSheet(document.getElementById("detailOverlay"));
  });

  document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      currentTab = btn.getAttribute("data-tab");
      renderTab();
    });
  });

  var params = new URLSearchParams(location.search);
  var tabParam = params.get("tab");
  if (tabParam === "notes" || tabParam === "sensory" || tabParam === "records" || tabParam === "beans" || tabParam === "recipes") {
    location.href = "notes.html" + (tabParam ? "?tab=" + tabParam : "");
    return;
  }
  else if (tabParam === "favorites") currentTab = "favorites";
  else if (tabParam === "history") currentTab = "history";
  else currentTab = "favorites";

  document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === currentTab);
  });

  renderTab();
})();
