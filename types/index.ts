// Global type definitions for DayStep app
import { Database } from "./supabase";

// Supabase database types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Enum types from database
export type ScheduleType = Database["public"]["Enums"]["schedule_type_enum"];
export type RecurrencePattern =
  Database["public"]["Enums"]["recurrence_pattern_enum"];

// Application types based on database schema
export type User = Tables<"users">;
export type Todo = Tables<"todos">;

// Todo + 반복 인스턴스 런타임 필드 (달력 등에서 사용)
// project_id는 이제 기본 Todo 타입에 포함됨
export type TodoWithRecurrenceInstance = Todo & {
  is_recurrence_instance?: boolean;
  recurrence_source_id?: string;
  recurrence_occurrence_date?: string;
};

export type PomodoroSession = Tables<"pomodoro_sessions">;

// Memo Tag types (manually defined until Supabase types are updated)
export interface NoteTag {
  id: string;
  user_id: string;
  name: string;
  color: string; // hex 색상 값 (예: #3B82F6)
  icon?: string; // 아이콘 키 (lucide 아이콘 등)
  description?: string | null;
  is_predefined?: boolean; // 미리 정의된 태그 여부
  is_system_derived?: boolean; // 시스템 템플릿에서 파생된 태그 여부
  template_id?: string | null; // 기반이 된 템플릿 ID (실제 템플릿 참조용)
  is_active: boolean;
  position?: number; // 정렬 순서 (구 버전 호환성)
  order_index?: number; // 새 정렬 순서
  created_at: string;
  updated_at: string;
  // 템플릿에서 변환된 태그임을 표시하는 속성
  is_template?: boolean; // getTagsForMemo에서 템플릿을 태그로 변환할 때 사용
}

