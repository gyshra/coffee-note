/**
 * POST /api/tastings  — 테이스팅 기록 저장
 * { coffeeId, tasting: { overall, starRating, baseScores, flavors, defects, memo, brewCount, recipe } }
 *
 * 저장 우선순위:
 * 1) Supabase (로그인 시)
 * 2) 응답으로 record 반환 (클라이언트가 localStorage에도 저장)
 */
const { getClient } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }

  const { coffeeId, tasting } = body || {};
  if (!tasting) return res.status(400).json({ error: 'tasting 필드 필요' });

  const record = {
    coffee_id:    coffeeId || null,
    overall:      tasting.overall     || 0,
    star_rating:  tasting.starRating  || 0,
    base_scores:  tasting.baseScores  || null,
    flavors:      tasting.flavors     || [],
    defects:      tasting.defects     || [],
    memo:         tasting.memo        || '',
    brew_count:   tasting.brewCount   || 1,
    recipe:       tasting.recipe      || null,
    created_at:   new Date().toISOString(),
  };

  // ── Supabase 저장 시도 ──────────────────────────────
  const sb = getClient();
  if (sb) {
    try {
      const { data, error } = await sb.from('tastings').insert([record]).select().single();
      if (!error && data) {
        return res.status(200).json({ ok: true, record: data, source: 'supabase' });
      }
      console.warn('[tastings] Supabase insert 실패:', error?.message);
    } catch (e) {
      console.warn('[tastings] Supabase 예외:', e.message);
    }
  }

  // ── 폴백: 클라이언트 로컬 저장용 record 반환 ───────
  return res.status(200).json({ ok: true, record, source: 'local' });
};
