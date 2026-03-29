# Coffee Note — 개발 마스터 플랜
# 작성일: 2026-03-29 | 기준 버전: v26

---

## 0. 이 문서의 목적

클로드가 매 세션마다 이 파일을 먼저 읽고, 전체 맥락을 파악한 뒤 작업에 들어간다.
"어디까지 됐는지", "다음은 뭔지", "뭘 건드리면 안 되는지"를 이 한 파일로 판단한다.

---

## 1. 프로젝트 현황 스냅샷

### 기술 스택
- **프론트**: HTML/CSS/Vanilla JS (멀티페이지, Vercel 정적 호스팅)
- **백엔드**: Vercel Serverless Functions (`/api/*.js`)
- **DB**: Supabase (PostgreSQL, Tokyo 리전, 프로젝트 ID: `xonvxjflyykanhvsyhsu`)
- **AI**: Gemini 2.0 Flash (OCR/검색 1순위) → Claude Haiku (fallback)
- **배포**: GitHub `gyshra/coffee-note` → Vercel 자동배포
- **로컬 경로**: `~/Documents/COFFEE NOTE project/coffee-note-latest/`

### 환경변수 (Vercel에 설정 필요)
```
GEMINI_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL      (클라이언트용)
NEXT_PUBLIC_SUPABASE_ANON_KEY (클라이언트용)
SUPABASE_URL                  (서버용)
SUPABASE_SERVICE_KEY          (서버용, service_role)
SUPABASE_ANON_KEY             (서버용)
```

---

## 2. 파일별 상태 — 절대 건드리지 말 것 / 재작성 필요

### ✅ 살릴 것 (로직층 — 건드리지 않음)

| 파일 | 역할 | 완성도 | 비고 |
|------|------|--------|------|
| `common.js` | localStorage, SCA 데이터(9개 카테고리 전체), 검색, 토스트, OCR 시트 | 95% | 핵심 모듈. 절대 재작성 금지 |
| `tasting-wheel.js` | 반원형 플레이버 휠 (Canvas 기반 회전, 스냅 애니메이션) | 90% | CoffeeWheel.init() API |
| `tasting-radar.js` | 레이더 차트 3중 비교 (내기록/커뮤니티/AI예측) | 80% | 겹침 버그: panelEl 동적 삽입 구조 문제 → Phase A-6에서 수정 |
| `card-generator.js` | 센서리 카드 Canvas(1080×1920px) 생성 | 85% | CardGenerator.generate(), share() |
| `supabase.js` | 클라이언트 Auth + DB (자동 config 로드) | 90% | SupaAuth, SupaDB 전역 노출 |
| `api/search.js` | AI 검색 Gemini→Haiku, Supabase 캐시 | 85% | buildPrompt() 개선 완료 |
| `api/ocr.js` | 이미지 → 원두 구조화 데이터 | 85% | |
| `api/config.js` | 환경변수 → 클라이언트 안전 노출 | 100% | |
| `api/_lib/supabase.js` | 서버사이드 Supabase 클라이언트, upsertCoffee, buildCommunity | 85% | formatCoffee()에 sca_score 등 누락 필드 추가 필요 |
| `common.css` | NYT 에디토리얼 스타일 토큰 전체 | 90% | Pretendard + Playfair Display, 각진 모서리, 흑백 톤 |
| `SUPABASE-SETUP.sql` | 테이블 DDL | 80% | cqi_benchmarks, users 테이블 누락 → Phase A-1에서 추가 |

### 🔁 재작성할 것 (HTML 껍데기만 — JS 로직은 script 태그로 붙임)

| 파일 | 목표 | 목업 화면 |
|------|------|----------|
| `index.html` | 탐색 전용 (검색+원두 상세) | Screen 2 |
| `tasting.html` | 기록 전용 (레이더 겹침 해결) | Screen 4 |
| `home.html` | 홈 (마이너 조정) | Screen 1 |

### ✨ 신규 생성할 것

| 파일 | 목적 | 목업 화면 |
|------|------|----------|
| `recipe.html` | AI 추천 레시피 + 커뮤니티 레시피 | Screen 3 |
| `compare.html` | 테이스팅 후 비교 결과 | Screen 5 |
| `scripts/seed_cqi.py` | CQI 1,311건 Supabase import | — |
| `api/cqi.js` | 원두별 CQI 점수 조회 | — |
| `public/manifest.json` | PWA 설치 | — |
| `public/sw.js` | Service Worker | — |

