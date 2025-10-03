import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TimeFormat } from '@/state/stores/settingsStore';

/**
 * 설정에 따라 시간을 포맷하는 헬퍼 함수
 */
export const formatTime = (date: Date, timeFormat: TimeFormat): string => {
  switch (timeFormat) {
    case '12h':
      return format(date, 'a h:mm', { locale: ko });
    case '24h':
      return format(date, 'HH:mm');
    default:
      return format(date, 'HH:mm');
  }
};

/**
 * 타임라인 현재 시간 마커용 시간 포맷 (더 자세한 형태)
 */
export const formatTimeForMarker = (date: Date, timeFormat: TimeFormat): string => {
  switch (timeFormat) {
    case '12h':
      return format(date, 'a h:mm', { locale: ko });
    case '24h':
      return format(date, 'HH:mm');
    default:
      return format(date, 'HH:mm');
  }
};