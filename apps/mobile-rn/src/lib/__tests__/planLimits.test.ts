/**
 * planLimitsStore 변환 로직 테스트
 * rowsToMap 순수 함수 검증
 */

interface RawPlanLimit {
  id: string;
  entity_type: string;
  tier: string;
  max_count: number;
  display_text: string;
  display_label: string;
}

/** planLimitsStore.rowsToMap 동일 로직 */
function rowsToMap(rows: RawPlanLimit[]) {
  const map: Record<string, any> = {};
  for (const row of rows) {
    if (!map[row.entity_type]) {
      map[row.entity_type] = {
        free: {maxCount: -1, displayText: '', displayLabel: ''},
        pro: {maxCount: -1, displayText: '', displayLabel: ''},
      };
    }
    const tier = row.tier as 'free' | 'pro';
    map[row.entity_type][tier] = {
      maxCount: row.max_count,
      displayText: row.display_text,
      displayLabel: row.display_label,
    };
  }
  return map;
}

describe('rowsToMap', () => {
  test('빈 배열 → 빈 맵', () => {
    expect(rowsToMap([])).toEqual({});
  });

  test('단일 엔티티 free/pro', () => {
    const rows: RawPlanLimit[] = [
      {id: '1', entity_type: 'todo', tier: 'free', max_count: 10, display_text: '10개', display_label: '할일'},
      {id: '2', entity_type: 'todo', tier: 'pro', max_count: -1, display_text: '무제한', display_label: '할일'},
    ];
    const map = rowsToMap(rows);
    expect(map.todo.free.maxCount).toBe(10);
    expect(map.todo.free.displayText).toBe('10개');
    expect(map.todo.pro.maxCount).toBe(-1);
    expect(map.todo.pro.displayText).toBe('무제한');
  });

  test('여러 엔티티 타입', () => {
    const rows: RawPlanLimit[] = [
      {id: '1', entity_type: 'todo', tier: 'free', max_count: 10, display_text: '10개', display_label: '할일'},
      {id: '2', entity_type: 'project', tier: 'free', max_count: 3, display_text: '3개', display_label: '프로젝트'},
      {id: '3', entity_type: 'todo', tier: 'pro', max_count: -1, display_text: '무제한', display_label: '할일'},
      {id: '4', entity_type: 'project', tier: 'pro', max_count: -1, display_text: '무제한', display_label: '프로젝트'},
    ];
    const map = rowsToMap(rows);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map.todo.free.maxCount).toBe(10);
    expect(map.project.free.maxCount).toBe(3);
  });

  test('free만 있는 경우 pro는 기본값', () => {
    const rows: RawPlanLimit[] = [
      {id: '1', entity_type: 'note', tier: 'free', max_count: 5, display_text: '5개', display_label: '원동력'},
    ];
    const map = rowsToMap(rows);
    expect(map.note.free.maxCount).toBe(5);
    expect(map.note.pro.maxCount).toBe(-1); // 기본값
    expect(map.note.pro.displayText).toBe('');
  });
});
