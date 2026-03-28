/**
 * POST /api/ocr  { base64, mimeType }
 * Stage 1: 이미지 텍스트만 추출 (Gemini 2.0 Flash 우선)
 * Stage 2 (선택): /api/search 로 AI 보강
 */
const { upsertCoffee } = require("./_lib/supabase");

const PROCESS_MAP = {
  washed:"워시드",wet:"워시드","wet process":"워시드",
  natural:"내추럴",dry:"내추럴","dry process":"내추럴",
  honey:"허니",pulped:"허니",
  "anaerobic washed":"무산소 워시드",
  "anaerobic natural":"무산소 내추럴",anaerobic:"무산소 내추럴",
  "carbonic maceration":"CM 내추럴",cm:"CM 내추럴",
  lactic:"유산균 발효",
  "wet hulled":"웻 헐드","giling basah":"웻 헐드",
  "double fermentation":"더블 퍼멘테이션",
  워시드:"워시드",내추럴:"내추럴",허니:"허니",
  무산소:"무산소 내추럴",유산균:"유산균 발효",
};

function normalizeProcess(raw) {
  if (!raw) return "";
  const lower = raw.toLowerCase().trim();
  for (const [k,v] of Object.entries(PROCESS_MAP)) {
    if (lower.includes(k)) return v;
  }
  return raw;
}

const PROMPT = `커피 봉지/카드의 텍스트를 읽어 JSON만 반환. 없으면 빈 문자열. 마크다운 없이.
{"name":"원두명","roaster":"로스터리","country":"국가","region":"지역","farm":"농장","altitude":"고도","process":"가공방식","variety":"품종","notes":[],"price":""}`;

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

  const { base64, mimeType="image/jpeg" } = body||{};
  if (!base64) return res.status(400).json({error:"이미지 없음"});

  let coffee = null;

  // ── 1순위: Gemini 2.0 Flash (~$0.0002/call) ──────────────────
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            contents:[{parts:[
              {inlineData:{mimeType,data:base64}},
              {text:PROMPT}
            ]}],
            generationConfig:{temperature:0.1,maxOutputTokens:500}
          })
        }
      );
      if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||"";
        try { coffee = JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch {}
      }
    } catch(e) { console.warn("[OCR] Gemini 오류:",e.message); }
  }

  // ── 2순위: Claude Haiku fallback ──────────────────────────────
  if (!coffee?.name && claudeKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":claudeKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",max_tokens:500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mimeType,data:base64}},
            {type:"text",text:PROMPT}
          ]}]
        })
      });
      if (r.ok) {
        const d = await r.json();
        const raw = d.content?.[0]?.text?.trim()||"";
        try { coffee = JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch {}
      }
    } catch(e) { console.warn("[OCR] Claude fallback 오류:",e.message); }
  }

  if (!coffee?.name) return res.status(200).json({coffee:null,text:""});

  // ── 후처리 ──────────────────────────────────────────────────
  coffee.source = "ocr_scan";
  coffee.process = normalizeProcess(coffee.process);
  coffee.processCategory = coffee.process;
  if (typeof coffee.notes==="string") {
    coffee.notes = coffee.notes.split(/[,、,]/).map(s=>s.trim()).filter(Boolean);
  }
  if (!Array.isArray(coffee.notes)) coffee.notes = [];

  try {
    const result = await upsertCoffee(coffee);
    if (result?.coffee) {
      coffee = {...coffee,...result.coffee};
      if (result.community) coffee._community = result.community;
    }
  } catch(e) { console.warn("[OCR] Supabase 저장 실패:",e.message); }

  return res.status(200).json({coffee, text:coffee.name});
};
