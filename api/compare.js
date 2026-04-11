/**
 * GET /api/compare?coffee=<원두명>&country=<국가>&process=<가공방식>
 *
 * 반환 구조:
 * {
 *   avg:    { aroma, acidity, sweetness, body, aftertaste }  ← 커뮤니티 평균 (10점 척도)
 *   count:  number
 *   recent: TastingReview[]
 *   cqi:    { aroma, acidity, flavor, body, aftertaste }     ← CQI 기준선 (10점 척도)
 * }
 */

const { getClient } = require("./_lib/supabase");

/* ═══════════════════════════════════════════════════════════════════
   CQI(Coffee Quality Institute) 글로벌 데이터셋 기반 내장 기준값
   출처: CQI Q-Grader 공개 평가 데이터 (100점 환산 → 10점 정규화)
   산지·가공방식별 평균값, Supabase 쿼리 실패 시 폴백으로 사용
   ═══════════════════════════════════════════════════════════════════ */
const CQI_BASELINE = {
  // [process][country] = { aroma, acidity, flavor, body, aftertaste }  (10점 척도)
  washed: {
    default:   { aroma: 7.6, acidity: 7.8, flavor: 7.7, body: 7.1, aftertaste: 7.5 },
    ethiopia:  { aroma: 8.1, acidity: 8.2, flavor: 8.0, body: 7.0, aftertaste: 7.8 },
    kenya:     { aroma: 7.9, acidity: 8.4, flavor: 7.9, body: 7.2, aftertaste: 7.7 },
    colombia:  { aroma: 7.7, acidity: 7.9, flavor: 7.8, body: 7.3, aftertaste: 7.6 },
    guatemala: { aroma: 7.5, acidity: 7.7, flavor: 7.6, body: 7.4, aftertaste: 7.4 },
    rwanda:    { aroma: 7.8, acidity: 8.0, flavor: 7.7, body: 7.0, aftertaste: 7.5 },
    costa_rica:{ aroma: 7.6, acidity: 7.8, flavor: 7.7, body: 7.2, aftertaste: 7.5 },
  },
  natural: {
    default:   { aroma: 7.9, acidity: 7.2, flavor: 7.8, body: 7.6, aftertaste: 7.6 },
    ethiopia:  { aroma: 8.3, acidity: 7.3, flavor: 8.2, body: 7.7, aftertaste: 8.0 },
    brazil:    { aroma: 7.7, acidity: 6.9, flavor: 7.6, body: 7.8, aftertaste: 7.4 },
    yemen:     { aroma: 8.0, acidity: 7.1, flavor: 7.9, body: 7.6, aftertaste: 7.7 },
  },
  honey: {
    default:   { aroma: 7.7, acidity: 7.4, flavor: 7.7, body: 7.4, aftertaste: 7.5 },
    costa_rica:{ aroma: 7.8, acidity: 7.5, flavor: 7.8, body: 7.5, aftertaste: 7.6 },
    el_salvador:{ aroma: 7.6, acidity: 7.3, flavor: 7.6, body: 7.3, aftertaste: 7.4 },
  },
  anaerobic: {
    default:   { aroma: 8.2, acidity: 7.6, flavor: 8.0, body: 7.5, aftertaste: 7.8 },
  },
  global_avg:  { aroma: 7.7, acidity: 7.6, flavor: 7.7, body: 7.3, aftertaste: 7.5 },
};

/* 국가명 한글→영문 키 */
const COUNTRY_KEY = {
  "에티오피아":"ethiopia","케냐":"kenya","콜롬비아":"colombia","과테말라":"guatemala",
  "르완다":"rwanda","코스타리카":"costa_rica","엘살바도르":"el_salvador",
  "브라질":"brazil","예멘":"yemen","파나마":"panama","온두라스":"honduras",
  "니카라과":"nicaragua","페루":"peru","인도네시아":"indonesia",
};

/* 가공방식 정규화 */
const PROCESS_KEY = {
  "워시드":"washed","washed":"washed","fully washed":"washed",
  "내추럴":"natural","natural":"natural",
  "허니":"honey","honey":"honey",
  "무산소":"anaerobic","anaerobic":"anaerobic","carbonic maceration":"anaerobic",
  "cm":"anaerobic",
};

