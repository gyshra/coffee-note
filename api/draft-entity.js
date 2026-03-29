/**
 * Coffee Note — Dynamic Taxonomy Pipeline
 * POST /api/draft-entity  { rawText, ocrData, coffeeId? }
 *
 * 흐름:
 * 1. taxonomy_drafts에 임시 저장
 * 2. Gemini로 AI Enrichment (웹 맥락 기반 정보 보완)
 * 3. 표준 UID 생성 + taxonomy 테이블에 신규 행 등록
 * 4. search_text 인덱스 실시간 업데이트 (트리거가 처리)
 * 5. 이후 동일 원두 → 즉시 자동 매핑
 */

const { getClient } = require("./_lib/supabase");

/* ═══════════════════════════════════════════════════
   1. UID 자동 생성
   국가코드(3) + 지역코드(3) + 농장코드(3) + 가공코드(1~2)
   예: ETH_YRG_KNG_W / IDN_SUM_PGS_AN
   ═══════════════════════════════════════════════════ */
const COUNTRY_CODES = {
  "ethiopia":"ETH","kenya":"KEN","colombia":"COL","guatemala":"GTM",
  "costa rica":"CRI","panama":"PAN","brazil":"BRA","indonesia":"IDN",
  "yemen":"YEM","rwanda":"RWA","burundi":"BDI","tanzania":"TZA",
  "el salvador":"SLV","honduras":"HND","nicaragua":"NIC","peru":"PER",
  "bolivia":"BOL","mexico":"MEX","china":"CHN","taiwan":"TWN",
  "에티오피아":"ETH","케냐":"KEN","콜롬비아":"COL","과테말라":"GTM",
  "코스타리카":"CRI","파나마":"PAN","브라질":"BRA","인도네시아":"IDN",
  "예멘":"YEM","르완다":"RWA","부룬디":"BDI","탄자니아":"TZA",
};

const PROCESS_CODES = {
  "washed":"W","워시드":"W",
  "natural":"N","내추럴":"N",
  "honey":"H","허니":"H",
  "anaerobic":"AN","무산소":"AN",
  "wet hulled":"WH","웻 헐드":"WH","웻헐드":"WH",
  "double fermentation":"DF","더블 퍼멘테이션":"DF",
  "carbonic maceration":"CM","카보닉":"CM",
  "lactic":"LA","유산균":"LA",
};

function makeCode(str, len) {
  if (!str) return "UNK";
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]/g, "")
    .slice(0, len)
    .padEnd(len, "X");
}

function generateUID(country, region, farm, process) {
  const cCode = COUNTRY_CODES[country?.toLowerCase()] || makeCode(country, 3);
  const rCode = makeCode(
    (region || "").replace(/\s+/g, "").slice(0, 3), 3
  );
  const fCode = makeCode(
    (farm || "").replace(/\s+/g, "").slice(0, 3), 3
  );
  const pCode = (() => {
    const p = (process || "").toLowerCase();
    for (const [key, code] of Object.entries(PROCESS_CODES)) {
      if (p.includes(key)) return code;
    }
    return makeCode(process, 1);
  })();

  return `${cCode}_${rCode}_${fCode}_${pCode}`;
}

/* UID 중복 시 숫자 접미사 추가 */
async function ensureUniqueUID(base, sb) {
  let uid = base;
  let suffix = 2;
  while (true) {
    const { data } = await sb.from("taxonomy").select("uid").eq("uid", uid).maybeSingle();
    if (!data) return uid;
    uid = `${base}_${suffix++}`;
    if (suffix > 99) return `${base}_${Date.now()}`;
  }
}

/* ═══════════════════════════════════════════════════
   2. AI Enrichment — Gemini로 원두 정보 보완
   ═══════════════════════════════════════════════════ */
