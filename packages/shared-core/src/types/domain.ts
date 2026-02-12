/**
 * 도메인 시스템 타입 정의
 *
 * Projects: AI 계획 도메인
 * Notes: 노트 시스템
 */

// ============================================
// 프로젝트 시스템 (AI 계획)
// ============================================

/**
 * 프로젝트 (Project) - AI 계획 도메인
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';

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

  // 복잡한 머릿속, 정리해줄게 플로우
  expected_outcome?: string;      // 기대 효과
  preparation?: string;           // 준비할 것
  source_reflection_id?: string;  // 연결된 수집 ID

  // 연결된 노트 (파생 데이터, project_notes junction table을 통해 로드)
  notes?: Note[];

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
 * - fuel: 원동력(복잡한 머릿속, 정리해줄게) 기능에서 생성된 노트
 */
export type NoteCategory = 'none' | 'work_in_progress' | 'read_later' | 'reference' | 'fuel';

/**
 * 노트 (Note)
 */
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  note_category: NoteCategory; // 노트 카테고리

  // 프로젝트 연결
  projects?: Project[]; // 여러 프로젝트 연결 (N:N, project_notes junction table을 통해 로드)

  // 할일 연결 (N:N, todo_notes junction table을 통해 로드)
  todos?: Array<{ id: string; title: string }>;

  // 노트 간 연결 (N:N, note_connections junction table을 통해 로드)
  connectedNotes?: Note[];

  // Capture 기능 필드 (수집 기능에서 사용)
  is_processed?: boolean; // 할일로 변환 여부 (capture 노트용)

  // 메타데이터
  is_pinned: boolean;
  is_banner_pinned?: boolean; // 홈 배너에 고정 여부

  created_at: string;
  updated_at: string;
}

// ============================================
// 에너지 레벨
// ============================================

export type EnergyLevel = 'low' | 'medium' | 'high';

// ============================================
// 입력 타입 (Create/Update)
// ============================================

export type CreateProjectInput = Omit<Project, 'id' | 'user_id' | 'total_todos' | 'completed_todos' | 'progress' | 'created_at' | 'updated_at'>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export type CreateNoteInput = Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateNoteInput = Partial<CreateNoteInput>;
