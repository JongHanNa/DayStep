'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import NoteTabs, { type NoteTabType } from '@/components/second-brain/notes/NoteTabs';
import AreaResourceSubTabs, { type SubTabType } from '@/components/second-brain/notes/AreaResourceSubTabs';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { Plus, Pin, Inbox, BookmarkCheck, FileText, FolderOpen } from 'lucide-react';
import type { Note, NoteType, NoteCategory } from '@/types/second-brain';

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: '일반 노트',
  reference: '레퍼런스',
  work_in_progress: '진행 중',
  read_later: '나중에 읽기',
};

// 탭 아이콘 매핑
const TAB_ICONS: Record<NoteTabType, any> = {
  inbox: Inbox,
  read_later: BookmarkCheck,
  draft: FileText,
  area_resource: FolderOpen,
};

export default function NotesPage() {
  const { appUser } = useAuth();
  const { notes, fetchNotes, updateNote } = useNoteStore();
  const [activeTab, setActiveTab] = useState<NoteTabType>('inbox');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('areas');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  useEffect(() => {
    if (appUser?.id) {
      fetchNotes(appUser.id);
    }
  }, [appUser?.id, fetchNotes]);

  // 탭별 노트 필터링
  const getFilteredNotes = (): Note[] => {
    switch (activeTab) {
      case 'inbox':
        // 수집함: note_category가 'none'이고 area/resource에 연결되지 않은 노트
        return notes.filter((note) => note.note_category === 'none' && !note.area_id && !note.resource_id);
      case 'read_later':
        // 나중에 보기: note_category가 'read_later'
        return notes.filter((note) => note.note_category === 'read_later');
      case 'draft':
        // 원고: note_category가 'work_in_progress'
        return notes.filter((note) => note.note_category === 'work_in_progress');
      case 'area_resource':
        // 영역·자원: area_id 또는 resource_id가 있는 노트
        if (activeSubTab === 'areas') {
          return notes.filter((note) => note.area_id);
        } else {
          return notes.filter((note) => note.resource_id);
        }
      default:
        return notes;
    }
  };

  const filteredNotes = getFilteredNotes();

  // 고정된 노트와 일반 노트 분리
  const pinnedNotes = filteredNotes.filter((note) => note.is_pinned);
  const regularNotes = filteredNotes.filter((note) => !note.is_pinned);

  // 탭별 카운트 계산
  const tabCounts = {
    inbox: notes.filter((n) => n.note_category === 'none' && !n.area_id && !n.resource_id).length,
    read_later: notes.filter((n) => n.note_category === 'read_later').length,
    draft: notes.filter((n) => n.note_category === 'work_in_progress').length,
    area_resource: notes.filter((n) => n.area_id || n.resource_id).length,
  };

  // 서브탭 카운트 계산
  const subTabCounts = {
    areas: notes.filter((n) => n.area_id).length,
    resources: notes.filter((n) => n.resource_id).length,
  };

  // 노트 클릭 핸들러
  const handleNoteClick = (note: Note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title || '',
      content: note.content || '',
      note_category: note.note_category,
      linkedAreaOrResource: note.area_id ? `area-${note.area_id}` : note.resource_id ? `resource-${note.resource_id}` : '',
      isPinned: note.is_pinned,
      projectIds: note.projects?.map((p) => p.id) || [],
      todoIds: [],
      noteIds: note.connectedNotes?.map((n) => n.id) || [],
    });
  };

  // 노트 저장 핸들러
  const handleSave = async () => {
    if (!editingNote || !noteForm || !appUser?.id) return;

    try {
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (noteForm.linkedAreaOrResource) {
        if (noteForm.linkedAreaOrResource.startsWith('area-')) {
          area_id = noteForm.linkedAreaOrResource.replace('area-', '');
        } else if (noteForm.linkedAreaOrResource.startsWith('resource-')) {
          resource_id = noteForm.linkedAreaOrResource.replace('resource-', '');
        }
      }

      await updateNote(appUser.id, editingNote.id, {
        title: noteForm.title,
        content: noteForm.content,
        note_category: noteForm.note_category,
        is_pinned: noteForm.isPinned,
        area_id,
        resource_id,
      });

      setEditingNote(null);
      setNoteForm(null);
      fetchNotes(appUser.id);
    } catch (error) {
      console.error('노트 저장 실패:', error);
      alert('노트 저장에 실패했습니다.');
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-3' : 'py-4'}`}>
            {/* 상단: 제목 + 버튼 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold">노트</h1>
                <p className="text-sm text-base-content/70">
                  {filteredNotes.length}개
                </p>
              </div>
              <button className="btn btn-primary btn-sm rounded-full">
                <Plus className="w-4 h-4" />
                새로 만들기
              </button>
            </div>

            {/* 메인 탭 */}
            <NoteTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />

            {/* 영역·자원 서브탭 (해당 탭일 때만 표시) */}
            {activeTab === 'area_resource' && (
              <div className="mt-3">
                <AreaResourceSubTabs
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                  counts={subTabCounts}
                />
              </div>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-base-content/50">아직 노트가 없습니다</p>
              <p className="text-sm text-base-content/30 mt-2">
                + 버튼을 눌러 새로운 노트를 추가하세요
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 고정된 노트 */}
              {pinnedNotes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    고정된 노트
                  </h2>
                  <div className="space-y-2">
                    {pinnedNotes.map((note) => (
                      <div
                        key={note.id}
                        className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleNoteClick(note)}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3">
                            {/* 카테고리 아이콘 */}
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {(() => {
                                const IconComponent = TAB_ICONS[
                                  note.note_category === 'read_later' ? 'read_later' :
                                  note.note_category === 'work_in_progress' ? 'draft' :
                                  (note.area_id || note.resource_id) ? 'area_resource' :
                                  'inbox'
                                ];
                                return <IconComponent className="w-5 h-5 text-primary" />;
                              })()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{note.title}</h3>
                              <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                                {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                              </p>

                              {/* 태그 및 영역/자원 표시 */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {note.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="badge badge-xs badge-ghost"
                                    style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {note.area && (
                                  <span className="badge badge-xs" style={{ backgroundColor: note.area.color + '20', color: note.area.color }}>
                                    영역: {note.area.title}
                                  </span>
                                )}
                                {note.resource && (
                                  <span className="badge badge-xs" style={{ backgroundColor: note.resource.color + '20', color: note.resource.color }}>
                                    자원: {note.resource.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일반 노트 */}
              {regularNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <h2 className="text-sm font-semibold text-base-content/70 mb-3">
                      모든 노트
                    </h2>
                  )}
                  <div className="space-y-2">
                    {regularNotes.map((note) => (
                      <div
                        key={note.id}
                        className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleNoteClick(note)}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3">
                            {/* 카테고리 아이콘 */}
                            <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                              {(() => {
                                const IconComponent = TAB_ICONS[
                                  note.note_category === 'read_later' ? 'read_later' :
                                  note.note_category === 'work_in_progress' ? 'draft' :
                                  (note.area_id || note.resource_id) ? 'area_resource' :
                                  'inbox'
                                ];
                                return <IconComponent className="w-5 h-5" />;
                              })()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{note.title}</h3>
                              <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                                {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                              </p>

                              {/* 태그 및 영역/자원 표시 */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {(note.tags || []).slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="badge badge-xs badge-ghost"
                                    style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {(note.tags || []).length > 3 && (
                                  <span className="badge badge-xs badge-ghost">
                                    +{(note.tags || []).length - 3}
                                  </span>
                                )}
                                {note.area && (
                                  <span className="badge badge-xs" style={{ backgroundColor: note.area.color + '20', color: note.area.color }}>
                                    영역: {note.area.title}
                                  </span>
                                )}
                                {note.resource && (
                                  <span className="badge badge-xs" style={{ backgroundColor: note.resource.color + '20', color: note.resource.color }}>
                                    자원: {note.resource.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />

        {/* 노트 편집 모달 */}
        {editingNote && noteForm && (
          <NoteEditModal
            open={!!editingNote}
            note={noteForm}
            onClose={() => {
              setEditingNote(null);
              setNoteForm(null);
            }}
            onChange={setNoteForm}
            onSave={handleSave}
            areas={[]}
            resources={[]}
            projects={[]}
            todos={[]}
            notes={notes}
          />
        )}
      </div>
    </AuthGuard>
  );
}
