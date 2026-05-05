-- feedback_posts: 버그 신고 & 기능 요청 게시판
-- 작성자(user_id == auth.uid())와 관리자(users.role='admin')만 내용 조회 가능.
-- 타 사용자에게는 집계 카운트만 노출(get_feedback_counts RPC 경유).

-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE feedback_type_enum AS ENUM ('bug', 'feature');
CREATE TYPE feedback_status_enum AS ENUM ('review', 'in_progress', 'done', 'declined');

-- ============================================================
-- 테이블
-- ============================================================

CREATE TABLE public.feedback_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         feedback_type_enum NOT NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  status       feedback_status_enum NOT NULL DEFAULT 'review',
  admin_reply  TEXT,
  version_tag  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_posts_user_id     ON public.feedback_posts(user_id);
CREATE INDEX idx_feedback_posts_status      ON public.feedback_posts(status);
CREATE INDEX idx_feedback_posts_created_at  ON public.feedback_posts(created_at DESC);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_feedback_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_posts_updated_at
  BEFORE UPDATE ON public.feedback_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_posts_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.feedback_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: 작성자 본인 또는 관리자만
CREATE POLICY "feedback_posts_select_own_or_admin"
  ON public.feedback_posts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT: 인증된 사용자는 본인 이름으로만 작성
CREATE POLICY "feedback_posts_insert_own"
  ON public.feedback_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE (작성자): 검토중 상태일 때만 본인 게시물 수정
CREATE POLICY "feedback_posts_update_own_if_review"
  ON public.feedback_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'review')
  WITH CHECK (auth.uid() = user_id);

-- UPDATE (관리자): 모든 게시물 수정 가능
CREATE POLICY "feedback_posts_update_admin"
  ON public.feedback_posts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- DELETE: 작성자 본인 또는 관리자
CREATE POLICY "feedback_posts_delete_own_or_admin"
  ON public.feedback_posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 집계 카운트 RPC (RLS 우회하여 상태별 전체/내 카운트 반환)
-- 반환: (status, total_count, my_count)
-- "비공개 · N건" dimmed row의 데이터 소스
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_feedback_counts()
RETURNS TABLE (
  status      feedback_status_enum,
  total_count BIGINT,
  my_count    BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  requesting_user UUID;
BEGIN
  requesting_user := auth.uid();
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    fp.status,
    COUNT(*)::BIGINT AS total_count,
    COUNT(*) FILTER (WHERE fp.user_id = requesting_user)::BIGINT AS my_count
  FROM public.feedback_posts fp
  GROUP BY fp.status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_feedback_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feedback_counts() TO authenticated;

-- ============================================================
-- Realtime 활성화 (상태 변경 즉시 반영)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_posts;
