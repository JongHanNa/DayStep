-- Remove 'scheduled' value from clarification_enum
-- All data has been migrated to 'schedule_clear', so 'scheduled' is no longer used
-- PostgreSQL doesn't support DROP VALUE, so we recreate the enum type

BEGIN;

-- 1. Create new enum type without 'scheduled'
CREATE TYPE clarification_enum_new AS ENUM (
  'none',
  'reminder',
  'someday',
  'waiting',
  'next_action',
  'schedule_clear'
);

-- 2. Drop default constraint temporarily
ALTER TABLE todos ALTER COLUMN clarification DROP DEFAULT;

-- 3. Change todos table column to new enum type
ALTER TABLE todos
ALTER COLUMN clarification TYPE clarification_enum_new
USING clarification::text::clarification_enum_new;

-- 4. Restore default constraint
ALTER TABLE todos ALTER COLUMN clarification SET DEFAULT 'none'::clarification_enum_new;

-- 5. Drop old enum type
DROP TYPE clarification_enum;

-- 6. Rename new enum type to original name
ALTER TYPE clarification_enum_new RENAME TO clarification_enum;

COMMIT;
