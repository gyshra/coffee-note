/**
 * POST /api/ocr  { base64, mimeType }
 * Gemini 2.0 Flash → Claude Haiku fallback
 * 에러 상세 로깅 + rate limit 처리
 */
const { upsertCoffee } = require("./_lib/supabase");

const PROCESS_MAP = {
  washed:"워시드",wet:"워시드","wet process":"워시드",
  natural:"내추럴",dry:"내추럴","dry process":"내추럴",
  honey:"허니",pulped:"허니",
  "anaerobic washed":"무산소 워시드","anaerobic natural":"무산소 내추럴",
  anaerobic:"무산소 내추럴","carbonic maceration":"CM 내추럴",cm:"CM 내추럴",
  lactic:"유산균 발효","wet hulled":"웻 헐드","giling basah":"웻 헐드",
  "double fermentation":"더블 퍼멘테이션",
  워시드:"워시드",내추럴:"내추럴",허니:"허니",무산소:"무산소 내추럴",유산균:"유산균 발효",
};
function normalizeProcess(raw) {
  if (!raw) return "";
  const l = raw.toLowerCase().trim();
  for (const [k,v] of Object.entries(PROCESS_MAP)) if (l.includes(k)) return v;
  return raw;
}

const SCA_ITEMS = ["블루베리","라즈베리","딸기","체리","크랜베리","레몬","라임","자몽","오렌지","귤","복숭아","살구","자두","사과","배","포도","파인애플","코코넛","자스민","장미","캐모마일","라벤더","홍차","꿀","카라멜","메이플시럽","바닐라","설탕","다크초콜릿","밀크초콜릿","코코아","헤이즐넛","아몬드","땅콩","시나몬","정향","넛멕","카다멈","후추","와인향","위스키","발효","식초","스모키","탄","파이프담배","풀향","허브","건초","흙내음","브라운 로스트"];
const SCA_ALIASES = {"과일":"체리","달콤한 과일":"복숭아","열대과일":"파인애플","베리":"블루베리","시트러스":"레몬","꽃향":"자스민","플로럴":"자스민","달콤":"꿀","초콜릿":"다크초콜릿","견과류":"헤이즐넛","고소한":"헤이즐넛","와인":"와인향","로스티":"브라운 로스트"};

function mapToSca(raw) {
  const l = raw.toLowerCase().trim();
  if (SCA_ITEMS.includes(raw)) return raw;
  for (const item of SCA_ITEMS) if (l.includes(item.toLowerCase())) return item;
  for (const [a,m] of Object.entries(SCA_ALIASES)) if (l.includes(a.toLowerCase())) return m;
  return null;
}
function buildNotes(arr) {
  const notes=[], unmapped=[];
  for (const r of arr) { const s=mapToSca(r); s&&!notes.includes(s)?notes.push(s):unmapped.push(r); }
  return { notes, unmappedNotes:unmapped };
}
function isValidUrl(s) {
  if (!s||typeof s!=="string") return false;
  try { const u=new URL(s); return u.protocol==="http:"||u.protocol==="https:"; } catch { return false; }
}
function parse(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch { return null; }
}

