/**
 * 공유 Supabase 헬퍼
 * 모든 API 함수에서 require("../_lib/supabase") 로 사용
 */
const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false }
  });
  return _client;
}

/**
 * norm_key 생성 — 한글/영문 혼용 원두명을 정규화
 * "에티오피아 예가체프 콩가 워시드" → "ethiopia_yirgacheffe_konga_washed"
 */
function makeNormKey(coffee) {
  const koToEn = {
    // 국가
    "에티오피아":"ethiopia","케냐":"kenya","콜롬비아":"colombia","과테말라":"guatemala",
    "코스타리카":"costarica","파나마":"panama","브라질":"brazil","인도네시아":"indonesia",
    "예멘":"yemen","르완다":"rwanda","부룬디":"burundi","탄자니아":"tanzania",
    "엘살바도르":"elsalvador","온두라스":"honduras","니카라과":"nicaragua","페루":"peru",
    // 지역
    "예가체프":"yirgacheffe","구지":"guji","시다모":"sidamo","하라":"harrar",
    "끼리냐가":"kirinyaga","냐에리":"nyeri","게이샤":"geisha",
    // 가공방식
    "워시드":"washed","내추럴":"natural","허니":"honey","무산소":"anaerobic",
    "카보닉":"cm","탄산침용":"cm","유산소":"aerobic","혐기성":"anaerobic",
    "내추럴 cm":"natural_cm","무산소 내추럴":"anaerobic_natural",
    // 불필요 단어 제거
    "워싱스테이션":"","station":"","washing":"","cooperative":"","협동조합":"",
  };

  const parts = [
    coffee.country || "",
    coffee.region  || "",
    coffee.farm    || "",
    coffee.process || coffee.processCategory || "",
  ].join(" ").toLowerCase();

  const key = parts
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .map(w => koToEn[w] !== undefined ? koToEn[w] : w)
    .filter(Boolean)
    .join("_")
    .replace(/_+/g, "_")
    .slice(0, 120);

  return key || "unknown_" + Date.now();
}

/**
 * 원두 upsert — norm_key로 중복 확인 후 없으면 등록, 있으면 반환
 */
async function upsertCoffee(coffee) {
  const supabase = getClient();
  if (!supabase) return { coffee, community: null, offlineMode: true };

  const nk = makeNormKey(coffee);

  // 기존 원두 조회
  const { data: existing } = await supabase
    .from("coffees")
    .select("*")
    .eq("norm_key", nk)
    .maybeSingle();

  if (existing) {
    // 커뮤니티 데이터도 조회
    const { data: tastings } = await supabase
      .from("tastings")
      .select("rating, flavor_tags, brew_method, aroma, acidity, sweetness, body, aftertaste, is_public")
      .eq("coffee_id", existing.id)
      .eq("is_public", true);

    const { data: recipes } = await supabase
      .from("recipes")
      .select("brew_method, temp, water, dose, grind, note, steps, likes")
      .eq("coffee_id", existing.id)
      .eq("is_public", true)
      .order("likes", { ascending: false })
      .limit(3);

    return {
      coffee: formatCoffee(existing),
      community: buildCommunity(tastings || []),
      recipes: recipes || [],
      isNew: false,
    };
  }

  // 신규 등록
  const row = {
    norm_key:         nk,
    name:             coffee.name || "",
    roaster:          coffee.roaster || "",
    country:          coffee.country || "",
    region:           coffee.region || "",
    farm:             coffee.farm || "",
    altitude:         coffee.altitude || "",
    process:          coffee.process || coffee.processCategory || "",
    process_category: coffee.processCategory || coffee.process || "",
    variety:          coffee.variety || "",
    notes:            Array.isArray(coffee.notes) ? coffee.notes : [],
    price:            coffee.price || "",
    ai_prediction:    coffee.aiPrediction || null,
    sources:          coffee.sources || null,
    description:      coffee.description || "",
    keywords:         Array.isArray(coffee.keywords) ? coffee.keywords : [],
    source:           coffee.source || "ai_search",
  };

  const { data: inserted, error } = await supabase
    .from("coffees")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] insert 오류:", error.message);
    return { coffee, community: null, isNew: true };
  }

  return {
    coffee: formatCoffee(inserted),
    community: { count: 0, avgRating: null, topFlavors: [], topBrewMethods: [], radarAvg: null },
    recipes: [],
    isNew: true,
  };
}

function formatCoffee(row) {
  return {
    id:              row.id,
    norm_key:        row.norm_key,
    name:            row.name,
    roaster:         row.roaster,
    country:         row.country,
    region:          row.region,
    farm:            row.farm,
    altitude:        row.altitude,
    process:         row.process,
    processCategory: row.process_category,
    variety:         row.variety,
    notes:           row.notes || [],
    price:           row.price,
    rating:          row.avg_rating || 0,
    avg_rating:      row.avg_rating,
    tasting_count:   row.tasting_count,
    aiPrediction:    row.ai_prediction,
    sources:         row.sources,
    description:     row.description,
    keywords:        row.keywords || [],
    source:          row.source,
    mapText: [(row.region||""), (row.country||"")].filter(Boolean).join(", ") + " | 지도 연동 예정",
  };
}

function buildCommunity(tastings) {
  if (!tastings.length) return { count: 0, avgRating: null, topFlavors: [], topBrewMethods: [], radarAvg: null };

  const ratings = tastings.filter(t => t.rating != null).map(t => Number(t.rating));
  const avgRating = ratings.length
    ? Math.round(ratings.reduce((a,b)=>a+b,0) / ratings.length * 10) / 10
    : null;

  const flavorCount = {};
  tastings.forEach(t => (t.flavor_tags||[]).forEach(f => { flavorCount[f] = (flavorCount[f]||0)+1; }));
  const topFlavors = Object.entries(flavorCount).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k])=>k);

  const brewCount = {};
  tastings.forEach(t => { if (t.brew_method) brewCount[t.brew_method] = (brewCount[t.brew_method]||0)+1; });
  const topBrewMethods = Object.entries(brewCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({method:k,count:v}));

  const axes = ["aroma","acidity","sweetness","body","aftertaste"];
  const radarAvg = {};
  axes.forEach(ax => {
    const vals = tastings.filter(t=>t[ax]!=null).map(t=>Number(t[ax]));
    radarAvg[ax] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : null;
  });

  return { count: tastings.length, avgRating, topFlavors, topBrewMethods, radarAvg };
}

module.exports = { getClient, makeNormKey, upsertCoffee, formatCoffee, buildCommunity };
