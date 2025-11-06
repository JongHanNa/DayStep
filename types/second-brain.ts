/**
 * Second Brain (GTD + PARA) 시스템 타입 정의
 *
 * PARA:
 * - Projects: 두 단계 이상의 할일 묶음 (종료일 있음)
 * - Areas: 지속적인 책임 영역 (종료일 없음)
 * - Resources: 관심 주제 (책임 없음)
 * - Archive: 완료/중단된 항목
 */

// ============================================
// PARA 시스템 기본 타입
// ============================================

/**
 * 영역 (Area) - 지속적인 책임 영역
 * 예: 직장, 가족, 건강, 재테크
 *
 * @deprecated Use AreaResource with status='area' instead
 */
export interface Area {
  id: string;
  user_id: string;
  title: string;
  icon?: string;
  color: string;
  order_index: number;
  is_pinned: boolean;
  status: 'area' | 'archived';
  created_at: string;
  updated_at: string;
}

/**
 * 자원 (Resource) - 관심 주제 (책임 없음)
 * 예: 독서, 영화, 여행, 프로그래밍
 *
 * @deprecated Use AreaResource with status='resource' instead
 */
export interface Resource {
  id: string;
  user_id: string;
  title: string;
  icon?: string;
  color: string;
  order_index: number;
  is_pinned: boolean;
  status: 'resource' | 'archived';
  created_at: string;
  updated_at: string;
}

/**
 * 영역/자원 통합 타입 (DB areas_resources 테이블)
 * status로 영역(area)과 자원(resource)을 구분
 */
export interface AreaResource {
  id: string;
  user_id: string;
  title: string;
  status: 'area' | 'resource' | 'archived';
  icon?: string;
  color: string;
  is_pinned: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * 프로젝트 (Project) - 두 단계 이상의 할일 묶음
 * 예: 앱 출시하기, 마라톤 완주, 자격증 합격
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';

  // PARA 연결
  goal_id?: string;
  goal?: Goal; // 관계 데이터
  area_resource_id?: string; // 영역 또는 자원 ID (areas_resources 테이블 참조)
  parent_project_id?: string;
  parent_project?: Project; // 관계 데이터

  // 날짜
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string (DB 컬럼명과 일치)
  completed_at?: string;

  // 메타데이터
  icon?: string;
  color: string;
  order_index: number;

  // 진행도 (자동 계산)
  total_todos: number;
  completed_todos: number;
  progress: number; // 0-100 (%)

  // 연결된 노트 (파생 데이터, project_notes junction table을 통해 로드)
  notes?: Note[];

  created_at: string;
  updated_at: string;
}

/**
 * 목표 (Goal) - 여러 프로젝트를 묶는 큰 그림
 * 예: 앱 출시하여 월 500만원 부수입 달성
 */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;

  // PARA 연결
  area_id?: string;
  area?: Area; // 관계 데이터
  resource_id?: string;
  resource?: Resource; // 관계 데이터

  // 날짜
  start_date?: string; // ISO date string (시작일)
  end_date?: string; // ISO date string (종료일)

  // 기간
  year_goal?: number; // 연간목표 (2025, 2026, 2027...)
  quarter_goal?: 'Q1' | 'Q2' | 'Q3' | 'Q4'; // 분기목표 (Q1~Q4)

  // 메타데이터
  icon?: string;
  color: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'suspended' | 'archived';

  // 연결된 프로젝트 (파생 데이터)
  projects?: Project[];
  progress: number; // 0-100 (%)

  created_at: string;
  updated_at: string;
}

// ============================================
// 노트 시스템
// ============================================

/**
 * 노트 타입
 */
export type NoteType = 'note' | 'reference' | 'work_in_progress' | 'read_later';

/**
 * 노트 카테고리 (DB note_category 컬럼과 일치)
 */
export type NoteCategory = 'none' | 'work_in_progress' | 'read_later' | 'reference';

/**
 * 노트 (Note) - PARA 구조로 분류되는 노트
 */
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  memo_type: NoteType;
  note_category: NoteCategory; // 노트 카테고리

  // PARA 연결
  projects?: Project[]; // 여러 프로젝트 연결 (N:N, project_notes junction table을 통해 로드)
  area_id?: string;
  area?: Area; // 관계 데이터
  resource_id?: string;
  resource?: Resource; // 관계 데이터

  // 메타데이터
  tags: string[];
  is_pinned: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================
// GTD 시스템 (Inbox, Clarify)
// ============================================

/**
 * GTD 상태
 */
export type GTDStatus =
  | 'inbox'           // 📥 수집함
  | 'next_action'     // ✅ 다음 행동
  | 'waiting'         // 👤 대기중 (위임)
  | 'scheduled'       // 📅 일정
  | 'someday'         // ⏰ 언젠가
  | 'completed'       // ✅ 완료
  | 'deleted';        // 🗑️ 삭제

/**
 * GTD 상황 (Context)
 */
export type GTDContext =
  | 'home'      // 🏠 집
  | 'office'    // 💼 사무실
  | 'computer'  // 💻 컴퓨터
  | 'phone'     // 📱 전화
  | 'errands'   // 🚗 외출
  | 'anywhere'; // 🌍 어디서나

/**
 * 에너지 레벨
 */
export type EnergyLevel = 'low' | 'medium' | 'high';