// Note Tag Template types (predefined tags available to all users)
export interface NoteTagTemplate {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string | null;
  category: 'productivity' | 'personal' | 'priority' | 'type' | 'general';
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Memo Tag Link types (many-to-many relationship)
export interface NoteTagLink {
  id: string;
  user_id: string;
  note_id: string;
  tag_id: string | null; // nullable로 변경 (템플릿 태그인 경우 null)
  template_id?: string | null; // 템플릿 태그 ID 추가
  assigned_at: string;
  is_active: boolean;
}

// Memo Tag 생성 입력 타입
export interface NoteTagInsert {
  user_id: string;
  name: string;
  color: string; // 기본값이 있으므로 필수로 처리
  description?: string | null;
  is_active?: boolean;
  position?: number;
}

// Memo Tag 업데이트 입력 타입
export interface NoteTagUpdate {
  name?: string;
  color?: string;
  description?: string | null;
  is_active?: boolean;
  position?: number;
}

// Memo Tag Link 생성 입력 타입
export interface NoteTagLinkInsert {
  user_id: string;
  note_id: string;
  tag_id: string;
  is_active?: boolean;
}

// Note types (manually defined until Supabase types are updated)
export type NoteCategory = 'none' | 'work_in_progress' | 'read_later' | 'reference' | 'fuel';

/** @deprecated Use 'fuel' instead of 'inbox' */
export type LegacyNoteCategory = 'none' | 'work_in_progress' | 'read_later' | 'reference' | 'inbox';

export interface Note {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  linked_date?: string | null;
  is_pinned: boolean;
  is_banner_pinned?: boolean;  // 홈 배너에 고정 여부
  is_floating: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_type?: 'single' | 'recurring';
  // Tags are loaded separately for performance
  tags?: NoteTag[];
  // Second Brain fields
  area_resource_id?: string | null;
  note_category?: NoteCategory;
}

// Note instance types (manually defined until Supabase types are updated)
export interface NoteInstance {
  id: string;
  original_note_id: string;
  user_id: string;
  instance_date: string;
  content: string;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

// Input types for forms
export type UserInsert = TablesInsert<"users">;
export type TodoInsert = TablesInsert<"todos">;
export type PomodoroSessionInsert = TablesInsert<"pomodoro_sessions">;

// Note insert types (manually defined until Supabase types are updated)
export interface NoteInsert {
  user_id: string;
  content: string;
  linked_date?: string | null;
  is_pinned?: boolean;
  is_floating?: boolean;
  position?: number;
  is_recurring?: boolean;
  recurrence_type?: 'single' | 'recurring';
}

// Note instance insert types (manually defined until Supabase types are updated)
export interface NoteInstanceInsert {
  original_note_id: string;
  user_id: string;
  instance_date: string;
  content: string;
  is_modified?: boolean;
}

// Update types for forms
export type UserUpdate = TablesUpdate<"users">;
export type TodoUpdate = TablesUpdate<"todos">;
export type PomodoroSessionUpdate = TablesUpdate<"pomodoro_sessions">;

// Note update types (manually defined until Supabase types are updated)
export interface NoteUpdate extends Partial<NoteInsert> {
  id: string;
}

// Note instance update types (manually defined until Supabase types are updated)
export interface NoteInstanceUpdate extends Partial<NoteInstanceInsert> {
  id: string;
}

// 기존 NoteTagInsert와 NoteTagUpdate는 위쪽에 정의되어 있음

// Memo tag link input types
export interface NoteTagLinkInsert {
  note_id: string;
  tag_id: string;
  user_id: string;
}

// Extended note types with tags
export interface NoteWithTags extends Note {
  tags: NoteTag[];
}

// Tag-related utility types
export type NoteTagColor =
  | string // Hex color like #FF0000
  | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
  | 'pink' | 'gray' | 'slate' | 'indigo' | 'cyan' | 'teal'
  | 'emerald' | 'lime' | 'amber' | 'rose';

export interface CreateNoteTagInput {
  name: string;
  color?: NoteTagColor;
  icon?: string;
  description?: string;
  template_id?: string; // 템플릿 기반 태그 생성 시
}

export interface UpdateNoteTagInput extends Partial<CreateNoteTagInput> {
  id: string;
}

// Enhanced tag interfaces for predefined tag system
export interface CreateTagFromTemplateInput {
  template_id: string;
  custom_name?: string; // 사용자가 템플릿 이름을 커스터마이징
  custom_color?: string; // 사용자가 템플릿 색상을 커스터마이징
}

export interface NoteTagCategory {
  category: 'productivity' | 'personal' | 'priority' | 'type' | 'general';
  name: string;
  description: string;
  icon: string;
}

// Tag view interfaces (for UI display)
export interface TagWithSource extends NoteTag {
  tag_source: 'user' | 'template';
  template_name?: string;
  category?: string;
}

export interface TagCategoryGroup {
  category: string;
  templates: NoteTagTemplate[];
  userTags: NoteTag[];
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

// Extended Todo interface with helper methods
export interface TodoWithMethods extends Todo {
  // Helper methods for schedule type checking
  isAllDay(): boolean;
  isTimed(): boolean;
  isAnytime(): boolean;

  // Helper methods for recurrence checking
  isRecurring(): boolean;
  isDailyRecurring(): boolean;
  isWeeklyRecurring(): boolean;
  isMonthlyRecurring(): boolean;
  isCustomRecurring(): boolean;

  // Duration calculation (returns milliseconds, null if not timed)
  getDuration(): number | null;

  // Time formatting helpers
  getFormattedStartTime(): string | null;
  getFormattedEndTime(): string | null;
  getFormattedTimeRange(): string | null;

  // Recurrence description
  getRecurrenceDescription(): string;
}

// Create Todo input with required fields for new schema
export interface CreateTodoInput {
  title: string; // Required title field
  priority?: "low" | "medium" | "high";
  icon?: string; // Icon key for todo category
  color?: string; // Color hex value or color ID

  // User identification (required for RLS)
  user_id?: string; // Optional since it can be auto-filled from auth context

  // Schedule information
  schedule_type: ScheduleType;
  start_time?: string; // ISO string
  end_time?: string; // ISO string