const PROMPT = `커피 봉지/라벨에서 텍스트를 읽어 아래 JSON 형식으로만 반환하세요. 마크다운 금지.

규칙:
- 이미지에서 확인되지 않는 항목은 반드시 null (추측 금지)
- name: 원두명 (브랜드·로스터명 제외, 산지/품종 조합이면 그대로)
- roaster: 봉지에 표시된 로스터리/브랜드명
- country/region: 원산지 국가·지역 (영문 표기 우선, 한국어도 허용)
- farm: 농장·생산자명 (원두명에 포함된 경우 분리)
- process: 가공방식 (Washed/Natural/Honey/Anaerobic 등 원문 그대로)
- rawNotes: 라벨에 적힌 향미·컵노트 텍스트 배열 (없으면 [])
- roasterUrl/farmUrl: 라벨에 URL이 명시된 경우만 입력, 없으면 null

{"name":null,"roaster":null,"country":null,"region":null,"farm":null,"altitude":null,"process":null,"variety":null,"rawNotes":[],"price":null,"roasterUrl":null,"farmUrl":null}`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !claudeKey) return res.status(500).json({error:"API 키 미설정 — Vercel 환경변수 확인"});

  let body = req.body;
  if (typeof body==="string") { try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Invalid JSON"});} }
  const { base64, mimeType="image/jpeg" } = body||{};
  if (!base64) return res.status(400).json({error:"이미지 없음"});

  let coffee = null;
  let usedModel = "";

  // ── 1순위: Gemini 2.0 Flash ──────────────────────────────────
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
      const statusText = `Gemini ${r.status}`;
      if (r.status === 429) {
        console.warn("[OCR] Gemini 429 Rate limit — Claude fallback으로 전환");
      } else if (r.status === 400) {
        const errBody = await r.text();
        console.warn("[OCR] Gemini 400:", errBody.slice(0,200));
      } else if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||"";
        if (raw) {
          coffee = parse(raw);
          if (coffee?.name) usedModel = "gemini-flash";
        }
        if (!raw) console.warn("[OCR] Gemini 응답 없음:", JSON.stringify(d).slice(0,200));
      } else {
        const errBody = await r.text();
        console.warn("[OCR] Gemini", r.status, errBody.slice(0,200));
      }
    } catch(e) { console.error("[OCR] Gemini 예외:", e.message); }
  }

  // ── 2순위: Claude Haiku (Vision) ─────────────────────────────
  if (!coffee?.name && claudeKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":claudeKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001", max_tokens:600,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mimeType,data:base64}},
            {type:"text",text:PROMPT}
          ]}]
        })
      });
      if (r.ok) {
        const d = await r.json();
        const raw = d.content?.[0]?.text?.trim()||"";
        if (raw) { coffee = parse(raw); if(coffee?.name) usedModel="claude-haiku"; }
      } else {
        const errBody = await r.text();
        console.error("[OCR] Claude", r.status, errBody.slice(0,200));
      }
    } catch(e) { console.error("[OCR] Claude 예외:", e.message); }
  }

  if (!coffee?.name) {
    console.warn("[OCR] 최종 결과 없음 — 두 모델 모두 실패");
    return res.status(200).json({coffee:null, text:"", _debug:{geminiKey:!!geminiKey, claudeKey:!!claudeKey}});
  }

  // ── 후처리 ──────────────────────────────────────────────────
  coffee.source = "ocr_scan";
  coffee._model = usedModel;
  coffee.process = normalizeProcess(coffee.process);
  coffee.processCategory = coffee.process;

  const rawArr = Array.isArray(coffee.rawNotes) ? coffee.rawNotes
    : Array.isArray(coffee.notes) ? coffee.notes : [];
  coffee.rawNotes = rawArr;
  const { notes, unmappedNotes } = buildNotes(rawArr);
  coffee.notes = notes;
  coffee.unmappedNotes = unmappedNotes;

  coffee.roasterUrl = isValidUrl(coffee.roasterUrl) ? coffee.roasterUrl : "";
  coffee.farmUrl    = isValidUrl(coffee.farmUrl)    ? coffee.farmUrl    : "";

  try {
    const result = await upsertCoffee(coffee);
    if (result?.coffee) {
      coffee = {...coffee,...result.coffee};
      if (result.community) coffee._community = result.community;
    }
  } catch(e) { console.warn("[OCR] Supabase:", e.message); }

  // ── Entity Resolution: 택소노미 UID 매핑 ────────────────────
  try {
    const { resolveEntity, recordMapping } = require("./normalize");
    const searchText = [coffee.farm, coffee.region, coffee.country, coffee.process].filter(Boolean).join(" ");
    const resolved = await resolveEntity(searchText, { country: coffee.country });

    coffee._entityResolution = {
      confidence:   resolved.confidence,
      action:       resolved.action,
      message:      resolved.message,
      matched:      resolved.matched,
      alternatives: resolved.alternatives,
    };

    if (resolved.action === "auto" && resolved.matched?.uid) {
      coffee.taxonomy_uid = resolved.matched.uid;
      if (coffee.id) {
        const sb = require("./_lib/supabase").getClient();
        if (sb) await sb.from("coffees").update({ taxonomy_uid: resolved.matched.uid }).eq("id", coffee.id);
        await recordMapping({ rawText: searchText, normalized: resolved.normalized, uid: resolved.matched.uid, confidence: resolved.confidence, confirmedBy: "auto" });
      }
    }
  } catch(e) { console.warn("[OCR] EntityResolution:", e.message); }

  return res.status(200).json({coffee, text:coffee.name, _model:usedModel});
};
