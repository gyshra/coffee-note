/**
 * shared-utils.js — 크로스파일 공통 유틸리티
 * Coffee Note v33 모듈화 Step 5
 *
 * 여러 HTML 파일에서 중복 정의되던 함수를 1곳으로 통합한다.
 * 전역 함수로 노출하여 기존 호출 코드 변경을 최소화한다.
 *
 * 원칙:
 *  - 기존 호출 코드(onclick="esc(...)" 등)를 변경하지 않기 위해 전역 노출
 *  - toast 요소 ID가 파일마다 다른 문제를 자동 감지로 해결
 */

/**
 * HTML 특수문자를 이스케이프한다.
 * 기존 8곳(home, mypage, notes, note-detail, recipe-detail, tasting, common, tasting-wheel)에
 * 동일하게 복붙되어 있던 함수를 통합한 것이다.
 *
 * @param {*} s - 이스케이프할 문자열
 * @returns {string}
 */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 토스트 메시지를 표시한다.
 * 기존에 3가지 변형이 있었던 것을 통합:
 *  - index.html:    toast(msg, ms)     → #toast
 *  - compare.html:  showToast(msg, d)  → #toast
 *  - recipe.html:   showToast(msg, d)  → #toast
 *  - common.js:     showToast(msg, d)  → #globalToast
 *
 * 이 함수는 #toast를 먼저 찾고, 없으면 #globalToast를 사용한다.
 *
 * @param {string} msg - 표시할 메시지
 * @param {number} [duration=2000] - 표시 시간(ms)
 */
function showToast(msg, duration) {
  duration = duration || 2000;
  var el = document.getElementById('toast') || document.getElementById('globalToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, duration);
}

/**
 * showToast의 별칭. index.html에서 toast()로 호출하던 코드와 호환.
 */
var toast = showToast;

/**
 * HTML 속성 컨텍스트용 이스케이프 (싱글 쿼트 포함).
 * onclick="fn('...')" 등 속성값 내부에 동적 문자열을 넣을 때 사용한다.
 *
 * @param {*} s - 이스케이프할 문자열
 * @returns {string}
 */
function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * URL 새니타이징.
 * href 속성에 삽입할 URL을 검증하여 javascript:, data: 등 위험한 프로토콜을 차단한다.
 * 허용: http://, https://, mailto:, tel:, 상대경로
 * 차단: javascript:, data:, vbscript:, 기타 모든 위험 스킴
 *
 * @param {*} url - 검증할 URL 문자열
 * @returns {string} 안전한 URL 또는 빈 문자열
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  var trimmed = url.trim();
  if (!trimmed) return '';
  // 위험한 프로토콜 차단 (대소문자 무시, 공백/탭 제거 후 검사)
  var normalized = trimmed.replace(/[\s\t\n\r]+/g, '').toLowerCase();
  if (/^(javascript|data|vbscript|blob)\s*:/i.test(normalized)) return '';
  // 절대 URL이면 http(s)만 허용
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
      return esc(trimmed);
    }
    return '';
  }
  // 상대 경로는 허용
  return esc(trimmed);
}
