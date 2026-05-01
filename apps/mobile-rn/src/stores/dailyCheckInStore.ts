/**
 * Daily Check-In Store (Zustand + MMKV)
 * 5개 핵심 카드(수면 정원/하루 계획하기/내 계획 보기/원동력 새기기/관심 키우기)를
 * 사용자가 매일 한 번씩 확인하도록 유도. 카드별 미확인 뱃지 + 앱 아이콘 뱃지.
 *
 * 자동 리셋: 날짜가 바뀌면 모두 미확인으로 복원됨 (resetIfNewDay).
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {format} from 'date-fns';
import notifee from '@notifee/react-native';
import {zustandMMKVStorage} from '@/lib/mmkv';

// 홈화면의 모든 카드 — 사용자는 매일 한 번씩 모두 확인하도록 유도됨
export const DAILY_CHECK_CARD_IDS = [
  // 일상 돌보기
  'sleep',
  'adhd-understanding',
  'cleaning',
  // 계획 세우기
  'daily-planner',
  'projects',
  'ai-chat',
  'guide',
  'data-cleanup',
  // 생각과 기억
  'motivation',
  'record',
  // 지원 & 피드백
  'feedback-board',
] as const;
export type DailyCheckCardId = (typeof DAILY_CHECK_CARD_IDS)[number];

const today = (): string => format(new Date(), 'yyyy-MM-dd');

const emptyChecked = (): Record<DailyCheckCardId, boolean> =>
  DAILY_CHECK_CARD_IDS.reduce(
    (acc, id) => ({...acc, [id]: false}),
    {} as Record<DailyCheckCardId, boolean>,
  );

const countUnchecked = (checked: Record<DailyCheckCardId, boolean>): number =>
  DAILY_CHECK_CARD_IDS.filter(id => !checked[id]).length;

interface DailyCheckInState {
  lastCheckDate: string;
  checkedCards: Record<DailyCheckCardId, boolean>;
  markChecked: (cardId: DailyCheckCardId) => void;
  resetIfNewDay: () => void;
  resetAll: () => void;
  syncAppBadge: () => void;
}

export const useDailyCheckInStore = create<DailyCheckInState>()(
  persist(
    (set, get) => ({
      lastCheckDate: today(),
      checkedCards: emptyChecked(),

      markChecked: (cardId) => {
        const t = today();
        set(state => {
          const isNewDay = state.lastCheckDate !== t;
          const baseChecked = isNewDay ? emptyChecked() : state.checkedCards;
          if (baseChecked[cardId] && !isNewDay) return state;
          return {
            lastCheckDate: t,
            checkedCards: {...baseChecked, [cardId]: true},
          };
        });
        get().syncAppBadge();
      },

      resetIfNewDay: () => {
        const t = today();
        if (get().lastCheckDate === t) return;
        set({lastCheckDate: t, checkedCards: emptyChecked()});
        get().syncAppBadge();
      },

      resetAll: () => {
        set({lastCheckDate: today(), checkedCards: emptyChecked()});
        get().syncAppBadge();
      },

      syncAppBadge: () => {
        const count = countUnchecked(get().checkedCards);
        notifee.setBadgeCount(count).catch(() => {
          // 알림 권한이 없으면 silently 실패 — 앱 내 카드 뱃지는 그대로 동작
        });
      },
    }),
    {
      name: 'daily-check-in-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
