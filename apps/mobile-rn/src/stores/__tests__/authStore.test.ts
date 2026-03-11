import {createMockSession, createMockUser} from '../../__tests__/fixtures/auth';

// supabase mock을 스토어 import 전에 설정
const mockGetSession = jest.fn();
const mockSignInWithIdToken = jest.fn();
const mockSignOut = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: {subscription: {unsubscribe: jest.fn()}},
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithIdToken: mockSignInWithIdToken,
      signOut: mockSignOut,
      refreshSession: mockRefreshSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

jest.mock('@/lib/mmkv', () => ({
  zustandMMKVStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  sessionStorage: {
    clearAll: jest.fn(),
  },
}));

const {useAuthStore} = require('../authStore');

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: null,
    session: null,
    isAuthenticated: false,
    loading: false,
    initializing: true,
    error: null,
  });
});

describe('authStore', () => {
  test('초기 상태', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('initialize', () => {
    test('세션 있음 → isAuthenticated true', async () => {
      const session = createMockSession();
      mockGetSession.mockResolvedValueOnce({data: {session}, error: null});

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(session.user);
      expect(state.session).toEqual(session);
      expect(state.initializing).toBe(false);
    });

    test('세션 없음 → isAuthenticated false', async () => {
      mockGetSession.mockResolvedValueOnce({data: {session: null}, error: null});

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.initializing).toBe(false);
    });

    test('타임아웃 → error 설정 + sessionStorage clearAll', async () => {
      const {sessionStorage} = require('@/lib/mmkv');
      mockGetSession.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Auth init timeout (10s)')), 50)),
      );

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.error).toContain('timeout');
      expect(state.initializing).toBe(false);
      expect(sessionStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('signInWithIdToken', () => {
    test('성공 → user/session 설정', async () => {
      const user = createMockUser();
      const session = createMockSession({user});
      mockSignInWithIdToken.mockResolvedValueOnce({data: {user, session}, error: null});

      const result = await useAuthStore.getState().signInWithIdToken('google', 'test-id-token');

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.session).toEqual(session);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
    });

    test('실패 → error 설정', async () => {
      mockSignInWithIdToken.mockResolvedValueOnce({
        data: {user: null, session: null},
        error: {message: 'Invalid token'},
      });

      const result = await useAuthStore.getState().signInWithIdToken('google', 'bad-token');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid token');
    });
  });

  describe('signOut', () => {
    test('상태 초기화', async () => {
      useAuthStore.setState({
        user: createMockUser(),
        session: createMockSession(),
        isAuthenticated: true,
      });
      mockSignOut.mockResolvedValueOnce({error: null});

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  test('clearError → error null', () => {
    useAuthStore.setState({error: 'some error'});
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
