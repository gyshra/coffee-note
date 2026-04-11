/**
 * POST /api/parse-bean  { text: string }
 * 원두 이름 텍스트 한 줄 → 구조화 JSON + confidence
 *
 * confidence 기준:
 *   high   : name + (country|region) + process 모두 파싱
 *   medium : name + (country|region) 파싱, process 없음
 *   low    : name만 파싱
 */

const PROMPT = `커피 원두 이름/설명 텍스트에서 정보를 추출해 JSON으로만 반환하세요. 마크다운 금지.

추출 규칙:
- name: 원두명 (로스터명 제외, 있는 그대로)
- roaster: 로스터리명 (텍스트에 있을 경우만, 없으면 null)
- country: 원산지 국가 (한국어 — 에티오피아/케냐/콜롬비아/파나마/과테말라/브라질/코스타리카/인도네시아/예멘/페루/기타)
- region: 지역명 (예가체프/시다마/안티구아 등, 없으면 null)
- farm: 농장·워싱스테이션명 (없으면 null)
- process: 가공방식 한국어 (워시드/내추럴/허니/무산소 발효/카보닉 매서레이션/웻 헐드, 불명확하면 null)
- variety: 품종명 (게이샤/Heirloom 등, 없으면 null)
- altitude: 고도 (없으면 null)

빈 항목은 null로, 배열 항목 없으면 []로.
형식: {"name":null,"roaster":null,"country":null,"region":null,"farm":null,"process":null,"variety":null,"altitude":null}`;

function parse(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
}

function calcConfidence(coffee) {
  const hasName    = !!coffee?.name;
  const hasOrigin  = !!(coffee?.country || coffee?.region);
  const hasProcess = !!coffee?.process;
  if (hasName && hasOrigin && hasProcess) return "high";
  if (hasName && hasOrigin)              return "medium";
  if (hasName)                           return "low";
  return "low";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); } }
  const { text } = body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "text 필드 필요" });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: "GEMINI_API_KEY 미설정" });

  let coffee = null;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${PROMPT}\n\n입력: ${text}` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        }),
      }
    );

    if (r.ok) {
      const d   = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (raw) coffee = parse(raw);
    } else {
      const err = await r.text();
      console.warn("[parse-bean] Gemini", r.status, err.slice(0, 200));
    }
  } catch (e) {
    console.error("[parse-bean] 예외:", e.message);
  }

  if (!coffee?.name) {
    return res.status(200).json({ coffee: null, confidence: "low", _debug: { text } });
  }

  const confidence = calcConfidence(coffee);
  return res.status(200).json({ coffee, confidence });
};
