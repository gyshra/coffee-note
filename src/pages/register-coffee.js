/**
 * src/pages/register-coffee.js
 * register-coffee.html 인라인 스크립트 → ES Module
 */

(function () {
  var CN = window.CoffeeNote;
  CN.renderBottomNav(null);

  var detailWrap = document.getElementById("processDetailWrap");
  var catSelect = document.getElementById("fProcessCategory");

  function syncProcessDetailVisibility() {
    if (catSelect.value) {
      detailWrap.classList.add("is-visible");
    } else {
      detailWrap.classList.remove("is-visible");
    }
  }

  catSelect.addEventListener("change", syncProcessDetailVisibility);
  syncProcessDetailVisibility();
  // AI 힌트바: 이름 입력 시 표시
  var aiHintShown = false;
  document.getElementById("fName").addEventListener("input", function() {
    var bar = document.getElementById("aiHintBar");
    if (this.value.trim().length > 2 && !aiHintShown) bar.style.display = "block";
    else if (!this.value.trim()) bar.style.display = "none";
  });

  var aiUrls = {};

  function highlightField(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = "#8C7355";
    el.style.backgroundColor = "#FFF8F0";
    el.style.color = "#5C3D1A";
  }

  document.getElementById("btnAiFill").addEventListener("click", function() {
    var name = document.getElementById("fName").value.trim();
    if (!name) { CN.showToast("원두 이름을 먼저 입력해주세요."); return; }
    var btn = this; btn.textContent = "검색 중…"; btn.disabled = true;
    fetch("/api/search", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({query:name, forceAi:true})
    }).then(function(r){ return r.json(); })
      .then(function(data) {
        btn.textContent = "AI로 정보 채우기"; btn.disabled = false;
        var ai = data.coffee||{};
        var filled = [];

        var pairs = [
          ["fRoaster", ai.roaster],["fRegion", ai.region],
          ["fFarm", ai.farm],["fAlt", ai.altitude],["fVariety", ai.variety]
        ];
        pairs.forEach(function(p) {
          if (!document.getElementById(p[0]).value && p[1]) {
            document.getElementById(p[0]).value = p[1];
            highlightField(p[0]);
            filled.push(p[0]);
          }
        });
        if (!document.getElementById("fNotes").value && Array.isArray(ai.notes) && ai.notes.length) {
          document.getElementById("fNotes").value = ai.notes.join(", ");
          highlightField("fNotes");
          filled.push("fNotes");
        }
        if (ai.processCategory) {
          var opts = catSelect.querySelectorAll("option");
          for (var oi=0;oi<opts.length;oi++) { if (opts[oi].value===ai.processCategory){ catSelect.value=ai.processCategory; break; } }
          syncProcessDetailVisibility();
        }

        // URL 저장
        if (ai.roasterUrl)  aiUrls.roasterUrl  = ai.roasterUrl;
        if (ai.farmUrl)     aiUrls.farmUrl      = ai.farmUrl;
        if (ai.purchaseUrl) aiUrls.purchaseUrl  = ai.purchaseUrl;

        document.getElementById("aiHintBar").style.display = "none";
        aiHintShown = true;

        // 결과 요약 표시
        var bar = document.getElementById("aiHintBar");
        bar.style.background = "#FFF8F0";
        bar.style.borderColor = "#D4A96A";
        bar.style.color = "#5C3D1A";
        if (filled.length > 0) {
          bar.innerHTML = '<strong>AI가 ' + filled.length + '개 항목 추가</strong> — 주황색 테두리가 AI가 채운 정보입니다. 확인 후 등록하세요.';
        } else {
          bar.innerHTML = 'AI도 추가 정보를 찾지 못했어요. <a href="https://www.google.com/search?q=' + encodeURIComponent(name + ' 커피 원두') + '" target="_blank" style="color:#8C7355">구글 검색 →</a>';
        }
        bar.style.display = "block";
      })
      .catch(function() { btn.textContent = "AI로 정보 채우기"; btn.disabled = false; CN.showToast("AI 검색 실패."); });
  });

  document.getElementById("btnBack").addEventListener("click", function () {
    if (history.length > 1) history.back();
    else location.href = "index.html";
  });

  var params = new URLSearchParams(location.search);
  var editIdx = params.get("edit");
  var editIndex = editIdx !== null && editIdx !== "" ? Number(editIdx) : NaN;
  var editing = Number.isInteger(editIndex) && CN.getCoffeeByIndex(editIndex);

  if (editing) {
    document.getElementById("pageTitle").textContent = "원두 수정";
    document.getElementById("btnSubmit").textContent = "수정 저장";
    var c = CN.getCoffeeByIndex(editIndex);
    document.getElementById("fName").value = c.name || "";
    document.getElementById("fRoaster").value = c.roaster || "";
    document.getElementById("fCountry").value = c.country || "에티오피아";
    document.getElementById("fRegion").value = c.region || "";
    document.getElementById("fFarm").value = c.farm || "";
    document.getElementById("fAlt").value = c.altitude || "";
    var cat = c.processCategory || CN.resolveProcessCategory(c);
    var opts = catSelect.querySelectorAll("option");
    var found = false;
    for (var oi = 0; oi < opts.length; oi++) {
      if (opts[oi].value === cat) {
        catSelect.value = cat;
        found = true;
        break;
      }
    }
    if (!found) {
      catSelect.value = "기타";
    }
    document.getElementById("fProcessDetail").value = (c.processDetail || "").trim();
    document.getElementById("fVariety").value = c.variety || "";
    document.getElementById("fNotes").value = (c.notes || []).join(", ");
    document.getElementById("fPrice").value = c.price || "";
    document.getElementById("fMemo").value = c.memo || "";
    syncProcessDetailVisibility();
  } else if (params.get("from") === "ocr") {
    var ocrRaw = sessionStorage.getItem("ocr_result");
    if (ocrRaw) {
      try {
        var ocr = JSON.parse(ocrRaw);
        if (ocr.name) document.getElementById("fName").value = ocr.name;
        if (ocr.roaster) document.getElementById("fRoaster").value = ocr.roaster;
        if (ocr.country) {
          var cSel = document.getElementById("fCountry");
          var cOpts = cSel.querySelectorAll("option");
          var cFound = false;
          for (var ci = 0; ci < cOpts.length; ci++) {
            if (cOpts[ci].value === ocr.country || cOpts[ci].textContent === ocr.country) {
              cSel.value = cOpts[ci].value; cFound = true; break;
            }
          }
          if (!cFound) cSel.value = ocr.country;
        }
        if (ocr.region) document.getElementById("fRegion").value = ocr.region;
        if (ocr.farm) document.getElementById("fFarm").value = ocr.farm;
        if (ocr.altitude) document.getElementById("fAlt").value = ocr.altitude;
        if (ocr.variety) document.getElementById("fVariety").value = ocr.variety;
        if (ocr.process) document.getElementById("fProcessDetail").value = ocr.process;
        if (ocr.notes && Array.isArray(ocr.notes)) document.getElementById("fNotes").value = ocr.notes.join(", ");
        syncProcessDetailVisibility();
        document.getElementById("pageTitle").textContent = "OCR 인식 결과 확인";
      } catch (e) { /* JSON 파싱 실패 시 무시 */ }
      sessionStorage.removeItem("ocr_result");
    }
  }

  document.getElementById("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("fName").value.trim();
    if (!name) {
      CN.showToast("원두 이름을 입력해 주세요.");
      return;
    }
    var country = document.getElementById("fCountry").value;
    var region = document.getElementById("fRegion").value.trim();
    var processCategory = document.getElementById("fProcessCategory").value;
    var processDetail = document.getElementById("fProcessDetail").value.trim();
    var notesStr = document.getElementById("fNotes").value;
    var notes = notesStr
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    var keywords = notes.concat(name.split(/\s+/), region, country, processCategory, processDetail).filter(Boolean);

    var draft = {
      processCategory: processCategory,
      processDetail: processDetail,
    };
    var obj = {
      name: name,
      roaster: document.getElementById("fRoaster").value.trim(),
      country: country,
      region: region,
      farm: document.getElementById("fFarm").value.trim(),
      altitude: document.getElementById("fAlt").value.trim(),
      processCategory: processCategory,
      processDetail: processDetail,
      process: CN.formatProcessDisplay(draft),
      variety: document.getElementById("fVariety").value.trim(),
      notes: notes,
      keywords: keywords,
      price: document.getElementById("fPrice").value.trim(),
      memo: document.getElementById("fMemo").value.trim(),
      rating: 4.0,
      mapText: (region || country) + ", " + country + " | 지도 연동 예정",
      source: "user_created",
    };

    var newIndex;
    if (editing) {
      CN.updateCoffee(editIndex, obj);
      newIndex = editIndex;
      CN.showToast("수정되었습니다.");
    } else {
      newIndex = CN.addCoffee(obj);
      CN.showToast("등록되었습니다.");
    }
    setTimeout(function () {
      location.href = "index.html?coffeeId=" + newIndex + "&expand=1";
    }, 400);
  });
})();
