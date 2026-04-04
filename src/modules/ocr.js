/**
 * src/modules/ocr.js
 * OCR 비즈니스 로직 — /api/ocr 호출 + payload 캡슐화
 * (feature-ocr.js의 ES Module 버전)
 */

/** OCR 결과 필드 정의 */
export const FIELD_MAP = [
  ['name',     '원두명'],
  ['country',  '국가'],
  ['region',   '지역'],
  ['process',  '가공방식'],
  ['variety',  '품종'],
  ['altitude', '고도'],
  ['roaster',  '로스터리']
];

let _payload = null;

/** 현재 OCR 결과 payload를 반환한다. */
export function getPayload() {
  return _payload;
}

/**
 * base64 이미지를 /api/ocr 로 전송하고 결과를 파싱한다.
 * DOM을 건드리지 않으며, 성공/실패 시 콜백으로 결과를 전달한다.
 */
export async function processImage(base64Full, onSuccess, onError) {
  var base64 = base64Full.split(',')[1];
  try {
    var res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 })
    });
    var data = await res.json();
    _payload = data.coffee || data;
    var rawText = data.rawText || '';
    if (onSuccess) onSuccess(_payload, rawText);
  } catch (err) {
    _payload = null;
    if (onError) onError(err);
  }
}

/**
 * OCR 결과 payload로부터 UI 그리드에 사용할 셀 배열을 생성한다.
 */
export function buildGridData(coffee, rawText) {
  var cells = [];
  for (var i = 0; i < FIELD_MAP.length; i++) {
    var key = FIELD_MAP[i][0];
    var label = FIELD_MAP[i][1];
    if (coffee[key]) {
      cells.push({ key: key, label: label, value: coffee[key] });
    }
  }
  return { cells: cells, rawText: rawText || '' };
}

/** 내부 payload 상태를 초기화한다. */
export function reset() {
  _payload = null;
}

/** OCR 결과를 확정하고, 검색에 필요한 데이터를 반환한다. */
export function confirm() {
  if (!_payload) return null;
  var query = _payload.name || _payload.country || '';
  return { query: query, payload: Object.assign({}, _payload) };
}

export const FeatureOCR = { getPayload, processImage, buildGridData, reset, confirm, FIELD_MAP };
