# Vercel 환경변수 설정 안내

Vercel → coffee-note 프로젝트 → Settings → Environment Variables

## 필수 환경변수

| Name | Value | 설명 |
|------|-------|------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | OCR + AI 검색용 |
| `SUPABASE_URL` | `https://xonvxjflyykanhvsyhsu.supabase.co` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | `service_role 키` | RLS 우회용 서버 전용 키 |

## SUPABASE_SERVICE_KEY 찾는 법
Supabase → Settings → API Keys → service_role (Reveal 클릭)
⚠️ 이 키는 절대 프론트엔드 코드에 넣지 마세요. Vercel 환경변수에만!

## 설정 후
Deployments → 최신 배포 → Redeploy (캐시 해제)