  // Departure information (새로 추가된 필드)
  departure_location?: string; // 출발 장소 (텍스트)
  departure_time?: string; // 출발 시간 (ISO string)

  // Recurrence information
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string; // ISO date string
  recurrence_count?: number;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[]; // [1,2,3,4,5] for Mon-Fri
  recurrence_day_of_month?: number;

  // Other fields
  completed?: boolean;
  order_index?: number;
  parent_todo_id?: string;

  // Second Brain System fields
  is_today_highlight?: boolean;
  assigned_to?: string | null;
  assigned_date?: string | null;

  // Relations
  project_id?: string | null; // 프로젝트 연결 (단일)
  project_ids?: string[]; // 다중 프로젝트 연결 (하위 호환성)
  note_ids?: string[]; // 연결된 노트 ID들

  // Balance System
  is_relationship_task?: boolean; // 관계 할일 여부

  // Skip status (일반 할일 스킵)
  skip_status?: 'not_needed' | 'missed' | null; // 일반 할일 스킵 상태
}

// Note instance types
export interface CreateNoteInstanceInput {
  original_note_id: string;
  user_id: string;
  instance_date: string; // YYYY-MM-DD format
  content: string;
  is_modified?: boolean;
}

export interface UpdateNoteInstanceInput extends Partial<CreateNoteInstanceInput> {
  id: string;
}

// Memo recurrence types
export type MemoRecurrenceType = 'single' | 'recurring';

// Extended note types with instance information
export interface NoteWithInstances {
  id: string;
  user_id: string;
  content: string;
  linked_date?: string | null;
  is_pinned: boolean;
  is_floating: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_type?: 'single' | 'recurring';
  note_instances?: NoteInstance[];
}

// Note instance with original note information
export interface NoteInstanceWithOriginal {
  id: string;
  original_note_id: string;
  user_id: string;
  instance_date: string;
  content: string;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
  original_memo?: Note;
}

// Update Todo input - all fields optional except id
export interface UpdateTodoInput extends Partial<CreateTodoInput> {
  id: string;
}

// ============================================
// Second Brain System Types
// ============================================

// ENUM types from database
export type AreaResourceStatus = 'area' | 'resource' | 'archived';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'paused';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
// NoteCategory는 위쪽 Note 타입 근처에서 정의됨 (inbox 포함)

// Area/Resource types
export interface AreaResource {
  id: string;
  user_id: string;
  title: string;
  status: AreaResourceStatus;
  icon: string | null;
  color: string;
  is_pinned: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AreaResourceInsert {
  user_id: string;
  title: string;
  status?: AreaResourceStatus;
  icon?: string | null;
  color?: string;
  is_pinned?: boolean;
  order_index?: number;
}

export interface AreaResourceUpdate extends Partial<AreaResourceInsert> {
  id: string;
}

// Type aliases for Area and Resource (same as AreaResource, but semantically different)
export type Area = AreaResource;
export type Resource = AreaResource;

// Goal types
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  status: ProgressStatus;
  icon: string | null;
  color: string | null;
  area_id: string | null;
  area_resource_id: string | null;
  resource_id: string | null;
  start_date: string | null;
  end_date: string | null;
  year_goal: number | null;
  quarter_goal: Quarter | null;
  order_index: number;
  created_at: string;
  updated_at: string;

