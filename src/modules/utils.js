/**
 * src/modules/utils.js
 * 공통 유틸리티 — HTML 이스케이프, 토스트, URL 검증
 * (shared-utils.js의 ES Module 버전)
 */

/** HTML 특수문자 이스케이프 */
export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTML 속성 컨텍스트용 이스케이프 (싱글 쿼트 포함) */
export function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 토스트 메시지 표시
 * #toast → #globalToast 순으로 자동 감지
 */
export function showToast(msg, duration) {
  duration = duration || 2000;
  var el = document.getElementById('toast') || document.getElementById('globalToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, duration);
}

/** showToast 별칭 */
export const toast = showToast;

/**
 * URL 새니타이징
 * javascript:, data:, vbscript: 등 위험 프로토콜 차단
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  var trimmed = url.trim();
  if (!trimmed) return '';
  var normalized = trimmed.replace(/[\s\t\n\r]+/g, '').toLowerCase();
  if (/^(javascript|data|vbscript|blob)\s*:/i.test(normalized)) return '';
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
      return esc(trimmed);
    }
    return '';
  }
  return esc(trimmed);
}
