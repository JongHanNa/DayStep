-- plan_limits: 플랜별 엔티티 한도 관리 테이블
-- 관리자가 웹/앱에서 수정하면 Realtime으로 전 클라이언트에 즉시 반영

CREATE TABLE public.plan_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,   -- 'todo'|'habit'|'project'|'note'|'cherished_people'|'care_interaction'
  tier            TEXT NOT NULL,   -- 'free'|'pro'
  max_count       INTEGER NOT NULL, -- 실제 적용 한도; -1 = 무제한
  display_text    TEXT NOT NULL,   -- UI 비교 테이블 표시 ('60개', '300,000개')
  display_label   TEXT NOT NULL,   -- Paywall 팝업 표시 ('할일', '300,000개 할일')
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, tier)
);

-- RLS 활성화
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 전체 읽기 허용
CREATE POLICY "plan_limits_read_for_authenticated"
  ON plan_limits FOR SELECT
  TO authenticated
  USING (true);

-- admin 역할만 쓰기 허용
CREATE POLICY "plan_limits_write_for_admin"
  ON plan_limits FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE plan_limits;

-- 초기 seed 데이터
INSERT INTO plan_limits (entity_type, tier, max_count, display_text, display_label) VALUES
  ('todo',             'free', 60,     '60개',       '할일'),
  ('todo',             'pro',  300000, '300,000개',  '300,000개 할일'),
  ('habit',            'free', 5,      '5개',        '습관'),
  ('habit',            'pro',  300,    '300개',      '300개 습관'),
  ('project',          'free', 15,     '15개',       '프로젝트'),
  ('project',          'pro',  300,    '300개',      '300개 프로젝트'),
  ('note',             'free', 40,     '40개',       '원동력'),
  ('note',             'pro',  1000,   '1,000개',    '1,000개 원동력'),
  ('cherished_people', 'free', 10,     '10명',       '소중한 사람'),
  ('cherished_people', 'pro',  1000,   '1,000명',    '1,000명 소중한 사람'),
  ('care_interaction', 'free', 30,     '30개',       '관심 기록'),
  ('care_interaction', 'pro',  1000,   '1,000개',    '1,000개 관심 기록');
