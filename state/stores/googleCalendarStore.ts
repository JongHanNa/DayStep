import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent, GoogleCalendar } from '@/types/calendar';

export interface GoogleCalendarState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  calendars: GoogleCalendar[];
  events: CalendarEvent[];
  selectedCalendars: string[];
  lastSyncTime: Date | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCalendars: (calendars: GoogleCalendar[]) => void;
  setEvents: (events: CalendarEvent[]) => void;
  toggleCalendar: (calendarId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastSyncTime: (time: Date | null) => void;
  syncCalendars: () => Promise<void>;
  syncEvents: () => Promise<void>;
  disconnect: () => void;
}

export const useGoogleCalendarStore = create<GoogleCalendarState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      calendars: [],
      events: [],
      selectedCalendars: [],
      lastSyncTime: null,
      isLoading: false,
      error: null,

      setTokens: (accessToken, refreshToken) => {
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          error: null
        });
      },

      setCalendars: (calendars) => {
        set({ calendars });
        // 기본적으로 primary 캘린더 선택
        const primaryCalendar = calendars.find(cal => cal.primary);
        if (primaryCalendar && get().selectedCalendars.length === 0) {
          set({ selectedCalendars: [primaryCalendar.id] });
        }
      },

      setEvents: (events) => {
        set({ events, lastSyncTime: new Date() });
      },

      toggleCalendar: (calendarId) => {
        const { selectedCalendars } = get();
        const newSelected = selectedCalendars.includes(calendarId)
          ? selectedCalendars.filter(id => id !== calendarId)
          : [...selectedCalendars, calendarId];
        set({ selectedCalendars: newSelected });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      setLastSyncTime: (time) => {
        set({ lastSyncTime: time });
      },

      syncCalendars: async () => {
        const { accessToken, refreshToken, setLoading, setError, setTokens, setCalendars } = get();

        try {
          setLoading(true);
          setError(null);

          // 개발 환경에서는 Mock 데이터 사용
          const { isDevelopmentMode, mockCalendars, generateMockTokens } = await import('@/lib/google-calendar/mock-data');

          if (isDevelopmentMode() && (!accessToken || accessToken.startsWith('mock_'))) {
            console.log('🧪 개발 모드: Mock 캘린더 데이터 사용');

            // Mock 토큰이 없으면 생성
            if (!accessToken) {
              const mockTokens = generateMockTokens();
              setTokens(mockTokens.access_token, mockTokens.refresh_token || '');
            }

            // Mock 캘린더 데이터 설정
            await new Promise(resolve => setTimeout(resolve, 500)); // 실제 API 호출처럼 딜레이
            setCalendars(mockCalendars);
            console.log(`✅ Mock 캘린더 ${mockCalendars.length}개 로드 완료`);
            return;
          }

          // 프로덕션 환경에서는 실제 API 사용
          if (!accessToken) {
            setError('인증되지 않았습니다.');
            return;
          }

          // Google Calendar API 인스턴스 생성
          const { getGoogleCalendarAPI } = await import('@/lib/google-calendar/api');
          let api = getGoogleCalendarAPI(accessToken);

          // 토큰 유효성 검증
          const isTokenValid = await api.validateToken();
          if (!isTokenValid && refreshToken) {
            try {
              // 토큰 갱신 시도
              const newTokens = await api.refreshAccessToken(refreshToken);
              setTokens(newTokens.access_token, newTokens.refresh_token || refreshToken);
              api = getGoogleCalendarAPI(newTokens.access_token);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              setError('인증이 만료되었습니다. 다시 로그인해주세요.');
              return;
            }
          } else if (!isTokenValid) {
            setError('인증이 만료되었습니다. 다시 로그인해주세요.');
            return;
          }

          // 캘린더 목록 가져오기
          const calendars = await api.getCalendars();
          setCalendars(calendars);
          console.log(`Successfully synced ${calendars.length} calendars`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '캘린더 목록을 가져오는 중 오류가 발생했습니다.';
          setError(errorMessage);
          console.error('Calendar list sync error:', error);
        } finally {
          setLoading(false);
        }
      },

      syncEvents: async () => {
        const { accessToken, refreshToken, selectedCalendars, setLoading, setError, setTokens } = get();

        console.log('🔍 [Debug] syncEvents 호출됨:', {
          hasAccessToken: !!accessToken,
          accessTokenType: accessToken?.startsWith('mock_') ? 'mock' : 'real',
          selectedCalendars,
          selectedCalendarsCount: selectedCalendars.length
        });

        try {
          setLoading(true);
          setError(null);

          // 개발 환경에서는 Mock 데이터 사용
          const { isDevelopmentMode, generateMockEvents } = await import('@/lib/google-calendar/mock-data');

          console.log('🔍 [Debug] 환경 체크:', {
            isDevelopmentMode: isDevelopmentMode(),
            accessToken: accessToken ? accessToken.slice(0, 20) + '...' : null,
            isMockToken: accessToken?.startsWith('mock_')
          });

          // 실제 토큰이 있으면 실제 API 사용, 그렇지 않으면 Mock 데이터 사용
          const shouldUseMockData = isDevelopmentMode() && (!accessToken || accessToken.startsWith('mock_'));

          if (shouldUseMockData) {
            console.log('🧪 개발 모드: Mock 이벤트 데이터 사용');

            // 선택된 캘린더가 없으면 기본 캘린더 선택
            if (selectedCalendars.length === 0) {
              console.log('📋 [Debug] 선택된 캘린더가 없어서 primary 캘린더 선택');
              set({ selectedCalendars: ['primary'] });
            }

            // Mock 이벤트 데이터 생성
            await new Promise(resolve => setTimeout(resolve, 800)); // 실제 API 호출처럼 딜레이
            const mockEvents = generateMockEvents();

            console.log('🎭 [Debug] Mock 이벤트 생성 완료:', {
              totalMockEvents: mockEvents.length,
              mockEventsPreview: mockEvents.slice(0, 3).map(e => ({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                calendarId: e.calendarId
              }))
            });

            // 선택된 캘린더의 이벤트만 필터링
            const currentSelectedCalendars = get().selectedCalendars; // 업데이트된 값 가져오기
            const filteredEvents = mockEvents.filter(event =>
              currentSelectedCalendars.length === 0 || currentSelectedCalendars.includes(event.calendarId)
            );

            console.log('🔍 [Debug] 이벤트 필터링 완료:', {
              currentSelectedCalendars,
              filteredEventsCount: filteredEvents.length,
              filteredEventsPreview: filteredEvents.slice(0, 3).map(e => ({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                calendarId: e.calendarId
              }))
            });

            set({ events: filteredEvents, lastSyncTime: new Date() });
            console.log(`✅ Mock 이벤트 ${filteredEvents.length}개 로드 완료 (총 ${mockEvents.length}개 중)`);
            return;
          }

          // 실제 Google Calendar API 사용
          console.log('🚀 실제 Google Calendar API 호출 시작');

          if (!accessToken) {
            console.error('❌ 액세스 토큰이 없습니다');
            setError('인증되지 않았습니다. 다시 로그인해주세요.');
            return;
          }

          // 선택된 캘린더가 없으면 primary 캘린더 자동 선택
          let currentSelectedCalendars = selectedCalendars;
          if (currentSelectedCalendars.length === 0) {
            console.log('📋 [Debug] 선택된 캘린더가 없어서 primary 캘린더 자동 선택');
            currentSelectedCalendars = ['primary'];
            set({ selectedCalendars: currentSelectedCalendars });
          }

          console.log('📋 [Debug] 사용할 캘린더 목록:', currentSelectedCalendars);

          // Google Calendar API 인스턴스 생성
          const { getGoogleCalendarAPI } = await import('@/lib/google-calendar/api');
          let api = getGoogleCalendarAPI(accessToken);

          // 토큰 유효성 검증
          const isTokenValid = await api.validateToken();
          if (!isTokenValid && refreshToken) {
            try {
              // 토큰 갱신 시도
              const newTokens = await api.refreshAccessToken(refreshToken);
              setTokens(newTokens.access_token, newTokens.refresh_token || refreshToken);
              api = getGoogleCalendarAPI(newTokens.access_token);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              setError('인증이 만료되었습니다. 다시 로그인해주세요.');
              return;
            }
          } else if (!isTokenValid) {
            setError('인증이 만료되었습니다. 다시 로그인해주세요.');
            return;
          }

          // 이벤트 가져오기 (오늘부터 3개월간)
          const timeMin = new Date();
          timeMin.setHours(0, 0, 0, 0);

          const timeMax = new Date();
          timeMax.setMonth(timeMax.getMonth() + 3);

          console.log('📊 [Debug] API 호출 파라미터:', {
            calendars: currentSelectedCalendars,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 500
          });

          const events = await api.getMultipleCalendarEvents(currentSelectedCalendars, {
            timeMin,
            timeMax,
            maxResults: 500
          });

          console.log('📊 [Debug] API 응답 완료:', {
            eventsCount: events.length,
            calendarsCount: currentSelectedCalendars.length,
            calendars: currentSelectedCalendars,
            eventsPreview: events.slice(0, 3).map(e => ({
              id: e.id,
              title: e.title,
              start: e.start,
              end: e.end,
              calendarId: e.calendarId
            }))
          });

          set({ events, lastSyncTime: new Date() });
          console.log(`✅ 실제 API로부터 ${events.length}개 이벤트 동기화 완료 (${currentSelectedCalendars.length}개 캘린더)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '이벤트 동기화 중 오류가 발생했습니다.';
          setError(errorMessage);
          console.error('Calendar sync error:', error);
        } finally {
          setLoading(false);
        }
      },

      disconnect: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          calendars: [],
          events: [],
          selectedCalendars: [],
          lastSyncTime: null,
          error: null
        });
      }
    }),
    {
      name: 'google-calendar-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        selectedCalendars: state.selectedCalendars,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
);