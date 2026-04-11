/**
 * POST /api/insight
 * { expected, actual, recipe, coffee }
 * → { insight: "한 줄 분석 + 다음 변수 제안" }
 * Claude Haiku 사용
 */

const AXES_KR = { acidity:'산미', bitterness:'쓴맛', sweetness:'단맛', body:'바디감', finish:'여운' };

function buildPrompt({ expected, actual, recipe, coffee }) {
  const diffs = Object.entries(AXES_KR).map(([k, label]) => {
    const e = expected?.[k] ?? 5, a = actual?.[k] ?? 5;
    return `${label}: 예상 ${e} → 실제 ${a} (${a > e ? '+' : ''}${a - e})`;
  }).join('\n');

  const recipeStr = recipe
    ? `추출: ${recipe.method || ''} ${recipe.temp || ''}°C 비율 ${recipe.ratio || ''} 원두 ${recipe.beanG || ''}g`
    : '';

  return `홈브루어의 커피 추출 결과를 분석해 한 문장으로 핵심 조언을 해주세요.

원두: ${coffee?.name || '알 수 없음'} (${coffee?.processCategory || ''})
${recipeStr}

예상 vs 실제 맛:
${diffs}

규칙:
- 반드시 한 문장(40자 내외)
- 가장 차이가 큰 항목 하나만 집중
- 구체적인 추출 변수 변경 제안 포함 (온도/분쇄도/시간/비율 중 하나)
- 친근하고 간결하게`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }

  const { expected, actual, recipe, coffee } = body || {};

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) return res.status(200).json({ insight: null });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages:   [{ role: 'user', content: buildPrompt({ expected, actual, recipe, coffee }) }],
      }),
    });

    if (r.ok) {
      const d       = await r.json();
      const insight = d.content?.[0]?.text?.trim();
      if (insight) return res.status(200).json({ insight });
    } else {
      console.warn('[insight] Claude', r.status);
    }
  } catch (e) {
    console.warn('[insight] 예외:', e.message);
  }

  return res.status(200).json({ insight: null });
};
