-- 사용자 기기 정보 테이블 (FCM 토큰 저장)
CREATE TABLE user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 사용자당 플랫폼별로 하나의 토큰만 허용
  UNIQUE(user_id, platform)
);

-- 알림 로그 테이블 (전송된 알림 기록)
CREATE TABLE notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'todo_reminder', 'weekly_summary')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 예약된 알림 테이블 (스케줄링용)
CREATE TABLE scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'todo_reminder', 'weekly_summary')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  repeat_pattern TEXT CHECK (repeat_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  repeat_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 설정 테이블 (사용자별 알림 선호도)
CREATE TABLE notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  todo_reminders BOOLEAN DEFAULT TRUE,
  weekly_summaries BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'Asia/Seoul',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- RLS 정책 설정
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- user_devices 정책
CREATE POLICY "Users can manage their own devices" ON user_devices
  FOR ALL USING (auth.uid() = user_id);

-- notification_logs 정책
CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Service role can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Users can update read status" ON notification_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- scheduled_notifications 정책
CREATE POLICY "Users can manage their own scheduled notifications" ON scheduled_notifications
  FOR ALL USING (auth.uid() = user_id);

-- notification_settings 정책
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_token ON user_devices(fcm_token);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_active ON scheduled_notifications(is_active) WHERE is_active = true;

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_user_devices_updated_at 
  BEFORE UPDATE ON user_devices 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_scheduled_notifications_updated_at 
  BEFORE UPDATE ON scheduled_notifications 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
  BEFORE UPDATE ON notification_settings 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 기본 알림 설정 생성 함수
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 새 사용자 등록 시 기본 알림 설정 생성
CREATE TRIGGER create_notification_settings_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE create_default_notification_settings();