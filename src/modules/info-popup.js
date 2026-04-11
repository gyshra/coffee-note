/**
 * src/modules/info-popup.js
 * ⓘ 정보 팝업 컴포넌트
 * 사용: InfoPopup.show({ title, desc, flavorEffect, keywords })
 *       InfoPopup.hide()
 *       InfoPopup.attach(buttonEl, data)
 */

let _overlay = null;
let _panel   = null;

function _ensureDOM() {
  if (_overlay) return;

  _overlay = document.createElement("div");
  _overlay.id = "infoPopupOverlay";
  _overlay.style.cssText = [
    "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:900",
    "display:none;align-items:flex-end;justify-content:center",
  ].join(";");
  _overlay.addEventListener("click", (e) => { if (e.target === _overlay) hide(); });

  _panel = document.createElement("div");
  _panel.id = "infoPopupPanel";
  _panel.style.cssText = [
    "width:100%;max-width:480px;background:#fff",
    "padding:24px 20px 32px;box-sizing:border-box",
    "border-top:3px solid #121212",
    "transform:translateY(100%);transition:transform .25s ease",
  ].join(";");

  _panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <span id="ipTitle" style="font-size:15px;font-weight:700;color:#121212;line-height:1.4"></span>
      <button id="ipClose" aria-label="닫기" style="background:none;border:none;cursor:pointer;padding:0;line-height:1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#121212" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <p id="ipDesc"  style="font-size:13px;color:#555;margin:0 0 14px;line-height:1.6"></p>
    <div id="ipFlavorWrap" style="background:#FFF8F0;border:0.5px solid #E8C98A;padding:12px 14px;margin-bottom:14px">
      <p style="font-size:11px;font-weight:700;color:#8C5A00;margin:0 0 4px;letter-spacing:.04em">맛에 미치는 영향</p>
      <p id="ipFlavor" style="font-size:13px;color:#5C3D1A;margin:0;line-height:1.6"></p>
    </div>
    <div id="ipTagsWrap" style="display:flex;gap:6px;flex-wrap:wrap"></div>
  `;

  _panel.querySelector("#ipClose").addEventListener("click", hide);
  _overlay.appendChild(_panel);
  document.body.appendChild(_overlay);
}

function show({ title = "", desc = "", flavorEffect = "", keywords = [] } = {}) {
  _ensureDOM();
  _panel.querySelector("#ipTitle").textContent  = title;
  _panel.querySelector("#ipDesc").textContent   = desc;
  _panel.querySelector("#ipFlavor").textContent = flavorEffect;

  const tagsWrap = _panel.querySelector("#ipTagsWrap");
  tagsWrap.innerHTML = "";
  keywords.forEach((k) => {
    const tag = document.createElement("span");
    tag.textContent = `#${k}`;
    tag.style.cssText = "font-size:11px;padding:3px 8px;border:0.5px solid #D4A96A;color:#8C5A00;background:#FFF8F0";
    tagsWrap.appendChild(tag);
  });

  _panel.querySelector("#ipFlavorWrap").style.display = flavorEffect ? "" : "none";
  _overlay.style.display = "flex";
  requestAnimationFrame(() => { _panel.style.transform = "translateY(0)"; });
}

function hide() {
  if (!_panel) return;
  _panel.style.transform = "translateY(100%)";
  setTimeout(() => { _overlay.style.display = "none"; }, 260);
}

/**
 * ⓘ 버튼 엘리먼트에 팝업 데이터를 연결합니다.
 * @param {HTMLElement} btn
 * @param {{ title, desc, flavorEffect, keywords }} data
 */
function attach(btn, data) {
  btn.addEventListener("click", (e) => { e.stopPropagation(); show(data); });
}

export const InfoPopup = { show, hide, attach };
