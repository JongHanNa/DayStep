-- =====================================================
-- 전체 스키마 백업 (리팩토링 전)
-- 생성일: 2025-10-09
-- =====================================================
-- 이 파일로 전체 스키마 복원 가능
-- 22개 테이블, 2개 ENUM 타입, 22개 외래키

-- =====================================================
-- ENUM 타입 정의
-- =====================================================

CREATE TYPE schedule_type_enum AS ENUM ('all_day', 'timed', 'anytime');
CREATE TYPE recurrence_pattern_enum AS ENUM ('none', 'daily', 'weekly', 'monthly', 'custom');

-- =====================================================
-- 테이블 생성 (외래키 제외)
-- =====================================================

-- users 테이블
CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- todos 테이블 (메인)
CREATE TABLE todos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    content text NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
    start_time timestamptz,
    end_time timestamptz,
    schedule_type schedule_type_enum NOT NULL DEFAULT 'anytime'::schedule_type_enum,
    recurrence_pattern recurrence_pattern_enum NOT NULL DEFAULT 'none'::recurrence_pattern_enum,
    recurrence_end_date date,
    recurrence_count integer,
    recurrence_interval integer DEFAULT 1,
    recurrence_days_of_week jsonb,
    recurrence_day_of_month integer,
    parent_todo_id uuid,
    icon text,
    color text DEFAULT '#DBAC6C'::text,
    departure_location text,
    departure_time timestamptz
);

-- repository_items 테이블
CREATE TABLE repository_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['resolution'::text, 'todo'::text])),
    title text NOT NULL,
    content text NOT NULL,
    category text,
    source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- timeline_tasks 테이블
CREATE TABLE timeline_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    planned_start_time timestamptz,
    planned_end_time timestamptz,
    actual_start_time timestamptz,
    actual_end_time timestamptz,
    status text NOT NULL DEFAULT 'planned'::text CHECK (status = ANY (ARRAY['planned'::text, 'in-progress'::text, 'completed'::text, 'cancelled'::text])),
    priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
    category text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- pomodoro_sessions 테이블
CREATE TABLE pomodoro_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid,
    user_id uuid NOT NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    duration integer,
    is_completed boolean DEFAULT false,
    break_duration integer DEFAULT 5,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- task_templates 테이블
CREATE TABLE task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    estimated_duration integer,
    category text,
    is_public boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_preferences 테이블
CREATE TABLE user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- todo_completions 테이블
CREATE TABLE todo_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id uuid NOT NULL,
    user_id uuid NOT NULL,
    completion_date date NOT NULL,
    completed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- todo_exclusions 테이블
CREATE TABLE todo_exclusions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_todo_id uuid NOT NULL,
    excluded_date date NOT NULL,
    created_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL
);

-- quick_memos 테이블
CREATE TABLE quick_memos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    content text NOT NULL,
    related_task_id uuid,
    is_pinned boolean DEFAULT false,
    is_floating boolean DEFAULT false,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    linked_date date,
    linked_timeline_task_id uuid,
    is_recurring boolean DEFAULT false,
    recurrence_type text DEFAULT 'single'::text CHECK (recurrence_type = ANY (ARRAY['single'::text, 'recurring'::text, 'instance'::text]))
);

-- todo_time_overrides 테이블
CREATE TABLE todo_time_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_todo_id uuid NOT NULL,
    user_id uuid NOT NULL,
    override_date date NOT NULL,
    start_time timestamptz,
    end_time timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- contacts 테이블
CREATE TABLE contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name varchar NOT NULL,
    notes text,
    company varchar,
    job_title varchar,
    relationship varchar CHECK (relationship::text = ANY (ARRAY['family', 'friend', 'colleague', 'business', 'other']::text[])),
    tags text[],
    last_contact_date timestamptz,
    avatar_url text,
    is_from_device boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- todo_contacts 테이블
CREATE TABLE todo_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid NOT NULL,
    relation_type varchar DEFAULT 'related'::varchar CHECK (relation_type::text = ANY (ARRAY['assignee', 'collaborator', 'related', 'mentioned']::text[])),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- memo_instances 테이블
CREATE TABLE memo_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_memo_id uuid,
    user_id uuid,
    instance_date date NOT NULL,
    content text NOT NULL,
    is_modified boolean DEFAULT false,
    related_task_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- motivation_templates 테이블
CREATE TABLE motivation_templates (
    id text PRIMARY KEY,
    content text NOT NULL,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    icon text NOT NULL,
    image_url text,
    difficulty text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- motivation_tags 테이블
CREATE TABLE motivation_tags (
    id text PRIMARY KEY,
    name text NOT NULL,
    color text NOT NULL,
    icon text NOT NULL,
    is_default boolean DEFAULT false,
    user_id uuid,
    created_at timestamptz DEFAULT now()
);

-- user_motivation_messages 테이블
CREATE TABLE user_motivation_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    content text NOT NULL,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    icon text NOT NULL,
    color text,
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- todo_motivation_links 테이블
CREATE TABLE todo_motivation_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id uuid NOT NULL,
    user_id uuid NOT NULL,
    motivation_type text NOT NULL CHECK (motivation_type = ANY (ARRAY['template'::text, 'custom'::text])),
    motivation_id text NOT NULL,
    assigned_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);

