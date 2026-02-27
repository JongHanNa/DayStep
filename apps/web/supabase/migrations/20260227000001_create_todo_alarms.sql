CREATE TABLE todo_alarms (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id    uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offset_minutes integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (todo_id, offset_minutes)
);

ALTER TABLE todo_alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own todo alarms" ON todo_alarms
  FOR ALL USING (auth.uid() = user_id);

-- 기존 데이터 마이그레이션 (alarm_offset_minutes 있는 todo들)
INSERT INTO todo_alarms (todo_id, user_id, offset_minutes)
SELECT id, user_id, alarm_offset_minutes
FROM todos
WHERE alarm_offset_minutes IS NOT NULL;
-- NOTE: todos.alarm_offset_minutes 컬럼은 web 호환을 위해 유지 (deprecated)
