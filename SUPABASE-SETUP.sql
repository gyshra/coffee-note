

-- =====================================================
       int,
  ADD COLUMN IF NOT EXISTS brew_tips     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence    text DEFAULT 'medium';

-- ─── tastings 테이블 — 누락 컬럼 추가 ────────────────
ALTER TABLE public.tastings
  ADD COLUMN IF NOT EXISTS flavor_intensities jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coffee_index        int;

-- ─── recipes 테이블 — 누락 컬럼 추가 ─────────────────
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS dripper     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS grinder     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS water_temp  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ratio       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS grind_size  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_expert   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price       int DEFAULT 0;

-- ─── 6. users 테이블 (신규) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname       text DEFAULT '',
  avatar         text DEFAULT '',
  flavor_profile jsonb DEFAULT '{}',
  gear           jsonb DEFAULT '{}',
  level          int DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- users auto-create on first login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 7. cqi_benchmarks 테이블 (신규) ─────────────────
CREATE TABLE IF NOT EXISTS public.cqi_benchmarks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_name   text NOT NULL DEFAULT '',
  country       text DEFAULT '',
  variety       text DEFAULT '',
  process       text DEFAULT '',
  color         text DEFAULT '',
  aroma         numeric(4,1),
  flavor        numeric(4,1),
  aftertaste    numeric(4,1),
  acidity       numeric(4,1),
  body          numeric(4,1),
  balance       numeric(4,1),
  uniformity    numeric(4,1),
  clean_cup     numeric(4,1),
  sweetness     numeric(4,1),
  total_score   numeric(5,1),
  moisture      numeric(5,2),
  defects       int DEFAULT 0,
  grader        text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cqi_country ON public.cqi_benchmarks (country);
CREATE INDEX IF NOT EXISTS idx_cqi_process ON public.cqi_benchmarks (process);
CREATE INDEX IF NOT EXISTS idx_cqi_score   ON public.cqi_benchmarks (total_score DESC);

-- CQI는 공개 읽기 허용 (시드 데이터)
ALTER TABLE public.cqi_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cqi_select" ON public.cqi_benchmarks FOR SELECT USING (true);
CREATE POLICY "cqi_insert" ON public.cqi_benchmarks FOR INSERT WITH CHECK (true);

-- =====================================================
-- ✅ 실행 완료 후 확인:
--    coffees / tastings / recipes / favorites / users / cqi_benchmarks
-- =====================================================


-- =====================================================
-- Phase A-8: Entity Resolution 시스템
-- 4단계 계층 택소노미 + pg_trgm 유사도 검색
-- =====================================================

