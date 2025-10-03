-- 리마인더 시스템을 위한 테이블 생성

-- 1. scheduled_reminders 테이블: 스케줄된 리마인더 정보
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id TEXT PRIMARY KEY,
    todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMPTZ NOT NULL,
    notification_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. user_settings 테이블 업데이트: reminder_settings 컬럼 추가
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{
    "enabled": true,
    "defaultReminderTime": 30,
    "encouragementEnabled": true,
    "encouragementTimes": ["09:00", "21:00"],
    "quietHours": {
        "start": "22:00",
        "end": "07:00"
    }
}'::jsonb;

-- 3. notification_logs 테이블: 알림 전송 기록 (이미 존재할 수 있음)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'todo_reminder', 'encouragement', 'system'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT now(),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id ON public.scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_todo_id ON public.scheduled_reminders(todo_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_reminder_time ON public.scheduled_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_read ON public.notification_logs(read);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- scheduled_reminders 정책
CREATE POLICY "Users can view their own scheduled reminders"
    ON public.scheduled_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled reminders"
    ON public.scheduled_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reminders"
    ON public.scheduled_reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reminders"
    ON public.scheduled_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- notification_logs 정책
CREATE POLICY "Users can view their own notification logs"
    ON public.notification_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification logs"
    ON public.notification_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification logs"
    ON public.notification_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- updated_at 트리거 함수 (공통)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 적용
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.scheduled_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 알림 전송을 위한 Edge Function에서 사용할 함수
CREATE OR REPLACE FUNCTION public.get_pending_reminders()
RETURNS TABLE (
    reminder_id TEXT,
    user_id UUID,
    todo_id UUID,
    todo_title TEXT,
    reminder_time TIMESTAMPTZ,
    notification_id INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        sr.id as reminder_id,
        sr.user_id,
        sr.todo_id,
        t.title as todo_title,
        sr.reminder_time,
        sr.notification_id
    FROM public.scheduled_reminders sr
    JOIN public.todos t ON sr.todo_id = t.id
    WHERE sr.reminder_time <= now()
    AND t.status != 'completed'
    ORDER BY sr.reminder_time ASC;
$$;

-- 만료된 리마인더 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_expired_reminders()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH deleted AS (
        DELETE FROM public.scheduled_reminders 
        WHERE reminder_time < now() - INTERVAL '1 day'
        RETURNING 1
    )
    SELECT COUNT(*) FROM deleted;
$$;

-- 사용자별 활성 리마인더 수 확인 함수
CREATE OR REPLACE FUNCTION public.get_user_active_reminders_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.scheduled_reminders sr
    JOIN public.todos t ON sr.todo_id = t.id
    WHERE sr.user_id = target_user_id
    AND sr.reminder_time > now()
    AND t.status != 'completed';
$$;