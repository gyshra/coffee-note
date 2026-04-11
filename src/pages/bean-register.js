/**
 * src/pages/bean-register.js
 * bean-register.html — 새 원두 등록 흐름
 * Step 1: 텍스트 입력 or 사진 스캔
 * Step 2: AI 파싱 결과 확인 + 수정
 * 저장 → index.html?coffeeId=N
 */

import { getProcessInfo, getCountryInfo } from '/src/modules/coffee-knowledge.js';
import { InfoPopup } from '/src/modules/info-popup.js';

const CN = window.CoffeeNote;
CN.renderBottomNav(null);

/* ── 파싱된 원두 데이터 ─────────────────────────────── */
let _parsed     = {};
let _confidence = "low";

/* ── Step 전환 ──────────────────────────────────────── */
function showStep(n) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  document.getElementById(`step${n}`).classList.add("active");
  document.getElementById("pageTitle").textContent = n === 1 ? "새 원두 등록" : "정보 확인";
}

/* ── Step 1 로직 ─────────────────────────────────────── */
const beanText = document.getElementById("beanText");
const btnNext  = document.getElementById("btnNext");
const aiStatus = document.getElementById("aiStatus");

beanText.addEventListener("input", () => {
  btnNext.disabled = !beanText.value.trim();
});

btnNext.addEventListener("click", async () => {
  const text = beanText.value.trim();
  if (!text) return;
  btnNext.disabled = true;
  aiStatus.classList.add("visible");
  aiStatus.textContent = "AI가 원두 정보를 파악하고 있어요…";

  try {
    const r    = await fetch("/api/parse-bean", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await r.json();
    _parsed     = data.coffee || { name: text };
    _confidence = data.confidence || "low";
  } catch {
    _parsed     = { name: text };
    _confidence = "low";
  }

  aiStatus.classList.remove("visible");
  btnNext.disabled = false;
  renderConfirmStep();
  showStep(2);
});

/* ── 사진 스캔 ──────────────────────────────────────── */
document.getElementById("scanInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  aiStatus.classList.add("visible");
  aiStatus.textContent = "이미지를 분석하고 있어요…";
  btnNext.disabled = true;

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const r    = await fetch("/api/ocr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType: file.type }),
    });
    const data = await r.json();
    _parsed     = data.coffee || {};
    _confidence = data.coffee?.confidence || "low";
  } catch {
    CN.showToast("이미지 분석에 실패했어요. 직접 입력해주세요.");
  }

  aiStatus.classList.remove("visible");
  btnNext.disabled = !beanText.value.trim();

  if (_parsed?.name) {
    beanText.value = _parsed.name;
    renderConfirmStep();
    showStep(2);
  }
  e.target.value = "";
});

/* ── Step 2: 결과 확인 렌더링 ───────────────────────── */
const FIELDS = [
  { key: "name",     label: "원두 이름",  required: true,  infoType: null },
  { key: "roaster",  label: "로스터리",   required: false, infoType: null },
  { key: "country",  label: "국가",       required: false, infoType: "country" },
  { key: "region",   label: "지역",       required: false, infoType: null },
  { key: "farm",     label: "농장",       required: false, infoType: null },
  { key: "process",  label: "가공방식",   required: false, infoType: "process" },
  { key: "variety",  label: "품종",       required: false, infoType: null },
  { key: "altitude", label: "고도",       required: false, infoType: null },
];

