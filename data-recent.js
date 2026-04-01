/**
 * data-recent.js — 최근 검색 데이터 관리 모듈
 * Coffee Note v33 모듈화 Step 2
 *
 * 원칙:
 *  - document.* 직접 호출 금지 (DOM 조작 없음)
 *  - 데이터 변경 후 업데이트된 목록을 반환값으로 전달
 *  - renderRecent() 등 UI 갱신은 호출자(index.html)가 담당
 */
var DataRecent = (function () {

  var STORAGE_KEY = 'coffee_note_recent';
  var MAX_ITEMS = 10;

  /**
   * 최근 검색 목록을 반환한다.
   * @returns {Array<string>}
   */
  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * 검색어를 목록 맨 앞에 추가한다 (중복 제거 + 10개 제한).
   * @param {string} query
   * @returns {Array<string>} 업데이트된 목록
   */
  function add(query) {
    var list = getAll().filter(function (r) { return r !== query; });
    list.unshift(query);
    list = list.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  /**
   * 특정 검색어를 목록에서 제거한다.
   * @param {string} query
   * @returns {Array<string>} 업데이트된 목록
   */
  function remove(query) {
    var list = getAll().filter(function (r) { return r !== query; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  /**
   * 목록을 전부 비운다.
   * @returns {Array} 빈 배열
   */
  function clearAll() {
    localStorage.setItem(STORAGE_KEY, '[]');
    return [];
  }

  /* ── 노출 ── */
  return {
    getAll:   getAll,
    add:      add,
    remove:   remove,
    clearAll: clearAll
  };

})();
