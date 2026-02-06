/**
 * OAuth Handlers Unit Tests
 * 
 * handleGoogleSignIn, handleKakaoSignIn, clearOAuthSessions 함수들의 단위 테스트
 */

import { handleGoogleSignIn, handleKakaoSignIn, clearOAuthSessions, mapOAuthError } from '../oauthHandlers';
import { supabase } from '../../supabase';

// Mock dependencies
jest.mock('../../supabase');
jest.mock('@capacitor/core');
jest.mock('@capacitor/preferences');
jest.mock('@capgo/capacitor-social-login');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCapacitor = {
  getPlatform: jest.fn(),
  isNativePlatform: jest.fn(),
};

const mockSocialLogin = {
  initialize: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
};

const mockPreferences = {
  set: jest.fn(),
  remove: jest.fn(),
};

// Setup mocks before tests
beforeAll(() => {
  // Mock Capacitor
  jest.doMock('@capacitor/core', () => ({
    Capacitor: mockCapacitor,
  }));

  // Mock SocialLogin
  jest.doMock('@capgo/capacitor-social-login', () => ({
    SocialLogin: mockSocialLogin,
  }));

  // Mock Preferences
  jest.doMock('@capacitor/preferences', () => ({
    Preferences: mockPreferences,
  }));

  // Mock window.location for web tests
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000/login',
    },
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OAuth Handlers', () => {
  describe('handleGoogleSignIn', () => {
    it('should use native SDK on iOS platform', async () => {
      // Arrange
      mockCapacitor.getPlatform.mockReturnValue('ios');
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      mockSocialLogin.login.mockResolvedValue({
        provider: 'google',
        result: {
          idToken: 'mock-id-token',
          profile: {
            email: 'test@example.com',
            name: 'Test User',
            id: 'google-123'
          }
        }
      });

      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Date.now() / 1000 + 3600,
            token_type: 'bearer'
          },
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        },
        error: null
      });

      // Act
      const result = await handleGoogleSignIn();

      // Assert
      expect(result.error).toBeNull();
      expect(mockSocialLogin.initialize).toHaveBeenCalledWith({
        google: {
          webClientId: expect.any(String),
          iOSClientId: expect.any(String),
          iOSServerClientId: expect.any(String),
        }
      });
      expect(mockSocialLogin.login).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          scopes: ['email', 'profile']
        }
      });
      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'mock-id-token'
      });
      expect(mockPreferences.set).toHaveBeenCalledWith({
        key: 'supabase_auth_session',
        value: expect.stringContaining('mock-access-token')
      });
    });

    it('should use OAuth redirect on web platform', async () => {
      // Arrange
      mockCapacitor.getPlatform.mockReturnValue('web');
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth.google.com/auth' },
        error: null
      });

      // Act
      const result = await handleGoogleSignIn();

      // Assert
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          queryParams: { prompt: 'select_account' }
        }
      });
    });

    it('should handle native login errors gracefully', async () => {
      // Arrange
      mockCapacitor.getPlatform.mockReturnValue('ios');
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      const mockError = new Error('Network connection failed');
      mockSocialLogin.login.mockRejectedValue(mockError);

      // Act
      const result = await handleGoogleSignIn();

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Network connection failed');
    });

    it('should handle missing idToken error', async () => {
      // Arrange
      mockCapacitor.getPlatform.mockReturnValue('ios');
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      mockSocialLogin.login.mockResolvedValue({
        provider: 'google',
        result: {
          profile: {
            email: 'test@example.com',
            name: 'Test User'
          }
          // idToken is missing
        }
      });

      // Act
      const result = await handleGoogleSignIn();

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Google 로그인에서 idToken을 받지 못했습니다.');
    });
  });

  describe('handleKakaoSignIn', () => {
    // Mock sessionStorage
    const mockSessionStorage = {
      setItem: jest.fn(),
    };
    
    beforeEach(() => {
      Object.defineProperty(global, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      });
    });

    it('should return error on mobile platform', async () => {
      // Arrange
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      // Act
      const result = await handleKakaoSignIn();

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('모바일에서는 카카오 로그인이 지원되지 않습니다');
      expect(result.error?.status).toBe(400);
    });

    it('should redirect to Kakao OAuth on web platform', async () => {
      // Arrange
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      // Mock window.location.href setter
      delete (window as any).location;
      (window as any).location = { 
        origin: 'http://localhost:3000',
        href: ''
      };

      // Act
      const result = await handleKakaoSignIn();

      // Assert
      expect(result.error).toBeNull();
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'kakao_oauth_state',
        expect.any(String)
      );
      expect((window as any).location.href).toContain('kauth.kakao.com/oauth/authorize');
    });
  });

  describe('clearOAuthSessions', () => {
    it('should clear native OAuth sessions on mobile', async () => {
      // Arrange
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      // Act
      await clearOAuthSessions();

      // Assert
      expect(mockSocialLogin.logout).toHaveBeenCalledWith({ provider: 'google' });
      expect(mockPreferences.remove).toHaveBeenCalledTimes(4); // 4 keys to remove
    });

    it('should clear web OAuth sessions on web platform', async () => {
      // Arrange
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      // Mock document.createElement and body.appendChild
      const mockIframe = {
        style: { display: '' },
        src: ''
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockIframe as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockIframe as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockIframe as any);

      // Act
      await clearOAuthSessions();

      // Assert
      expect(document.createElement).toHaveBeenCalledWith('iframe');
      expect(mockIframe.style.display).toBe('none');
      expect(mockIframe.src).toBe('https://accounts.google.com/Logout');
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockSocialLogin.logout.mockRejectedValue(new Error('Logout failed'));

      // Act & Assert - should not throw
      await expect(clearOAuthSessions()).resolves.toBeUndefined();
    });
  });

  describe('mapOAuthError', () => {
    it('should map popup closed error', () => {
      const error = new Error('popup_closed');
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('로그인이 취소되었습니다');
      expect(result.status).toBe(400);
    });

    it('should map network error', () => {
      const error = new Error('Network request failed');
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('네트워크 연결을 확인해주세요');
      expect(result.status).toBe(0);
    });

    it('should map timeout error', () => {
      const error = new Error('Request timeout');
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('로그인 요청이 시간 초과되었습니다');
      expect(result.status).toBe(408);
    });

    it('should map unauthorized error', () => {
      const error = new Error('unauthorized access');
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('인증이 거부되었습니다');
      expect(result.status).toBe(403);
    });

    it('should handle unknown errors', () => {
      const error = 'unknown error';
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('알 수 없는 오류가 발생했습니다');
      expect(result.status).toBe(500);
    });

    it('should handle Error objects with generic messages', () => {
      const error = new Error('Some generic error');
      const result = mapOAuthError(error);
      
      expect(result.message).toBe('Some generic error');
      expect(result.status).toBe(500);
    });
  });
});