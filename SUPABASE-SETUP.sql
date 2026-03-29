

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
  ADD COLUMN IF NOT EXISTS aroma         int,
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
