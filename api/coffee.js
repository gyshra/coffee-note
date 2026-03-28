/**
 * Vercel Serverless Function — 공유 원두 DB
 * POST /api/coffee  { action, coffee, norm_key, coffee_id }
 *
 * actions:
 *   "upsert"  — norm_key로 중복 확인 후 없으면 등록, 있으면 반환
 *   "get"     — coffee_id 또는 norm_key로 원두 + 커뮤니티 데이터 조회
 *   "search"  — 텍스트로 원두 검색
 */

const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY; // service_role key (RLS 우회)
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * norm_key 생성
 * "에티오피아 예가체프 콩가 워시드" → "ethiopia_yirgacheffe_konga_washed"
 */
function makeNormKey(coffee) {
  const parts = [
    coffee.country || "",
    coffee.region  || "",
    coffee.farm    || "",
    coffee.process || coffee.processCategory || "",
  ];

  // 한글 → 영문 매핑 (주요 산지/가공)
  const map = {
    "에티오피아":"ethiopia","케냐":"kenya","콜롬비아":"colombia","과테말라":"guatemala",
    "코스타리카":"costarica","파나마":"panama","브라질":"brazil","인도네시아":"indonesia",
    "예멘":"yemen","르완다":"rwanda","부룬디":"burundi","탄자니아":"tanzania",
    "예가체프":"yirgacheffe","구지":"guji","시다모":"sidamo","하라":"harrar",
    "워시드":"washed","내추럴":"natural","허니":"honey","무산소":"anaerobic",
    "워싱스테이션":"","station":"","washing":"","washed":"washed",
  };

  const key = parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .map(w => map[w] || w)
    .filter(Boolean)
    .join("_")
    .replace(/_+/g, "_")
    .slice(0, 120);

  return key || "unknown";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { action, coffee, norm_key, coffee_id, query } = body || {};
  const supabase = getSupabase();

  // Supabase 미설정 시 → 로컬 전용 모드 (정상 동작)
  if (!supabase) {
    if (action === "upsert" && coffee) {
      const nk = makeNormKey(coffee);
      return res.status(200).json({ coffee: { ...coffee, norm_key: nk }, isNew: true, offlineMode: true });
    }
    return res.status(200).json({ offlineMode: true });
  }

  try {
    // ─── upsert: 원두 등록 or 기존 반환 ────────────────
    if (action === "upsert" && coffee) {
      const nk = norm_key || makeNormKey(coffee);

      // 1. 기존 원두 확인
      const { data: existing } = await supabase
        .from("coffees")
        .select("*, tastings(rating, flavor_tags, brew_method, memo, created_at, is_public)")
        .eq("norm_key", nk)
        .single();

      if (existing) {
        // 기존 원두 + 커뮤니티 데이터 반환
        return res.status(200).json({
          coffee: formatCoffee(existing),
          isNew: false,
          community: buildCommunity(existing.tastings || []),
        });
      }

      // 2. 신규 등록
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
        notes:            coffee.notes || [],
        price:            coffee.price || "",
        ai_prediction:    coffee.aiPrediction || null,
        sources:          coffee.sources || null,
        description:      coffee.description || "",
        keywords:         coffee.keywords || [],
        source:           coffee.source || "ai_search",
      };

      const { data: inserted, error } = await supabase
        .from("coffees")
        .insert(row)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        coffee: formatCoffee(inserted),
        isNew: true,
        community: { count: 0, avgRating: null, topFlavors: [], topBrewMethods: [] },
      });
    }

    // ─── get: 원두 + 커뮤니티 데이터 조회 ────────────────
    if (action === "get") {
      let query_builder = supabase
        .from("coffees")
        .select(`
          *,
          tastings (
            rating, flavor_tags, brew_method, memo,
            aroma, acidity, sweetness, body, aftertaste,
            created_at, is_public
          ),
          recipes (
            brew_method, temp, water, dose, grind, note,
            steps, likes, created_at, is_public
          )
        `);

      if (coffee_id) {
        query_builder = query_builder.eq("id", coffee_id);
      } else if (norm_key) {
        query_builder = query_builder.eq("norm_key", norm_key);
      } else {
        return res.status(400).json({ error: "coffee_id 또는 norm_key 필요" });
      }

      const { data, error } = await query_builder.single();
      if (error || !data) return res.status(404).json({ error: "원두를 찾을 수 없습니다." });

      return res.status(200).json({
        coffee: formatCoffee(data),
        community: buildCommunity(data.tastings || []),
        recipes: (data.recipes || []).filter(r => r.is_public).slice(0, 5),
      });
    }

    // ─── search: 텍스트 검색 ──────────────────────────
    if (action === "search" && query) {
      const { data, error } = await supabase
        .from("coffees")
        .select("id, norm_key, name, roaster, country, region, process, notes, avg_rating, tasting_count")
        .or(`name.ilike.%${query}%,region.ilike.%${query}%,country.ilike.%${query}%,farm.ilike.%${query}%`)
        .order("tasting_count", { ascending: false })
        .limit(10);

      if (error) throw error;
      return res.status(200).json({ results: data || [] });
    }

    return res.status(400).json({ error: "알 수 없는 action" });

  } catch (err) {
    console.error("[Coffee API] 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};

// ─── 헬퍼 함수 ───────────────────────────────────────

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
    avg_rating:      row.avg_rating,
    tasting_count:   row.tasting_count,
    aiPrediction:    row.ai_prediction,
    sources:         row.sources,
    description:     row.description,
    keywords:        row.keywords || [],
    source:          row.source,
    mapText:         [(row.region || ""), (row.country || "")].filter(Boolean).join(", ") + " | 지도 연동 예정",
    rating:          row.avg_rating || 0,
  };
}

function buildCommunity(tastings) {
  const pub = tastings.filter(t => t.is_public !== false);
  if (!pub.length) return { count: 0, avgRating: null, topFlavors: [], topBrewMethods: [], radarAvg: null };

  // 평균 별점
  const ratings = pub.filter(t => t.rating != null).map(t => Number(t.rating));
  const avgRating = ratings.length ? Math.round((ratings.reduce((a,b)=>a+b,0) / ratings.length) * 10) / 10 : null;

  // 인기 향미 태그
  const flavorCount = {};
  pub.forEach(t => (t.flavor_tags || []).forEach(f => { flavorCount[f] = (flavorCount[f] || 0) + 1; }));
  const topFlavors = Object.entries(flavorCount).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k])=>k);

  // 인기 추출 방법
  const brewCount = {};
  pub.forEach(t => { if (t.brew_method) brewCount[t.brew_method] = (brewCount[t.brew_method] || 0) + 1; });
  const topBrewMethods = Object.entries(brewCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({method:k, count:v}));

  // 레이더 평균
  const axes = ["aroma","acidity","sweetness","body","aftertaste"];
  const radarAvg = {};
  axes.forEach(ax => {
    const vals = pub.filter(t => t[ax] != null).map(t => Number(t[ax]));
    radarAvg[ax] = vals.length ? Math.round((vals.reduce((a,b)=>a+b,0) / vals.length) * 10) / 10 : null;
  });

  return { count: pub.length, avgRating, topFlavors, topBrewMethods, radarAvg };
}
