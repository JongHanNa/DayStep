/**
 * ADHD 추천 엔진 테스트
 * adhdStore의 calculateScore, pickBest 로직 검증
 *
 * 스토어 구조:
 * - execution: { currentTodo, skippedIds, completedInSession, sessionStartedAt }
 * - isExecutionActive: boolean
 * - cachedPatterns: { completedKeywords, skippedKeywords, hourlyCompletionRate }
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {getSession: jest.fn()},
  },
}));

jest.mock('@/lib/mmkv', () => ({
  zustandMMKVStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const {useADHDStore} = require('../../stores/adhdStore');

function createTodo(overrides: Record<string, any> = {}) {
  return {
    id: 'todo-1',
    user_id: 'user-1',
    title: '테스트',
    completed: false,
    schedule_type: 'timed',
    start_time: null,
    end_time: null,
    importance: false,
    urgency: false,
    anytime_duration: null,
    ...overrides,
  };
}

const DEFAULT_PATTERNS = {
  completedKeywords: {},
  skippedKeywords: {},
  hourlyCompletionRate: new Array(24).fill(0),
};

beforeEach(() => {
  useADHDStore.setState({
    execution: {
      currentTodo: null,
      skippedIds: [],
      completedInSession: 0,
      sessionStartedAt: null,
    },
    isExecutionActive: false,
    cachedPatterns: {...DEFAULT_PATTERNS, hourlyCompletionRate: [...DEFAULT_PATTERNS.hourlyCompletionRate]},
  });
});

describe('ADHD 추천 엔진', () => {
  describe('recommendNext (pickBest 간접 테스트)', () => {
    test('완료된 할일은 추천하지 않음', () => {
      const todos = [createTodo({completed: true})];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo).toBeNull();
    });

    test('스킵된 할일은 추천하지 않음', () => {
      useADHDStore.setState({
        execution: {currentTodo: null, skippedIds: ['todo-1'], completedInSession: 0, sessionStartedAt: null},
      });
      const todos = [createTodo()];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo).toBeNull();
    });

    test('빈 배열 → null', () => {
      useADHDStore.getState().recommendNext([]);
      expect(useADHDStore.getState().execution.currentTodo).toBeNull();
    });

    test('짧은 제목 우선 (ADHD 시작 용이)', () => {
      const todos = [
        createTodo({id: 'long', title: '매우 긴 할일 제목으로 시작하기 어려운 작업입니다 정말 길어요'}),
        createTodo({id: 'short', title: '짧은 할일'}),
      ];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo?.id).toBe('short');
    });

    test('anytime 할일 우선 (바로 시작 가능)', () => {
      const todos = [
        createTodo({id: 'timed', schedule_type: 'timed', title: '일반 할일 작업 제목'}),
        createTodo({id: 'anytime', schedule_type: 'anytime', title: '일반 할일 작업 제목'}),
      ];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo?.id).toBe('anytime');
    });

    test('중요+긴급 할일 우선', () => {
      const todos = [
        createTodo({id: 'normal', title: '보통 할일이에요 일반적인 작업입니다'}),
        createTodo({id: 'urgent', title: '보통 할일이에요 일반적인 작업입니다', importance: true, urgency: true}),
      ];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo?.id).toBe('urgent');
    });

    test('짧은 소요시간 우선', () => {
      const todos = [
        createTodo({id: 'long-dur', title: '일반적인 작업을 수행합니다 매우', anytime_duration: 60}),
        createTodo({id: 'short-dur', title: '일반적인 작업을 수행합니다 매우', anytime_duration: 10}),
      ];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo?.id).toBe('short-dur');
    });

    test('여러 요소 복합 → 최고 점수 선택', () => {
      const todos = [
        createTodo({id: 'a', title: '긴 할일 제목이에요 시작하기 어려움', schedule_type: 'timed'}),
        createTodo({id: 'b', title: '짧은 일', schedule_type: 'anytime', importance: true, anytime_duration: 5}),
      ];
      useADHDStore.getState().recommendNext(todos);
      expect(useADHDStore.getState().execution.currentTodo?.id).toBe('b');
    });
  });

  describe('markSkipped', () => {
    test('스킵 → skippedIds에 추가', () => {
      useADHDStore.setState({
        execution: {currentTodo: createTodo(), skippedIds: [], completedInSession: 0, sessionStartedAt: null},
      });
      useADHDStore.getState().markSkipped();
      expect(useADHDStore.getState().execution.skippedIds).toContain('todo-1');
    });

    test('currentTodo가 null이면 skippedIds 변화 없음', () => {
      useADHDStore.getState().markSkipped();
      expect(useADHDStore.getState().execution.skippedIds).toEqual([]);
    });
  });

  describe('markCompleted', () => {
    test('완료 → completedInSession 증가 + currentTodo null', () => {
      useADHDStore.setState({
        execution: {currentTodo: createTodo(), skippedIds: [], completedInSession: 0, sessionStartedAt: null},
      });
      useADHDStore.getState().markCompleted('todo-1');
      expect(useADHDStore.getState().execution.completedInSession).toBe(1);
      expect(useADHDStore.getState().execution.currentTodo).toBeNull();
    });

    test('키워드 학습 → completedKeywords 갱신', () => {
      useADHDStore.setState({
        execution: {currentTodo: createTodo({title: '운동하기'}), skippedIds: [], completedInSession: 0, sessionStartedAt: null},
      });
      useADHDStore.getState().markCompleted('todo-1');
      expect(useADHDStore.getState().cachedPatterns.completedKeywords['운동하기']).toBe(1);
    });
  });

  describe('startExecution / endExecution', () => {
    test('실행 시작 → isExecutionActive + 최적 할일 선택', () => {
      const todos = [createTodo({id: 'a', title: '짧은일'}), createTodo({id: 'b', title: '긴 할일 제목입니다'})];
      useADHDStore.getState().startExecution(todos);
      expect(useADHDStore.getState().isExecutionActive).toBe(true);
      expect(useADHDStore.getState().execution.currentTodo).not.toBeNull();
    });

    test('실행 종료 → 상태 초기화', () => {
      useADHDStore.setState({
        isExecutionActive: true,
        execution: {currentTodo: createTodo(), skippedIds: ['a'], completedInSession: 3, sessionStartedAt: new Date()},
      });
      useADHDStore.getState().endExecution();
      expect(useADHDStore.getState().isExecutionActive).toBe(false);
      expect(useADHDStore.getState().execution.currentTodo).toBeNull();
      expect(useADHDStore.getState().execution.skippedIds).toEqual([]);
    });
  });

  describe('resetSession', () => {
    test('세션 리셋 → skippedIds, completedInSession 초기화 (currentTodo 유지)', () => {
      useADHDStore.setState({
        execution: {
          currentTodo: createTodo(),
          skippedIds: ['a', 'b'],
          completedInSession: 5,
          sessionStartedAt: new Date(),
        },
      });
      useADHDStore.getState().resetSession();
      const exec = useADHDStore.getState().execution;
      expect(exec.skippedIds).toEqual([]);
      expect(exec.completedInSession).toBe(0);
      // currentTodo는 resetSession에서 초기화하지 않음
      expect(exec.currentTodo).not.toBeNull();
    });
  });
});
