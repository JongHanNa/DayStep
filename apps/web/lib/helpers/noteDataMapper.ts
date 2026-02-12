/**
 * 노트 데이터 매핑 유틸리티
 *
 * 역할: 여러 데이터 타입을 NoteFormData로 변환하는 공통 함수
 * 목적: 코드 중복 제거, 일관성 보장, 유지보수성 향상
 */

import type { Note } from '@/types/domain';
import type { NoteFormData } from '@/components/notes/shared/NoteFormFields';

/**
 * Note → NoteFormData 변환
 *
 * 사용처: 노트 관련 페이지
 *
 * @param note - DB notes 테이블 데이터
 * @returns 노트 편집 모달에 전달할 폼 데이터
 */
export function mapNoteToNoteForm(
  note: Note,
): NoteFormData {
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    note_category: note.note_category,
    linkedAreaOrResource: '',
    isPinned: note.is_pinned,
    projectIds: note.projects?.map((p) => p.id) || [],
    todoIds: note.todos?.map((t) => t.id) || [],
    noteIds: note.connectedNotes?.map((n) => n.id) || [],
  };
}
