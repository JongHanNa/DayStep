/**
 * motivationUtils 테스트
 * 순수 함수: calculateStreak, calculateXP, getFilterCounts, isNoteProcessed
 */
import {calculateStreak, calculateXP, getFilterCounts, isNoteProcessed} from '../motivationUtils';

function createNote(overrides: Record<string, any> = {}) {
  return {
    id: 'note-1',
    user_id: 'user-1',
    content: '테스트 노트',
    emotion: null,
    is_pinned: false,
    todos: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('motivationUtils', () => {
  describe('calculateStreak', () => {
    test('빈 배열 → 0', () => {
      expect(calculateStreak([])).toBe(0);
    });

    test('오늘 1개 → streak 1', () => {
      const notes = [createNote({created_at: new Date().toISOString()})];
      expect(calculateStreak(notes)).toBe(1);
    });

    test('오늘 + 어제 → streak 2', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const notes = [
        createNote({created_at: today.toISOString()}),
        createNote({created_at: yesterday.toISOString()}),
      ];
      expect(calculateStreak(notes)).toBe(2);
    });

    test('연속 3일 → streak 3', () => {
      const today = new Date();
      const notes = [0, 1, 2].map(i => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return createNote({id: `note-${i}`, created_at: d.toISOString()});
      });
      expect(calculateStreak(notes)).toBe(3);
    });

    test('오늘 + 이틀 전 (어제 빠짐) → streak 1', () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const notes = [
        createNote({created_at: today.toISOString()}),
        createNote({id: 'note-2', created_at: twoDaysAgo.toISOString()}),
      ];
      expect(calculateStreak(notes)).toBe(1);
    });

    test('같은 날 여러 노트 → streak 1', () => {
      const now = new Date();
      const notes = [
        createNote({id: 'note-1', created_at: now.toISOString()}),
        createNote({id: 'note-2', created_at: now.toISOString()}),
        createNote({id: 'note-3', created_at: now.toISOString()}),
      ];
      expect(calculateStreak(notes)).toBe(1);
    });

    test('오늘 노트 없음 → streak 0', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const notes = [createNote({created_at: yesterday.toISOString()})];
      expect(calculateStreak(notes)).toBe(0);
    });
  });

  describe('calculateXP', () => {
    test('빈 배열 → 0 XP, level 1', () => {
      const result = calculateXP([]);
      expect(result).toEqual({total: 0, level: 1, progress: 0});
    });

    test('노트 1개 → 10 XP', () => {
      const result = calculateXP([createNote()]);
      expect(result.total).toBe(10);
      expect(result.level).toBe(1);
      expect(result.progress).toBe(0.1);
    });

    test('노트 10개 → 100 XP, level 2', () => {
      const notes = Array.from({length: 10}, (_, i) =>
        createNote({id: `note-${i}`}),
      );
      const result = calculateXP(notes);
      expect(result.total).toBe(100);
      expect(result.level).toBe(2);
      expect(result.progress).toBe(0);
    });

    test('todo 변환 포함 → 추가 XP', () => {
      const notes = [
        createNote({todos: [{id: 'todo-1'}]}),
      ];
      const result = calculateXP(notes);
      expect(result.total).toBe(30); // 10 (노트) + 20 (todo 1개)
    });

    test('여러 todo 변환 → todo 수 * 20', () => {
      const notes = [
        createNote({todos: [{id: 'todo-1'}, {id: 'todo-2'}, {id: 'todo-3'}]}),
      ];
      const result = calculateXP(notes);
      expect(result.total).toBe(70); // 10 + 20*3
    });

    test('level 계산 정확성', () => {
      // 250 XP = 25 notes
      const notes = Array.from({length: 25}, (_, i) =>
        createNote({id: `note-${i}`}),
      );
      const result = calculateXP(notes);
      expect(result.total).toBe(250);
      expect(result.level).toBe(3); // floor(250/100)+1
      expect(result.progress).toBe(0.5); // 50%
    });
  });

  describe('getFilterCounts', () => {
    test('빈 배열', () => {
      expect(getFilterCounts([])).toEqual({all: 0, pending: 0, processed: 0});
    });

    test('처리되지 않은 노트만', () => {
      const notes = [createNote(), createNote({id: 'note-2'})];
      expect(getFilterCounts(notes)).toEqual({all: 2, pending: 2, processed: 0});
    });

    test('처리된 노트만 (todo 있음)', () => {
      const notes = [
        createNote({todos: [{id: 'todo-1'}]}),
        createNote({id: 'note-2', todos: [{id: 'todo-2'}]}),
      ];
      expect(getFilterCounts(notes)).toEqual({all: 2, pending: 0, processed: 2});
    });

    test('혼합', () => {
      const notes = [
        createNote({todos: [{id: 'todo-1'}]}),
        createNote({id: 'note-2'}),
        createNote({id: 'note-3', todos: [{id: 'todo-2'}]}),
      ];
      expect(getFilterCounts(notes)).toEqual({all: 3, pending: 1, processed: 2});
    });
  });

  describe('isNoteProcessed', () => {
    test('todo 없음 → false', () => {
      expect(isNoteProcessed(createNote())).toBe(false);
    });

    test('빈 todo 배열 → false', () => {
      expect(isNoteProcessed(createNote({todos: []}))).toBe(false);
    });

    test('todo 있음 → true', () => {
      expect(isNoteProcessed(createNote({todos: [{id: 'todo-1'}]}))).toBe(true);
    });

    test('todos undefined → false', () => {
      expect(isNoteProcessed(createNote({todos: undefined}))).toBe(false);
    });
  });
});