/**
 * Inbox 아이템 (수집함)
 */
export interface InboxItem {
  id: string;
  user_id: string;
  content: string;
  status: GTDStatus;

  // 수집 타입 (할일, 노트, 프로젝트, 목표)
  item_type?: 'todo' | 'note' | 'project' | 'goal';

  // GTD 분류 정보
  context?: GTDContext;
  energy_level?: EnergyLevel;
  time_estimate?: number; // 예상 소요시간 (분)

  // PARA 연결
  project_id?: string;
  area_id?: string;
  resource_id?: string;

  // 위임 정보
  waiting_for?: string;
  delegated_to?: string;
  delegated_at?: string;

  // 할일 타입 전용 필드
  clarification?: string; // 명료화
  next_action_status?: string; // 다음행동상황
  scheduled_date?: string; // 예정 날짜 (ISO date string)
  is_highlight?: boolean; // 오늘의 하이라이트
  is_completed?: boolean; // 완료 여부
  recurrence_pattern?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'; // 반복 패턴

  // 노트 타입 전용 필드
  note_title?: string; // 노트 제목
  note_content?: string; // 노트 내용
  note_category?: '중간 작업물' | '나중에 보기' | '레퍼런스'; // 노트 분류
  is_pinned?: boolean; // 고정 여부
  linked_area_or_resource?: string; // 영역/자원 연결 ('area-{id}' 또는 'resource-{id}')

  // 메타데이터
  clarified_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================
// 점검 (Review) 시스템
// ============================================

/**
 * 점검 타입
 */
export type ReviewType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * 점검 세션
 */
export interface ReviewSession {
  id: string;
  user_id: string;
  review_type: ReviewType;
  review_date: string; // ISO date string

  // 점검 체크리스트
  inbox_cleared: boolean;
  next_actions_reviewed: boolean;
  waiting_for_reviewed: boolean;
  projects_reviewed: boolean;
  someday_reviewed: boolean;

  // 노트
  notes?: string;

  // 완료 시간
  completed_at?: string;
  duration_minutes?: number;

  created_at: string;
  updated_at: string;
}

// ============================================
// 온보딩 (Onboarding) 시스템
// ============================================

/**
 * 온보딩 진행 상태
 */
export interface OnboardingProgress {
  id: string;
  user_id: string;

  // 단계별 완료 상태
  step_1_areas: boolean;      // 책임영역 만들기
  step_2_resources: boolean;  // 관심자원 만들기
  step_3_goals: boolean;      // 목표 설정하기
  step_4_projects: boolean;   // 프로젝트 설정하기
  step_5_todos: boolean;      // 할일 배정하기

  completed: boolean;
  completed_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================
// 입력 타입 (Create/Update)
// ============================================

export type CreateAreaInput = Omit<Area, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAreaInput = Partial<CreateAreaInput>;

export type CreateResourceInput = Omit<Resource, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateResourceInput = Partial<CreateResourceInput>;

// AreaResource 입력 타입
export type CreateAreaResourceInput = Omit<AreaResource, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAreaResourceInput = Partial<CreateAreaResourceInput>;

export type CreateProjectInput = Omit<Project, 'id' | 'user_id' | 'total_todos' | 'completed_todos' | 'progress' | 'created_at' | 'updated_at' | 'goal' | 'area' | 'resource' | 'parent_project'>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export type CreateGoalInput = Omit<Goal, 'id' | 'user_id' | 'projects' | 'progress' | 'created_at' | 'updated_at' | 'area' | 'resource'>;
export type UpdateGoalInput = Partial<CreateGoalInput>;

export type CreateNoteInput = Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'project' | 'area' | 'resource'>;
export type UpdateNoteInput = Partial<CreateNoteInput>;

export type CreateInboxItemInput = Omit<InboxItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateInboxItemInput = Partial<CreateInboxItemInput>;

export type CreateReviewSessionInput = Omit<ReviewSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateReviewSessionInput = Partial<CreateReviewSessionInput>;

// ============================================
// 유틸리티 타입
// ============================================

/**
 * 온보딩 단계
 */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

/**
 * 명료화 질문 답변
 */
export interface ClarifyAnswer {
  question1: 'yes' | 'no'; // 실행 가능한가?
  question1_action?: 'delete' | 'note' | 'someday' | 'remind'; // NO인 경우
  question2?: 'now' | 'delegate' | 'schedule' | 'next_action' | 'project'; // YES인 경우

  // 세부 정보
  context?: GTDContext;
  energy_level?: EnergyLevel;
  time_estimate?: number;
  scheduled_date?: string;
  delegated_to?: string;
  project_title?: string;
}

/**
 * 명료화 결과
 */
export interface ClarifyResult {
  original_item: InboxItem;
  action: 'delete' | 'note' | 'someday' | 'next_action' | 'schedule' | 'delegate' | 'project';
  created_todo?: any; // Todo 타입 (기존 시스템과 연동)
  created_note?: Note;
  created_project?: Project;
}

/**
 * 아카이브 필터
 */
export interface ArchiveFilter {
  type: 'all' | 'goals' | 'projects' | 'areas' | 'resources';
  year?: number;
  quarter?: 1 | 2 | 3 | 4;
  status?: 'completed' | 'on_hold' | 'archived';
}
