/**
 * Vercel Serverless Function — 이미지 + AI 지식 종합 분석
 * 우선순위:
 *   1. 이미지 정보 + 인터넷 지식 모두 활용
 *   2. 이미지 없으면 AI 지식만 / 정보 없으면 이미지만
 * POST /api/ocr  { base64, mimeType }
 */
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
        model: "claude-haiku-4-5-20251001",
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
              text: `이 커피 이미지를 분석하고, 이미지에서 읽은 정보와 네가 알고 있는 해당 원두에 대한 지식을 종합해서 아래 JSON으로만 답해줘.

[분석 원칙]
- 이미지에서 직접 읽은 정보는 "image" 출처로 표시
- 네 지식(인터넷/데이터베이스 기반)으로 보완한 정보는 "ai" 출처로 표시
- 이미지 정보와 AI 지식이 다를 경우 이미지 정보 우선
- 어느 쪽에도 정보가 없으면 컵노트/가공방식으로 합리적으로 추론
- 마크다운 없이 순수 JSON만 출력

{
  "name": "원두 이름",
  "roaster": "로스터리 이름 (모르면 빈 문자열)",
  "country": "생산 국가 (한글)",
  "region": "지역",
  "farm": "농장/워싱스테이션",
  "altitude": "고도 (예: 1700-1900m)",
  "process": "가공방식 (워시드/내추럴/허니/무산소)",
  "processCategory": "가공방식 (워시드/내추럴/허니/무산소)",
  "variety": "품종",
  "notes": ["컵노트1", "컵노트2", "컵노트3"],
  "rating": 4.0,
  "price": "",
  "description": "이 원두에 대한 종합 설명 2-3문장 (한글)",
  "sources": {
    "name": "image 또는 ai 또는 both",
    "region": "image 또는 ai 또는 both",
    "notes": "image 또는 ai 또는 both",
    "process": "image 또는 ai 또는 both",
    "altitude": "image 또는 ai 또는 inferred"
  },
  "aiPrediction": {
    "flavorProfile": "이미지+지식 기반 예상 향미 설명 (한글, 2문장)",
    "recommendedBrew": "최적 추출 도구 (예: V60, 에스프레소)",
    "brewTips": "구체적 추출 팁: 물 온도, 분쇄도, 물:원두 비율 포함 (한글)",
    "acidity": 7,
    "sweetness": 6,
    "body": 5,
    "aroma": 8,
    "confidence": "high 또는 medium 또는 low (정보 신뢰도)"
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
      ? data.content[0].text.trim()
      : "";

    let coffee = null;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      coffee = JSON.parse(clean);
      coffee.source = "ocr_scan";
      coffee.mapText = [(coffee.region || ""), (coffee.country || "")]
        .filter(Boolean).join(", ") + " | 지도 연동 예정";
    } catch (e) {
      console.error("[OCR] JSON 파싱 실패:", e.message, text.slice(0, 300));
      return res.status(200).json({ text: text, coffee: null });
    }

    // Supabase에 저장 (비동기, 실패해도 클라이언트엔 영향 없음)
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      const saved = await fetch(`${baseUrl}/api/coffee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", coffee }),
      });
      const savedData = await saved.json();
      // Supabase에서 반환된 데이터(커뮤니티 포함)로 교체
      if (savedData.coffee) {
        coffee = { ...coffee, ...savedData.coffee };
        if (savedData.community) coffee._community = savedData.community;
      }
    } catch (e) {
      console.warn("[OCR] Supabase 저장 스킵:", e.message);
    }

    return res.status(200).json({ coffee: coffee, text: coffee.name || "" });
  } catch (err) {
    console.error("[OCR] 서버 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};