function renderConfirmStep() {
  const wrap = document.getElementById("confirmFields");
  wrap.innerHTML = "";

  /* confidence 배너 */
  const bannerLabel = document.getElementById("bannerLabel");
  const bannerDesc  = document.getElementById("bannerDesc");
  if (_confidence === "high") {
    bannerLabel.textContent = "AI 파싱 완료";
    bannerDesc.textContent  = "정보가 정확하게 인식됐어요. 확인 후 등록하세요.";
  } else if (_confidence === "medium") {
    bannerLabel.textContent = "일부 정보가 불확실해요";
    bannerDesc.textContent  = "아래 항목을 확인하고 틀린 부분을 탭해 수정하세요.";
  } else {
    bannerLabel.textContent = "직접 입력이 필요해요";
    bannerDesc.textContent  = "각 항목을 탭해서 정보를 추가할 수 있어요.";
  }

  FIELDS.forEach(({ key, label, infoType }) => {
    const value   = _parsed[key] || "";
    const isEmpty = !value;

    const row = document.createElement("div");
    row.className = "confirm-field";

    /* 왼쪽: 레이블 + 값 */
    const inner = document.createElement("div");
    inner.className = "confirm-field-inner";

    const labelEl = document.createElement("div");
    labelEl.className = "field-label";
    labelEl.textContent = label.toUpperCase();

    const valueEl = document.createElement("div");
    valueEl.className = `field-value${isEmpty ? " placeholder" : ""}`;
    valueEl.textContent = isEmpty ? "탭해서 입력" : value;

    /* confidence 배지 (값 있을 때만) */
    if (!isEmpty && _confidence !== "high") {
      const badge = document.createElement("span");
      badge.className = `badge badge-${_confidence}`;
      badge.textContent = _confidence === "medium" ? "확인 필요" : "미파싱";
      valueEl.appendChild(badge);
    }

    /* 인라인 편집 input */
    const editEl = document.createElement("input");
    editEl.className = "field-edit";
    editEl.value = value;
    editEl.placeholder = label + " 입력";
    editEl.addEventListener("change", (e) => {
      _parsed[key] = e.target.value.trim();
      valueEl.textContent = _parsed[key] || "탭해서 입력";
      valueEl.className   = `field-value${_parsed[key] ? "" : " placeholder"}`;
      editEl.classList.remove("visible");
    });
    editEl.addEventListener("blur", () => {
      _parsed[key] = editEl.value.trim();
      valueEl.textContent = _parsed[key] || "탭해서 입력";
      valueEl.className   = `field-value${_parsed[key] ? "" : " placeholder"}`;
      editEl.classList.remove("visible");
    });

    inner.appendChild(labelEl);
    inner.appendChild(valueEl);
    inner.appendChild(editEl);

    /* 값 또는 레이블 탭 → 편집 모드 */
    inner.addEventListener("click", () => {
      editEl.classList.add("visible");
      editEl.value = _parsed[key] || "";
      valueEl.style.display = "none";
      editEl.focus();
    });
    editEl.addEventListener("focus", () => { valueEl.style.display = "none"; });
    editEl.addEventListener("blur",  () => { valueEl.style.display = ""; });

    row.appendChild(inner);

    /* 오른쪽: ⓘ 버튼 */
    if (infoType) {
      const info = infoType === "process" ? getProcessInfo(value)
                 : infoType === "country" ? getCountryInfo(value)
                 : null;
      if (info) {
        const btn = document.createElement("button");
        btn.className = "info-btn";
        btn.setAttribute("aria-label", `${label} 정보`);
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        InfoPopup.attach(btn, {
          title:       info.label || (info.flag ? `${info.flag} ${value}` : value),
          desc:        info.desc,
          flavorEffect: info.flavorEffect,
          keywords:    info.keywords || info.notable || [],
        });
        row.appendChild(btn);
      }
    }

    wrap.appendChild(row);
  });
}

/* ── 저장 ────────────────────────────────────────────── */
document.getElementById("btnSave").addEventListener("click", () => {
  const name = (_parsed.name || "").trim();
  if (!name) { CN.showToast("원두 이름을 입력해주세요."); return; }

  const notes    = Array.isArray(_parsed.notes) ? _parsed.notes : [];
  const keywords = notes.concat(
    (name).split(/\s+/),
    _parsed.region, _parsed.country, _parsed.process
  ).filter(Boolean);

  const obj = {
    name,
    roaster:         _parsed.roaster    || "",
    country:         _parsed.country    || "",
    region:          _parsed.region     || "",
    farm:            _parsed.farm       || "",
    altitude:        _parsed.altitude   || "",
    processCategory: _parsed.process    || "",
    processDetail:   "",
    process:         _parsed.process    || "",
    variety:         _parsed.variety    || "",
    notes,
    keywords,
    rating:  4.0,
    source: "user_created",
  };

  const newIndex = CN.addCoffee(obj);
  CN.showToast("등록되었습니다!");
  setTimeout(() => {
    location.href = `tasting.html?coffeeId=${newIndex}`;
  }, 400);
});

/* ── 뒤로 가기 ──────────────────────────────────────── */
document.getElementById("btnBack").addEventListener("click", () => {
  if (document.getElementById("step2").classList.contains("active")) {
    showStep(1);
  } else {
    history.length > 1 ? history.back() : (location.href = "home.html");
  }
});

document.getElementById("btnBackToInput").addEventListener("click", () => showStep(1));
