-- Daily Planner 기능 추가
-- 1. todos 테이블에 Eisenhower 매트릭스 + 하기싫어도해야할일 필드 추가
-- 2. daily_reflections 테이블 생성

-- ============================================
-- 1. todos 테이블 필드 추가
-- ============================================

-- Eisenhower 매트릭스용
ALTER TABLE todos ADD COLUMN IF NOT EXISTS importance boolean DEFAULT null;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS urgency boolean DEFAULT null;

-- 하기 싫어도 해야할 일 플래그
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_reluctant_must_do boolean DEFAULT false;

-- ============================================
-- 2. daily_reflections 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS daily_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,

  -- 오늘의 칭찬 (최대 3개)
  praises jsonb DEFAULT '[]'::jsonb,
  -- 오늘의 감사 (최대 3개)
  gratitudes jsonb DEFAULT '[]'::jsonb,
  -- 보상
  reward text DEFAULT '',
  -- 하루의 소감
  reflection text DEFAULT '',
  -- 오늘 지출
  spending_note text DEFAULT '',
  -- 생각 보관
  thought_archive text DEFAULT '',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, date)
);

-- RLS 정책
ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reflections"
  ON daily_reflections FOR ALL
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date
  ON daily_reflections(user_id, date);
