-- AI 사용량 추적 테이블
-- 무료 사용자: 하루 3회, Pro 사용자: 하루 30회

-- ai_usage 테이블 생성
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  provider TEXT, -- claude, openai, groq, gemini
  model TEXT,    -- 사용된 모델명
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 복합 유니크 제약 (user_id + date 조합으로 하루당 1개 레코드)
  CONSTRAINT ai_usage_user_date_unique UNIQUE (user_id, date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON public.ai_usage(date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage(user_id, date);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ai_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_usage_updated_at();

-- RLS 정책 설정
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 사용량만 조회 가능
CREATE POLICY "Users can view own ai_usage"
  ON public.ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 사용량만 삽입 가능
CREATE POLICY "Users can insert own ai_usage"
  ON public.ai_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 사용량만 업데이트 가능
CREATE POLICY "Users can update own ai_usage"
  ON public.ai_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- increment_ai_usage RPC 함수
-- 사용량을 원자적으로 증가시키고, 제한 초과 여부를 반환
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_is_pro BOOLEAN DEFAULT FALSE,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_estimated_cost DECIMAL DEFAULT 0,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INTEGER;
  v_current_count INTEGER;
  v_result JSON;
BEGIN
  -- 일일 제한 설정
  v_daily_limit := CASE WHEN p_is_pro THEN 30 ELSE 3 END;

  -- UPSERT: 오늘 레코드가 없으면 생성, 있으면 업데이트
  INSERT INTO public.ai_usage (
    user_id,
    date,
    request_count,
    input_tokens,
    output_tokens,
    estimated_cost,
    provider,
    model
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1,
    p_input_tokens,
    p_output_tokens,
    p_estimated_cost,
    p_provider,
    p_model
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    request_count = ai_usage.request_count + 1,
    input_tokens = ai_usage.input_tokens + p_input_tokens,
    output_tokens = ai_usage.output_tokens + p_output_tokens,
    estimated_cost = ai_usage.estimated_cost + p_estimated_cost,
    provider = COALESCE(p_provider, ai_usage.provider),
    model = COALESCE(p_model, ai_usage.model),
    updated_at = NOW()
  RETURNING request_count INTO v_current_count;

  -- 결과 반환
  v_result := json_build_object(
    'success', TRUE,
    'current_count', v_current_count,
    'daily_limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - v_current_count),
    'is_limit_exceeded', v_current_count > v_daily_limit
  );

  RETURN v_result;
END;
$$;

-- get_ai_usage RPC 함수
-- 현재 사용량과 제한 정보 조회
CREATE OR REPLACE FUNCTION public.get_ai_usage(
  p_user_id UUID,
  p_is_pro BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INTEGER;
  v_current_count INTEGER;
  v_input_tokens INTEGER;
  v_output_tokens INTEGER;
  v_estimated_cost DECIMAL;
  v_result JSON;
BEGIN
  -- 일일 제한 설정
  v_daily_limit := CASE WHEN p_is_pro THEN 30 ELSE 3 END;

  -- 오늘의 사용량 조회
  SELECT
    COALESCE(request_count, 0),
    COALESCE(input_tokens, 0),
    COALESCE(output_tokens, 0),
    COALESCE(estimated_cost, 0)
  INTO v_current_count, v_input_tokens, v_output_tokens, v_estimated_cost
  FROM public.ai_usage
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- 레코드가 없으면 기본값 설정
  IF NOT FOUND THEN
    v_current_count := 0;
    v_input_tokens := 0;
    v_output_tokens := 0;
    v_estimated_cost := 0;
  END IF;

  -- 결과 반환
  v_result := json_build_object(
    'current_count', v_current_count,
    'daily_limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - v_current_count),
    'is_limit_exceeded', v_current_count >= v_daily_limit,
    'input_tokens', v_input_tokens,
    'output_tokens', v_output_tokens,
    'estimated_cost', v_estimated_cost
  );

  RETURN v_result;
END;
$$;

-- check_ai_limit RPC 함수
-- 요청 전 제한 초과 여부만 확인 (사용량 증가 없음)
CREATE OR REPLACE FUNCTION public.check_ai_limit(
  p_user_id UUID,
  p_is_pro BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INTEGER;
  v_current_count INTEGER;
  v_result JSON;
BEGIN
  -- 일일 제한 설정
  v_daily_limit := CASE WHEN p_is_pro THEN 30 ELSE 3 END;

  -- 오늘의 사용량 조회
  SELECT COALESCE(request_count, 0)
  INTO v_current_count
  FROM public.ai_usage
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- 레코드가 없으면 0
  IF NOT FOUND THEN
    v_current_count := 0;
  END IF;

  -- 결과 반환
  v_result := json_build_object(
    'can_proceed', v_current_count < v_daily_limit,
    'current_count', v_current_count,
    'daily_limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - v_current_count)
  );

  RETURN v_result;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.increment_ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_limit TO authenticated;

-- 코멘트 추가
COMMENT ON TABLE public.ai_usage IS 'AI 플래닝 기능 사용량 추적 테이블';
COMMENT ON FUNCTION public.increment_ai_usage IS 'AI 요청 시 사용량을 원자적으로 증가시키고 제한 초과 여부 반환';
COMMENT ON FUNCTION public.get_ai_usage IS '현재 AI 사용량과 제한 정보 조회';
COMMENT ON FUNCTION public.check_ai_limit IS '요청 전 AI 사용 제한 초과 여부 확인';
