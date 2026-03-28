# Vercel 환경변수 설정 가이드

## 필수 환경변수

| 변수명 | 설명 | 우선순위 |
|--------|------|----------|
| `GEMINI_API_KEY` | Google AI Studio API 키 (OCR + 검색 1순위) | **신규 필수** |
| `ANTHROPIC_API_KEY` | Claude API 키 (fallback 용도) | 유지 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 유지 |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 키 | 유지 |

## AI 라우팅 구조 (v23)

```
OCR 요청 → Gemini 2.0 Flash (1순위, ~$0.0002/call)
         → Claude Haiku fallback (Gemini 실패 시)

텍스트 검색 → Supabase 캐시 (비용 제로)
           → Gemini 2.0 Flash (캐시 미스, ~$0.0003/call)
           → Claude Haiku fallback (신뢰도 낮을 때, 한국어 정밀도)
```

## GEMINI_API_KEY 발급 방법

1. https://aistudio.google.com 접속
2. "Get API key" → "Create API key"
3. 무료 tier: 하루 1,500 OCR 요청, 분당 15회
4. 초과 시 유료 전환 (Gemini 2.0 Flash: 입력 $0.10/1M 토큰)

## Vercel 설정 방법

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 위 변수 4개 모두 입력
3. "Save" 후 Redeploy

## 비용 최적화 효과

- OCR: Sonnet($0.025) → Gemini Flash($0.0002) = **125배 절감**
- 검색: Haiku($0.005) → Gemini Flash($0.0003) = **17배 절감**
- DB 캐시 히트 시: 비용 제로
