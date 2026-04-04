/**
 * src/modules/storage-recent.js
 * 최근 검색 데이터 관리 — localStorage I/O
 * (data-recent.js의 ES Module 버전)
 */

const STORAGE_KEY = 'coffee_note_recent';
const MAX_ITEMS = 10;

/** 최근 검색 목록을 반환한다. */
export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/** 검색어를 목록 맨 앞에 추가한다 (중복 제거 + 10개 제한). */
export function add(query) {
  var list = getAll().filter(function (r) { return r !== query; });
  list.unshift(query);
  list = list.slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

/** 특정 검색어를 목록에서 제거한다. */
export function remove(query) {
  var list = getAll().filter(function (r) { return r !== query; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

/** 목록을 전부 비운다. */
export function clearAll() {
  localStorage.setItem(STORAGE_KEY, '[]');
  return [];
}

export const DataRecent = { getAll, add, remove, clearAll };
