/**
 * src/modules/coffee-knowledge.js
 * 가공방식·산지별 설명 + 맛에 미치는 영향 정적 데이터
 * export: PROCESS_KNOWLEDGE, COUNTRY_KNOWLEDGE, getProcessInfo(), getCountryInfo()
 */

export const PROCESS_KNOWLEDGE = {
  워시드: {
    label: "워시드 (Washed)",
    emoji: "💧",
    desc: "과육을 물로 씻어 제거한 후 건조. 생두 고유의 특성이 가장 잘 드러납니다.",
    flavorEffect: "산미가 선명하고 깨끗합니다. 플로럴·시트러스 계열 향미가 두드러지며 바디감은 가볍습니다.",
    keywords: ["클린", "산미", "밝음", "플로럴"],
  },
  내추럴: {
    label: "내추럴 (Natural)",
    emoji: "☀️",
    desc: "과육 그대로 통째로 건조. 발효 과정에서 과일 풍미가 생두에 스며듭니다.",
    flavorEffect: "달콤하고 과일향이 강합니다. 베리·열대과일 계열 향미와 묵직한 바디감이 특징입니다.",
    keywords: ["달콤", "과일", "바디", "발효"],
  },
  허니: {
    label: "허니 (Honey)",
    emoji: "🍯",
    desc: "과육 일부를 남기고 건조. 워시드와 내추럴의 중간 성격을 가집니다.",
    flavorEffect: "꿀·황도 같은 부드러운 단맛과 중간 바디감. 워시드의 깔끔함 + 내추럴의 단맛을 함께 즐길 수 있습니다.",
    keywords: ["단맛", "부드러움", "균형", "꿀"],
  },
  "무산소 발효": {
    label: "무산소 발효 (Anaerobic)",
    emoji: "🔬",
    desc: "밀폐 탱크 안에서 산소 없이 발효. 독특하고 강렬한 향미를 만들어냅니다.",
    flavorEffect: "복잡하고 개성 강한 향미. 발효 특유의 와인·열대과일·캔디 계열이 강하게 나타납니다.",
    keywords: ["개성", "복잡", "와인", "발효"],
  },
  "카보닉 매서레이션": {
    label: "카보닉 매서레이션 (CM)",
    emoji: "🍷",
    desc: "이산화탄소 환경에서 탄산침용 방식으로 발효. 와인 양조 기법에서 차용했습니다.",
    flavorEffect: "쥬시하고 와인 같은 질감. 과일향이 폭발적으로 나타나며 애프터에 독특한 여운이 남습니다.",
    keywords: ["쥬시", "와인", "과일", "여운"],
  },
  "웻 헐드": {
    label: "웻 헐드 (Wet Hulled)",
    emoji: "🌿",
    desc: "인도네시아 전통 방식(길링 바사). 높은 습도 환경에서 반건조 상태로 탈곡합니다.",
    flavorEffect: "바디감이 매우 묵직하고 어스티(흙내음)합니다. 낮은 산미와 강한 허브·우디 계열 향미가 특징입니다.",
    keywords: ["묵직", "흙내음", "허브", "낮은산미"],
  },
};

