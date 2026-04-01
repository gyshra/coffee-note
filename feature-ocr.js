/**
 * feature-ocr.js — OCR 비즈니스 로직 모듈
 * Coffee Note v33 모듈화 Phase 1
 *
 * 원칙:
 *  - document.* 직접 호출 금지 (DOM 조작 없음)
 *  - 결과는 콜백(callback) 또는 반환값(return)으로만 전달
 *  - 전역 변수 ocrPayload를 내부 상태로 캡슐화
 */
const FeatureOCR = (function () {

  /* ── 내부 상태 (캡슐화) ── */
  let _payload = null;

  /* ── OCR 결과 필드 정의 (UI에서 그리드 렌더링 시 참조) ── */
  const FIELD_MAP = [
    ['name',     '원두명'],
    ['country',  '국가'],
    ['region',   '지역'],
    ['process',  '가공방식'],
    ['variety',  '품종'],
    ['altitude', '고도'],
    ['roaster',  '로스터리']
  ];

  /* ── 공개 API ── */

  /**
   * 현재 OCR 결과 payload를 반환한다.
   * @returns {Object|null}
   */
  function getPayload() {
    return _payload;
  }

  /**
   * base64 이미지를 /api/ocr 로 전송하고 결과를 파싱한다.
   * DOM을 건드리지 않으며, 성공/실패 시 콜백으로 결과를 전달한다.
   *
   * @param {string} base64Full - "data:image/...;base64,XXXXX" 전체 문자열
   * @param {function(payload:Object, rawText:string)} onSuccess
   * @param {function(error:Error)} onError
   */
  async function processImage(base64Full, onSuccess, onError) {
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
   * DOM을 건드리지 않고 순수 데이터만 반환한다.
   *
   * @param {Object} coffee - OCR 결과 객체
   * @param {string} rawText - 원본 OCR 텍스트
   * @returns {{ cells: Array<{key:string, label:string, value:string}>, rawText: string }}
   */
  function buildGridData(coffee, rawText) {
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

  /**
   * 내부 payload 상태를 초기화한다. (다시 찍기 시 호출)
   */
  function reset() {
    _payload = null;
  }

  /**
   * OCR 결과를 확정하고, 검색에 필요한 데이터를 반환한다.
   * sessionStorage 저장은 이 모듈 바깥(호출자)이 담당한다.
   *
   * @returns {{ query: string, payload: Object }|null}
   */
  function confirm() {
    if (!_payload) return null;
    var query = _payload.name || _payload.country || '';
    return { query: query, payload: Object.assign({}, _payload) };
  }

  /* ── 노출 ── */
  return {
    getPayload:   getPayload,
    processImage: processImage,
    buildGridData: buildGridData,
    reset:        reset,
    confirm:      confirm,
    FIELD_MAP:    FIELD_MAP
  };

})();