async function enrichWithAI(rawText, ocrData) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  const knownFields = Object.entries(ocrData || {})
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `당신은 스페셜티 커피 전문가입니다. 아래 원두 정보(OCR 추출, 오타 있을 수 있음)를 분석하여 표준 정보로 보완하세요.

OCR 원문: "${rawText}"
알려진 정보:
${knownFields || "(없음)"}

다음 JSON만 반환 (마크다운 없이):
{
  "name": "정확한 원두 이름",
  "country": "국가 (한글)",
  "country_en": "Country (English)",
  "region": "산지/지역 (한글)",
  "region_en": "Region (English)",
  "farm": "농장/워싱스테이션 (한글 표준명)",
  "farm_en": "Farm (English)",
  "farm_aliases": ["오타1", "오타2", "이전 표기"],
  "process": "가공방식 (표준 한글)",
  "variety": "품종",
  "altitude": "고도 (예: 1800-2200m)",
  "typical_notes": ["향미1", "향미2", "향미3"],
  "continent": "대륙 (아프리카/중미/남미/아시아 중 택1)",
  "confidence": "high/medium/low"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.warn("[DraftEntity] AI enrichment 실패:", e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════
   3. Draft 생성 (confidence < 0.70 진입점)
   normalize.js에서 호출
   ═══════════════════════════════════════════════════ */
async function createDraftEntity(rawText, ocrData, coffeeId) {
  const sb = getClient();
  if (!sb) return { success: false, reason: "no_supabase" };

  /* 3-1. draft 테이블에 임시 저장 */
  const { data: draft, error: draftErr } = await sb
    .from("taxonomy_drafts")
    .insert({
      raw_text: rawText,
      ocr_data: ocrData || {},
      status:   "pending",
    })
    .select()
    .single();

  if (draftErr) {
    console.error("[DraftEntity] draft insert 오류:", draftErr.message);
    return { success: false, reason: draftErr.message };
  }

  /* 3-2. AI Enrichment */
  console.log("[DraftEntity] AI enrichment 시작:", rawText);
  const aiResult = await enrichWithAI(rawText, ocrData);

  if (!aiResult || !aiResult.country) {
    /* AI 실패 → draft를 failed로 마크 후 반환 */
    await sb.from("taxonomy_drafts")
      .update({ status: "ai_failed", processed_at: new Date().toISOString() })
      .eq("id", draft.id);
    return { success: false, reason: "ai_enrichment_failed", draftId: draft.id };
  }

  /* 3-3. UID 생성 */
  const baseUID = generateUID(
    aiResult.country_en || aiResult.country,
    aiResult.region_en  || aiResult.region,
    aiResult.farm_en    || aiResult.farm,
    aiResult.process
  );
  const uid = await ensureUniqueUID(baseUID, sb);

  /* 3-4. taxonomy 테이블에 신규 행 등록 */
  const aliases = [
    rawText,                         // OCR 원문 자체도 alias로 등록
    ...(aiResult.farm_aliases || []),
    ocrData?.farm || "",
  ].filter(v => v && v !== aiResult.farm && v !== aiResult.farm_en);

  const { error: taxErr } = await sb.from("taxonomy").insert({
    uid,
    continent:    aiResult.continent || "",
    country:      aiResult.country   || "",
    country_en:   aiResult.country_en|| "",
    region:       aiResult.region    || "",
    region_en:    aiResult.region_en || "",
    farm:         aiResult.farm      || "",
    farm_en:      aiResult.farm_en   || "",
    farm_aliases: [...new Set(aliases)],
    process:      aiResult.process   || "",
    variety:      aiResult.variety   || "",
    /* search_text는 트리거(update_taxonomy_search_text)가 자동 생성 */
  });

  if (taxErr) {
    console.error("[DraftEntity] taxonomy insert 오류:", taxErr.message);
    await sb.from("taxonomy_drafts")
      .update({ status: "taxonomy_failed", ai_result: aiResult, processed_at: new Date().toISOString() })
      .eq("id", draft.id);
    return { success: false, reason: taxErr.message, draftId: draft.id };
  }

  /* 3-5. draft 완료 처리 */
  await sb.from("taxonomy_drafts").update({
    status:       "completed",
    ai_result:    aiResult,
    assigned_uid: uid,
    processed_at: new Date().toISOString(),
  }).eq("id", draft.id);

  /* 3-6. coffeeId가 있으면 즉시 연결 */
  if (coffeeId) {
    await sb.from("coffees")
      .update({ taxonomy_uid: uid })
      .eq("id", coffeeId)
      .catch(() => {});
  }

  console.log(`[DraftEntity] ✅ 새 UID 생성: ${uid} (${aiResult.farm || aiResult.country})`);

  return {
    success:  true,
    uid,
    draftId:  draft.id,
    taxonomy: aiResult,
    aliases:  [...new Set(aliases)],
  };
}

/* ═══════════════════════════════════════════════════
   4. API Handler
   ═══════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "POST only" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "invalid json" }); }
  }

  const { rawText, ocrData, coffeeId } = body || {};
  if (!rawText) return res.status(400).json({ error: "rawText 필요" });

  try {
    const result = await createDraftEntity(rawText, ocrData, coffeeId);
    return res.status(200).json(result);
  } catch (e) {
    console.error("[DraftEntity] 오류:", e.message);
    return res.status(200).json({ success: false, reason: e.message });
  }
};

/* 다른 API에서 재사용 가능하도록 export */
module.exports.createDraftEntity = createDraftEntity;
module.exports.generateUID       = generateUID;
