/**
 * src/modules/search.js
 * 검색 비즈니스 로직 — 로컬 필터링 + API 호출
 * (feature-search.js의 ES Module 버전)
 */

/** localStorage(또는 common.js의 getCoffees)에서 커피 목록을 반환한다. */
export function getLocalCoffees() {
  try {
    if (typeof getCoffees === 'function') return getCoffees();
    return JSON.parse(localStorage.getItem('coffee_note_coffees') || '[]');
  } catch (e) {
    return [];
  }
}

/** 커피 배열을 키워드로 필터링한다. */
export function filterByKeyword(coffees, query) {
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

/** 커피 배열을 카테고리(산지/가공방식)로 필터링한다. */
export function filterByCategory(coffees, category) {
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

/** /api/search 엔드포인트를 호출하고 결과를 반환한다. */
export async function searchAPI(query) {
  var res = await fetch('/api/search?q=' + encodeURIComponent(query));
  if (!res.ok) throw new Error('Search API failed: ' + res.status);
  return await res.json();
}

/** AI 검색 결과를 로컬 DB에 저장한다 (중복 시 건너뜀). */
export function saveToLocalIfNew(coffee) {
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

export const FeatureSearch = {
  getLocalCoffees,
  filterByKeyword,
  filterByCategory,
  searchAPI,
  saveToLocalIfNew
};
