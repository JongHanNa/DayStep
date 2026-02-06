/**
 * 노트 데이터 매핑 유틸리티
 *
 * 역할: 여러 데이터 타입을 NoteFormData로 변환하는 공통 함수
 * 목적: 코드 중복 제거, 일관성 보장, 유지보수성 향상
 */

import type { Note, InboxItem } from '@/types/domain';
import type { NoteFormData } from '@/components/notes/shared/NoteFormFields';

/**
 * Note → NoteFormData 변환
 *
 * 사용처: 노트 관련 페이지
 *
 * @param note - DB notes 테이블 데이터
 * @param areas - 영역 목록 (area/resource 구분용, optional)
 * @returns 노트 편집 모달에 전달할 폼 데이터
 */
export function mapNoteToNoteForm(
  note: Note,
  areas?: Array<{ id: string }>
): NoteFormData {
  // area_resource_id → linkedAreaOrResource 변환
  let linkedAreaOrResource = '';
  if (note.area_resource_id && areas) {
    // areas 배열에 있으면 'area-', 아니면 'resource-' 프리픽스 추가
    const isArea = areas.some(a => a.id === note.area_resource_id);
    linkedAreaOrResource = isArea
      ? `area-${note.area_resource_id}`
      : `resource-${note.area_resource_id}`;
  } else if (note.area_resource_id) {
    // areas 배열이 없으면 기본값으로 area- 사용
    linkedAreaOrResource = `area-${note.area_resource_id}`;
  }

  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    note_category: note.note_category,
    linkedAreaOrResource,
    isPinned: note.is_pinned,
    projectIds: note.projects?.map((p) => p.id) || [],
    todoIds: note.todos?.map((t) => t.id) || [],
    noteIds: note.connectedNotes?.map((n) => n.id) || [],
  };
}

/**
 * InboxItem → NoteFormData 변환
 *
 * 사용처: 수집/명료화 페이지
 *
 * @param item - InboxItem 데이터 (노트 타입 수집함 아이템)
 * @returns 노트 편집 모달에 전달할 폼 데이터
 */
export function mapInboxItemToNoteForm(item: InboxItem): NoteFormData {
  // note_category 한글 → enum 변환
  const mapCategoryToNoteCategory = (category?: string): NoteFormData['note_category'] => {
    switch (category) {
      case '중간 작업물':
        return 'work_in_progress';
      case '나중에 보기':
        return 'read_later';
      case '레퍼런스':
        return 'reference';
      default:
        return 'work_in_progress';
    }
  };

  return {
    title: item.note_title || item.content,
    content: item.note_content || '',
    note_category: mapCategoryToNoteCategory(item.note_category),
    linkedAreaOrResource: item.linked_area_or_resource || '',
    isPinned: item.is_pinned || false,
    // ✅ InboxItem도 Junction 데이터 지원 (fetchInboxNotes 수정 후)
    projectIds: item.projects?.map((p) => p.id) || [],
    todoIds: item.todos?.map((t) => t.id) || [],
    noteIds: item.connectedNotes?.map((n) => n.id) || [],
  };
}