---

## 3. 씨드 데이터 갭 분석

### 3.1 계획 vs 실제 구현 상태

| 데이터소스 | 건수 | 계획 | 실제 상태 | 갭 |
|-----------|------|------|----------|-----|
| CQI 오픈 데이터셋 | 1,311건 | cqi_benchmarks 테이블 | **0% — 테이블도 없음** | 테이블 생성 + seed_cqi.py + api/cqi.js |
| AI 대량 생성 | 200건 | 한국 원두 한국어 설명 씨드 | **0%** | scripts/seed_coffees.py 필요 |
| RoastDB 참조 | 4,540건 | AI 검색 정확도 향상 | **0% — 참조 코드 없음** | api/search.js 프롬프트에 컨텍스트로 주입 |
| SCA Golden Cup | 48조합 | 레시피 자동 제안 엔진 | **20% — buildRecipePanel() 휴리스틱만** | SCA_MATRIX 상수로 구현 필요 |

### 3.2 Supabase 스키마 갭

**coffees 테이블 — 누락 컬럼:**
```sql
sca_score      numeric(4,1)  -- CQI 연동 시 채워짐
raw_notes      text[]        -- OCR 원본 텍스트
roaster_url    text
farm_url       text
purchase_url   text
acidity        int           -- AI 예측값 저장
sweetness      int
body           int
aroma          int
brew_tips      text          -- AI 추천 레시피 텍스트
confidence     text          -- high/medium/low
```

**tastings 테이블 — 누락 컬럼:**
```sql
flavor_intensities  jsonb  -- {블루베리: 8, 자스민: 6, ...}
coffee_index        int    -- localStorage 호환용 (이미 있음)
```

**recipes 테이블 — 누락 컬럼:**
```sql
dripper     text
grinder     text
water_temp  text
ratio       text
grind_size  text
-- steps jsonb 이미 있음
is_expert   boolean DEFAULT false
is_premium  boolean DEFAULT false
price       int     -- 유료 레시피 가격 (원)
```

**users 테이블 — 완전 누락:**
```sql
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id),
  nickname       text,
  avatar         text,
  flavor_profile jsonb,       -- {Fruity:0.44, Floral:0.22, ...}
  gear           jsonb,       -- {dripper:"V60", grinder:"커맨단테"}
  level          int DEFAULT 1,
  created_at     timestamptz DEFAULT now()
);
```

**cqi_benchmarks 테이블 — 완전 누락:**
```sql
CREATE TABLE public.cqi_benchmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_name text,
  country     text,
  variety     text,
  process     text,
  aroma       numeric(4,1),
  flavor      numeric(4,1),
  aftertaste  numeric(4,1),
  acidity     numeric(4,1),
  body        numeric(4,1),
  balance     numeric(4,1),
  total_score numeric(5,1),
  grader      text,
  created_at  timestamptz DEFAULT now()
);
```

---

## 4. 커피 추출 관련 외부 자료 연동 방안

### 4.1 즉시 활용 가능한 공개 자료 (무료)

| 자료 | 출처 | 활용 방법 | 우선순위 |
|------|------|----------|---------|
| **SCA Golden Cup Standard** | sca.coffee (공개 PDF) | 48조합 매트릭스를 `SCA_MATRIX` 상수로 코드에 내장 → 레시피 자동 제안 | ★★★ |
| **CQI Dataset** | github.com/jldbc/coffee-quality-database | arabica_data_cleaned.csv → seed_cqi.py → Supabase | ★★★ |
| **World Coffee Research Sensory Lexicon** | worldcoffeeresearch.org (무료 PDF) | SCA 향미 설명 텍스트 → AI 프롬프트 컨텍스트 보강 | ★★ |
| **SCA Water Quality Report** | sca.coffee (공개) | 물 경도/TDS 기반 추출 팁 → brewTips 생성 로직 | ★★ |
| **Perfect Daily Grind 아티클** | perfectdailygrind.com | 원두별 배경 서사 생성 시 AI 프롬프트에 레퍼런스로 주입 | ★ |

### 4.2 구현 방법별 분류

**방법 A: 코드에 직접 내장 (API 비용 없음)**
- SCA Golden Cup 48조합 → `api/search.js`의 `SCA_MATRIX` 객체
- 가공방식 × 로스팅 × 추출도구 → 물온도/비율/분쇄도/시간 자동 계산
- 현재 `buildRecipePanel()`의 휴리스틱을 이것으로 교체

