'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
// 탭 타입 정의 (이전 NoteTabs, AreaResourceSubTabs 컴포넌트에서 이동)
type NoteTabType = 'inbox' | 'read_later' | 'draft' | 'area_resource';
type SubTabType = 'areas' | 'resources';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { Plus, Pin, Inbox, BookmarkCheck, FileText, FolderOpen } from 'lucide-react';
import type { Note, NoteType, NoteCategory, Project } from '@/types/second-brain';
import { updateNoteTodos } from '@/lib/supabase/todo-notes';
import { updateNoteProjects } from '@/lib/supabase/project-notes';
import { updateNoteNotes } from '@/lib/supabase/note-notes';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import { mapNoteToNoteForm } from '@/lib/helpers/noteDataMapper';

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
  const { notes, fetchNotes, updateNote, createNote } = useNoteStore();
  const { todos: entityTodos, fetchAllTodos } = useTodoStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<NoteTabType>('inbox');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('areas');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);

  // Entity Todo를 database Todo 형식으로 변환
  const todos = entityTodos.map(todo => todo.toDatabase() as any);

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/notes');
  }, []);

  useEffect(() => {
    if (appUser?.id) {
      fetchNotes(appUser.id);
      fetchAllTodos();
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
      fetchProjects(appUser.id);
    }
  }, [appUser?.id, fetchNotes, fetchAllTodos, fetchAreas, fetchResources, fetchProjects]);

  // 탭별 노트 필터링
  const getFilteredNotes = (): Note[] => {
    switch (activeTab) {
      case 'inbox':
        // 수집함: area/resource에 연결되지 않은 노트 (분류와 무관)
        return notes.filter((note) => !note.area_resource_id);
      case 'read_later':
        // 나중에 보기: note_category가 'read_later'
        return notes.filter((note) => note.note_category === 'read_later');
      case 'draft':
        // 원고: note_category가 'work_in_progress'
        return notes.filter((note) => note.note_category === 'work_in_progress');
      case 'area_resource':
        // 영역·자원: area_resource_id가 있는 노트
        if (activeSubTab === 'areas') {
          // 영역 필터: area_resource_id가 areas 배열에 있는지 확인
          return notes.filter((note) => note.area_resource_id && areas.some(a => a.id === note.area_resource_id));
        } else {
          // 자원 필터: area_resource_id가 resources 배열에 있는지 확인
          return notes.filter((note) => note.area_resource_id && resources.some(r => r.id === note.area_resource_id));
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
    inbox: notes.filter((n) => !n.area_resource_id).length,
    read_later: notes.filter((n) => n.note_category === 'read_later').length,
    draft: notes.filter((n) => n.note_category === 'work_in_progress').length,
    area_resource: notes.filter((n) => n.area_resource_id).length,
  };

  // 서브탭 카운트 계산
  const subTabCounts = {
    areas: notes.filter((n) => n.area_resource_id && areas.some(a => a.id === n.area_resource_id)).length,
    resources: notes.filter((n) => n.area_resource_id && resources.some(r => r.id === n.area_resource_id)).length,
  };

  // 노트 클릭 핸들러
  const handleNoteClick = (note: Note) => {
    setEditingNote(note);
    // ✅ 공통 매핑 함수 사용 (중복 코드 제거, 일관성 보장)
    setNoteForm(mapNoteToNoteForm(note, areas));
  };

  // 노트 저장 핸들러
  const handleSave = async () => {
    if (!editingNote || !noteForm || !appUser?.id) return;

    try {
      // linkedAreaOrResource를 area_resource_id로 변환
      let area_resource_id: string | undefined;

      if (noteForm.linkedAreaOrResource) {
        // 'area-' 또는 'resource-' 프리픽스 제거
        area_resource_id = noteForm.linkedAreaOrResource.replace(/^(area|resource)-/, '');
      }

      // 노트 기본 정보 저장
      await updateNote(editingNote.id, appUser.id, {
        title: noteForm.title,
        content: noteForm.content,
        note_category: noteForm.note_category,
        is_pinned: noteForm.isPinned,
        area_resource_id,
      });

      // 할일 연결 저장
      if (noteForm.todoIds !== undefined) {
        await updateNoteTodos(editingNote.id, noteForm.todoIds, appUser.id);
      }

      // 프로젝트 연결 저장
      if (noteForm.projectIds !== undefined) {
        await updateNoteProjects(editingNote.id, noteForm.projectIds, appUser.id);
      }

      setEditingNote(null);
      setNoteForm(null);
      fetchNotes(appUser.id);
    } catch (error) {
      console.error('노트 저장 실패:', error);
      alert('노트 저장에 실패했습니다.');
    }
  };

  // 노트 즉시 생성 핸들러
  const handleQuickAdd = async () => {
    if (isCreating || !appUser?.id) return;

    try {
      setIsCreating(true);

      // 활성 탭에 따라 note_category 자동 설정
      const noteCategory: NoteCategory =
        activeTab === 'read_later' ? 'read_later' :
        activeTab === 'draft' ? 'work_in_progress' :
        'none';

      // DB에 즉시 생성
      await createNote(appUser.id, {
        title: '새노트',
        content: '',
        note_category: noteCategory,
        is_pinned: false,
      });

      // 목록 새로고침
      await fetchNotes(appUser.id);
    } catch (error) {
      console.error('노트 생성 실패:', error);
      alert('노트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 할일 생성 핸들러
  const handleCreateTodo = async (title: string) => {
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    // EntityTodo 생성 (useTodoStore의 createTodo 사용)
    const { createTodo } = useTodoStore.getState();
    const newEntityTodo = await createTodo({
      title,
      user_id: appUser.id,
      completed: false,
      schedule_type: 'anytime',
    });

    if (!newEntityTodo) {
      throw new Error('할일 생성에 실패했습니다.');
    }

    // Database Todo 형식으로 반환
    return newEntityTodo.toDatabase() as any;
  };

  // 프로젝트 생성 핸들러
  const handleCreateProject = async (title: string): Promise<Project> => {
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    const newProject = await createProject(appUser.id, {
      title,
      description: '',
      status: 'not_started',
      color: '#808080',
      order_index: 0,
    });

    if (!newProject) {
      throw new Error('프로젝트 생성에 실패했습니다.');
    }

    return newProject;
  };

  // 프로젝트 수정 핸들러
  const handleUpdateProject = async (id: string, title: string): Promise<void> => {
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    await updateProject(appUser.id, id, { title });
    await fetchProjects(appUser.id);
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProject = async (id: string): Promise<void> => {
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    await deleteProject(appUser.id, id);
    await fetchProjects(appUser.id);
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    setEditingProject(project);
    setShowProjectEditModal(true);
  };

  // 노트 생성 핸들러
  const handleCreateNote = async (title: string): Promise<Note> => {
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    const newNote = await createNote(appUser.id, {
      title,
      content: '',
      note_category: 'work_in_progress', // 기본값
      is_pinned: false,
    });

    if (!newNote) {
      throw new Error('노트 생성에 실패했습니다.');
    }

    return newNote;
  };

  // 노트-노트 즉시 저장 핸들러
  const handleNoteNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingNote?.id || !appUser?.id) return;

    try {
      await updateNoteNotes(editingNote.id, noteIds, appUser.id);
      // UI 동기화를 위해 재조회
      await fetchNotes(appUser.id);
    } catch (error) {
      console.error('노트-노트 연결 저장 실패:', error);
      throw error;
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-3' : 'py-4'}`}>
            {/* 상단: 제목 + 버튼 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-base-content/70">
                  {filteredNotes.length}개
                </p>
              </div>
              <button
                onClick={handleQuickAdd}
                className="btn btn-primary btn-sm rounded-full"
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreating ? '생성 중...' : '새로 만들기'}
              </button>
            </div>

            {/* 메인 탭 (인라인 구현) */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {([
                { id: 'inbox' as const, label: '수집함', icon: Inbox },
                { id: 'read_later' as const, label: '나중에', icon: BookmarkCheck },
                { id: 'draft' as const, label: '원고', icon: FileText },
                { id: 'area_resource' as const, label: '영역·자원', icon: FolderOpen },
              ]).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-100 hover:bg-base-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-primary-content/20' : 'bg-base-300'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 영역·자원 서브탭 (해당 탭일 때만 표시) */}
            {activeTab === 'area_resource' && (
              <div className="mt-3 flex gap-2">
                {([
                  { id: 'areas' as const, label: '영역' },
                  { id: 'resources' as const, label: '자원' },
                ]).map((subTab) => {
                  const isActive = activeSubTab === subTab.id;
                  const count = subTabCounts[subTab.id];
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isActive
                          ? 'bg-base-content text-base-100'
                          : 'bg-base-100 hover:bg-base-300'
                      }`}
                    >
                      {subTab.label}
                      {count > 0 && (
                        <span className="ml-1 text-xs opacity-70">({count})</span>
                      )}
                    </button>
                  );
                })}
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
                                  note.area_resource_id ? 'area_resource' :
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

                              {/* 영역/자원 표시 */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {note.area_resource_id && (() => {
                                  const areaResource = areas.find(a => a.id === note.area_resource_id) || resources.find(r => r.id === note.area_resource_id);
                                  if (!areaResource) return null;
                                  const isArea = areas.some(a => a.id === note.area_resource_id);
                                  return (
                                    <span className="badge badge-xs" style={{ backgroundColor: areaResource.color + '20', color: areaResource.color }}>
                                      {isArea ? '영역' : '자원'}: {areaResource.title}
                                    </span>
                                  );
                                })()}
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
                                  note.area_resource_id ? 'area_resource' :
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

                              {/* 영역/자원 표시 */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {note.area_resource_id && (() => {
                                  const areaResource = areas.find(a => a.id === note.area_resource_id) || resources.find(r => r.id === note.area_resource_id);
                                  if (!areaResource) return null;
                                  const isArea = areas.some(a => a.id === note.area_resource_id);
                                  return (
                                    <span className="badge badge-xs" style={{ backgroundColor: areaResource.color + '20', color: areaResource.color }}>
                                      {isArea ? '영역' : '자원'}: {areaResource.title}
                                    </span>
                                  );
                                })()}
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
            areas={areas}
            resources={resources}
            projects={projects}
            todos={todos}
            notes={notes}
            onCreateTodo={handleCreateTodo}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onProjectClick={handleProjectClick}
            onCreateNote={handleCreateNote}
            onNoteNoteImmediateSave={handleNoteNoteImmediateSave}
          />
        )}

        {/* 프로젝트 편집 모달 */}
        {editingProject && (
          <ProjectEditDialog
            open={showProjectEditModal}
            editingProject={editingProject}
            onSave={async (projectData, area_id, resource_id) => {
              if (!editingProject) return;
              await handleUpdateProject(editingProject.id, projectData.title || editingProject.title);
              setShowProjectEditModal(false);
              setEditingProject(null);
            }}
            onCancel={() => {
              setShowProjectEditModal(false);
              setEditingProject(null);
            }}
            onDelete={async (project) => {
              await handleDeleteProject(project.id);
              setShowProjectEditModal(false);
              setEditingProject(null);
            }}
            onProjectChange={setEditingProject}
          />
        )}
      </div>
    </AuthGuard>
  );
}
