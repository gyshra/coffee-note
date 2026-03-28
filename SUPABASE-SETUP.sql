-- =====================================================
-- Coffee Note — Supabase 테이블 설정 SQL
-- =====================================================
-- 사용 방법:
-- 1. Supabase 대시보드 접속 (https://supabase.com)
-- 2. 본인 프로젝트 클릭
-- 3. 왼쪽 메뉴에서 "SQL Editor" 클릭
-- 4. 이 파일의 내용을 전부 복사해서 붙여넣기
-- 5. "Run" 버튼 클릭
-- =====================================================


-- ─── 1. 테이스팅 기록 테이블 ──────────────────────────
CREATE TABLE IF NOT EXISTS public.tastings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id      text,                    -- localStorage 기준 ID
  coffee_name   text NOT NULL DEFAULT '',
  coffee_index  int,
  aroma         int CHECK (aroma BETWEEN 1 AND 10),
  acidity       int CHECK (acidity BETWEEN 1 AND 10),
  sweetness     int CHECK (sweetness BETWEEN 1 AND 10),
  body          int CHECK (body BETWEEN 1 AND 10),
  aftertaste    int CHECK (aftertaste BETWEEN 1 AND 10),
  flavor_tags   text[] DEFAULT '{}',
  brew_method   text,
  memo          text,
  rating        numeric(3,1),
  raw_data      jsonb,                   -- 전체 원본 데이터
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, local_id)             -- 중복 방지
);

-- 인덱스 (빠른 조회)
CREATE INDEX IF NOT EXISTS idx_tastings_user_id    ON public.tastings (user_id);
CREATE INDEX IF NOT EXISTS idx_tastings_created_at ON public.tastings (created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.tastings ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 기록만 읽기/쓰기/수정/삭제 가능
CREATE POLICY "tastings_select" ON public.tastings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tastings_insert" ON public.tastings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tastings_update" ON public.tastings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tastings_delete" ON public.tastings FOR DELETE USING (auth.uid() = user_id);


-- ─── 2. 즐겨찾기 테이블 ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_index  int NOT NULL,
  coffee_name   text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, coffee_index)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON public.favorites FOR DELETE USING (auth.uid() = user_id);


-- ─── 3. updated_at 자동 갱신 트리거 ──────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tastings_updated_at ON public.tastings;
CREATE TRIGGER set_tastings_updated_at
  BEFORE UPDATE ON public.tastings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- =====================================================
-- ✅ 실행 완료 후 확인 사항:
--   - Table Editor에서 "tastings" 와 "favorites" 테이블이 보이면 성공!
-- =====================================================
