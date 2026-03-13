/**
 * Calendar Store (Zustand + MMKV)
 * Google Calendar 연동 상태 관리
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import {
  fetchCalendarEvents,
  type GoogleCalendarEvent,
} from '@/lib/googleCalendarApi';
import {startOfMonth, endOfMonth, format} from 'date-fns';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

interface CalendarState {
  isConnected: boolean;
  monthEvents: Record<string, GoogleCalendarEvent[]>; // 'YYYY-MM-DD' → events
  loading: boolean;

  connectGoogleCalendar: () => Promise<boolean>;
  disconnectGoogleCalendar: () => void;
  fetchEventsForMonth: (year: number, month: number) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      monthEvents: {},
      loading: false,

      connectGoogleCalendar: async () => {
        try {
          // 방어적 configure — auth.ts 모듈 로드 전이라도 안전하게 동작
          GoogleSignin.configure({
            iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
            webClientId: Config.GOOGLE_WEB_CLIENT_ID,
          });

          // 현재 Google 세션이 없으면 signIn 먼저 수행
          const currentUser = GoogleSignin.getCurrentUser();
          if (!currentUser) {
            await GoogleSignin.signIn();
          }

          const result = await GoogleSignin.addScopes({
            scopes: [CALENDAR_SCOPE],
          });
          if (result) {
            set({isConnected: true});
            return true;
          }
          throw new Error('캘린더 권한을 부여받지 못했습니다.');
        } catch (error: any) {
          console.error('[Calendar] connectGoogleCalendar error:', error);
          throw error;
        }
      },

      disconnectGoogleCalendar: () => {
        set({isConnected: false, monthEvents: {}});
      },

      fetchEventsForMonth: async (year: number, month: number) => {
        if (!get().isConnected) return;

        set({loading: true});
        try {
          const tokens = await GoogleSignin.getTokens();
          const accessToken = tokens.accessToken;

          const monthDate = new Date(year, month - 1, 1);
          const timeMin = format(startOfMonth(monthDate), "yyyy-MM-dd'T'00:00:00XXX");
          const timeMax = format(endOfMonth(monthDate), "yyyy-MM-dd'T'23:59:59XXX");

          const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);

          // 날짜별 매핑
          const byDate: Record<string, GoogleCalendarEvent[]> = {};
          for (const event of events) {
            const dateStr = event.isAllDay
              ? event.start // 'YYYY-MM-DD'
              : event.start.substring(0, 10); // dateTime → 날짜만

            if (!byDate[dateStr]) {
              byDate[dateStr] = [];
            }
            byDate[dateStr].push(event);
          }

          set({monthEvents: byDate, loading: false});
        } catch (error: any) {
          console.error('[Calendar] fetchEvents error:', error);
          if (error.message === 'TOKEN_EXPIRED') {
            // 토큰 만료 시 SDK가 자동 갱신하므로 재시도
            try {
              const tokens = await GoogleSignin.getTokens();
              const monthDate = new Date(year, month - 1, 1);
              const timeMin = format(startOfMonth(monthDate), "yyyy-MM-dd'T'00:00:00XXX");
              const timeMax = format(endOfMonth(monthDate), "yyyy-MM-dd'T'23:59:59XXX");

              const events = await fetchCalendarEvents(tokens.accessToken, timeMin, timeMax);
              const byDate: Record<string, GoogleCalendarEvent[]> = {};
              for (const event of events) {
                const dateStr = event.isAllDay
                  ? event.start
                  : event.start.substring(0, 10);
                if (!byDate[dateStr]) byDate[dateStr] = [];
                byDate[dateStr].push(event);
              }
              set({monthEvents: byDate, loading: false});
            } catch (retryError) {
              console.error('[Calendar] retry failed:', retryError);
              set({isConnected: false, monthEvents: {}, loading: false});
            }
          } else if (error.message === 'PERMISSION_DENIED') {
            set({isConnected: false, monthEvents: {}, loading: false});
          } else {
            set({loading: false});
          }
        }
      },
    }),
    {
      name: 'calendar-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({isConnected: state.isConnected}),
    },
  ),
);
