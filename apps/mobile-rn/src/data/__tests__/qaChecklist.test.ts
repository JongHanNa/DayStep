/**
 * QA 체크리스트 데이터 무결성 테스트
 * 데이터 구조와 ID 유니크성 검증
 */
import {QA_SECTIONS, TOTAL_ITEMS, SMOKE_ITEMS} from '../qaChecklist';

describe('qaChecklist 데이터', () => {
  test('16개 섹션 존재', () => {
    expect(QA_SECTIONS).toHaveLength(16);
  });

  test('모든 섹션에 id, title, items 존재', () => {
    for (const section of QA_SECTIONS) {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  test('섹션 ID 유니크', () => {
    const ids = QA_SECTIONS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('항목 ID 전체 유니크', () => {
    const ids = QA_SECTIONS.flatMap(s => s.items.map(i => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('모든 항목에 id, label, isSmoke 존재', () => {
    for (const section of QA_SECTIONS) {
      for (const item of section.items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(typeof item.isSmoke).toBe('boolean');
      }
    }
  });

  test('TOTAL_ITEMS가 모든 항목 수와 일치', () => {
    const actual = QA_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
    expect(TOTAL_ITEMS).toBe(actual);
  });

  test('SMOKE_ITEMS가 스모크 항목 수와 일치', () => {
    const actual = QA_SECTIONS.reduce(
      (sum, s) => sum + s.items.filter(i => i.isSmoke).length,
      0,
    );
    expect(SMOKE_ITEMS).toBe(actual);
  });

  test('스모크 항목이 전체의 10~30% 범위', () => {
    const ratio = SMOKE_ITEMS / TOTAL_ITEMS;
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.3);
  });

  test('각 섹션 title이 번호로 시작', () => {
    for (let i = 0; i < QA_SECTIONS.length; i++) {
      expect(QA_SECTIONS[i].title).toMatch(/^\d+\./);
    }
  });
});