```javascript
const SCA_MATRIX = {
  // [process][roast][tool] = {temp, ratio, grind, time}
  "washed": {
    "light": { "V60": {temp:"94-96°C", ratio:"1:16", grind:"medium-fine", time:"2:30-3:00"}, ... },
    "medium": { ... }
  },
  "natural": { ... }
};
```

**방법 B: AI 프롬프트 컨텍스트 주입 (Gemini 호출 시)**
- RoastDB 4,540건을 Supabase에 저장 → 검색 시 유사 원두 데이터를 프롬프트에 포함
- WCR Sensory Lexicon 텍스트를 SCA 향미 설명으로 AI에 제공
- 비용: 프롬프트 토큰 증가 → Gemini Flash 기준 미미한 수준

**방법 C: 향후 검토 (현재 범위 초과)**
- 학술 논문 (Rao 2014 "The Coffee Roaster's Companion" 등) — 저작권 문제
- 커피 저울 연동 (Acaia, Brewista BT API) — 하드웨어 연동 범위
- 기상 데이터 API (습도/기온 → 추출 변수 보정) — 기능 과잉

---

## 5. 마스터 플랜 — 4단계

### Phase A — 기반 정비 (1주 목표)
**목표: 데이터 구조를 완성하고 CQI 실데이터를 Supabase에 넣는다**

| ID | 작업 | 담당 | 예상 |
|----|------|------|------|
| A-1 | SUPABASE-SETUP.sql 에 누락 컬럼/테이블 추가 (cqi_benchmarks, users, coffees 컬럼 추가) | Claude | 30분 |
| A-2 | scripts/seed_cqi.py 작성 (CQI CSV → Supabase cqi_benchmarks) | Claude | 1시간 |
| A-3 | SCA Golden Cup 48조합 → SCA_MATRIX 상수 → api/search.js 내장 | Claude | 1시간 |
| A-4 | api/cqi.js — 원두 country/process/variety로 CQI 점수 조회 | Claude | 30분 |
| A-5 | api/search.js — CQI 조회 결과 응답에 포함, sca_score 필드 추가 | Claude | 30분 |
| A-6 | tasting-radar.js — 겹침 버그 구조적 수정 (동적 DOM 삽입 제거) | Claude | 1시간 |
| A-7 | api/_lib/supabase.js — formatCoffee()에 누락 필드 추가 | Claude | 30분 |
| **A-★** | **CQI CSV 다운로드 후 seed_cqi.py 실행** | **직접** | 15분 |
| **A-★** | **Supabase SQL Editor에서 A-1 SQL 실행** | **직접** | 5분 |
| **A-★** | **Vercel 환경변수 7개 확인** | **직접** | 10분 |
| **A-★** | **Supabase Google OAuth provider 활성화** | **직접** | 5분 |

### Phase B — 화면 재구축 (2주 목표)
**목표: 목업 5개 화면을 완전히 구현. 기존 JS는 script 태그로 붙임**

| ID | 파일 | 목업 | 핵심 내용 | 예상 |
|----|------|------|----------|------|
| B-1 | `index.html` 재작성 | Screen 2 | 검색+원두 상세 (OCR그리드+예상향미+CQI점수+신뢰도+레시피버튼) | 3시간 |
| B-2 | `recipe.html` 신규 | Screen 3 | 추출법 탭+SCA_MATRIX 레시피+커뮤니티 바 차트+"내리러가기" | 3시간 |
| B-3 | `tasting.html` 재작성 | Screen 4 | 향미태그+레이더(겹침없음)+추출법+저장+비교 버튼 | 4시간 |
| B-4 | `compare.html` 신규 | Screen 5 | 레이더오버레이+바차트+AI인사이트+커뮤니티후기+CTA | 3시간 |
| B-5 | `home.html` 수정 | Screen 1 | 목업 레이아웃 정합성 맞춤 | 1시간 |

### Phase C — 데이터 연동 (1주 목표)
**목표: 실제 데이터가 흐르는 앱**

| ID | 작업 | 담당 | 예상 |
|----|------|------|------|
| C-1 | card-generator.js → 카카오/인스타 공유 | Claude | 1시간 |
| C-2 | PWA manifest.json + sw.js | Claude | 1시간 |
| C-3 | 커뮤니티 평균값 Supabase 실시간 집계로 교체 | Claude | 1시간 |
| C-4 | mypage.html — 실제 기록/통계/레벨 표시 | Claude | 2시간 |
| C-5 | notes.html — 실제 Supabase 기록 목록 | Claude | 1시간 |
| **C-★** | **Google 로그인 → 실제 테스트** | **직접** | 30분 |
| **C-★** | **테이스팅 저장 → Supabase 확인** | **직접** | 20분 |

