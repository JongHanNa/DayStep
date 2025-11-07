-- Rename clarification_enum value from 'scheduled' to 'schedule_clear'
-- Purpose: 'schedule_clear' better represents "tasks with clear date/time" vs schedule_type which manages scheduling status
-- This will automatically update all existing data
ALTER TYPE clarification_enum RENAME VALUE 'scheduled' TO 'schedule_clear';
