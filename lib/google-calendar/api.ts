/**
 * Google Calendar API 클래스
 * Google Calendar API v3와 통신하여 이벤트 및 캘린더 데이터를 처리합니다.
 */
import type {
  CalendarEvent,
  GoogleCalendar,
  GoogleCalendarApiEvent,
  GoogleCalendarApiCalendar,
  GoogleOAuthTokens
} from '@/types/calendar';

/**
 * Google Calendar API 클라이언트 클래스
 */
export class GoogleCalendarAPI {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 액세스 토큰 업데이트
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * API 요청을 위한 헤더 생성
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * API 응답 처리
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // JSON 파싱 실패 시 기본 에러 메시지 사용
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * 캘린더 목록 가져오기
   */
  async getCalendars(): Promise<GoogleCalendar[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/calendarList`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await this.handleResponse<{ items: GoogleCalendarApiCalendar[] }>(response);

      return data.items.map(this.transformCalendar).filter((calendar): calendar is GoogleCalendar => calendar !== null);
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
      throw new Error('캘린더 목록을 가져오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 캘린더의 이벤트 목록 가져오기
   */
  async getEvents(
    calendarId: string,
    options: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams();

      // 기본 옵션 설정
      params.set('singleEvents', 'true');
      params.set('orderBy', 'startTime');
      params.set('maxResults', '250');

      // 시간 범위 설정 (기본: 오늘부터 3개월)
      if (options.timeMin) {
        params.set('timeMin', options.timeMin.toISOString());
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        params.set('timeMin', now.toISOString());
      }

      if (options.timeMax) {
        params.set('timeMax', options.timeMax.toISOString());
      } else {
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        params.set('timeMax', threeMonthsLater.toISOString());
      }

      // 커스텀 옵션 적용
      if (options.maxResults) {
        params.set('maxResults', options.maxResults.toString());
      }
      if (options.singleEvents !== undefined) {
        params.set('singleEvents', options.singleEvents.toString());
      }
      if (options.orderBy) {
        params.set('orderBy', options.orderBy);
      }

      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await this.handleResponse<{ items: GoogleCalendarApiEvent[] }>(response);

      return data.items.map((event) => this.transformEvent(event, calendarId)).filter((event): event is CalendarEvent => event !== null);
    } catch (error) {
      console.error(`Failed to fetch events for calendar ${calendarId}:`, error);
      throw new Error('이벤트를 가져오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 여러 캘린더의 이벤트를 한 번에 가져오기
   */
  async getMultipleCalendarEvents(
    calendarIds: string[],
    options: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      const eventPromises = calendarIds.map(calendarId =>
        this.getEvents(calendarId, options)
      );

      const eventArrays = await Promise.allSettled(eventPromises);
      const allEvents: CalendarEvent[] = [];

      eventArrays.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value);
        } else {
          console.warn(`Failed to fetch events for calendar ${calendarIds[index]}:`, result.reason);
        }
      });

      // 시작 시간으로 정렬
      return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    } catch (error) {
      console.error('Failed to fetch events from multiple calendars:', error);
      throw new Error('여러 캘린더의 이벤트를 가져오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    try {
      const response = await fetch('/api/auth/google/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('토큰 갱신에 실패했습니다.');
      }

      const tokens = await response.json();
      this.setAccessToken(tokens.access_token);

      return tokens;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('인증 토큰 갱신 중 오류가 발생했습니다.');
    }
  }

  /**
   * 토큰 유효성 검증
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/calendarList?maxResults=1`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * API 응답의 캘린더 데이터를 내부 타입으로 변환
   */
  private transformCalendar(apiCalendar: GoogleCalendarApiCalendar): GoogleCalendar | null {
    if (!apiCalendar.id || !apiCalendar.summary) {
      return null;
    }

    return {
      id: apiCalendar.id,
      name: apiCalendar.summary,
      primary: apiCalendar.primary || false,
      backgroundColor: apiCalendar.backgroundColor || '#1976d2',
      accessRole: apiCalendar.accessRole as GoogleCalendar['accessRole'],
      description: apiCalendar.description,
      timeZone: apiCalendar.timeZone || 'Asia/Seoul'
    };
  }

  /**
   * API 응답의 이벤트 데이터를 내부 타입으로 변환
   */
  private transformEvent(apiEvent: GoogleCalendarApiEvent, calendarId: string): CalendarEvent | null {
    if (!apiEvent.id || !apiEvent.summary) {
      return null;
    }

    // 시작/종료 시간 처리
    const start = apiEvent.start?.dateTime || apiEvent.start?.date;
    const end = apiEvent.end?.dateTime || apiEvent.end?.date;

    if (!start || !end) {
      return null;
    }

    // 종일 이벤트 여부 확인 (date 필드가 있으면 종일 이벤트)
    const isAllDay = !!apiEvent.start?.date;

    // 날짜 형식 통일 (ISO 8601)
    const startTime = isAllDay ? `${start}T00:00:00.000Z` : start;
    const endTime = isAllDay ? `${end}T00:00:00.000Z` : end;

    return {
      id: apiEvent.id,
      title: apiEvent.summary,
      start: startTime,
      end: endTime,
      isAllDay,
      description: apiEvent.description,
      location: apiEvent.location,
      calendarId,
      source: 'google_calendar',
      recurrence: apiEvent.recurrence,
      creator: apiEvent.creator ? {
        email: apiEvent.creator.email,
        displayName: apiEvent.creator.displayName
      } : undefined,
      organizer: apiEvent.organizer ? {
        email: apiEvent.organizer.email,
        displayName: apiEvent.organizer.displayName
      } : undefined,
      attendees: apiEvent.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined
      }))
    };
  }
}

/**
 * 싱글톤 패턴으로 API 인스턴스 관리
 */
let apiInstance: GoogleCalendarAPI | null = null;

/**
 * Google Calendar API 인스턴스 생성/반환
 */
export function getGoogleCalendarAPI(accessToken: string): GoogleCalendarAPI {
  if (!apiInstance || apiInstance['accessToken'] !== accessToken) {
    apiInstance = new GoogleCalendarAPI(accessToken);
  }
  return apiInstance;
}

/**
 * API 인스턴스 정리
 */
export function clearGoogleCalendarAPI(): void {
  apiInstance = null;
}