/**
 * Vercel Serverless Function — OCR (Claude Vision)
 * POST /api/ocr
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[OCR] API key exists:", !!apiKey, "| length:", apiKey ? apiKey.length : 0);
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." });

  // body 파싱 (Vercel은 자동 파싱하지만 안전하게 처리)
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
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            {
              type: "text",
              text: "이 커피 봉지나 카드에서 원두 이름, 산지(국가/지역), 가공방식, 품종, 컵노트를 추출해줘. 없는 정보는 생략하고 찾은 것만 한 줄씩 알려줘.\n예시 형식:\n원두명: 예가체프 콩가\n산지: 에티오피아\n가공: 워시드\n컵노트: 블루베리, 자스민",
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

    return res.status(200).json({ text });
  } catch (err) {
    console.error("[OCR] 서버 오류:", err.message);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
};
