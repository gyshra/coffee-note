-- =====================================================
-- Coffee Note — 전체 초기화 + 재생성 SQL
-- 기존 테이블 삭제 후 새로 만들기
-- =====================================================

-- 1. 기존 테이블 전부 삭제
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.tastings CASCADE;
DROP TABLE IF EXISTS public.coffees CASCADE;
DROP FUNCTION IF EXISTS public.update_coffee_stats CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;

-- 2. 공유 원두 테이블
CREATE TABLE public.coffees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norm_key         text UNIQUE NOT NULL,
  name             text NOT NULL DEFAULT '',
  roaster          text DEFAULT '',
  country          text DEFAULT '',
  region           text DEFAULT '',
  farm             text DEFAULT '',
  altitude         text DEFAULT '',
  process          text DEFAULT '',
  process_category text DEFAULT '',
  variety          text DEFAULT '',
  notes            text[] DEFAULT '{}',
  price            text DEFAULT '',
  avg_rating       numeric(3,1) DEFAULT 0,
  tasting_count    int DEFAULT 0,
  ai_prediction    jsonb,
  sources          jsonb,
  description      text DEFAULT '',
  keywords         text[] DEFAULT '{}',
  source           text DEFAULT 'ai_search',
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coffees_norm_key ON public.coffees (norm_key);
ALTER TABLE public.coffees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coffees_select" ON public.coffees FOR SELECT USING (true);
CREATE POLICY "coffees_insert" ON public.coffees FOR INSERT WITH CHECK (true);
CREATE POLICY "coffees_update" ON public.coffees FOR UPDATE USING (auth.uid() = created_by OR created_by IS NULL);

-- 3. 테이스팅 기록 테이블
CREATE TABLE public.tastings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_id    uuid REFERENCES public.coffees(id) ON DELETE SET NULL,
  local_id     text,
  coffee_name  text NOT NULL DEFAULT '',
  aroma        int CHECK (aroma BETWEEN 1 AND 10),
  acidity      int CHECK (acidity BETWEEN 1 AND 10),
  sweetness    int CHECK (sweetness BETWEEN 1 AND 10),
  body         int CHECK (body BETWEEN 1 AND 10),
  aftertaste   int CHECK (aftertaste BETWEEN 1 AND 10),
  flavor_tags  text[] DEFAULT '{}',
  brew_method  text,
  memo         text,
  rating       numeric(3,1),
  is_public    boolean DEFAULT true,
  raw_data     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

CREATE INDEX idx_tastings_user_id   ON public.tastings (user_id);
CREATE INDEX idx_tastings_coffee_id ON public.tastings (coffee_id);
ALTER TABLE public.tastings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tastings_select" ON public.tastings FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "tastings_insert" ON public.tastings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tastings_update" ON public.tastings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tastings_delete" ON public.tastings FOR DELETE USING (auth.uid() = user_id);

-- 4. 레시피 공유 테이블
CREATE TABLE public.recipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_id   uuid REFERENCES public.coffees(id) ON DELETE SET NULL,
  coffee_name text DEFAULT '',
  brew_method text,
  temp        text,
  water       text,
  dose        text,
  grind       text,
  note        text,
  steps       jsonb DEFAULT '[]',
  likes       int DEFAULT 0,
  is_public   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_coffee_id ON public.recipes (coffee_id);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_select" ON public.recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "recipes_insert" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_update" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipes_delete" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- 5. 즐겨찾기 테이블
CREATE TABLE public.favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_id   uuid REFERENCES public.coffees(id) ON DELETE CASCADE,
  coffee_name text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, coffee_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- 6. 평균 별점 자동 계산 트리거
CREATE FUNCTION public.update_coffee_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.coffee_id IS NOT NULL THEN
    UPDATE public.coffees SET
      avg_rating    = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.tastings WHERE coffee_id = NEW.coffee_id AND rating IS NOT NULL),
      tasting_count = (SELECT COUNT(*) FROM public.tastings WHERE coffee_id = NEW.coffee_id),
      updated_at    = now()
    WHERE id = NEW.coffee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_coffee_stats
  AFTER INSERT OR UPDATE ON public.tastings
  FOR EACH ROW EXECUTE PROCEDURE public.update_coffee_stats();

-- =====================================================
-- 완료! Table Editor에서 4개 테이블 확인:
-- coffees / tastings / recipes / favorites
-- =====================================================