-- pg_trgm 확장 활성화 (Supabase에서 기본 지원)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── taxonomy (4단계 마스터 데이터) ──────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy (
  uid          text PRIMARY KEY,          -- BEAN_ID_001 형태
  -- Level 1
  continent    text NOT NULL DEFAULT '',
  country      text NOT NULL DEFAULT '',
  country_en   text NOT NULL DEFAULT '',
  -- Level 2
  region       text NOT NULL DEFAULT '',
  region_en    text NOT NULL DEFAULT '',
  -- Level 3
  farm         text NOT NULL DEFAULT '',
  farm_en      text NOT NULL DEFAULT '',
  farm_aliases text[] DEFAULT '{}',       -- 알려진 표기 변형들
  -- Level 4
  process      text NOT NULL DEFAULT '',
  variety      text NOT NULL DEFAULT '',
  -- 검색용 통합 벡터 (tsvector + trgm 둘 다 활용)
  search_text  text GENERATED ALWAYS AS (
    lower(
      country || ' ' || country_en || ' ' ||
      region  || ' ' || region_en  || ' ' ||
      farm    || ' ' || farm_en    || ' ' ||
      process || ' ' || variety    || ' ' ||
      array_to_string(farm_aliases, ' ')
    )
  ) STORED,
  tasting_count int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- GIN 인덱스: pg_trgm 유사도 검색 최적화
CREATE INDEX IF NOT EXISTS idx_taxonomy_trgm
  ON public.taxonomy USING gin(search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_taxonomy_country
  ON public.taxonomy (lower(country));

CREATE INDEX IF NOT EXISTS idx_taxonomy_farm_aliases
  ON public.taxonomy USING gin(farm_aliases);

ALTER TABLE public.taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxonomy_select" ON public.taxonomy FOR SELECT USING (true);
CREATE POLICY "taxonomy_insert" ON public.taxonomy FOR INSERT WITH CHECK (true);
CREATE POLICY "taxonomy_update" ON public.taxonomy FOR UPDATE USING (true);

-- ─── entity_mappings: OCR 결과 → UID 매핑 기록 ────────
CREATE TABLE IF NOT EXISTS public.entity_mappings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text     text NOT NULL,             -- OCR 원본
  normalized   text NOT NULL,             -- 전처리 후
  matched_uid  text REFERENCES public.taxonomy(uid),
  confidence   numeric(4,3) NOT NULL,     -- 0.000 ~ 1.000
  match_method text DEFAULT 'trgm',       -- trgm / exact / manual
  confirmed_by text DEFAULT 'auto',       -- auto / user / admin
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_raw ON public.entity_mappings (normalized);

ALTER TABLE public.entity_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entity_select" ON public.entity_mappings FOR SELECT USING (true);
CREATE POLICY "entity_insert" ON public.entity_mappings FOR INSERT WITH CHECK (true);

-- ─── coffees 테이블에 taxonomy_uid 연결 ───────────────
ALTER TABLE public.coffees
  ADD COLUMN IF NOT EXISTS taxonomy_uid text REFERENCES public.taxonomy(uid);

CREATE INDEX IF NOT EXISTS idx_coffees_taxonomy
  ON public.coffees (taxonomy_uid);

-- ─── pg_trgm 유사도 검색 함수 ─────────────────────────
CREATE OR REPLACE FUNCTION public.find_similar_taxonomy(
  query_text text,
  threshold  float DEFAULT 0.3
)
RETURNS TABLE(
  uid         text,
  country     text,
  region      text,
  farm        text,
  process     text,
  variety     text,
  similarity  float
) LANGUAGE sql STABLE AS $$
  SELECT
    uid, country, region, farm, process, variety,
    similarity(search_text, lower(query_text)) AS similarity
  FROM public.taxonomy
  WHERE similarity(search_text, lower(query_text)) > threshold
  ORDER BY similarity DESC
  LIMIT 5;
$$;

-- ─── taxonomy 초기 시드 데이터 (주요 원두 산지) ────────
INSERT INTO public.taxonomy (uid, continent, country, country_en, region, region_en, farm, farm_en, farm_aliases, process, variety)
VALUES
  -- 에티오피아
  ('ETH_YRG_KNG_W', '아프리카', '에티오피아', 'Ethiopia', '예가체프', 'Yirgacheffe', '콩가', 'Konga', ARRAY['콩가','Konga','Kongga'], '워시드', 'Heirloom'),
  ('ETH_YRG_GDO_W', '아프리카', '에티오피아', 'Ethiopia', '예가체프', 'Yirgacheffe', '게도', 'Gedeo', ARRAY['게도','Gedeo','Gedeb'], '워시드', 'Heirloom'),
  ('ETH_GUJ_SHK_N', '아프리카', '에티오피아', 'Ethiopia', '구지', 'Guji', '샤키소', 'Shakiso', ARRAY['샤키소','Shakiso','샥키소'], '내추럴', 'Heirloom'),
  ('ETH_SID_ARR_W', '아프리카', '에티오피아', 'Ethiopia', '시다모', 'Sidamo', '아리차', 'Aricha', ARRAY['아리차','Aricha'], '워시드', 'Heirloom'),
  -- 케냐
  ('KEN_NYR_KIA_W', '아프리카', '케냐', 'Kenya', '냐에리', 'Nyeri', '키암바라', 'Kiambara', ARRAY['키암바라','Kiambara'], '워시드', 'SL28/SL34'),
  ('KEN_KRG_KAR_W', '아프리카', '케냐', 'Kenya', '끼리냐가', 'Kirinyaga', '까리미쿠이', 'Karimikui', ARRAY['까리미쿠이','Karimikui'], '워시드', 'SL28'),
  -- 콜롬비아
  ('COL_HUI_EPR_N', '남미', '콜롬비아', 'Colombia', '우일라', 'Huila', '엘 파라이소', 'El Paraiso', ARRAY['엘 파라이소','El Paraiso','엘파라이소'], '내추럴', 'Caturra'),
  ('COL_NAR_LMT_H', '남미', '콜롬비아', 'Colombia', '나리뇨', 'Narino', '라 미나', 'La Mina', ARRAY['라 미나','La Mina'], '허니', 'Castillo'),
  -- 파나마
  ('PAN_CHR_HKT_W', '중미', '파나마', 'Panama', '치리키', 'Chiriqui', '하세엔다 라 에스메랄다', 'Hacienda La Esmeralda', ARRAY['에스메랄다','Esmeralda','하세엔다'], '워시드', 'Gesha'),
  -- 인도네시아
  ('IDN_SUM_PGS_AN', '아시아', '인도네시아', 'Indonesia', '수마트라 아체', 'Sumatra Aceh', '쁘가싱', 'Pegasing', ARRAY['쁘가싱','Pegasing','뺴가싱','씽가씽','빼가싱','페가싱'], '무산소 발효', 'Ateng'),
  ('IDN_SUM_MND_WH', '아시아', '인도네시아', 'Indonesia', '수마트라 만델링', 'Sumatra Mandheling', '린통', 'Lintong', ARRAY['린통','Lintong','린통','린동'], '웻 헐드', 'Typica'),
  -- 과테말라
  ('GTM_HUE_SBR_W', '중미', '과테말라', 'Guatemala', '우에우에테낭고', 'Huehuetenango', '산 베르나르도', 'San Bernardo', ARRAY['산 베르나르도','San Bernardo'], '워시드', 'Bourbon'),
  -- 브라질
  ('BRA_MNG_FZD_N', '남미', '브라질', 'Brazil', '미나스 제라이스', 'Minas Gerais', '파젠다 이파네마', 'Fazenda Ipanema', ARRAY['파젠다','Fazenda Ipanema','이파네마'], '내추럴', 'Yellow Bourbon'),
  -- 코스타리카
  ('CRI_TAR_DTA_H', '중미', '코스타리카', 'Costa Rica', '타라주', 'Tarrazu', '돈 마요르', 'Don Mayor', ARRAY['돈 마요르','Don Mayor'], '허니', 'Caturra')
ON CONFLICT (uid) DO NOTHING;

-- taxonomy 통계 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_taxonomy_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.taxonomy_uid IS NOT NULL THEN
    UPDATE public.taxonomy
    SET tasting_count = (
      SELECT COUNT(*) FROM public.coffees WHERE taxonomy_uid = NEW.taxonomy_uid
    ), updated_at = now()
    WHERE uid = NEW.taxonomy_uid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_taxonomy_count ON public.coffees;
CREATE TRIGGER trg_taxonomy_count
  AFTER INSERT OR UPDATE ON public.coffees
  FOR EACH ROW EXECUTE PROCEDURE public.update_taxonomy_count();

-- =====================================================
-- ✅ 실행 후 확인: taxonomy 테이블에 14개 시드 데이터 존재
-- SELECT COUNT(*) FROM taxonomy;  → 14
-- =====================================================
-- v29 추가: 누락 테이블 및 컬럼
-- =====================================================

-- ─── coffees 테이블 — 누락 컬럼 추가 ─────────────────
ALTER TABLE public.coffees
  ADD COLUMN IF NOT EXISTS sca_score     numeric(4,1),
  ADD COLUMN IF NOT EXISTS raw_notes     text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS roaster_url   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS farm_url      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS purchase_url  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS acidity       int,
  ADD COLUMN IF NOT EXISTS sweetness     int,
  ADD COLUMN IF NOT EXISTS body          int,
  ADD COLUMN IF NOT EXISTS aroma  