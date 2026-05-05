/**
 * QA Checklist Store Tests
 */

jest.mock('@/lib/mmkv', () => ({
  zustandMMKVStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const {useQAChecklistStore, getProgress, getSectionProgress} =
  require('../qaChecklistStore');

beforeEach(() => {
  useQAChecklistStore.setState({
    checkedItems: {},
    platform: 'ios',
    testInfo: {version: '', buildNumber: '', date: '', tester: ''},
    smokeOnly: false,
  });
});

describe('qaChecklistStore', () => {
  describe('toggleItem', () => {
    test('항목 체크 → true', () => {
      useQAChecklistStore.getState().toggleItem('install-1');
      expect(useQAChecklistStore.getState().checkedItems['ios:install-1']).toBe(true);
    });

    test('항목 체크 해제 → false', () => {
      useQAChecklistStore.setState({checkedItems: {'ios:install-1': true}});
      useQAChecklistStore.getState().toggleItem('install-1');
      expect(useQAChecklistStore.getState().checkedItems['ios:install-1']).toBe(false);
    });

    test('플랫폼별 독립 체크', () => {
      useQAChecklistStore.getState().toggleItem('install-1'); // ios
      useQAChecklistStore.getState().setPlatform('android');
      useQAChecklistStore.getState().toggleItem('install-1'); // android

      const items = useQAChecklistStore.getState().checkedItems;
      expect(items['ios:install-1']).toBe(true);
      expect(items['android:install-1']).toBe(true);
    });
  });

  describe('setPlatform', () => {
    test('ios → android 전환', () => {
      useQAChecklistStore.getState().setPlatform('android');
      expect(useQAChecklistStore.getState().platform).toBe('android');
    });
  });

  describe('setSmokeOnly', () => {
    test('스모크 필터 토글', () => {
      useQAChecklistStore.getState().setSmokeOnly(true);
      expect(useQAChecklistStore.getState().smokeOnly).toBe(true);
    });
  });

  describe('setTestInfo', () => {
    test('부분 업데이트', () => {
      useQAChecklistStore.getState().setTestInfo({version: '1.0.0', tester: 'QA'});
      const info = useQAChecklistStore.getState().testInfo;
      expect(info.version).toBe('1.0.0');
      expect(info.tester).toBe('QA');
      expect(info.date).toBe(''); // 변경되지 않은 필드
    });
  });

  describe('resetPlatform', () => {
    test('현재 플랫폼 체크만 초기화', () => {
      useQAChecklistStore.setState({
        platform: 'ios',
        checkedItems: {
          'ios:install-1': true,
          'ios:install-2': true,
          'android:install-1': true,
        },
      });

      useQAChecklistStore.getState().resetPlatform();

      const items = useQAChecklistStore.getState().checkedItems;
      expect(items['ios:install-1']).toBeUndefined();
      expect(items['ios:install-2']).toBeUndefined();
      expect(items['android:install-1']).toBe(true); // android 유지
    });
  });

  describe('resetAll', () => {
    test('전체 초기화', () => {
      useQAChecklistStore.setState({
        checkedItems: {
          'ios:install-1': true,
          'android:install-1': true,
        },
      });

      useQAChecklistStore.getState().resetAll();
      expect(useQAChecklistStore.getState().checkedItems).toEqual({});
    });
  });

  describe('getProgress', () => {
    test('전체 진행률 계산', () => {
      const result = getProgress({}, 'ios', false);
      expect(result.total).toBeGreaterThan(0);
      expect(result.checked).toBe(0);
      expect(result.percent).toBe(0);
    });

    test('체크 시 진행률 증가', () => {
      const items = {'ios:install-1': true, 'ios:install-2': true};
      const result = getProgress(items, 'ios', false);
      expect(result.checked).toBe(2);
      expect(result.percent).toBeGreaterThan(0);
    });

    test('스모크 필터 → 스모크 항목만 카운트', () => {
      const all = getProgress({}, 'ios', false);
      const smoke = getProgress({}, 'ios', true);
      expect(smoke.total).toBeLessThan(all.total);
      expect(smoke.total).toBeGreaterThan(0);
    });

    test('다른 플랫폼 체크는 무시', () => {
      const items = {'android:install-1': true};
      const result = getProgress(items, 'ios', false);
      expect(result.checked).toBe(0);
    });
  });

  describe('getSectionProgress', () => {
    test('섹션별 진행률', () => {
      const items = {'ios:install-1': true};
      const result = getSectionProgress('install', items, 'ios', false);
      expect(result.total).toBe(4); // install 섹션 4개 항목
      expect(result.checked).toBe(1);
    });

    test('존재하지 않는 섹션 → 0', () => {
      const result = getSectionProgress('nonexistent', {}, 'ios', false);
      expect(result.total).toBe(0);
      expect(result.checked).toBe(0);
    });

    test('스모크 필터 적용', () => {
      const all = getSectionProgress('install', {}, 'ios', false);
      const smoke = getSectionProgress('install', {}, 'ios', true);
      expect(smoke.total).toBeLessThan(all.total);
    });
  });
});
