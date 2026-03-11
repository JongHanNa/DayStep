/**
 * Auth Test Fixtures
 */

export function createMockUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {name: 'Test User'},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockSession(overrides: Record<string, any> = {}) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1시간 후
    expires_in: 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  };
}
