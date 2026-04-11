/**
 * GET /api/story?name=<원두명>&country=<국가>
 * Gemini Flash 로 원두 배경 정보(스토리) 생성 후 반환
 */

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { name = "", country = "" } = req.query || {};

  if (!name.trim()) {
    return res.status(400).json({ error: "name 파라미터 필요" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("[Phase1:CQI_Debug] GEMINI_API_KEY 미설정, 폴백 응답 반환");
    return res.status(200).json({ story: buildFallbackStory(name, country) });
  }

  try {
    const prompt = buildPrompt(name, country);
    console.log(`[Phase1:CQI_Debug] /api/story 요청: name="${name}", country="${country}"`);

    const r = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error(`[Phase1:CQI_Debug] Gemini 오류 ${r.status}:`, errText.slice(0, 200));
      return res.status(200).json({ story: buildFallbackStory(name, country) });
    }

    const data = await r.json();
    const story =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!story) {
      console.warn("[Phase1:CQI_Debug] Gemini 빈 응답, 폴백 사용");
      return res.status(200).json({ story: buildFallbackStory(name, country) });
    }

    console.log(`[Phase1:CQI_Debug] /api/story 성공, 길이=${story.length}`);
    return res.status(200).json({ story });

  } catch (e) {
    console.error("[Phase1:CQI_Debug] /api/story 예외:", e.message);
    return res.status(200).json({ story: buildFallbackStory(name, country) });
  }
};

function buildPrompt(name, country) {
  const ctx = country ? ` (산지: ${country})` : "";
  return `스페셜티 커피 원두 "${name}"${ctx}에 대한 감성적인 배경 스토리를 한국어 3-4문장으로 작성해줘.
생산지의 특성, 재배 환경, 풍미 특징, 커피 애호가에게 어필하는 감성적 요소를 포함해.
마크다운, 따옴표, 헤더 없이 순수 텍스트만 반환. JSON 아님.`;
}

function buildFallbackStory(name, country) {
  const loc = country ? `${country}의 ` : "";
  return `${loc}고지대에서 정성껏 재배된 ${name}은 스페셜티 커피 농가의 오랜 노하우가 담긴 원두입니다. 각 산지의 독특한 테루아와 기후가 만들어낸 복합적인 풍미가 매 한 모금에 담겨 있습니다. 직접 테이스팅하며 당신만의 프로파일을 발견해보세요.`;
}
