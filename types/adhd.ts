// ============================================
// ADHD Mode 시스템 공통 타입 정의
// ============================================

import type { Todo } from '@/entities/todo/Todo';
import type { Note } from '@/state/stores/noteStore';

// ============================================
// Execution Mode 타입
// ============================================

/** 실행 모드 뷰 상태 */
export type ExecutionViewState =
  | 'recommendation'        // 할일 추천 화면
  | 'skip-reason'           // 스킵 사유 (미사용)
  | 'completed-all'         // 모두 완료 축하 화면
  | 'empty-state'           // 할일 없음 화면
  | 'distraction-plan'      // 집중 환경 준비
  | 'adhoc-timer'           // 즉흥 포모도로 타이머
  | 'adhoc-capture'         // 완료 후 기록
  | 'adhoc-note-connection'; // 원동력 노트 연결

/** 타이머 표시 모드 */
export type TimerDisplayMode = 'elapsed' | 'remaining' | 'both';

/** 추천 뷰 Props */
export interface RecommendationViewProps {
  todo: Todo;
  awakeningSentence: string | null;
  isAnimating: boolean;
  onComplete: () => void;
  onStartPomodoroWithTodo: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onStartAdhoc: () => void;
}

/** 완료 할일 (밸런스 체크용) */
export interface CompletedTodoForBalance {
  id: string;
  title: string;
  isRelationshipTask?: boolean | null;
}

/** 모두 완료 뷰 Props */
export interface CompletedAllViewProps {
  completedCount: number;
  onExit: () => void;
  completedTodos: CompletedTodoForBalance[];
  notes: Note[];
  onConnectNote: (todoId: string, noteId: string | null, newContent?: string) => Promise<void>;
  lastCompletedTodoId?: string;
}

/** 빈 상태 뷰 Props */
export interface EmptyStateViewProps {
  onGoToOrganize: () => void;
  onStartAdhoc: () => void;
}

/** 즉흥 타이머 뷰 Props */
export interface AdhocTimerViewProps {
  timerState: {
    status: 'idle' | 'running' | 'paused' | 'completed';
    duration: number;
    remainingTime: number;
    elapsedTime: number;
  };
  onStop: () => void;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  onAdjustTime: (deltaMs: number) => void;
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
  inlineTodoInput: string;
  onInlineTodoInputChange: (value: string) => void;
  onCreateInlineTodo: () => void;
  onUpdateLinkedTodoTitle: (title: string) => void;
  originalStartTime?: Date;
  originalDuration?: number;
  totalDuration: number | null;
  isPiPAvailable: boolean;
  isPiPActive: boolean;
  onStartPiP: () => void;
  onStopPiP: () => void;
  timerDisplayMode: TimerDisplayMode;
  onToggleDisplayMode: () => void;
}

/** 기록 캡처 뷰 Props */
export interface AdhocCaptureViewProps {
  title: string;
  onTitleChange: (value: string) => void;
  onCapture: () => void;
  onSkip: () => void;
  isAnimating: boolean;
}

/** 노트 연결 뷰 Props */
export interface AdhocNoteConnectionViewProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string | null) => void;
  newNoteContent: string;
  onNewNoteContentChange: (value: string) => void;
  mode: 'select' | 'create';
  onModeChange: (mode: 'select' | 'create') => void;
  onConnect: () => void;
  onSkip: () => void;
  isAnimating: boolean;
}

// ============================================
// Care Mode 타입
// ============================================

/** 마음 전해보기 뷰 상태 */
export type CareViewState = 'select-person' | 'care-timer' | 'write-news' | 'completed';

/** 빠른 기록 모드 */
export type QuickRecordMode = 'news' | 'thanks' | 'gift' | null;

// ============================================
// 공통 타입
// ============================================

/** 타이머 컨트롤 Props */
export interface TimerControlsProps {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAdjustTime: (deltaMs: number) => void;
  isPaused: boolean;
  canAdjust?: boolean;
}

/** 원형 프로그레스 타이머 Props */
export interface CircularProgressTimerProps {
  progress: number;          // 0-1 진행률
  elapsedTime: number;       // 경과 시간 (ms)
  remainingTime: number;     // 남은 시간 (ms)
  displayMode: TimerDisplayMode;
  size?: number;
  strokeWidth?: number;
}

/** 삭제 확인 모달 Props */
export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ============================================
// 헬퍼 함수
// ============================================

/** 일정 유형 라벨 */
export const getScheduleTypeLabel = (scheduleType: string): string => {
  const labelMap: Record<string, string> = {
    'anytime': '언제든지',
    'timed': '시간지정',
    'all_day': '종일',
  };
  return labelMap[scheduleType] || scheduleType;
};

/** 시간 포맷팅 (mm:ss) */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/** 시간 포맷팅 (hh:mm) */
export const formatTimeHHMM = (date: Date): string => {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};
