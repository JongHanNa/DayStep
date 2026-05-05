import {createMockTodo} from '../../__tests__/fixtures/todos';

// supabase mock
const mockFrom = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
    },
  },
  fetchWithJWT: jest.fn(),
}));

jest.mock('@/lib/mmkv', () => ({
  zustandMMKVStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const {useTodoStore} = require('../todoStore');

beforeEach(() => {
  jest.clearAllMocks();
  useTodoStore.setState({
    todos: [],
    completions: [],
    selectedDate: '2026-03-12',
    motivationMap: {},
    loading: false,
    error: null,
    offlineQueue: [],
    monthViewData: null,
    monthViewLoading: false,
  });
  // Default: authenticated user
  mockGetSession.mockResolvedValue({data: {session: {user: {id: 'user-1'}}}});
});

describe('todoStore', () => {
  test('setSelectedDate → 상태 변경', () => {
    // fetchTodosForDate will be called but we just test state change
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({data: [], error: null}),
    });

    useTodoStore.getState().setSelectedDate('2026-03-15');
    expect(useTodoStore.getState().selectedDate).toBe('2026-03-15');
  });

  describe('createTodo', () => {
    test('optimistic update → 서버 성공 → ID 교체', async () => {
      const serverTodo = createMockTodo({id: 'server-todo-id'});
      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({data: serverTodo, error: null}),
      };
      mockFrom.mockReturnValue(chain);

      const result = await useTodoStore.getState().createTodo({
        title: '새 할일',
        start_time: '2026-03-12T09:00:00.000Z',
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('server-todo-id');
      const todos = useTodoStore.getState().todos;
      expect(todos.some((t: any) => t.id === 'server-todo-id')).toBe(true);
      expect(todos.some((t: any) => t.id.startsWith('temp_'))).toBe(false);
    });

    test('서버 에러 → 롤백', async () => {
      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({data: null, error: {message: 'Insert failed'}}),
      };
      mockFrom.mockReturnValue(chain);

      const result = await useTodoStore.getState().createTodo({title: '실패 할일'});

      expect(result).toBeNull();
      expect(useTodoStore.getState().todos).toHaveLength(0);
      expect(useTodoStore.getState().error).toBe('Insert failed');
    });
  });

  describe('toggleTodoCompletion', () => {
    test('비반복 할일 → completed 토글', async () => {
      const todo = createMockTodo({completed: false});
      useTodoStore.setState({todos: [todo]});

      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({error: null}),
      };
      mockFrom.mockReturnValue(chain);

      const result = await useTodoStore.getState().toggleTodoCompletion('todo-1');

      expect(result).toBe(true);
      expect(useTodoStore.getState().todos[0].completed).toBe(true);
    });

    test('존재하지 않는 todo → false', async () => {
      const result = await useTodoStore.getState().toggleTodoCompletion('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('deleteTodo', () => {
    test('optimistic 제거 → 서버 성공', async () => {
      const todo = createMockTodo();
      useTodoStore.setState({todos: [todo]});

      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({error: null}),
      };
      mockFrom.mockReturnValue(chain);

      const result = await useTodoStore.getState().deleteTodo('todo-1');

      expect(result).toBe(true);
      expect(useTodoStore.getState().todos).toHaveLength(0);
    });

    test('서버 에러 → 롤백', async () => {
      const todo = createMockTodo();
      useTodoStore.setState({todos: [todo]});

      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({error: {message: 'Delete failed'}}),
      };
      mockFrom.mockReturnValue(chain);

      const result = await useTodoStore.getState().deleteTodo('todo-1');

      expect(result).toBe(false);
      expect(useTodoStore.getState().todos).toHaveLength(1);
      expect(useTodoStore.getState().error).toBe('Delete failed');
    });
  });

  test('clearError → error null', () => {
    useTodoStore.setState({error: 'some error'});
    useTodoStore.getState().clearError();
    expect(useTodoStore.getState().error).toBeNull();
  });
});
