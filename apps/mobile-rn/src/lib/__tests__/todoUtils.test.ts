/**
 * todoUtils 테스트
 * 순수 함수: hexWithOpacity, getPriorityColor
 */
import {hexWithOpacity, getPriorityColor} from '../todoUtils';

describe('todoUtils', () => {
  describe('hexWithOpacity', () => {
    test('#FF0000 + 0.5 → rgba(255, 0, 0, 0.5)', () => {
      expect(hexWithOpacity('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    test('#3B82F6 + 1 → rgba(59, 130, 246, 1)', () => {
      expect(hexWithOpacity('#3B82F6', 1)).toBe('rgba(59, 130, 246, 1)');
    });

    test('#000000 + 0 → rgba(0, 0, 0, 0)', () => {
      expect(hexWithOpacity('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    });

    test('#FFFFFF + 0.7 → rgba(255, 255, 255, 0.7)', () => {
      expect(hexWithOpacity('#FFFFFF', 0.7)).toBe('rgba(255, 255, 255, 0.7)');
    });
  });

  describe('getPriorityColor', () => {
    const PRIMARY = '#3B82F6';

    test('중요+긴급 → 메인 컬러', () => {
      expect(getPriorityColor(true, true, PRIMARY)).toBe(PRIMARY);
    });

    test('중요만 → 0.7 opacity', () => {
      const result = getPriorityColor(true, false, PRIMARY);
      expect(result).toBe(hexWithOpacity(PRIMARY, 0.7));
    });

    test('긴급만 → 0.5 opacity', () => {
      const result = getPriorityColor(false, true, PRIMARY);
      expect(result).toBe(hexWithOpacity(PRIMARY, 0.5));
    });

    test('둘 다 없음 → null', () => {
      expect(getPriorityColor(false, false, PRIMARY)).toBeNull();
    });

    test('null 값 → null', () => {
      expect(getPriorityColor(null, null, PRIMARY)).toBeNull();
    });

    test('undefined 값 → null', () => {
      expect(getPriorityColor(undefined, undefined, PRIMARY)).toBeNull();
    });

    test('primaryColor 미지정 → 기본값 #3B82F6 사용', () => {
      expect(getPriorityColor(true, true)).toBe('#3B82F6');
    });
  });
});
