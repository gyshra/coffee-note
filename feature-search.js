/**
 * feature-search.js — 검색 비즈니스 로직 모듈
 * Coffee Note v33 모듈화 Step 1
 *
 * 원칙:
 *  - document.* 직접 호출 금지 (DOM 조작 없음)
 *  - 결과는 반환값(return) 또는 콜백으로만 전달
 *  - localStorage 접근은 이 모듈 안에서만 수행하여 일관성 보장
 */
var FeatureSearch = (function () {

  /* ── 로컬 DB 읽기 ── */

  /**
   * localStorage(또는 common.js의 getCoffees)에서 커피 목록을 반환한다.
   * 기존 index.html의 localDB()를 대체한다.
   *
   * @returns {Array<Object>}
   */
  function getLocalCoffees() {
    try {
      if (typeof getCoffees === 'function') return getCoffees();
      return JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
    } catch (e) {
      return [];
    }
  }

  /* ── 순수 필터링 (DOM 무관) ── */

  /**
   * 커피 배열을 키워드로 필터링한다.
   * 기존 doSearch() 내부의 로컬 검색 로직을 추출한 것이다.
   *
   * @param {Array<Object>} coffees - 커피 객체 배열
   * @param {string} query - 검색 키워드
   * @returns {Array<Object>} 매칭된 커피 배열
   */
  function filterByKeyword(coffees, query) {
    var q = query.toLowerCase();
    return coffees.filter(function (c) {
      var text = [
        c.name || '',
        c.country || '',
        c.region || '',
        c.variety || '',
        c.process || '',
        (c.cup_notes || []).join(' ')
      ].join(' ').toLowerCase();
      return text.indexOf(q) !== -1;
    });
  }

  /**
   * 커피 배열을 카테고리(산지/가공방식)로 필터링한다.
   * 기존 applyFilter()의 순수 로직을 추출한 것이다.
   *
   * @param {Array<Object>} coffees - 커피 객체 배열
   * @param {string} category - 'all' 또는 필터값 (예: 'Ethiopia', 'washed')
   * @returns {Array<Object>}
   */
  function filterByCategory(coffees, category) {
    if (category === 'all') return coffees;
    var f = category.toLowerCase();
    return coffees.filter(function (c) {
      var text = [
        c.country || '',
        c.process || '',
        c.region || '',
        c.variety || ''
      ].join(' ').toLowerCase();
      return text.indexOf(f) !== -1;
    });
  }

  /* ── API 호출 (DOM 무관) ── */

  /**
   * /api/search 엔드포인트를 호출하고 결과를 반환한다.
   * 성공 시 { coffee: {...} } 형태, 실패 시 예외를 던진다.
   *
   * @param {string} query - 검색 키워드
   * @returns {Promise<Object>} API 응답 JSON
   * @throws {Error} 네트워크 오류 또는 비정상 응답
   */
  async function searchAPI(query) {
    var res = await fetch('/api/search?q=' + encodeURIComponent(query));
    if (!res.ok) throw new Error('Search API failed: ' + res.status);
    return await res.json();
  }

  /* ── 로컬 DB 쓰기 ── */

  /**
   * AI 검색 결과를 로컬 DB에 저장한다 (중복 시 건너뜀).
   * 기존 doSearch() 내부의 "list.unshift + localStorage.setItem" 로직이다.
   *
   * @param {Object} coffee - 저장할 커피 객체
   * @returns {boolean} 저장 성공 여부 (중복이면 false)
   */
  function saveToLocalIfNew(coffee) {
    try {
      var list = getLocalCoffees();
      var exists = list.some(function (c) {
        return c.name && coffee.name &&
               c.name.toLowerCase() === coffee.name.toLowerCase();
      });
      if (exists) return false;
      list.unshift(coffee);
      localStorage.setItem('coffee_note_coffees', JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── 노출 ── */
  return {
    getLocalCoffees:  getLocalCoffees,
    filterByKeyword:  filterByKeyword,
    filterByCategory: filterByCategory,
    searchAPI:        searchAPI,
    saveToLocalIfNew: saveToLocalIfNew
  };

})();
