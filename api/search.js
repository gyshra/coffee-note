/**
 * Vercel Serverless Function — AI 원두 검색
 * POST /api/search  { query: "케냐 AA 키암부" }
 * Claude API로 원두 정보를 구조화된 JSON으로 반환
 */
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
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `커피 원두 "${query}"에 대한 정보를 아래 JSON 형식으로만 답해줘. 마크다운이나 설명 없이 JSON만.

{
  "name": "원두 전체 이름 (한글)",
  "roaster": "로스터리 이름 (모르면 빈 문자열)",
  "country": "생산 국가 (한글)",
  "region": "지역 (한글)",
  "farm": "농장/워싱스테이션 (한글, 모르면 빈 문자열)",
  "altitude": "고도 (예: 1700-1900m, 모르면 빈 문자열)",
  "process": "가공방식 (워시드/내추럴/허니/무산소 중 하나)",
  "processCategory": "가공방식 (워시드/내추럴/허니/무산소 중 하나)",
  "variety": "품종 (모르면 빈 문자열)",
  "notes": ["컵노트1", "컵노트2", "컵노트3"],
  "price": "가격대 (모르면 빈 문자열)",
  "rating": 4.0,
  "description": "이 원두에 대한 간략한 설명 (2-3문장)",
  "aiPrediction": {
    "flavorProfile": "예상 향미 프로필 설명",
    "brewTips": "추천 추출 방법과 팁",
    "recommendedBrew": "가장 잘 어울리는 추출 도구 (V60/에스프레소/프렌치프레스 등)",
    "acidity": 7,
    "sweetness": 6,
    "body": 5,
    "aroma": 8
  },
  "keywords": ["검색 키워드1", "검색 키워드2"]
}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Search] Claude API 오류:", response.status, err);
      return res.status(500).json({ error: "AI 검색 오류: " + response.status });
    }

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text.trim()
      : "";

    // JSON 파싱
    let coffee = null;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      coffee = JSON.parse(clean);
      coffee.source = "ai_search";
      coffee.mapText = `${coffee.region || ""}, ${coffee.country || ""} | 지도 연동 예정`;
    } catch (e) {
      console.error("[Search] JSON 파싱 오류:", e.message, text.slice(0, 200));
      return res.status(500).json({ error: "AI 응답 파싱 오류" });
    }

    return res.status(200).json({ coffee });
  } catch (err) {
    console.error("[Search] 서버 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};
