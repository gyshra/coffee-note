/**
 * POST /api/search  { query, forceAi? }
 * 1. Supabase 캐시 → 2. Gemini Flash → 3. Claude Haiku (한국어 정밀도 fallback)
 */
const { upsertCoffee, getClient, buildCommunity, formatCoffee } = require("./_lib/supabase");

const SCHEMA = `{"name":"원두명(한글)","roaster":"","country":"국가(한글)","region":"지역","farm":"농장/워싱스테이션","altitude":"고도","process":"워시드|내추럴|허니|무산소 워시드|무산소 내추럴|CM 내추럴|CM 워시드|유산균 발효|더블 퍼멘테이션|웻 헐드","variety":"품종","notes":["컵노트1","컵노트2"],"description":"2문장 설명(한글)","brewTips":"물온도/분쇄도/비율 팁(한글)","acidity":7,"sweetness":6,"body":5,"aroma":8,"confidence":"high|medium|low"}`;

function buildPrompt(query) {
  return `커피 원두 "${query}" 정보를 JSON만 반환. 마크다운 없이.\n${SCHEMA}`;
}

async function callGemini(query, key) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        contents:[{parts:[{text:buildPrompt(query)}]}],
        generationConfig:{temperature:0.2,maxOutputTokens:700}
      })
    }
  );
  if (!r.ok) throw new Error("Gemini "+r.status);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||"";
}

async function callHaiku(query, key) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model:"claude-haiku-4-5-20251001",max_tokens:700,
      messages:[{role:"user",content:buildPrompt(query)}]
    })
  });
  if (!r.ok) throw new Error("Haiku "+r.status);
  const d = await r.json();
  return d.content?.[0]?.text?.trim()||"";
}

function parseJson(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !claudeKey) return res.status(500).json({error:"API 키 미설정"});

  let body = req.body;
  if (typeof body==="string") { try { body=JSON.parse(body); } catch { return res.status(400).json({error:"Invalid JSON"}); } }

  const { query, forceAi=false } = body||{};
  if (!query) return res.status(400).json({error:"검색어 없음"});

  // ── 1. Supabase 캐시 (API 비용 제로) ─────────────────────────
  if (!forceAi) {
    try {
      const supabase = getClient();
      if (supabase) {
        const { data } = await supabase
          .from("coffees")
          .select("*")
          .or(`name.ilike.%${query}%,region.ilike.%${query}%,farm.ilike.%${query}%`)
          .limit(1)
          .maybeSingle();
        if (data) {
          const { data: tastings } = await supabase
            .from("tastings")
            .select("rating,flavor_tags,brew_method,aroma,acidity,sweetness,body,aftertaste")
            .eq("coffee_id",data.id).eq("is_public",true);
          const coffee = {...formatCoffee(data), _community:buildCommunity(tastings||[])};
          return res.status(200).json({coffee, fromCache:true});
        }
      }
    } catch(e) { console.warn("[Search] 캐시 조회 실패:",e.message); }
  }

  // ── 2. Gemini 2.0 Flash (~$0.0003/call) ──────────────────────
  let coffee = null;
  let usedModel = "";

  if (geminiKey) {
    try {
      const raw = await callGemini(query, geminiKey);
      const parsed = parseJson(raw);
      if (parsed?.name) { coffee = parsed; usedModel = "gemini-flash"; }
    } catch(e) { console.warn("[Search] Gemini 오류:",e.message); }
  }

  // ── 3. Claude Haiku fallback (신뢰도 낮거나 Gemini 실패 시) ──
  const needsHaiku = !coffee ||
    coffee.confidence === "low" ||
    (!coffee.region && !coffee.farm) ||
    (claudeKey && !geminiKey);

  if (needsHaiku && claudeKey) {
    try {
      const raw = await callHaiku(query, claudeKey);
      const parsed = parseJson(raw);
      if (parsed?.name) { coffee = parsed; usedModel = "claude-haiku"; }
    } catch(e) { console.warn("[Search] Haiku 오류:",e.message); }
  }

  if (!coffee) return res.status(500).json({error:"AI 응답 없음"});

  coffee.source = "ai_search";
  coffee._model = usedModel;

  // ── Supabase 저장 ─────────────────────────────────────────────
  try {
    const result = await upsertCoffee(coffee);
    if (result?.coffee) {
      coffee = {...coffee,...result.coffee};
      if (result.community) coffee._community = result.community;
    }
  } catch(e) { console.warn("[Search] Supabase 저장 실패:",e.message); }

  return res.status(200).json({coffee});
};
