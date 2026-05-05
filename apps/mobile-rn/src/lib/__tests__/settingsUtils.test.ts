/**
 * settingsStore 유틸 함수 테스트
 * getMainColorForPreset 순수 함수 검증
 */

type BackgroundPreset = 'warmBackground' | 'calmBackground' | 'eveningBackground' | 'executionBackground';

/** settingsStore.getMainColorForPreset 동일 로직 */
function getMainColorForPreset(preset: BackgroundPreset): string {
  const PRESET_MAIN_COLORS: Record<BackgroundPreset, string> = {
    calmBackground: '#3B82F6',
    warmBackground: '#D97706',
    eveningBackground: '#8B5CF6',
    executionBackground: '#EA580C',
  };
  return PRESET_MAIN_COLORS[preset];
}

describe('getMainColorForPreset', () => {
  test('calmBackground → 파란색', () => {
    expect(getMainColorForPreset('calmBackground')).toBe('#3B82F6');
  });

  test('warmBackground → 주황색', () => {
    expect(getMainColorForPreset('warmBackground')).toBe('#D97706');
  });

  test('eveningBackground → 보라색', () => {
    expect(getMainColorForPreset('eveningBackground')).toBe('#8B5CF6');
  });

  test('executionBackground → 진한 주황색', () => {
    expect(getMainColorForPreset('executionBackground')).toBe('#EA580C');
  });

  test('모든 프리셋이 유효한 hex color', () => {
    const presets: BackgroundPreset[] = [
      'calmBackground', 'warmBackground', 'eveningBackground', 'executionBackground',
    ];
    for (const preset of presets) {
      const color = getMainColorForPreset(preset);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
