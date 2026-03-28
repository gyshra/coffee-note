/**
 * Vercel Serverless Function — OCR (Claude Vision)
 * 브라우저에서 /api/ocr 로 POST 요청 → 서버에서 Claude API 호출
 * API 키는 Vercel 환경변수에만 존재 (외부 노출 없음)
 */
module.exports = async function handler(req, res) {
  // CORS 허용
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { base64, mimeType } = req.body;
  if (!base64) {
    return res.status(400).json({ error: "No image data" });
  }

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType || "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "이 커피 봉지나 카드에서 원두 이름, 산지(국가/지역), 가공방식, 품종, 컵노트를 추출해줘. 없는 정보는 생략하고 찾은 것만 한 줄씩 알려줘. 예: 원두명: 예가체프 콩가 / 산지: 에티오피아 / 가공: 워시드",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text =
      data.content && data.content[0] && data.content[0].text
        ? data.content[0].text.trim()
        : "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("[OCR] 오류:", err);
    return res.status(500).json({ error: "OCR 처리 중 오류가 발생했습니다." });
  }
}