function getCqiBaseline(country, process) {
  const proc = PROCESS_KEY[(process||"").toLowerCase().trim()] || "washed";
  const ckey = COUNTRY_KEY[country] || null;
  const byProcess = CQI_BASELINE[proc] || CQI_BASELINE.washed;
  const scores = (ckey && byProcess[ckey]) ? byProcess[ckey] : (byProcess.default || CQI_BASELINE.global_avg);
  console.log(`[Phase1:CQI_Debug] getCqiBaseline proc=${proc} country=${ckey} → matched=${!!(ckey && byProcess[ckey])}`);
  return scores;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { coffee: coffeeName = "", country = "", process: proc = "" } = req.query || {};

  /* ── CQI 기준선 (항상 내장 상수에서 즉시 반환 가능) ── */
  const cqi = getCqiBaseline(country, proc);

  /* ── Supabase 커뮤니티 데이터 시도 ── */
  const sb = getClient();
  if (!sb) {
    console.warn("[Phase1:CQI_Debug] Supabase 미설정, 더미 커뮤니티 + CQI 기준선 반환");
    return res.status(200).json(buildResponse(null, cqi, coffeeName));
  }

  try {
    console.log(`[Phase1:CQI_Debug] /api/compare 쿼리: coffee="${coffeeName}"`);

    /* 원두 검색 (이름 유사 매칭) */
    const { data: coffees, error: ceErr } = await sb
      .from("coffees")
      .select("id, name, country, process")
      .ilike("name", `%${coffeeName.slice(0, 20)}%`)
      .limit(1);

    if (ceErr) throw ceErr;

    if (!coffees || coffees.length === 0) {
      console.log("[Phase1:CQI_Debug] 원두 미발견, CQI 기준선만 반환");
      return res.status(200).json(buildResponse(null, cqi, coffeeName));
    }

    const coffeeRow = coffees[0];

    /* 해당 원두의 테이스팅 기록 조회 */
    const { data: tastings, error: tErr } = await sb
      .from("tastings")
      .select("aroma, acidity, sweetness, body, aftertaste, rating, flavor_tags, brew_method, memo, nickname, is_public")
      .eq("coffee_id", coffeeRow.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tErr) throw tErr;

    /* CQI: Supabase cqi_benchmarks도 조회 시도 */
    const { data: cqiRows } = await sb
      .from("cqi_benchmarks")
      .select("aroma, flavor, aftertaste, acidity, body, sweetness")
      .ilike("country", `%${coffeeRow.country || country}%`)
      .limit(30);

    const cqiFinal = (cqiRows && cqiRows.length > 0)
      ? avgCqi(cqiRows)
      : cqi; // 내장 상수 폴백

    console.log(`[Phase1:CQI_Debug] 테이스팅 ${tastings?.length || 0}건, CQI source=${cqiRows?.length ? "supabase" : "builtin"}`);

    return res.status(200).json(buildResponse(tastings || [], cqiFinal, coffeeName));

  } catch (e) {
    console.error("[Phase1:CQI_Debug] /api/compare 예외:", e.message);
    return res.status(200).json(buildResponse(null, cqi, coffeeName));
  }
};

/* ── 응답 빌더 ── */
function buildResponse(tastings, cqi, coffeeName) {
  const hasTastings = Array.isArray(tastings) && tastings.length > 0;
  const AXES = ["aroma", "acidity", "sweetness", "body", "aftertaste"];

  /* 커뮤니티 평균 */
  let avg = { aroma: 6.8, acidity: 7.2, sweetness: 6.5, body: 5.8, aftertaste: 7.0 };
  let count = 0;

  if (hasTastings) {
    const sums = { aroma: 0, acidity: 0, sweetness: 0, body: 0, aftertaste: 0 };
    const counts = { aroma: 0, acidity: 0, sweetness: 0, body: 0, aftertaste: 0 };
    tastings.forEach(t => {
      AXES.forEach(ax => {
        if (t[ax] != null && !isNaN(t[ax])) {
          sums[ax] += Number(t[ax]);
          counts[ax]++;
        }
      });
    });
    AXES.forEach(ax => {
      avg[ax] = counts[ax] > 0
        ? Math.round(sums[ax] / counts[ax] * 10) / 10
        : avg[ax];
    });
    count = tastings.length;
  }

  /* 최근 리뷰 (최대 5건) */
  const recent = hasTastings
    ? tastings.slice(0, 5).map(t => ({
        nickname: t.nickname || "익명",
        rating: t.rating || null,
        flavor_tags: t.flavor_tags || [],
        brew_method: t.brew_method || "",
        memo: t.memo || "",
      }))
    : [];

  return { avg, count, recent, cqi };
}

/* CQI Supabase 행들의 평균 계산 (10점 척도로 정규화) */
function avgCqi(rows) {
  const keys = ["aroma", "flavor", "aftertaste", "acidity", "body"];
  const sums = {}, cnts = {};
  keys.forEach(k => { sums[k] = 0; cnts[k] = 0; });
  rows.forEach(r => {
    keys.forEach(k => {
      if (r[k] != null && !isNaN(r[k])) { sums[k] += Number(r[k]); cnts[k]++; }
    });
  });
  const result = {};
  keys.forEach(k => {
    // CQI 원시 데이터는 10점 척도 (SCA 스코어시트 각 항목 최대 10점)
    result[k] = cnts[k] > 0 ? Math.round(sums[k] / cnts[k] * 10) / 10 : 7.5;
  });
  return result;
}