  // Relations
  area_resource?: AreaResource;
  projects?: Project[];
}

export interface GoalInsert {
  user_id: string;
  title: string;
  status?: ProgressStatus;
  icon?: string | null;
  color?: string | null;
  area_id?: string | null;
  area_resource_id?: string | null;
  resource_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  year_goal?: number | null;
  quarter_goal?: Quarter | null;
  order_index?: number;
}

export interface GoalUpdate extends Partial<GoalInsert> {
  id: string;
}

// Project Status (AI 플래닝용 간소화된 상태)
export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed';

// Project Source - AI 생성 vs 직접 작성 구분
export type ProjectSource = 'manual' | 'mcp';

// Project types (AI 플래닝용 간소화된 스키마)
// DB 스키마에서 projects 테이블 타입을 사용
export type Project = Tables<'projects'> & {
  // Relations (선택적으로 조인해서 가져올 때 사용)
  todos?: Todo[];
};

export interface ProjectInsert {
  user_id: string;
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  icon?: string | null;
  color?: string | null;
  source?: ProjectSource; // AI 생성('mcp') vs 직접 작성('manual')
}

export interface ProjectUpdate extends Partial<Omit<ProjectInsert, 'user_id'>> {
  id: string;
}

// Project 진행률 정보
export interface ProjectProgress {
  project_id: string;
  total: number;
  completed: number;
  progress: number; // 0-100 퍼센트
}

// Extended Todo type with new fields (기존 Todo 타입을 확장하지 않고 새 필드만 문서화)
export interface TodoExtendedFields {
  is_today_highlight: boolean;
  assigned_to: string | null;
  assigned_date: string | null;
}

// Extended Note type with new fields (기존 Note 타입을 확장하지 않고 새 필드만 문서화)
export interface NoteExtendedFields {
  area_resource_id: string | null;
  note_category: NoteCategory;
}

// Statistics types
export interface ProjectTodoStats {
  project_id: string;
  user_id: string;
  total_todos: number;
  completed_todos: number;
  remaining_todos: number;
  completion_rate: number;
}

export interface GoalProjectStats {
  goal_id: string;
  user_id: string;
  total_projects: number;
  in_progress_projects: number;
  not_started_projects: number;
  completed_projects: number;
  paused_projects: number;
  completion_rate: number;
}

export interface AreaResourceNoteCount {
  area_resource_id: string;
  user_id: string;
  title: string;
  status: AreaResourceStatus;
  note_count: number;
}

// ============================================
// 반복 할일 미루기 (Postpone) Types
// ============================================

/**
 * 미루기 액션 타입
 * - reschedule: 특정 시간으로 미루기
 * - anytime: 나중에 (시간 미정)
 * - start_now: 지금 바로 하기 (타이머 시작)
 */
export type PostponeAction = 'reschedule' | 'anytime' | 'start_now';

/**
 * 미루기 옵션
 */
export interface PostponeOptions {
  action: PostponeAction;
  recordPostponement: boolean; // 미룸 기록 여부 (todo_exclusions에 'postponed' 저장)
  newTime?: string; // HH:mm 형식 (reschedule인 경우만 사용)
}

/**
 * 미루기 처리 파라미터
 */
export interface PostponeParams {
  parentTodoId: string;
  occurrenceDate: string; // YYYY-MM-DD
  userId: string;
  action: PostponeAction;
  recordPostponement: boolean;
  newTime?: string; // HH:mm
  originalStartTime?: string; // ISO format (원래 시작 시간)
}

/**
 * 시간 미정 할일 아이템 (Anytime Inbox용)
 * 새 아키텍처: 독립 할일로 저장됨 (todo_overrides 대신 todos 테이블 사용)
 */
export interface AnytimeInboxItem {
  id: string; // 독립 할일 ID (todos 테이블의 id)
  parentTodoId: string; // 원본 반복 할일 ID (parent_recurring_todo_id)
  occurrenceDate: string; // YYYY-MM-DD (occurrence_date)
  title: string;
  icon?: string | null;
  color?: string | null;
  originalStartTime?: string; // 원래 예정 시간 (HH:mm 또는 ISO)
  postponedAt: string; // 미룬 시각 (created_at)
  hasPostponementRecord: boolean; // 미룸 기록 여부 (exclusion 존재 여부)
}

// ============================================
// Department Types (Re-export)
// ============================================
export * from './department';

// ============================================
// Relationship Types (Re-export)
// ============================================
export * from './relationship';

// ============================================
// Role Types (Re-export)
// ============================================
export * from './role';