-- memo_tags 테이블
CREATE TABLE memo_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name varchar(50) NOT NULL,
    color varchar(7) NOT NULL DEFAULT '#3B82F6'::varchar CHECK (color::text ~ '^#[0-9A-Fa-f]{6}$'::text),
    description text,
    is_active boolean NOT NULL DEFAULT true,
    position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    template_id uuid,
    is_system_derived boolean DEFAULT false,
    icon varchar(50) DEFAULT 'tag'::varchar,
    is_predefined boolean DEFAULT false
);

-- memo_tag_links 테이블
CREATE TABLE memo_tag_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    memo_id uuid NOT NULL,
    tag_id uuid,
    assigned_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    is_active boolean NOT NULL DEFAULT true,
    template_id uuid
);

-- memo_tag_templates 테이블
CREATE TABLE memo_tag_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(50) UNIQUE NOT NULL CHECK (char_length(name::text) >= 1 AND char_length(name::text) <= 50),
    color varchar(20) NOT NULL CHECK (color::text ~ '^#[0-9A-Fa-f]{6}$'::text OR color::text = ANY (ARRAY['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray', 'slate', 'indigo', 'cyan', 'teal', 'emerald', 'lime', 'amber', 'rose']::text[])),
    icon varchar(50) DEFAULT 'tag'::varchar,
    description text,
    category varchar(30) NOT NULL DEFAULT 'general'::varchar CHECK (category::text = ANY (ARRAY['productivity', 'personal', 'priority', 'type', 'general']::text[])),
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 외래키 제약조건
-- =====================================================

ALTER TABLE todos ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE todos ADD CONSTRAINT todos_parent_todo_id_fkey FOREIGN KEY (parent_todo_id) REFERENCES todos(id) ON DELETE CASCADE;

ALTER TABLE repository_items ADD CONSTRAINT repository_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE timeline_tasks ADD CONSTRAINT timeline_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE pomodoro_sessions ADD CONSTRAINT pomodoro_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE pomodoro_sessions ADD CONSTRAINT pomodoro_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES timeline_tasks(id) ON DELETE CASCADE;

ALTER TABLE task_templates ADD CONSTRAINT task_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE todo_completions ADD CONSTRAINT todo_completions_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE;
ALTER TABLE todo_completions ADD CONSTRAINT todo_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE todo_exclusions ADD CONSTRAINT todo_exclusions_parent_todo_id_fkey FOREIGN KEY (parent_todo_id) REFERENCES todos(id) ON DELETE CASCADE;

ALTER TABLE quick_memos ADD CONSTRAINT quick_memos_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES todos(id) ON DELETE SET NULL;
ALTER TABLE quick_memos ADD CONSTRAINT quick_memos_linked_timeline_task_id_fkey FOREIGN KEY (linked_timeline_task_id) REFERENCES timeline_tasks(id) ON DELETE SET NULL;

ALTER TABLE todo_time_overrides ADD CONSTRAINT todo_time_overrides_parent_todo_id_fkey FOREIGN KEY (parent_todo_id) REFERENCES todos(id) ON DELETE CASCADE;

ALTER TABLE todo_contacts ADD CONSTRAINT todo_contacts_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE;
ALTER TABLE todo_contacts ADD CONSTRAINT todo_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE memo_instances ADD CONSTRAINT memo_instances_original_memo_id_fkey FOREIGN KEY (original_memo_id) REFERENCES quick_memos(id) ON DELETE CASCADE;
ALTER TABLE memo_instances ADD CONSTRAINT memo_instances_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES todos(id) ON DELETE SET NULL;

ALTER TABLE todo_motivation_links ADD CONSTRAINT todo_motivation_links_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE;

ALTER TABLE memo_tags ADD CONSTRAINT memo_tags_template_id_fkey FOREIGN KEY (template_id) REFERENCES memo_tag_templates(id) ON DELETE SET NULL;

ALTER TABLE memo_tag_links ADD CONSTRAINT memo_tag_links_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES memo_tags(id) ON DELETE CASCADE;
ALTER TABLE memo_tag_links ADD CONSTRAINT memo_tag_links_template_id_fkey FOREIGN KEY (template_id) REFERENCES memo_tag_templates(id) ON DELETE CASCADE;

-- =====================================================
-- 완료
-- =====================================================
-- 이 마이그레이션은 실제 적용하지 않음 (백업용)
-- 복원 시: 이 파일을 새 DB에 적용하면 스키마 복구 가능
SELECT 'Schema backup completed' AS status;