### Phase D — 배포 완성 (3일 목표)
**목표: 20명 베타 공유 가능한 수준**

| ID | 작업 | 담당 |
|----|------|------|
| D-1 | 전체 흐름 버그 테스트 (OCR → 검색 → 레시피 → 기록 → 비교) | **직접** |
| D-2 | PWA 홈 화면 설치 테스트 (iOS Safari) | **직접** |
| D-3 | 베타 유저 20명 공유 | **직접** |

---

## 6. 화면별 네비게이션 흐름

```
home.html
  ├─ [스캔] → OCR 시트 → index.html?coffeeId=N
  ├─ [검색] → index.html
  └─ [최근 카드 탭] → compare.html?tastingId=N

index.html  (Screen 2: 탐색)
  ├─ 검색 → 원두 상세 펼침
  ├─ [레시피 보기] → recipe.html?coffeeId=N
  └─ [기록하기] → tasting.html?coffeeId=N  (AI 예측값 sessionStorage 저장)

recipe.html  (Screen 3: 레시피)
  ├─ 추출법 탭 선택 → SCA_MATRIX 기반 레시피 표시
  ├─ 커뮤니티 레시피 목록
  └─ [내리러 가기] → tasting.html?coffeeId=N&recipeId=R

tasting.html  (Screen 4: 기록)
  ├─ Step1 플레이버 휠
  ├─ Step2 레이더 차트
  ├─ Step3 추출법/메모/별점
  └─ [저장+비교] → compare.html?tastingId=NEW

compare.html  (Screen 5: 비교)
  ├─ 레이더 오버레이 (내기록 vs 커뮤니티 vs CQI)
  ├─ AI 인사이트
  ├─ [카드 공유] → card-generator
  └─ [구매하기] → 외부 링크
```

---

## 7. 디자인 원칙 (변경 불가)

- **배경**: `#FFFFFF` (순백)
- **텍스트**: `#121212` (거의 검정)
- **액센트**: `#8C7355` (웜 브라운)
- **보조선**: `#E0E0E0`
- **폰트**: Pretendard Variable (본문) + Playfair Display 900 (로고)
- **모서리**: 0px (각진 에디토리얼 스타일) — 절대 border-radius 사용 금지
- **네온/그라디언트**: 사용 금지
- **목업 파일**: `coffee_note_complete_mockup.html` (5개 화면 레퍼런스)

---

## 8. 현재 버전 번호 규칙

- **v26**: 현재 기준 버전
- **v29부터**: 다음 작업 시작 버전 (건너뜀 의도적)
- **ZIP 파일명**: `coffee-note-v{N}.zip`
- **각 Phase 완료 시 버전 증가**: A완료→v29, B완료→v30, C완료→v31, D완료→v32

---

## 9. 직접 해야 할 것 체크리스트

### Phase A 시작 전 (지금 당장)
- [ ] CQI CSV 다운로드: `https://github.com/jldbc/coffee-quality-database/raw/master/data/arabica_data_cleaned.csv`
- [ ] Vercel 환경변수 7개 설정 확인
- [ ] Supabase Google OAuth 활성화: Authentication → Providers → Google

### Phase A 중 (Claude가 스크립트 주면)
- [ ] `python3 scripts/seed_cqi.py` 실행 (Python 3.x 필요, `pip install supabase`)
- [ ] Supabase SQL Editor에서 업데이트된 SQL 실행

### Phase C 중 (기능 테스트)
- [ ] 실제 Google 계정으로 로그인 테스트
- [ ] 테이스팅 기록 후 Supabase Table Editor에서 확인
- [ ] iOS Safari에서 "홈 화면에 추가" 테스트

---

## 10. 금지 사항

1. `common.js` 전체 재작성 금지 — 필요시 함수 추가만
2. `tasting-wheel.js` CoffeeWheel 공개 API 변경 금지
3. `common.css` 디자인 토큰 (색상/폰트) 변경 금지
4. 기존 localStorage 키 이름 변경 금지 (`coffee_note_*`)
5. `vercel.json` 구조 변경 금지 (`{"version": 2}` 유지)
6. 새 npm 패키지 추가 시 `package.json` 확인 후 진행
