/**
 * POST /api/recipe-suggest
 * { coffee: { name, process, country, roast? }, method: string }
 *
 * 1순위: SCA_MATRIX 정적 조회 (API 비용 0원)
 * 2순위: Gemini Flash (SCA_MATRIX 미지원 조합)
 *
 * 응답: { recipe: { temp, ratio, grindDesc, bloomSec, brewTimeSec, tip }, source }
 */

import { lookupRecipe, METHODS, PROCESSES } from '../src/modules/sca-matrix.js';

function parse(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }

  const { coffee = {}, method = 'V60' } = body || {};
  const processKey = coffee.processCategory || coffee.process || '워시드';
  const roast      = coffee.roast || 'medium';

  // ── 1순위: SCA_MATRIX 정적 조회 ──────────────────────────
  if (PROCESSES.includes(processKey) && METHODS.includes(method)) {
    const recipe = lookupRecipe(method, processKey, roast);
    return res.status(200).json({ recipe, source: 'sca_matrix' });
  }

  // ── 2순위: Gemini Flash ───────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    const recipe = lookupRecipe('V60', '워시드', roast);
    return res.status(200).json({ recipe: { ...recipe, source: 'sca_matrix_fallback' }, source: 'sca_matrix_fallback' });
  }

  const prompt = `커피 원두 특성에 맞는 추출 레시피를 JSON으로만 반환하세요. 마크다운 금지.

원두: ${coffee.name || '알 수 없음'}
가공방식: ${processKey}
국가: ${coffee.country || '알 수 없음'}
로스팅: ${roast}
추출 도구: ${method}

응답 형식:
{"temp":93,"ratio":"1:15","grindDesc":"중간-가늘게","bloomSec":30,"brewTimeSec":180,"tip":"한 줄 조언"}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 300 } }) }
    );
    if (r.ok) {
      const d   = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      const ai  = parse(raw);
      if (ai?.temp) return res.status(200).json({ recipe: { ...ai, source: 'gemini' }, source: 'gemini' });
    }
  } catch (e) { console.warn('[recipe-suggest] Gemini 예외:', e.message); }

  // 최종 폴백
  const recipe = lookupRecipe('V60', '워시드', roast);
  return res.status(200).json({ recipe: { ...recipe, source: 'fallback' }, source: 'fallback' });
}