export const COUNTRY_KNOWLEDGE = {
  에티오피아: {
    flag: "🇪🇹",
    region: "아프리카",
    desc: "커피의 발원지. 예가체프·시다마·짐마 등 지역별 개성이 강합니다.",
    flavorEffect: "플로럴·베리·시트러스 계열 향미가 풍부합니다. 특히 내추럴은 블루베리·자스민으로 유명합니다.",
    altitude: "1,500–2,200m",
    notable: ["예가체프", "시다마", "구지", "짐마"],
  },
  케냐: {
    flag: "🇰🇪",
    region: "아프리카",
    desc: "SL28·SL34 등 고유 품종. 더블 워시드(케냐식 처리)로 유명합니다.",
    flavorEffect: "검은 베리류(블랙커런트)와 강렬한 산미, 과일즙 같은 쥬시함이 특징입니다.",
    altitude: "1,400–2,000m",
    notable: ["니에리", "키리냐가", "무랑가"],
  },
  콜롬비아: {
    flag: "🇨🇴",
    region: "중남미",
    desc: "다양한 재배지와 소농 중심. 안정적인 품질로 스페셜티 입문 원두로 인기입니다.",
    flavorEffect: "캐러멜·초콜릿·견과류 + 부드러운 산미. 균형감이 뛰어나 어떤 추출법에도 잘 맞습니다.",
    altitude: "1,200–2,000m",
    notable: ["우일라", "나리뇨", "안티오키아", "카우카"],
  },
  파나마: {
    flag: "🇵🇦",
    region: "중남미",
    desc: "게이샤(Geisha) 품종의 고향. 경매가 세계 최고 수준을 자랑합니다.",
    flavorEffect: "자스민·복숭아·베르가못 계열의 독보적인 플로럴 향. 티(tea)처럼 가볍고 섬세합니다.",
    altitude: "1,200–1,700m",
    notable: ["보케테", "볼칸"],
  },
  과테말라: {
    flag: "🇬🇹",
    region: "중남미",
    desc: "화산성 토양과 높은 고도. 지역별로 뚜렷한 개성을 가집니다.",
    flavorEffect: "다크초콜릿·갈색설탕·사과 산미. 묵직한 바디와 달콤함이 균형을 이룹니다.",
    altitude: "1,300–1,800m",
    notable: ["안티구아", "우에우에테낭고", "아카테낭고"],
  },
  브라질: {
    flag: "🇧🇷",
    region: "중남미",
    desc: "세계 최대 생산국. 낮은 고도와 자연 건조로 부드럽고 달콤한 원두가 많습니다.",
    flavorEffect: "헤이즐넛·밀크초콜릿·카라멜. 낮은 산미와 풀바디. 에스프레소 블렌딩 베이스로 많이 사용됩니다.",
    altitude: "800–1,300m",
    notable: ["세라도", "술미나스", "모지아나"],
  },
  코스타리카: {
    flag: "🇨🇷",
    region: "중남미",
    desc: "허니 프로세스 발전지. 소규모 마이크로밀 시스템으로 품질 관리합니다.",
    flavorEffect: "꿀·사과·황도 계열의 부드러운 단맛. 깔끔한 산미와 무게감 있는 바디감을 동시에 즐길 수 있습니다.",
    altitude: "1,200–1,700m",
    notable: ["타라수", "센트럴 밸리", "웨스트 밸리"],
  },
  인도네시아: {
    flag: "🇮🇩",
    region: "아시아·태평양",
    desc: "수마트라·자바·술라웨시. 웻 헐드 방식으로 독특한 어스티 풍미를 만듭니다.",
    flavorEffect: "흙내음·허브·다크초콜릿·담배. 묵직한 바디와 낮은 산미. 호불호가 갈리는 강한 개성이 특징입니다.",
    altitude: "700–1,500m",
    notable: ["만델링", "가요 마운틴", "토라자"],
  },
  예멘: {
    flag: "🇾🇪",
    region: "중동",
    desc: "커피 무역의 역사적 발원지 모카항. 고대 품종과 전통 건조 방식을 유지합니다.",
    flavorEffect: "와인·블루베리·향신료·다크초콜릿. 복잡하고 진한 풍미 + 독특한 발효 여운이 매력입니다.",
    altitude: "1,500–2,500m",
    notable: ["하라즈", "마타리", "이스마일리"],
  },
  페루: {
    flag: "🇵🇪",
    region: "중남미",
    desc: "최근 스페셜티 시장에서 주목받는 신흥 생산지. 유기농 재배 비율이 높습니다.",
    flavorEffect: "밀크초콜릿·사탕수수·견과류. 부드럽고 달콤하며 산미가 은은합니다. 안정적이고 친근한 맛입니다.",
    altitude: "1,000–1,800m",
    notable: ["차마야", "산 이그나시오", "아야바카"],
  },
};

/**
 * @param {string} process - 가공방식 키
 * @returns {{ label, emoji, desc, flavorEffect, keywords } | null}
 */
export function getProcessInfo(process) {
  return PROCESS_KNOWLEDGE[process] || null;
}

/**
 * @param {string} country - 국가명 키
 * @returns {{ flag, region, desc, flavorEffect, altitude, notable } | null}
 */
export function getCountryInfo(country) {
  return COUNTRY_KNOWLEDGE[country] || null;
}
