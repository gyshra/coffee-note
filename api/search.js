/**
 * Vercel Serverless Function — AI 원두 검색
 * POST /api/search  { query }
 */
const { upsertCoffee } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const query = body && body.query;
  if (!query) return res.status(400).json({ error: "검색어가 없습니다." });

  // 먼저 Supabase에서 검색
  try {
    const { getClient } = require("./_lib/supabase");
    const supabase = getClient();
    if (supabase) {
      const { data: existing } = await supabase
        .from("coffees")
        .select("*")
        .or(`name.ilike.%${query}%,region.ilike.%${query}%,farm.ilike.%${query}%`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data: tastings } = await supabase
          .from("tastings")
          .select("rating, flavor_tags, brew_method, aroma, acidity, sweetness, body, aftertaste")
          .eq("coffee_id", existing.id)
          .eq("is_public", true);

        const { buildCommunity, formatCoffee } = require("./_lib/supabase");
        const coffee = { ...formatCoffee(existing), _community: buildCommunity(tastings || []) };
        return res.status(200).json({ coffee, fromCache: true });
      }
    }
  } catch (e) {
    console.warn("[Search] Supabase 캐시 조회 실패:", e.message);
  }

  // Supabase에 없으면 Claude API 호출
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: `커피 원두 "${query}"에 대해 아래 JSON으로만 답해줘. 마크다운 없이 JSON만.

[가공방식 분류]
워시드 / 내추럴 / 허니 / 무산소 워시드 / 무산소 내추럴 / CM 내추럴 / CM 워시드 / 유산균 발효 / 더블 퍼멘테이션 / 웻 헐드 / 기타 실험적

{
  "name": "원두 이름 (한글)",
  "roaster": "",
  "country": "국가 (한글)",
  "region": "지역",
  "farm": "농장/워싱스테이션",
  "altitude": "고도",
  "process": "위 분류에서 선택",
  "processCategory": "위 분류에서 선택",
  "processDetail": "세부 가공 설명",
  "variety": "품종",
  "notes": ["컵노트1", "컵노트2", "컵노트3"],
  "price": "",
  "rating": 4.0,
  "description": "설명 2문장 (한글)",
  "sources": { "name": "ai", "region": "ai", "notes": "ai", "process": "ai" },
  "aiPrediction": {
    "flavorProfile": "예상 향미 (한글)",
    "recommendedBrew": "추천 추출",
    "brewTips": "물 온도/분쇄도/비율 포함 (한글)",
    "acidity": 7, "sweetness": 6, "body": 5, "aroma": 8,
    "confidence": "high 또는 medium 또는 low"
  },
  "keywords": ["키워드1", "키워드2"]
}`
        }]
      })
    });

    if (!response.ok) throw new Error("Claude API 오류: " + response.status);

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text.trim() : "";

    let coffee = null;
    try {
      coffee = JSON.parse(text.replace(/```json|```/g, "").trim());
      coffee.source = "ai_search";
      coffee.mapText = `${coffee.region||""}, ${coffee.country||""} | 지도 연동 예정`;
    } catch (e) {
      return res.status(500).json({ error: "AI 응답 파싱 오류" });
    }

    // Supabase 저장
    try {
      const result = await upsertCoffee(coffee);
      if (result.coffee) {
        coffee = { ...coffee, ...result.coffee };
        if (result.community) coffee._community = result.community;
      }
    } catch (e) {
      console.warn("[Search] Supabase 저장 실패:", e.message);
    }

    return res.status(200).json({ coffee });
  } catch (err) {
    console.error("[Search] 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};
