/**
 * QA Checklist Store (Zustand + MMKV)
 * 관리자 전용 QA 테스트 체크리스트 상태 관리
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {QA_SECTIONS} from '@/data/qaChecklist';

export type TestPlatform = 'ios' | 'android';

interface TestInfo {
  version: string;
  buildNumber: string;
  date: string;
  tester: string;
}

interface QAChecklistState {
  /** 플랫폼별 체크 상태: { 'ios:item-id': true, 'android:item-id': true } */
  checkedItems: Record<string, boolean>;
  /** 현재 선택된 플랫폼 */
  platform: TestPlatform;
  /** 테스트 정보 */
  testInfo: TestInfo;
  /** 스모크 테스트만 보기 필터 */
  smokeOnly: boolean;

  // Actions
  toggleItem: (itemId: string) => void;
  setPlatform: (platform: TestPlatform) => void;
  setSmokeOnly: (value: boolean) => void;
  setTestInfo: (info: Partial<TestInfo>) => void;
  resetPlatform: () => void;
  resetAll: () => void;
}

/** 플랫폼 접두사 키 생성 */
const platformKey = (platform: TestPlatform, itemId: string) =>
  `${platform}:${itemId}`;

export const useQAChecklistStore = create<QAChecklistState>()(
  persist(
    (set, get) => ({
      checkedItems: {},
      platform: 'ios',
      testInfo: {version: '', buildNumber: '', date: '', tester: ''},
      smokeOnly: false,

      toggleItem: (itemId: string) => {
        const key = platformKey(get().platform, itemId);
        set(state => ({
          checkedItems: {
            ...state.checkedItems,
            [key]: !state.checkedItems[key],
          },
        }));
      },

      setPlatform: (platform: TestPlatform) => set({platform}),

      setSmokeOnly: (value: boolean) => set({smokeOnly: value}),

      setTestInfo: (info: Partial<TestInfo>) =>
        set(state => ({
          testInfo: {...state.testInfo, ...info},
        })),

      resetPlatform: () => {
        const {platform, checkedItems} = get();
        const prefix = `${platform}:`;
        const filtered = Object.fromEntries(
          Object.entries(checkedItems).filter(([k]) => !k.startsWith(prefix)),
        );
        set({checkedItems: filtered});
      },

      resetAll: () => set({checkedItems: {}}),
    }),
    {
      name: 'qa-checklist-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);

/** 진행률 계산 헬퍼 */
export function getProgress(
  checkedItems: Record<string, boolean>,
  platform: TestPlatform,
  smokeOnly: boolean,
) {
  let total = 0;
  let checked = 0;

  for (const section of QA_SECTIONS) {
    for (const item of section.items) {
      if (smokeOnly && !item.isSmoke) continue;
      total++;
      if (checkedItems[platformKey(platform, item.id)]) checked++;
    }
  }

  return {total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0};
}

/** 섹션별 진행률 */
export function getSectionProgress(
  sectionId: string,
  checkedItems: Record<string, boolean>,
  platform: TestPlatform,
  smokeOnly: boolean,
) {
  const section = QA_SECTIONS.find(s => s.id === sectionId);
  if (!section) return {total: 0, checked: 0};

  let total = 0;
  let checked = 0;

  for (const item of section.items) {
    if (smokeOnly && !item.isSmoke) continue;
    total++;
    if (checkedItems[platformKey(platform, item.id)]) checked++;
  }

  return {total, checked};
}
