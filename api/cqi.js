/**
 * GET /api/cqi?country=에티오피아&process=워시드&variety=Heirloom
 * CQI 데이터셋에서 유사 원두의 전문가 평가 기준값 반환
 */
const { getClient } = require("./_lib/supabase");

/* 한글 → 영문 국가명 매핑 */
const COUNTRY_MAP = {
  "에티오피아":"Ethiopia","케냐":"Kenya","콜롬비아":"Colombia",
  "과테말라":"Guatemala","코스타리카":"Costa Rica","파나마":"Panama",
  "브라질":"Brazil","인도네시아":"Indonesia","예멘":"Yemen",
  "르완다":"Rwanda","부룬디":"Burundi","탄자니아":"Tanzania",
  "엘살바도르":"El Salvador","온두라스":"Honduras","니카라과":"Nicaragua",
  "페루":"Peru","볼리비아":"Bolivia","멕시코":"Mexico","중국":"China",
  "대만":"Taiwan","미국":"United States","하와이":"United States",
};

/* 가공방식 정규화 */
const PROCESS_MAP = {
  "워시드":"Washed","내추럴":"Natural","허니":"Honey",
  "무산소 워시드":"Anaerobic","무산소 내추럴":"Natural",
  "CM 내추럴":"Natural","CM 워시드":"Washed",
  "유산균 발효":"Washed","더블 퍼멘테이션":"Natural","웻 헐드":"Wet-Hulled",
  "washed":"Washed","natural":"Natural","honey":"Honey",
};

function normalizeCountry(raw) {
  if (!raw) return null;
  return COUNTRY_MAP[raw.trim()] || raw.trim();
}

function normalizeProcess(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  for (const [k, v] of Object.entries(PROCESS_MAP)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return raw.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { country, process: proc, variety } = req.query || {};

  const sb = getClient();
  if (!sb) {
    return res.status(200).json({ found: false, reason: "supabase_not_configured" });
  }

  try {
    const countryEn = normalizeCountry(country);
    const processEn = normalizeProcess(proc);

    let query = sb
      .from("cqi_benchmarks")
      .select("aroma,flavor,aftertaste,acidity,body,balance,sweetness,total_score,country,process,variety")
      .order("total_score", { ascending: false });

    /* 우선순위: 국가+가공 → 국가만 → 전체 평균 */
    if (countryEn) {
      query = query.ilike("country", `%${countryEn}%`);
    }
    if (processEn) {
      query = query.ilike("process", `%${processEn}%`);
    }

    const { data, error } = await query.limit(30);

    if (error) throw error;

    if (!data || data.length === 0) {
      /* 폴백: 전체 평균 */
      const { data: all } = await sb
        .from("cqi_benchmarks")
        .select("aroma,flavor,aftertaste,acidity,body,balance,sweetness,total_score")
        .limit(200);

      if (!all || !all.length) {
        return res.status(200).json({ found: false, reason: "no_data" });
      }

      return res.status(200).json({
        found: true,
        matchLevel: "global_average",
        count: all.length,
        scores: avgScores(all),
      });
    }

    return res.status(200).json({
      found: true,
      matchLevel: countryEn && processEn ? "country_process" : countryEn ? "country" : "all",
      count: data.length,
      scores: avgScores(data),
      sample: data[0], /* 최고 점수 원두 예시 */
    });

  } catch (e) {
    console.error("[CQI]", e.message);
    return res.status(200).json({ found: false, reason: e.message });
  }
};

function avgScores(rows) {
  const keys = ["aroma","flavor","aftertaste","acidity","body","balance","sweetness","total_score"];
  const sums = {};
  const counts = {};
  keys.forEach(k => { sums[k] = 0; counts[k] = 0; });

  rows.forEach(r => {
    keys.forEach(k => {
      if (r[k] != null && !isNaN(r[k])) {
        sums[k] += Number(r[k]);
        counts[k]++;
      }
    });
  });

  const result = {};
  keys.forEach(k => {
    result[k] = counts[k] > 0 ? Math.round((sums[k] / counts[k]) * 10) / 10 : null;
  });

  /* 레이더 5축 매핑 (앱에서 사용하는 키) */
  result["radar"] = {
    아로마:   result.aroma     || 7,
    산미:     result.acidity   || 7,
    단맛:     result.sweetness || 7,
    바디감:   result.body      || 7,
    여운:     result.aftertaste|| 7,
  };

  return result;
}
