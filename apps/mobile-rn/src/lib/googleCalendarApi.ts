/**
 * Google Calendar API Client
 * RN 클라이언트에서 직접 Google Calendar API 호출
 */

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime 또는 'YYYY-MM-DD' (종일)
  end: string;
  isAllDay: boolean;
  color: string;
}

/** Google Calendar colorId → hex 매핑 */
const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

const DEFAULT_COLOR = '#4285F4'; // Google Blue

interface GoogleEventResource {
  id: string;
  summary?: string;
  start: {date?: string; dateTime?: string};
  end: {date?: string; dateTime?: string};
  colorId?: string;
}

interface GoogleEventsResponse {
  items?: GoogleEventResource[];
}

/**
 * Google Calendar API에서 이벤트 조회
 */
export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {Authorization: `Bearer ${accessToken}`},
    },
  );

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }
  if (response.status === 403) {
    throw new Error('PERMISSION_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data: GoogleEventsResponse = await response.json();

  return (data.items ?? []).map(item => {
    const isAllDay = !!item.start.date;
    return {
      id: item.id,
      title: item.summary ?? '(제목 없음)',
      start: isAllDay ? item.start.date! : item.start.dateTime!,
      end: isAllDay ? item.end.date! : item.end.dateTime!,
      isAllDay,
      color: item.colorId
        ? GOOGLE_CALENDAR_COLORS[item.colorId] ?? DEFAULT_COLOR
        : DEFAULT_COLOR,
    };
  });
}
