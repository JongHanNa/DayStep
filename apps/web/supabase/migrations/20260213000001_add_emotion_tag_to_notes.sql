-- 원동력 감정 태그 컬럼 추가
ALTER TABLE notes ADD COLUMN emotion_tag TEXT DEFAULT NULL;

-- 유효값 체크 (enum 대신 CHECK constraint로 유연하게)
ALTER TABLE notes ADD CONSTRAINT notes_emotion_tag_check
  CHECK (emotion_tag IS NULL OR emotion_tag IN ('joy', 'gratitude', 'awakening', 'determination'));

COMMENT ON COLUMN notes.emotion_tag IS '원동력 감정 태그: joy(기쁨), gratitude(감사), awakening(각성), determination(결단)';
