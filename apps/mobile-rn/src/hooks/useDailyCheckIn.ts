/**
 * useDailyCheckIn — 화면 포커스 시 일일 체크인 카드 표시
 *
 * 5개 화면(수면 정원/플래너/프로젝트/원동력/관심 키우기)에서 호출.
 * 사용자가 해당 화면에 진입(focus)하면 홈 카드의 미확인 뱃지 + 앱 아이콘 뱃지 1 감소.
 */
import {useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  useDailyCheckInStore,
  type DailyCheckCardId,
} from '@/stores/dailyCheckInStore';

export function useDailyCheckIn(cardId: DailyCheckCardId) {
  const markChecked = useDailyCheckInStore(s => s.markChecked);
  useFocusEffect(
    useCallback(() => {
      markChecked(cardId);
    }, [markChecked, cardId]),
  );
}
