'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { Plus, X, Pencil, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import type { CreateProjectInput, CreateNoteInput, Project, NoteType } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

export default function ProjectsSettingsPage() {
  const router = useRouter();
  const { createProject, updateProject, deleteProject, projects, fetchProjects } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { createNote } = useNoteStore();

  // 편집 관련 state
  const [editingProject, setEditingProject] = useState<(Project & {
    isNew?: boolean;
    paraSelection?: string;
    notes?: Array<{
      title: string;
      content: string;
      memoType: NoteType;
      paraSelection?: string;
      isPinned: boolean;
    }>;
  }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [showNoteSection, setShowNoteSection] = useState(false);

  // 노트 추가 state
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    memoType: 'note' as NoteType,
    paraSelection: '',
    isPinned: false,
  });

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchProjects, fetchGoals, fetchAreas, fetchResources]);

  // 새 프로젝트 추가 핸들러
  const handleAddProject = () => {
    setEditingProject({
      id: '',
      title: '',
      description: '',
      icon: 'lucide-FolderOpen',
      color: '#A8DADC',
      status: 'not_started',
      goal_id: '',
      start_date: '',
      target_end_date: '',
      total_todos: 0,
      completed_todos: 0,
      progress: 0,
      order_index: projects.length,
      created_at: '',
      updated_at: '',
      user_id: '',
      paraSelection: '',
      notes: [],
      isNew: true,
    });
    setEditDialogOpen(true);
    setShowNoteSection(false);
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (project.area_id) {
      paraSelection = `area-${project.area_id}`;
    } else if (project.resource_id) {
      paraSelection = `resource-${project.resource_id}`;
    }

    setEditingProject({ ...project, paraSelection, notes: [], isNew: false });
    setEditDialogOpen(true);
    setShowNoteSection(false);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingProject) {
      setEditingProject({ ...editingProject, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingProject) {
      const color = getColorById(colorId).hex;
      setEditingProject({ ...editingProject, color });
    }
  };

  // 노트 추가 핸들러
  const handleAddNote = () => {
    if (!newNote.title.trim()) {
      alert('노트 제목을 입력해주세요.');
      return;
    }

    if (editingProject) {
      setEditingProject({
        ...editingProject,
        notes: [...(editingProject.notes || []), newNote],
      });
      setNewNote({
        title: '',
        content: '',
        memoType: 'note',
        paraSelection: '',
        isPinned: false,
      });
    }
  };

  // 노트 제거 핸들러
  const handleRemoveNote = (noteIndex: number) => {
    if (editingProject && editingProject.notes) {
      setEditingProject({
        ...editingProject,
        notes: editingProject.notes.filter((_, i) => i !== noteIndex),
      });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingProject || !editingProject.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (editingProject.paraSelection) {
        if (editingProject.paraSelection.startsWith('area-')) {
          area_id = editingProject.paraSelection.replace('area-', '');
        } else if (editingProject.paraSelection.startsWith('resource-')) {
          resource_id = editingProject.paraSelection.replace('resource-', '');
        }
      }

      if (editingProject.isNew) {
        // 새 프로젝트 생성
        const projectData: CreateProjectInput = {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
          status: editingProject.status,
          goal_id: editingProject.goal_id || undefined,
          area_id,
          resource_id,
          start_date: editingProject.start_date || undefined,
          target_end_date: editingProject.target_end_date || undefined,
          order_index: projects.length,
        };
        const createdProject = await createProject(projectData);

        // 프로젝트에 연결된 노트들 생성
        if (editingProject.notes && editingProject.notes.length > 0) {
          for (const note of editingProject.notes) {
            // 노트의 paraSelection 파싱
            let note_area_id: string | undefined;
            let note_resource_id: string | undefined;

            if (note.paraSelection) {
              if (note.paraSelection.startsWith('area-')) {
                note_area_id = note.paraSelection.replace('area-', '');
              } else if (note.paraSelection.startsWith('resource-')) {
                note_resource_id = note.paraSelection.replace('resource-', '');
              }
            }

            const noteData: CreateNoteInput = {
              title: note.title,
              content: note.content,
              memo_type: note.memoType,
              project_id: createdProject.id,
              area_id: note_area_id,
              resource_id: note_resource_id,
              is_pinned: note.isPinned,
              tags: [],
            };
            await createNote(noteData);
          }
        }
      } else {
        // 기존 프로젝트 수정
        await updateProject(editingProject.id, {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
          status: editingProject.status,
          goal_id: editingProject.goal_id || undefined,
          area_id,
          resource_id,
          start_date: editingProject.start_date || undefined,
          target_end_date: editingProject.target_end_date || undefined,
        });

        // 노트는 편집 시에는 생성하지 않음 (새로 추가할 때만 생성)
        if (editingProject.notes && editingProject.notes.length > 0) {
          for (const note of editingProject.notes) {
            // 노트의 paraSelection 파싱
            let note_area_id: string | undefined;
            let note_resource_id: string | undefined;

            if (note.paraSelection) {
              if (note.paraSelection.startsWith('area-')) {
                note_area_id = note.paraSelection.replace('area-', '');
              } else if (note.paraSelection.startsWith('resource-')) {
                note_resource_id = note.paraSelection.replace('resource-', '');
              }
            }

            const noteData: CreateNoteInput = {
              title: note.title,
              content: note.content,
              memo_type: note.memoType,
              project_id: editingProject.id,
              area_id: note_area_id,
              resource_id: note_resource_id,
              is_pinned: note.isPinned,
              tags: [],
            };
            await createNote(noteData);
          }
        }
      }

      setEditDialogOpen(false);
      setEditingProject(null);
      await fetchProjects();
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
      await fetchProjects();
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">프로젝트 (Projects)</h1>
              <p className="text-sm text-base-content/70">
                진행 중인 프로젝트를 관리하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 프로젝트 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">프로젝트 목록 ({projects.length}개)</h2>
            <button onClick={handleAddProject} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              새 프로젝트 추가
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 프로젝트가 없습니다. 새 프로젝트를 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: project.color + '30',
                          borderColor: project.color,
                          borderWidth: '2px',
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: project.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{project.title}</div>
                        {project.description && (
                          <div className="text-sm text-base-content/60">{project.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(project)}
                        className="btn btn-ghost btn-sm btn-circle text-error"
                        aria-label="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 편집/추가 다이얼로그 */}
      {editDialogOpen && editingProject && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingProject.isNew ? '새 프로젝트 추가' : '프로젝트 편집'}
            </h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: editingProject.color + '20',
                  borderColor: editingProject.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingProject.title}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 웹사이트 리뉴얼"
              />
            </div>

            {/* 연결할 목표 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">연결할 목표 (선택)</span>
              </label>
              <select
                value={editingProject.goal_id || ''}
                onChange={(e) => setEditingProject({ ...editingProject, goal_id: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.icon} {goal.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 진행상황 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">진행상황</span>
              </label>
              <select
                value={editingProject.status}
                onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived' })}
                className="select select-bordered"
              >
                <option value="not_started">시작안함</option>
                <option value="active">진행중</option>
                <option value="on_hold">중단</option>
                <option value="completed">완료</option>
              </select>
            </div>

            {/* 연결할 영역/자원 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">연결할 영역/자원 (선택)</span>
              </label>
              <select
                value={editingProject.paraSelection}
                onChange={(e) => setEditingProject({ ...editingProject, paraSelection: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => (
                    <option key={area.id} value={`area-${area.id}`}>
                      {area.icon} {area.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => (
                    <option key={resource.id} value={`resource-${resource.id}`}>
                      {resource.icon} {resource.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 시작일/종료일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingProject.target_end_date || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, target_end_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>
            </div>

            {/* 노트 섹션 */}
            <div className="border-t border-base-300 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setShowNoteSection(!showNoteSection)}
                className="flex items-center gap-2 text-sm font-medium mb-2"
              >
                {showNoteSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                노트 추가 (선택) {editingProject.notes && editingProject.notes.length > 0 && `(${editingProject.notes.length}개)`}
              </button>

              {showNoteSection && (
                <div className="space-y-4 p-4 bg-base-100 rounded-lg">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">노트 제목</span>
                    </label>
                    <input
                      type="text"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      placeholder="예: 기획 초안"
                      className="input input-bordered input-sm"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">노트 내용</span>
                    </label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="노트 내용을 입력하세요"
                      className="textarea textarea-bordered textarea-sm h-16"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">분류</span>
                      </label>
                      <select
                        value={newNote.memoType}
                        onChange={(e) => setNewNote({ ...newNote, memoType: e.target.value as NoteType })}
                        className="select select-bordered select-sm"
                      >
                        <option value="work_in_progress">중간 작업물</option>
                        <option value="read_later">나중에 보기</option>
                        <option value="reference">레퍼런스</option>
                        <option value="note">일반 노트</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">연결할 영역/자원 (선택)</span>
                      </label>
                      <select
                        value={newNote.paraSelection}
                        onChange={(e) => setNewNote({ ...newNote, paraSelection: e.target.value })}
                        className="select select-bordered select-sm"
                      >
                        <option value="">선택 안 함</option>
                        <optgroup label="영역">
                          {areas.map((area) => (
                            <option key={area.id} value={`area-${area.id}`}>
                              {area.icon} {area.title}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="자원">
                          {resources.map((resource) => (
                            <option key={resource.id} value={`resource-${resource.id}`}>
                              {resource.icon} {resource.title}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        checked={newNote.isPinned}
                        onChange={(e) => setNewNote({ ...newNote, isPinned: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="label-text">고정하기</span>
                    </label>
                  </div>

                  <button onClick={handleAddNote} className="btn btn-sm btn-ghost w-full">
                    <Plus className="w-3 h-3" />
                    노트 추가
                  </button>

                  {/* 추가된 노트 목록 */}
                  {editingProject.notes && editingProject.notes.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium">추가된 노트 ({editingProject.notes.length}개)</p>
                      {editingProject.notes.map((note, index) => {
                        const memoTypeLabels = {
                          work_in_progress: '중간 작업물',
                          read_later: '나중에 보기',
                          reference: '레퍼런스',
                          note: '일반 노트',
                        };

                        return (
                          <div key={index} className="p-2 bg-base-200 rounded flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{note.title}</p>
                                <span className="badge badge-xs">{memoTypeLabels[note.memoType]}</span>
                                {note.isPinned && <span className="badge badge-xs badge-accent">고정</span>}
                              </div>
                              {note.content && (
                                <p className="text-xs text-base-content/70 mt-1 line-clamp-2">{note.content}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveNote(index)}
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && projectToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">프로젝트 삭제</h3>
            <p className="mb-6">
              <strong>{projectToDelete.title}</strong> 프로젝트를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingProject?.icon}
        selectedColor={editingProject?.color}
        onColorSelect={handleColorChange}
      />
    </div>
  );
}
