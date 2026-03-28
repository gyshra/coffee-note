/**
 * POST /api/ocr  { base64, mimeType }
 * - Gemini 2.0 Flash 우선 (비용 최소)
 * - farm 명시적 분리, rawNotes 원본 보존, notes SCA 매핑
 * - roasterUrl / farmUrl / purchaseUrl 요청
 */
const { upsertCoffee } = require("./_lib/supabase");

// ── 가공방식 정규화 (후처리) ──────────────────────────────────
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
  const l = raw.toLowerCase().trim();
  for (const [k,v] of Object.entries(PROCESS_MAP)) if (l.includes(k)) return v;
  return raw;
}

// ── SCA 플레이버 매핑 테이블 ──────────────────────────────────
// 자유 텍스트 → SCA 표준 한국어 노트로 근사 매핑
const SCA_ALIASES = {
  "과일":"체리","과일향":"체리","달콤한 과일":"복숭아","열대과일":"파인애플",
  "베리류":"블루베리","베리":"블루베리","딸기류":"딸기","레드베리":"라즈베리",
  "시트러스":"레몬","감귤":"귤","자몽류":"자몽","오렌지류":"오렌지",
  "꽃향":"자스민","플로럴":"자스민","화사한":"장미","허브":"라벤더",
  "달콤":"꿀","단맛":"꿀","카라멜향":"카라멜","설탕":"카라멜",
  "초콜릿":"다크초콜릿","초코":"밀크초콜릿","코코아향":"코코아",
  "견과류":"헤이즐넛","넛","아몬드","고소한":"헤이즐넛",
  "발효":"와인향","발효미":"와인향","와인":"와인향",
  "흙":"흙내음","어시":"흙내음","그린":"풀향",
  "로스티":"브라운 로스트","스모키":"스모키","탄":"탄맛",
  "산미":"레몬","밝은 산미":"자몽","부드러운 산미":"사과",
  "피니시":"여운","뒷맛":"여운","긴 여운":"여운",
};
const SCA_ITEMS = [
  "블루베리","라즈베리","딸기","체리","크랜베리",
  "레몬","라임","자몽","오렌지","귤",
  "복숭아","살구","자두","사과","배","포도","파인애플","코코넛",
  "자스민","장미","캐모마일","라벤더","홍차",
  "꿀","카라멜","메이플시럽","바닐라","설탕",
  "다크초콜릿","밀크초콜릿","코코아","헤이즐넛","아몬드","땅콩",
  "시나몬","정향","넛멕","카다멈","후추",
  "와인향","위스키","발효","식초",
  "스모키","탄","파이프담배",
  "풀향","허브","건초","흙내음",
  "브라운 로스트","견과류향",
];

function mapToSca(rawNote) {
  const lower = rawNote.toLowerCase().trim();
  // 1. 완전 일치
  if (SCA_ITEMS.includes(rawNote)) return rawNote;
  // 2. 포함 일치
  for (const item of SCA_ITEMS) if (lower.includes(item.toLowerCase())) return item;
  // 3. 별칭 매핑
  for (const [alias, mapped] of Object.entries(SCA_ALIASES)) {
    if (lower.includes(alias.toLowerCase())) return mapped;
  }
  return null; // 매핑 불가
}

function buildNotes(rawArray) {
  const mapped = [];
  const unmapped = [];
  for (const r of rawArray) {
    const s = mapToSca(r);
    if (s && !mapped.includes(s)) mapped.push(s);
    else unmapped.push(r);
  }
  return { notes: mapped, unmappedNotes: unmapped };
}

// ── OCR 프롬프트 ─────────────────────────────────────────────
const PROMPT = `커피 봉지/카드의 텍스트를 정확히 읽어 JSON만 반환. 마크다운 없이.

[중요 규칙]
- name: 원두의 고유 이름 (국가명·지역명 제외한 농장/품종/배치 이름)
- farm: 원두명에 농장/생산자 이름이 포함된 경우 반드시 분리해서 기입 (예: "쁘가싱", "Konga", "Finca La Palma")
- region: 지역/산지 (예: 예가체프, 토라자, 아체)
- rawNotes: 이미지에 적힌 컵노트 텍스트 그대로 (원본 보존)
- roasterUrl: 이미지에서 로스터리 웹사이트 URL이 보이면 기입, 없으면 빈 문자열
- farmUrl: 농장/생산자 웹사이트 URL이 보이면 기입, 없으면 빈 문자열

{"name":"","roaster":"","country":"국가","region":"지역","farm":"농장/생산자","altitude":"고도","process":"가공방식","variety":"품종","rawNotes":["원본노트1","원본노트2"],"price":"","roasterUrl":"","farmUrl":""}`;

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
  if (typeof body==="string") { try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Invalid JSON"});} }
  const { base64, mimeType="image/jpeg" } = body||{};
  if (!base64) return res.status(400).json({error:"이미지 없음"});

  let coffee = null;

  // ── 1순위: Gemini 2.0 Flash ───────────────────────────────────
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            contents:[{parts:[{inlineData:{mimeType,data:base64}},{text:PROMPT}]}],
            generationConfig:{temperature:0.1,maxOutputTokens:600}
          })
        }
      );
      if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||"";
        try { coffee = JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch {}
      }
    } catch(e){ console.warn("[OCR] Gemini 오류:",e.message); }
  }

  // ── 2순위: Claude Haiku fallback ──────────────────────────────
  if (!coffee?.name && claudeKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":claudeKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",max_tokens:600,
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
    } catch(e){ console.warn("[OCR] Claude fallback:",e.message); }
  }

  if (!coffee?.name) return res.status(200).json({coffee:null,text:""});

  // ── 후처리 ───────────────────────────────────────────────────
  coffee.source = "ocr_scan";
  coffee.process = normalizeProcess(coffee.process);
  coffee.processCategory = coffee.process;

  // rawNotes 안전 처리
  const rawArr = Array.isArray(coffee.rawNotes) ? coffee.rawNotes
    : typeof coffee.rawNotes==="string" ? coffee.rawNotes.split(/[,、,]/).map(s=>s.trim()).filter(Boolean)
    : Array.isArray(coffee.notes) ? coffee.notes : [];
  coffee.rawNotes = rawArr;

  // SCA 매핑
  const { notes: scaNotes, unmappedNotes } = buildNotes(rawArr);
  coffee.notes = scaNotes;
  coffee.unmappedNotes = unmappedNotes; // 매핑 안 된 원본 노트

  // URL 안전 처리
  coffee.roasterUrl = isValidUrl(coffee.roasterUrl) ? coffee.roasterUrl : "";
  coffee.farmUrl    = isValidUrl(coffee.farmUrl)    ? coffee.farmUrl    : "";

  // Supabase 저장
  try {
    const result = await upsertCoffee(coffee);
    if (result?.coffee) {
      coffee = {...coffee,...result.coffee};
      if (result.community) coffee._community = result.community;
      if (result.recipes)   coffee._recipes   = result.recipes;
    }
  } catch(e){ console.warn("[OCR] Supabase:",e.message); }

  return res.status(200).json({coffee, text:coffee.name});
};

function isValidUrl(s) {
  if (!s || typeof s!=="string") return false;
  try { const u=new URL(s); return u.protocol==="http:"||u.protocol==="https:"; } catch { return false; }
}
