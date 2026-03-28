/**
 * Vercel Serverless Function — 이미지 분석 (Claude Vision)
 * 이미지에서 커피 정보 추출 + Supabase 저장
 */
const { upsertCoffee } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const base64 = body && body.base64;
  const mimeType = (body && body.mimeType) || "image/jpeg";
  if (!base64) return res.status(400).json({ error: "이미지 데이터가 없습니다." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            {
              type: "text",
              text: `이 커피 이미지에서 텍스트를 정확하게 읽고, 네 지식과 종합해서 JSON으로만 답해줘.
마크다운 없이 순수 JSON만 출력.

[가공방식 분류 - 반드시 아래 중 정확히 선택]
- "워시드" (Washed/Wet)
- "내추럴" (Natural/Dry)
- "허니" (Honey/Pulped Natural) - Yellow/Red/Black Honey 포함
- "무산소 워시드" (Anaerobic Washed)
- "무산소 내추럴" (Anaerobic Natural)
- "CM 내추럴" (Carbonic Maceration Natural)
- "CM 워시드" (Carbonic Maceration Washed)
- "유산균 발효" (Lactic Fermentation)
- "더블 퍼멘테이션" (Double Fermentation)
- "웻 헐드" (Wet Hulled/Giling Basah)
- "기타 실험적" (그 외 특수 가공)

[이미지 텍스트 읽기 원칙]
- 이미지의 텍스트를 그대로 정확히 읽어줘 (오타/오인식 주의)
- 영문이면 영문 그대로, 한글이면 한글 그대로
- 컵노트는 이미지에 있는 것 우선, 없으면 가공방식+산지로 추론

{
  "name": "원두 이름 (이미지 텍스트 그대로)",
  "roaster": "로스터리 이름",
  "country": "생산 국가 (한글)",
  "region": "지역 (이미지 텍스트 그대로)",
  "farm": "농장/워싱스테이션 (이미지 텍스트 그대로)",
  "altitude": "고도",
  "process": "위 분류에서 정확히 선택",
  "processCategory": "위 분류에서 정확히 선택",
  "processDetail": "가공방식 세부 설명 (예: Black Honey, CM 72hr, 무산소 120hr 등)",
  "variety": "품종",
  "notes": ["컵노트1", "컵노트2", "컵노트3"],
  "rating": 4.0,
  "price": "",
  "description": "이 원두 설명 2문장 (한글)",
  "sources": {
    "name": "image 또는 ai",
    "region": "image 또는 ai",
    "notes": "image 또는 ai 또는 inferred",
    "process": "image 또는 ai 또는 inferred"
  },
  "aiPrediction": {
    "flavorProfile": "가공방식과 산지 기반 예상 향미 (한글, 2문장)",
    "recommendedBrew": "최적 추출 도구",
    "brewTips": "물 온도, 분쇄도, 물:원두 비율 포함한 구체적 팁 (한글)",
    "acidity": 7,
    "sweetness": 6,
    "body": 5,
    "aroma": 8,
    "confidence": "high 또는 medium 또는 low"
  },
  "keywords": ["키워드1", "키워드2"]
}`
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[OCR] Claude API 오류:", response.status, errText);
      return res.status(500).json({ error: "Claude API 오류: " + response.status });
    }

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text.trim() : "";

    let coffee = null;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      coffee = JSON.parse(clean);
      coffee.source = "ocr_scan";
      coffee.mapText = [(coffee.region||""), (coffee.country||"")].filter(Boolean).join(", ") + " | 지도 연동 예정";
    } catch (e) {
      console.error("[OCR] JSON 파싱 실패:", e.message, text.slice(0, 200));
      return res.status(200).json({ text, coffee: null });
    }

    // Supabase에 직접 저장
    try {
      const result = await upsertCoffee(coffee);
      if (result.coffee) {
        coffee = { ...coffee, ...result.coffee };
        if (result.community) coffee._community = result.community;
        if (result.recipes) coffee._recipes = result.recipes;
      }
    } catch (e) {
      console.warn("[OCR] Supabase 저장 실패 (계속 진행):", e.message);
    }

    return res.status(200).json({ coffee, text: coffee.name || "" });
  } catch (err) {
    console.error("[OCR] 서버 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};
