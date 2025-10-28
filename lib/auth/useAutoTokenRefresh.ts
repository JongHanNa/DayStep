/**
 * Capacitor WebView 환경을 위한 자동 JWT 토큰 갱신 Hook
 * Supabase JS SDK의 자동 갱신이 신뢰성이 떨어지는 Capacitor WebView 환경에서
 * 만료 기반 토큰 갱신 시스템을 제공합니다.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { isCapacitorEnvironment } from '../supabase/core';

interface TokenRefreshConfig {
  // 토큰 만료 몇 초 전에 갱신할지 (기본: 60초)
  refreshBeforeExpirySeconds?: number;
  // 디버그 로깅 활성화 여부
  enableDebugLogs?: boolean;
}

/**
 * Capacitor 환경에서 JWT 토큰 자동 갱신을 위한 Hook
 */
export function useAutoTokenRefresh(config: TokenRefreshConfig = {}) {
  const {
    refreshBeforeExpirySeconds = 60,
    enableDebugLogs = true
  } = config;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  const log = useCallback((message: string, data?: any) => {
    if (enableDebugLogs) {
      console.log(`🔄 [AutoTokenRefresh] ${message}`, data || '');
    }
  }, [enableDebugLogs]);

  useEffect(() => {
    // Capacitor 환경에서만 자동 갱신 활성화
    if (!isCapacitorEnvironment()) {
      log('웹 환경 감지 - Supabase SDK 기본 자동 갱신 사용');
      return;
    }

    log('Capacitor 환경 감지 - 만료 기반 자동 토큰 갱신 시작', {
      refreshBeforeExpirySeconds
    });

    // 토큰 갱신 함수 (effect 내부 정의)
    const performTokenRefresh = async (): Promise<boolean> => {
      if (isRefreshingRef.current) {
        log('토큰 갱신이 이미 진행 중 - 중복 호출 무시');
        return false;
      }

      isRefreshingRef.current = true;
      
      try {
        log('토큰 갱신 시작');
        
        // Capacitor 환경에서는 refreshSession 대신 저장된 refresh_token 사용
        let refreshResult;
        
        if (isCapacitorEnvironment()) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            
            if (value) {
              const storedSession = JSON.parse(value);
              if (storedSession.refresh_token) {
                log('Capacitor 환경 - 저장된 refresh_token으로 갱신 시도');
                refreshResult = await supabase.auth.refreshSession({
                  refresh_token: storedSession.refresh_token
                });
              } else {
                log('토큰 갱신 실패 - Capacitor에 refresh_token 없음');
                return false;
              }
            } else {
              log('토큰 갱신 실패 - Capacitor에 저장된 세션 없음');
              return false;
            }
          } catch (capacitorError) {
            log('Capacitor 세션 읽기 실패', capacitorError);
            return false;
          }
        } else {
          // 웹 환경에서는 기본 방식 사용
          refreshResult = await supabase.auth.refreshSession();
        }
        
        if (refreshResult.error) {
          log('토큰 갱신 실패', { error: refreshResult.error.message });
          return false;
        }

        if (refreshResult.data.session?.access_token) {
          log('토큰 갱신 성공', {
            userId: refreshResult.data.session.user?.id,
            expiresAt: refreshResult.data.session.expires_at,
            hasAccessToken: !!refreshResult.data.session.access_token
          });

          // Capacitor 환경에서는 Preferences에도 새로운 세션 저장
          if (isCapacitorEnvironment()) {
            try {
              const { Preferences } = await import('@capacitor/preferences');
              await Preferences.set({
                key: 'supabase_auth_session',
                value: JSON.stringify({
                  access_token: refreshResult.data.session.access_token,
                  refresh_token: refreshResult.data.session.refresh_token,
                  expires_at: refreshResult.data.session.expires_at,
                  token_type: refreshResult.data.session.token_type,
                  user: refreshResult.data.session.user
                })
              });
              log('갱신된 세션이 Capacitor Preferences에 저장됨');
            } catch (capacitorError) {
              log('Capacitor Preferences 저장 실패', capacitorError);
            }
          }

          // 다음 갱신 시점 스케줄링
          if (refreshResult.data.session.expires_at) {
            scheduleNextRefresh(refreshResult.data.session.expires_at);
          }
          return true;
        }
      } catch (error) {
        log('토큰 갱신 중 예외 발생', error);
      } finally {
        isRefreshingRef.current = false;
      }

      return false;
    };

    // 토큰 만료 시점 기반 갱신 스케줄링 함수 (effect 내부 정의)
    const scheduleNextRefresh = (expiresAt: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const now = Date.now();
      const expiryTime = expiresAt * 1000; // 초를 밀리초로 변환
      const refreshTime = expiryTime - (refreshBeforeExpirySeconds * 1000);
      const timeUntilRefresh = refreshTime - now;

      if (timeUntilRefresh > 0) {
        log('다음 토큰 갱신 스케줄링', {
          현재시간: new Date(now).toISOString(),
          만료시간: new Date(expiryTime).toISOString(),
          갱신시간: new Date(refreshTime).toISOString(),
          대기시간초: Math.floor(timeUntilRefresh / 1000)
        });

        timeoutRef.current = setTimeout(() => {
          log('스케줄된 토큰 갱신 실행');
          performTokenRefresh();
        }, timeUntilRefresh);
      } else {
        log('토큰이 이미 만료됨 - 즉시 갱신');
        performTokenRefresh();
      }
    };

    // 초기 세션 확인 및 갱신 스케줄링 함수 (effect 내부 정의)
    const initializeTokenRefresh = async () => {
      try {
        // 1. Supabase 세션 먼저 확인
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.expires_at) {
          log('Supabase 세션 확인됨', {
            userId: session.user?.id,
            expiresAt: session.expires_at,
            현재만료까지남은분: Math.floor(((session.expires_at * 1000) - Date.now()) / (1000 * 60))
          });
          
          scheduleNextRefresh(session.expires_at);
          return; // Supabase 세션이 있으면 여기서 종료
        }
        
        // 2. Supabase 세션이 없으면 Capacitor Preferences 확인
        if (isCapacitorEnvironment()) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            
            if (value) {
              const storedSession = JSON.parse(value);
              if (storedSession.expires_at) {
                log('Capacitor 백업 세션 확인됨', {
                  userId: storedSession.user?.id,
                  expiresAt: storedSession.expires_at,
                  현재만료까지남은분: Math.floor(((storedSession.expires_at * 1000) - Date.now()) / (1000 * 60))
                });
                
                scheduleNextRefresh(storedSession.expires_at);
                return; // 백업 세션으로 스케줄링 완료
              }
            }
          } catch (capacitorError) {
            log('Capacitor 백업 세션 확인 실패', capacitorError);
          }
        }
        
        log('초기 세션 없음 - 자동 갱신 비활성화');
      } catch (error) {
        log('초기 세션 확인 실패', error);
      }
    };

    // 1. 초기 세션 확인 및 스케줄링
    initializeTokenRefresh();

    // 2. 앱 포그라운드 복귀 시 토큰 상태 확인
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        log('앱 포그라운드 복귀 - 토큰 상태 확인');
        
        // 토큰 만료 상태 확인 후 필요시만 갱신
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.expires_at) {
            const now = Date.now();
            const expiryTime = session.expires_at * 1000;
            const timeUntilExpiry = expiryTime - now;
            
            // 만료까지 1분 이하면 즉시 갱신
            if (timeUntilExpiry < 60 * 1000) {
              log('포그라운드 복귀 - 토큰 만료 임박으로 즉시 갱신');
              performTokenRefresh();
            } else {
              log('포그라운드 복귀 - 토큰 정상 상태', {
                남은시간분: Math.floor(timeUntilExpiry / (1000 * 60))
              });
            }
          }
        } catch (error) {
          log('포그라운드 복귀 - 세션 확인 실패', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. 페이지 포커스 시 토큰 상태 확인
    const handleFocus = async () => {
      log('페이지 포커스 - 토큰 상태 확인');
      
      // 토큰 만료 상태 확인 후 필요시만 갱신
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.expires_at) {
          const now = Date.now();
          const expiryTime = session.expires_at * 1000;
          const timeUntilExpiry = expiryTime - now;
          
          // 만료까지 1분 이하면 즉시 갱신
          if (timeUntilExpiry < 60 * 1000) {
            log('페이지 포커스 - 토큰 만료 임박으로 즉시 갱신');
            performTokenRefresh();
          }
        }
      } catch (error) {
        log('페이지 포커스 - 세션 확인 실패', error);
      }
    };

    window.addEventListener('focus', handleFocus);

    // 정리
    return () => {
      const currentTimeout = timeoutRef.current;
      
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      log('자동 토큰 갱신 시스템 정리 완료');
    };
  }, [refreshBeforeExpirySeconds, log]);

  // 외부에서 사용할 수 있는 수동 갱신 함수
  const manualRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;
    
    try {
      log('수동 토큰 갱신 시작');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        log('수동 토큰 갱신 실패', { error: error.message });
        return false;
      }

      if (data.session?.access_token) {
        log('수동 토큰 갱신 성공');

        // Capacitor 환경에서는 Preferences에도 새로운 세션 저장
        if (isCapacitorEnvironment()) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({
              key: 'supabase_auth_session',
              value: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                token_type: data.session.token_type,
                user: data.session.user
              })
            });
            log('수동 갱신된 세션이 Capacitor Preferences에 저장됨');
          } catch (capacitorError) {
            log('수동 갱신 Capacitor Preferences 저장 실패', capacitorError);
          }
        }

        return true;
      }
    } catch (error) {
      log('수동 토큰 갱신 중 예외 발생', error);
    } finally {
      isRefreshingRef.current = false;
    }

    return false;
  }, [log]);

  return {
    performTokenRefresh: manualRefresh,
    isRefreshing: isRefreshingRef.current
  };
}

/**
 * 간단한 사용법을 위한 기본 설정 Hook
 */
export function useCapacitorAutoTokenRefresh() {
  return useAutoTokenRefresh({
    refreshBeforeExpirySeconds: 60,
    enableDebugLogs: true
  });
}