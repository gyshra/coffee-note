/**
 * Coffee Note — Entity Resolution API
 * POST /api/normalize  { text, context? }
 *
 * OCR 원문을 받아 4단계 택소노미 UID에 매핑.
 * confidence ≥ 0.90 → 자동 매핑
 * confidence 0.70~0.89 → 사용자 확인 요청
 * confidence < 0.70 → 신규 원두 또는 수동 입력
 */
const { getClient } = require("./_lib/supabase");

/* ═══════════════════════════════════════════════════
   1. 전처리 (Pre-processing)
   OCR 노이즈 제거 + 한글/영문 정규화
   ═══════════════════════════════════════════════════ */
function preprocess(raw) {
  if (!raw) return "";
  return raw
    .normalize("NFC")                        // 유니코드 정규화
    .replace(/[\r\n\t]+/g, " ")              // 줄바꿈 → 공백
    .replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\w\s\-\/\.]/g, " ") // 특수문자 제거 (한글+영문+숫자+기본 기호만 유지)
    .replace(/\s+/g, " ")                    // 연속 공백 → 단일
    .trim()
    .toLowerCase();
}

/* ═══════════════════════════════════════════════════
   2. Levenshtein Distance (편집 거리)
   서버사이드에서 pg_trgm 결과 보정용
   ═══════════════════════════════════════════════════ */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/* Jaro-Winkler Similarity */
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1.0;
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1m = new Array(len1).fill(false);
  const s2m = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const lo = Math.max(0, i - matchDist);
    const hi = Math.min(i + matchDist + 1, len2);
    for (let j = lo; j < hi; j++) {
      if (s2m[j] || s1[i] !== s2[j]) continue;
      s1m[i] = s2m[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1m[i]) continue;
    while (!s2m[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro = (matches/len1 + matches/len2 + (matches - transpositions/2)/matches) / 3;
  const prefix = Math.min([...Array(Math.min(4, len1, len2))].filter((_,i) => s1[i] === s2[i]).length, 4);
  return jaro + prefix * 0.1 * (1 - jaro);
}

/* 복합 유사도: Jaro-Winkler 60% + 정규화 편집거리 40% */
function similarity(a, b) {
  const jw = jaroWinkler(a, b);
  const maxLen = Math.max(a.length, b.length);
  const lev = maxLen > 0 ? 1 - levenshtein(a, b) / maxLen : 1;
  return jw * 0.6 + lev * 0.4;
}

/* 토큰별 최대 유사도 (부분 매칭) */
function tokenSimilarity(query, target) {
  const qTokens = query.split(/\s+/).filter(Boolean);
  const tTokens = target.split(/\s+/).filter(Boolean);
  if (!qTokens.length || !tTokens.length) return 0;

  let total = 0;
  qTokens.forEach(qt => {
    const best = Math.max(...tTokens.map(tt => similarity(qt, tt)));
    total += best;
  });
  return total / qTokens.length;
}

/* ═══════════════════════════════════════════════════
   3. 핵심: pg_trgm 쿼리 + JS 재계산 → 최종 confidence
   ═══════════════════════════════════════════════════ */
async function resolveEntity(rawText, context) {
  const normalized = preprocess(rawText);
  const sb = getClient();

  if (!sb || !normalized) {
    return { confidence: 0, action: "new", normalized };
  }

  /* pg_trgm 유사도 검색 (PostgreSQL 함수 호출) */
  const { data: candidates, error } = await sb
    .rpc("find_similar_taxonomy", {
      query_text: normalized,
      threshold: 0.2,       // 넓게 잡고 JS에서 정밀 필터링
    });

  if (error || !candidates?.length) {
    /* 폴백: aliases 직접 검색 */
    const { data: aliasCandidates } = await sb
      .from("taxonomy")
      .select("uid, country, country_en, region, region_en, farm, farm_en, farm_aliases, process, variety, search_text")
      .limit(20);

    if (!aliasCandidates?.length) {
      return { confidence: 0, action: "new", normalized };
    }

    return scoreAndRank(normalized, aliasCandidates.map(r => ({
      ...r,
      similarity: tokenSimilarity(normalized, r.search_text || ""),
    })), context);
  }

  /* JS 측에서 토큰 유사도로 재채점 */
  const rescored = candidates.map(c => ({
    ...c,
    /* alias 가중치: farm_aliases 중 하나라도 높은 유사도면 boost */
    similarity: Math.max(
      Number(c.similarity) * 0.7 + tokenSimilarity(normalized, c.farm?.toLowerCase() || "") * 0.3,
      tokenSimilarity(normalized, c.search_text || "")
    ),
  }));

  return scoreAndRank(normalized, rescored, context);
}

function scoreAndRank(normalized, candidates, context) {
  /* context(국가 등)가 있으면 일치하는 후보에 가중치 */
  if (context?.country) {
    const ctryNorm = preprocess(context.country);
    candidates = candidates.map(c => ({
      ...c,
      similarity: c.similarity * (
        (c.country_en?.toLowerCase().includes(ctryNorm) ||
         c.country?.includes(context.country)) ? 1.15 : 1.0
      ),
    }));
  }

  candidates.sort((a, b) => b.similarity - a.similarity);
  const best = candidates[0];
  if (!best) return { confidence: 0, action: "new", normalized };

  const confidence = Math.min(best.similarity, 1.0);

  let action, message;
  if (confidence >= 0.90) {
    action  = "auto";
    message = null;
  } else if (confidence >= 0.70) {
    action  = "confirm";
    message = `"${best.farm || best.region}" 원두가 맞나요?`;
  } else {
    action  = "new";
    message = "새로운 원두로 등록합니다.";
  }

  return {
    confidence: Math.round(confidence * 1000) / 1000,
    action,
    message,
    normalized,
    matched: {
      uid:      best.uid,
      country:  best.country,
      region:   best.region,
      farm:     best.farm,
      process:  best.process,
      variety:  best.variety,
    },
    alternatives: candidates.slice(1, 3).map(c => ({
      uid: c.uid, country: c.country, region: c.region,
      farm: c.farm, similarity: Math.round(c.similarity * 100),
    })),
  };
}

/* ═══════════════════════════════════════════════════
   4. 매핑 결과 기록 + coffees 테이블에 UID 연결
   ═══════════════════════════════════════════════════ */
async function recordMapping({ rawText, normalized, uid, confidence, method, confirmedBy }) {
  const sb = getClient();
  if (!sb) return;
  await sb.from("entity_mappings").insert({
    raw_text:    rawText,
    normalized,
    matched_uid: uid,
    confidence,
    match_method: method || "trgm",
    confirmed_by: confirmedBy || "auto",
  }).catch(() => {});
}

/* ═══════════════════════════════════════════════════
   5. API Handler
   ═══════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "POST only" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "invalid json" }); } }

  const { text, context, coffeeId, action: userAction, uid: userUid } = body || {};

  /* ── 사용자 확인(confirm) 응답 처리 ── */
  if (userAction === "confirm" && userUid && coffeeId) {
    const sb = getClient();
    if (sb) {
      await sb.from("coffees").update({ taxonomy_uid: userUid }).eq("id", coffeeId);
      await recordMapping({ rawText: text || "", normalized: preprocess(text||""), uid: userUid, confidence: 0.85, method: "trgm", confirmedBy: "user" });
    }
    return res.status(200).json({ success: true, uid: userUid, action: "confirmed" });
  }

  /* ── 신규 entity resolution ── */
  if (!text) return res.status(400).json({ error: "text 필요" });

  try {
    const result = await resolveEntity(text, context || {});

    /* 자동 매핑인 경우 기록 */
    if (result.action === "auto" && result.matched?.uid) {
      await recordMapping({
        rawText:     text,
        normalized:  result.normalized,
        uid:         result.matched.uid,
        confidence:  result.confidence,
        confirmedBy: "auto",
      });

      /* coffeeId가 있으면 바로 연결 */
      if (coffeeId) {
        const sb = getClient();
        if (sb) await sb.from("coffees").update({ taxonomy_uid: result.matched.uid }).eq("id", coffeeId);
      }
    }

    /* ── confidence < 0.70: Dynamic Taxonomy Pipeline 트리거 ── */
    if (result.action === "new") {
      /* 비동기로 실행 — 응답을 블로킹하지 않음 */
      setImmediate(async () => {
        try {
          const { createDraftEntity } = require("./draft-entity");
          const ocrData = context || {};
          const draftResult = await createDraftEntity(text, ocrData, coffeeId || null);
          if (draftResult.success) {
            console.log(`[Normalize] 동적 택소노미 생성 완료: ${draftResult.uid}`);
          }
        } catch (e) {
          console.warn("[Normalize] Draft pipeline 오류:", e.message);
        }
      });

      /* 클라이언트에게는 즉시 "new" 반환 (파이프라인은 백그라운드) */
      result._draftPipelineTriggered = true;
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("[Normalize]", e.message);
    return res.status(200).json({ confidence: 0, action: "new", error: e.message });
  }
};

/* ── 모듈 export (다른 API에서 재사용) ── */
module.exports.resolveEntity = resolveEntity;
module.exports.preprocess    = preprocess;
module.exports.recordMapping = recordMapping;
