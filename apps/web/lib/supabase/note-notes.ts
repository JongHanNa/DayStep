import { fetchWithJWT } from './core';

/**
 * Get all notes connected to a note (다대다 관계 - 양방향 조회)
 * @param noteId - Note ID
 * @returns 연결된 노트 ID 배열
 */
export async function getNoteNotes(noteId: string): Promise<string[]> {
  try {
    // 양방향 조회: source_note_id와 target_note_id 모두 검색
    const [sourceResults, targetResults] = await Promise.all([
      fetchWithJWT(
        `/note_notes?source_note_id=eq.${noteId}&select=target_note_id`,
        { method: 'GET' }
      ),
      fetchWithJWT(
        `/note_notes?target_note_id=eq.${noteId}&select=source_note_id`,
        { method: 'GET' }
      ),
    ]);

    const noteIds: string[] = [];

    // source_note_id로 연결된 노트들
    if (Array.isArray(sourceResults)) {
      noteIds.push(...sourceResults.map((item: any) => item.target_note_id));
    }

    // target_note_id로 연결된 노트들
    if (Array.isArray(targetResults)) {
      noteIds.push(...targetResults.map((item: any) => item.source_note_id));
    }

    // 중복 제거
    return Array.from(new Set(noteIds));
  } catch (error) {
    console.error('Error fetching note notes:', error);
    return [];
  }
}

/**
 * Link two notes (단일 연결 생성)
 * @param sourceNoteId - Source Note ID
 * @param targetNoteId - Target Note ID
 * @param userId - User ID (RLS 정책 필수)
 */
export async function linkNoteNote(
  sourceNoteId: string,
  targetNoteId: string,
  userId: string
): Promise<boolean> {
  try {
    await fetchWithJWT('/note_notes', {
      method: 'POST',
      body: JSON.stringify({
        source_note_id: sourceNoteId,
        target_note_id: targetNoteId,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error linking note note:', error);
    return false;
  }
}

/**
 * Unlink two notes (단일 연결 해제 - 양방향)
 * @param sourceNoteId - Source Note ID
 * @param targetNoteId - Target Note ID
 */
export async function unlinkNoteNote(
  sourceNoteId: string,
  targetNoteId: string
): Promise<boolean> {
  try {
    // 양방향 연결 모두 삭제
    await Promise.all([
      fetchWithJWT(
        `/note_notes?source_note_id=eq.${sourceNoteId}&target_note_id=eq.${targetNoteId}`,
        { method: 'DELETE' }
      ),
      fetchWithJWT(
        `/note_notes?source_note_id=eq.${targetNoteId}&target_note_id=eq.${sourceNoteId}`,
        { method: 'DELETE' }
      ),
    ]);
    return true;
  } catch (error) {
    console.error('Error unlinking note note:', error);
    return false;
  }
}

/**
 * Update all note connections for a note (노트의 모든 연결 업데이트)
 * @param noteId - Note ID
 * @param noteIds - 연결할 노트 ID 배열 (여러 개 가능)
 * @param userId - User ID (RLS 정책 필수)
 */
export async function updateNoteNotes(
  noteId: string,
  noteIds: string[],
  userId: string
): Promise<boolean> {
  try {
    // 1. 기존 연결 모두 삭제 (양방향)
    await Promise.all([
      fetchWithJWT(`/note_notes?source_note_id=eq.${noteId}`, {
        method: 'DELETE',
      }),
      fetchWithJWT(`/note_notes?target_note_id=eq.${noteId}`, {
        method: 'DELETE',
      }),
    ]);

    // 2. 새로운 연결 생성
    if (noteIds.length > 0) {
      // 배치 삽입을 위한 데이터 준비
      const insertData = noteIds.map((targetNoteId) => ({
        source_note_id: noteId,
        target_note_id: targetNoteId,
      }));

      await fetchWithJWT('/note_notes', {
        method: 'POST',
        body: JSON.stringify(insertData),
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating note notes:', error);
    return false;
  }
}
