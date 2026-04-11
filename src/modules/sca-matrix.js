/**
 * src/modules/sca-matrix.js
 * SCA Golden Cup 기반 48조합 레시피 매트릭스 (6가공 × 8추출법)
 *
 * 구조: SCA_MATRIX[method][process] = { temp, ratio, grindDesc, bloomSec, tipKr }
 * export: SCA_MATRIX, lookupRecipe(method, process, roast?)
 */

// ── 가공방식 온도 보정값 (baseline 대비 °C) ────────────────
const PROCESS_TEMP_OFFSET = {
  워시드:         0,   // baseline — 선명한 산미 그대로
  내추럴:        -2,   // 과일향 보존을 위해 낮게
  허니:          -1,   // 내추럴과 워시드 중간
  '무산소 발효': -3,   // 복잡한 향미 보호
  '카보닉 매서레이션': -3,
  '웻 헐드':      0,   // 어스티 특성은 온도 변화 불필요
};

// ── 가공방식별 팁 ──────────────────────────────────────────
const PROCESS_TIP = {
  워시드:         '산미가 선명하게 드러납니다. 표준 레시피로 원두 본래 특성을 파악하세요.',
  내추럴:         '과일향·단맛 살리기 위해 온도를 낮추고 뜸들이기를 길게.',
  허니:           '워시드와 내추럴의 중간. 단맛을 살리되 산미도 유지합니다.',
  '무산소 발효':  '복잡한 발효향이 특징. 낮은 온도로 향미 손실을 최소화.',
  '카보닉 매서레이션': '쥬시함이 핵심. 부드럽게 부어 과일향을 극대화.',
  '웻 헐드':      '묵직한 바디가 특징. 굵은 분쇄로 과추출을 방지하세요.',
};

// ── 로스팅 보정값 ──────────────────────────────────────────
const ROAST_TEMP_OFFSET = { light: -2, medium: 0, dark: -3 };
const ROAST_RATIO_OFFSET = { light: 0, medium: 0, dark: -0.5 }; // 비율 분모 조정

// ── 메서드 기본 레시피 (SCA Golden Cup 기준) ──────────────
const METHOD_BASE = {
  V60:          { temp: 93, ratio: '1:15', grindDesc: '중간-가늘게',  bloomSec: 30, brewTimeSec: 180 },
  칼리타:       { temp: 93, ratio: '1:15', grindDesc: '중간',        bloomSec: 30, brewTimeSec: 200 },
  케멕스:       { temp: 93, ratio: '1:16', grindDesc: '굵게-중간',    bloomSec: 45, brewTimeSec: 240 },
  에어로프레스: { temp: 88, ratio: '1:12', grindDesc: '중간-가늘게',  bloomSec:  0, brewTimeSec: 120 },
  프렌치프레스: { temp: 93, ratio: '1:14', grindDesc: '굵게',         bloomSec:  0, brewTimeSec: 240 },
  에스프레소:   { temp: 93, ratio: '1:2',  grindDesc: '매우 가늘게',  bloomSec:  0, brewTimeSec:  28 },
  모카포트:     { temp: 93, ratio: '1:7',  grindDesc: '중간-가늘게',  bloomSec:  0, brewTimeSec: 300 },
  콜드브루:     { temp: 20, ratio: '1:8',  grindDesc: '굵게',         bloomSec:  0, brewTimeSec: 43200 }, // 12h
};

const METHODS   = Object.keys(METHOD_BASE);
const PROCESSES = Object.keys(PROCESS_TEMP_OFFSET);

// ── 48조합 매트릭스 동적 생성 ─────────────────────────────
export const SCA_MATRIX = {};

for (const method of METHODS) {
  SCA_MATRIX[method] = {};
  const base = METHOD_BASE[method];
  for (const process of PROCESSES) {
    const tempOffset = PROCESS_TEMP_OFFSET[process];
    const parsedRatio = parseFloat(base.ratio.split(':')[1]);
    SCA_MATRIX[method][process] = {
      temp:         base.temp + tempOffset,
      ratio:        base.ratio,
      _ratioNum:    parsedRatio,
      grindDesc:    base.grindDesc,
      bloomSec:     process === '내추럴' || process === '무산소 발효' || process === '카보닉 매서레이션'
                      ? Math.max(base.bloomSec, 40)
                      : base.bloomSec,
      brewTimeSec:  base.brewTimeSec,
      tip:          PROCESS_TIP[process],
    };
  }
}

/**
 * SCA_MATRIX 조회 + 로스팅 보정 적용
 * @param {string} method   - 추출법 (V60, 칼리타, …)
 * @param {string} process  - 가공방식 (워시드, 내추럴, …)
 * @param {string} [roast]  - 로스팅 (light|medium|dark, 기본 medium)
 * @returns {{ temp, ratio, grindDesc, bloomSec, brewTimeSec, tip, source }}
 */
export function lookupRecipe(method, process, roast = 'medium') {
  const methodEntry   = SCA_MATRIX[method]   || SCA_MATRIX['V60'];
  const processEntry  = methodEntry[process] || methodEntry['워시드'];

  const tempAdj  = ROAST_TEMP_OFFSET[roast]  ?? 0;
  const ratioAdj = ROAST_RATIO_OFFSET[roast] ?? 0;
  const newRatioNum = processEntry._ratioNum + ratioAdj;

  return {
    temp:        processEntry.temp + tempAdj,
    ratio:       `1:${newRatioNum % 1 === 0 ? newRatioNum : newRatioNum.toFixed(1)}`,
    grindDesc:   processEntry.grindDesc,
    bloomSec:    processEntry.bloomSec,
    brewTimeSec: processEntry.brewTimeSec,
    tip:         processEntry.tip,
    source:      'sca_matrix',
  };
}

export { METHODS, PROCESSES };
