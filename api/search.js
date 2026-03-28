/**
 * POST /api/search  { query, context?, forceAi? }
 * context: { country, region, farm } — OCR에서 넘어온 추가 맥락
 * 1. Supabase 캐시 → 2. Gemini Flash → 3. Claude Haiku fallback
 */
const { upsertCoffee, getClient, buildCommunity, formatCoffee } = require("./_lib/supabase");

// SCA 매핑 (ocr.js와 동일 로직 공유)
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
  "풀향","허브","건초","흙내음","브라운 로스트",
];
const SCA_ALIASES = {
  "과일":"체리","달콤한 과일":"복숭아","열대과일":"파인애플","베리":"블루베리",
  "딸기류":"딸기","레드베리":"라즈베리","시트러스":"레몬","감귤":"귤",
  "꽃향":"자스민","플로럴":"자스민","화사한":"장미","달콤":"꿀","단맛":"꿀",
  "초콜릿":"다크초콜릿","초코":"밀크초콜릿","코코아향":"코코아","견과류":"헤이즐넛",
  "고소한":"헤이즐넛","발효미":"와인향","와인":"와인향","로스티":"브라운 로스트",
};
function mapToSca(raw) {
  const l = raw.toLowerCase().trim();
  if (SCA_ITEMS.includes(raw)) return raw;
  for (const item of SCA_ITEMS) if (l.includes(item.toLowerCase())) return item;
  for (const [alias,mapped] of Object.entries(SCA_ALIASES)) if (l.includes(alias.toLowerCase())) return mapped;
  return null;
}
function normalizeNotes(arr) {
  if (!Array.isArray(arr)) return { notes:[], rawNotes:[] };
  const notes=[],rawNotes=[...arr];
  for (const r of arr) { const s=mapToSca(r); if(s&&!notes.includes(s)) notes.push(s); }
  return { notes, rawNotes };
}
function isValidUrl(s) {
  if (!s||typeof s!=="string") return false;
  try { const u=new URL(s); return u.protocol==="http:"||u.protocol==="https:"; } catch { return false; }
}

function buildPrompt(query, context) {
  const ctx = context
    ? `\n알려진 맥락: 국가=${context.country||""}, 지역=${context.region||""}, 농장=${context.farm||""}`
    : "";
  return `커피 원두 "${query}" 정보를 JSON만 반환. 마크다운 없이.${ctx}

[규칙]
- farm: 농장/생산자 이름. 원두명에 포함된 경우도 분리해서 기입.
- rawNotes: 이 원두의 실제 컵노트 (자유 텍스트, 알려진 것 기입)
- roasterUrl: 로스터리 공식 웹사이트 URL (확실한 것만, 불확실하면 "")
- farmUrl: 농장/생산자 공식 웹사이트 URL (확실한 것만, 불확실하면 "")
- purchaseUrl: 이 원두를 구매할 수 있는 URL (로스터리 상품 페이지, 확실한 것만)
- confidence: 정보 신뢰도 (high=잘 알려진 원두, medium=어느 정도 알려짐, low=정보 불충분)

{"name":"원두명(한글)","roaster":"","country":"국가(한글)","region":"지역","farm":"농장/생산자","altitude":"고도","process":"워시드|내추럴|허니|무산소 워시드|무산소 내추럴|CM 내추럴|CM 워시드|유산균 발효|더블 퍼멘테이션|웻 헐드","variety":"품종","rawNotes":["노트1","노트2","노트3"],"description":"2문장(한글)","brewTips":"물온도/분쇄도/비율(한글)","acidity":7,"sweetness":6,"body":5,"aroma":8,"roasterUrl":"","farmUrl":"","purchaseUrl":"","confidence":"high|medium|low"}`;
}

async function callGemini(prompt, key) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:800}})
    }
  );
  if (!r.ok) throw new Error("Gemini "+r.status);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||"";
}

async function callHaiku(prompt, key) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:800,messages:[{role:"user",content:prompt}]})
  });
  if (!r.ok) throw new Error("Haiku "+r.status);
  const d = await r.json();
  return d.content?.[0]?.text?.trim()||"";
}

function parse(raw) {
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
  if (typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Invalid JSON"});}}
  const { query, context, forceAi=false } = body||{};
  if (!query) return res.status(400).json({error:"검색어 없음"});

  // ── 1. Supabase 캐시 ────────────────────────────────────────
  if (!forceAi) {
    try {
      const sb = getClient();
      if (sb) {
        const { data } = await sb.from("coffees").select("*")
          .or(`name.ilike.%${query}%,region.ilike.%${query}%,farm.ilike.%${query}%`)
          .limit(1).maybeSingle();
        if (data) {
          const { data: tastings } = await sb.from("tastings")
            .select("id,rating,flavor_tags,brew_method,aroma,acidity,sweetness,body,aftertaste,memo,created_at")
            .eq("coffee_id",data.id).eq("is_public",true).order("created_at",{ascending:false}).limit(5);
          const coffee = {...formatCoffee(data),_community:buildCommunity(tastings||[]),_recentNotes:tastings||[]};
          return res.status(200).json({coffee,fromCache:true});
        }
      }
    } catch(e){ console.warn("[Search] 캐시:",e.message); }
  }

  // ── 2. AI 검색 ──────────────────────────────────────────────
  const prompt = buildPrompt(query, context);
  let coffee = null, usedModel = "";

  if (geminiKey) {
    try {
      const raw = await callGemini(prompt, geminiKey);
      const p = parse(raw);
      if (p?.name){ coffee=p; usedModel="gemini-flash"; }
    } catch(e){ console.warn("[Search] Gemini:",e.message); }
  }

  // Haiku fallback: Gemini 실패 OR 신뢰도 낮음 OR 핵심 필드 없음
  const needsHaiku = !coffee
    || coffee.confidence==="low"
    || (!coffee.region && !coffee.farm)
    || (!geminiKey && claudeKey);

  if (needsHaiku && claudeKey) {
    try {
      const raw = await callHaiku(prompt, claudeKey);
      const p = parse(raw);
      if (p?.name){ coffee=p; usedModel="claude-haiku"; }
    } catch(e){ console.warn("[Search] Haiku:",e.message); }
  }

  if (!coffee) return res.status(500).json({error:"AI 응답 없음"});

  // ── 후처리 ──────────────────────────────────────────────────
  coffee.source = "ai_search";
  coffee._model = usedModel;

  // rawNotes → SCA 매핑
  const rawArr = Array.isArray(coffee.rawNotes) ? coffee.rawNotes
    : Array.isArray(coffee.notes) ? coffee.notes : [];
  const { notes: scaNotes, rawNotes } = normalizeNotes(rawArr);
  coffee.rawNotes = rawNotes;
  coffee.notes = scaNotes.length ? scaNotes : rawArr; // fallback: 매핑 안 되면 원본 유지

  // URL 검증
  coffee.roasterUrl  = isValidUrl(coffee.roasterUrl)  ? coffee.roasterUrl  : "";
  coffee.farmUrl     = isValidUrl(coffee.farmUrl)      ? coffee.farmUrl     : "";
  coffee.purchaseUrl = isValidUrl(coffee.purchaseUrl)  ? coffee.purchaseUrl : "";

  // Supabase 저장
  try {
    const result = await upsertCoffee(coffee);
    if (result?.coffee){
      coffee={...coffee,...result.coffee};
      if (result.community) coffee._community=result.community;
      if (result.recipes)   coffee._recipes=result.recipes;
    }
  } catch(e){ console.warn("[Search] Supabase:",e.message); }

  return res.status(200).json({coffee});
};
