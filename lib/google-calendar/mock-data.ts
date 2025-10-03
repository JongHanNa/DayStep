/**
 * 개발 환경용 Mock Google Calendar 데이터
 * Google OAuth 승인 대기 중일 때 임시로 사용
 */
import type { CalendarEvent, GoogleCalendar } from '@/types/calendar';

/**
 * Mock 캘린더 목록
 */
export const mockCalendars: GoogleCalendar[] = [
  {
    id: 'primary',
    name: '개인 캘린더',
    primary: true,
    backgroundColor: '#1976d2',
    accessRole: 'owner',
    description: '기본 개인 캘린더',
    timeZone: 'Asia/Seoul'
  },
  {
    id: 'work_calendar',
    name: '업무 캘린더',
    primary: false,
    backgroundColor: '#d84315',
    accessRole: 'owner',
    description: '업무 관련 일정',
    timeZone: 'Asia/Seoul'
  },
  {
    id: 'family_calendar',
    name: '가족 캘린더',
    primary: false,
    backgroundColor: '#388e3c',
    accessRole: 'writer',
    description: '가족 공유 캘린더',
    timeZone: 'Asia/Seoul'
  }
];

/**
 * Mock 이벤트 데이터 생성
 */
export function generateMockEvents(): CalendarEvent[] {
  const now = new Date();
  const events: CalendarEvent[] = [];

  // 오늘 이벤트들
  const today = new Date(now);
  events.push(
    {
      id: 'mock-event-1',
      title: '📅 팀 미팅',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
      isAllDay: false,
      calendarId: 'work_calendar',
      source: 'google_calendar',
      description: '주간 팀 미팅 및 프로젝트 진행상황 공유',
      location: '회의실 A',
      creator: {
        email: 'skwhdgks@gmail.com',
        displayName: 'jonghan Na'
      }
    },
    {
      id: 'mock-event-2',
      title: '🏥 병원 예약',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString(),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString(),
      isAllDay: false,
      calendarId: 'primary',
      source: 'google_calendar',
      description: '정기 건강검진',
      location: '서울대병원'
    }
  );

  // 내일 이벤트들
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  events.push(
    {
      id: 'mock-event-3',
      title: '💻 코드 리뷰',
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 30).toISOString(),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 30).toISOString(),
      isAllDay: false,
      calendarId: 'work_calendar',
      source: 'google_calendar',
      description: 'DayStep 프로젝트 코드 리뷰 세션',
      attendees: [
        {
          email: 'colleague@example.com',
          displayName: '동료 개발자',
          responseStatus: 'accepted'
        }
      ]
    },
    {
      id: 'mock-event-4',
      title: '🎂 생일 파티',
      start: tomorrow.toISOString().split('T')[0],
      end: tomorrow.toISOString().split('T')[0],
      isAllDay: true,
      calendarId: 'family_calendar',
      source: 'google_calendar',
      description: '아버지 생일 파티'
    }
  );

  // 이번 주 이벤트들
  for (let i = 2; i <= 6; i++) {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + i);

    events.push({
      id: `mock-event-week-${i}`,
      title: `📚 스터디 모임 ${i - 1}일차`,
      start: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 19, 0).toISOString(),
      end: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 21, 0).toISOString(),
      isAllDay: false,
      calendarId: 'primary',
      source: 'google_calendar',
      description: 'React 19 새 기능 스터디',
      location: '스터디 카페'
    });
  }

  // 다음 주 이벤트들
  for (let i = 7; i <= 10; i++) {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + i);

    events.push({
      id: `mock-event-next-${i}`,
      title: `🏃‍♂️ 운동`,
      start: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 6, 30).toISOString(),
      end: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 7, 30).toISOString(),
      isAllDay: false,
      calendarId: 'primary',
      source: 'google_calendar',
      description: '아침 러닝',
      location: '한강공원'
    });
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * 개발 환경 확인
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost') ||
         typeof window !== 'undefined' && window.location.hostname === 'localhost';
}

/**
 * Mock 토큰 생성 (개발용)
 */
export function generateMockTokens() {
  return {
    access_token: 'mock_access_token_' + Date.now(),
    refresh_token: 'mock_refresh_token_' + Date.now(),
    expiry_date: Date.now() + 3600000, // 1시간 후 만료
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/calendar.readonly'
  };
}