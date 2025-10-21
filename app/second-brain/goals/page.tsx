'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { Plus, X, Pencil } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateGoalInput, Goal, Project } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { Sheet } from 'react-modal-sheet';
import { createModalConfig } from '@/lib/modal-config';

export default function GoalsPage() {
  const { createGoal, updateGoal, deleteGoal, goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, createProject, updateProject, deleteProject } = useProjectStore();

  // 편집 관련 state
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // 프로젝트 관련 state
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDeleteConfirmOpen, setProjectDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  useEffect(() => {
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchGoals, fetchAreas, fetchResources]);

  // 새 목표 추가 핸들러 - 즉시 생성
  const handleAddGoal = async () => {
    if (isCreatingGoal) return; // 중복 클릭 방지

    setIsCreatingGoal(true);
    try {
      // 목표 즉시 생성
      const createdGoal = await createGoal({
        title: '새 목표',
        description: '',
        icon: 'lucide-Target',
        color: '#A8DADC',
        status: 'not_started',
        timeframe: 'year',
        target_year: new Date().getFullYear(),
        target_quarter: 1,
      });

      console.log('새 목표 생성 완료:', createdGoal);
    } catch (error) {
      console.error('목표 생성 실패:', error);
      alert('목표 생성에 실패했습니다.');
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // 목표 편집 핸들러
  const handleEditGoal = (goal: Goal) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingGoal) {
      const color = getColorById(colorId).hex;
      setEditingGoal({ ...editingGoal, color });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingGoal || !editingGoal.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (editingGoal.paraSelection) {
        if (editingGoal.paraSelection.startsWith('area-')) {
          area_id = editingGoal.paraSelection.replace('area-', '');
        } else if (editingGoal.paraSelection.startsWith('resource-')) {
          resource_id = editingGoal.paraSelection.replace('resource-', '');
        }
      }

      if (editingGoal.isNew) {
        // 새 목표 생성
        const goalData: CreateGoalInput = {
          title: editingGoal.title,
          description: editingGoal.description || '',
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          target_date: editingGoal.target_date || undefined,
          timeframe: editingGoal.timeframe,
          target_year: editingGoal.target_year || undefined,
          target_quarter: editingGoal.target_quarter || undefined,
        };
        await createGoal(goalData);
      } else {
        // 기존 목표 수정
        await updateGoal(editingGoal.id, {
          title: editingGoal.title,
          description: editingGoal.description || '',
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          target_date: editingGoal.target_date || undefined,
          timeframe: editingGoal.timeframe,
          target_year: editingGoal.target_year || undefined,
          target_quarter: editingGoal.target_quarter || undefined,
        });
      }

      setEditDialogOpen(false);
      setEditingGoal(null);
      await fetchGoals();
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingGoal(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;

    try {
      await deleteGoal(goalToDelete.id);
      setDeleteConfirmOpen(false);
      setGoalToDelete(null);
      await fetchGoals();
    } catch (error) {
      console.error('목표 삭제 실패:', error);
      alert('목표 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setGoalToDelete(null);
  };

  // 현재 편집 중인 목표에 연결된 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    if (!editingGoal || editingGoal.isNew) return [];
    return projects.filter((project) => project.goal_id === editingGoal.id);
  }, [projects, editingGoal]);

  // 프로젝트 추가 핸들러 - 즉시 생성
  const handleAddProject = async () => {
    if (!editingGoal || editingGoal.isNew) {
      alert('먼저 목표를 저장해주세요.');
      return;
    }

    if (isCreating) return; // 중복 클릭 방지

    setIsCreating(true);
    try {
      // 프로젝트 즉시 생성
      const createdProject = await createProject({
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        goal_id: editingGoal.id,
        order_index: projects.length,
      });

      console.log('새 프로젝트 생성 완료:', createdProject);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    let paraSelection = '';
    if (project.area_id) {
      paraSelection = `area-${project.area_id}`;
    } else if (project.resource_id) {
      paraSelection = `resource-${project.resource_id}`;
    }

    setEditingProject({ ...project, paraSelection, isNew: false });
    setProjectDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>, area_id?: string, resource_id?: string) => {
    try {
      if ((projectData as any).isNew) {
        await createProject({
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          area_id,
          resource_id,
          start_date: projectData.start_date || undefined,
          target_end_date: projectData.target_end_date || undefined,
          order_index: projectData.order_index!,
        });
      } else {
        await updateProject(projectData.id!, {
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          area_id,
          resource_id,
          start_date: projectData.start_date || undefined,
          target_end_date: projectData.target_end_date || undefined,
        });
      }

      setProjectDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 프로젝트 편집 취소 핸들러
  const handleCancelProjectEdit = () => {
    setProjectDialogOpen(false);
    setEditingProject(null);
  };

  // 프로젝트 삭제 확인 다이얼로그 열기
  const handleDeleteProjectClick = (project: Project) => {
    setProjectToDelete(project);
    setProjectDeleteConfirmOpen(true);
  };

  // 프로젝트 삭제 실행
  const handleConfirmProjectDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setProjectDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 프로젝트 삭제 취소
  const handleCancelProjectDelete = () => {
    setProjectDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">목표 (Goals)</h1>
          <p className="text-sm text-base-content/70 mt-1">
            장기 목표를 설정하고 관리하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 목표 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">목표 목록 ({goals.length}개)</h2>
            <button
              onClick={handleAddGoal}
              className="btn btn-primary btn-sm"
              disabled={isCreatingGoal}
            >
              {isCreatingGoal ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreatingGoal ? '생성 중...' : '새 목표 추가'}
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 목표가 없습니다. 새 목표를 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => {
                const IconComponent = getUnifiedIcon(goal.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: goal.color + '30',
                          borderColor: goal.color,
                          borderWidth: '2px',
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: goal.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{goal.title}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(goal)}
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

      {/* 편집/추가 모달 - FULLSCREEN */}
      <Sheet
        isOpen={editDialogOpen && !!editingGoal}
        onClose={handleCancelEdit}
        {...createModalConfig('FULLSCREEN')}
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={handleCancelEdit} className="btn btn-primary btn-sm px-4 py-2 rounded-full">
                취소
              </button>
              <h3 className="text-lg font-semibold">
                {editingGoal?.isNew ? '새 목표 추가' : '목표 편집'}
              </h3>
              <button onClick={handleSaveEdit} className="btn btn-primary btn-sm px-4 py-2 rounded-full">
                저장
              </button>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <Sheet.Scroller draggableAt="top" style={{ overflowX: 'hidden', backgroundColor: 'white' }}>
              <div className="px-4 py-6" style={{ overflowX: 'hidden', touchAction: 'pan-y' }}>
                {editingGoal && (
                  <>
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
                          backgroundColor: editingGoal.color + '20',
                          borderColor: editingGoal.color,
                        }}
                      >
                        {(() => {
                          const IconComponent = getUnifiedIcon(editingGoal.icon as UnifiedIconKey).component;
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
                        value={editingGoal.title}
                        onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                        className="input input-bordered"
                        placeholder="예: 건강한 생활 습관 형성"
                      />
                    </div>

                    {/* 상태 */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">상태</span>
                      </label>
                      <select
                        value={editingGoal.status}
                        onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'suspended' | 'archived' })}
                        className="select select-bordered"
                      >
                        <option value="not_started">시작 안함</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                        <option value="suspended">중단</option>
                      </select>
                    </div>

                    {/* 영역/자원 */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">영역/자원 (선택)</span>
                      </label>
                      <select
                        value={editingGoal.paraSelection}
                        onChange={(e) => setEditingGoal({ ...editingGoal, paraSelection: e.target.value })}
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
                          value={editingGoal.start_date || ''}
                          onChange={(e) => setEditingGoal({ ...editingGoal, start_date: e.target.value })}
                          className="input input-bordered"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">종료일 (선택)</span>
                        </label>
                        <input
                          type="date"
                          value={editingGoal.target_date || ''}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_date: e.target.value })}
                          className="input input-bordered"
                        />
                      </div>
                    </div>

                    {/* 기간 */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">기간</span>
                      </label>
                      <select
                        value={editingGoal.timeframe}
                        onChange={(e) => setEditingGoal({ ...editingGoal, timeframe: e.target.value as 'quarter' | 'year' | '5_years' })}
                        className="select select-bordered"
                      >
                        <option value="quarter">분기 (3개월)</option>
                        <option value="year">연간 (1년)</option>
                        <option value="5_years">장기 (5년)</option>
                      </select>
                    </div>

                    {/* 연간목표/분기목표 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">연간목표 (선택)</span>
                        </label>
                        <select
                          value={editingGoal.target_year || new Date().getFullYear()}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_year: parseInt(e.target.value) })}
                          className="select select-bordered"
                        >
                          {Array.from({ length: 6 }, (_, i) => {
                            const year = new Date().getFullYear() + i;
                            return (
                              <option key={year} value={year}>
                                {year}년
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">분기목표 (선택)</span>
                        </label>
                        <select
                          value={editingGoal.target_quarter || 1}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_quarter: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                          className="select select-bordered"
                        >
                          <option value={1}>1분기 (1~3월)</option>
                          <option value={2}>2분기 (4~6월)</option>
                          <option value={3}>3분기 (7~9월)</option>
                          <option value={4}>4분기 (10~12월)</option>
                        </select>
                      </div>
                    </div>

                    {/* 프로젝트 영역 */}
                    {!editingGoal.isNew && (
                      <div className="card bg-base-200 mb-4">
                        <div className="card-body">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">연결된 프로젝트</h2>
                            <button
                              onClick={handleAddProject}
                              className="btn btn-ghost btn-sm"
                              disabled={isCreating}
                            >
                              {isCreating ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              {isCreating ? '생성 중...' : '추가'}
                            </button>
                          </div>

                          {filteredProjects.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                              연결된 프로젝트가 없습니다.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredProjects.map((project) => {
                                const ProjectIconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
                                return (
                                  <div
                                    key={project.id}
                                    onClick={() => handleEditProject(project)}
                                    className="flex items-start gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                                  >
                                    <div
                                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{
                                        backgroundColor: project.color + '30',
                                        borderColor: project.color,
                                        borderWidth: '2px',
                                      }}
                                    >
                                      <ProjectIconComponent className="w-5 h-5" style={{ color: project.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{project.title}</div>
                                      <div className="text-sm text-base-content/60">
                                        {project.status === 'not_started' && '시작 안함'}
                                        {project.status === 'active' && '진행중'}
                                        {project.status === 'on_hold' && '중단'}
                                        {project.status === 'completed' && '완료'}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProjectClick(project);
                                      }}
                                      className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                                      aria-label="프로젝트 제거"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      {/* 삭제 확인 모달 - content-height */}
      <Sheet
        isOpen={deleteConfirmOpen && !!goalToDelete}
        onClose={handleCancelDelete}
        detent="content-height"
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="px-4 py-3">
              <h3 className="font-bold text-lg">목표 삭제</h3>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <div className="px-4 py-6">
              <p className="mb-6">
                <strong>{goalToDelete?.title}</strong> 목표를 삭제하시겠습니까?
                <br />
                <span className="text-sm text-base-content/60">
                  이 작업은 되돌릴 수 없습니다.
                </span>
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={handleCancelDelete} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleConfirmDelete} className="btn btn-error">
                  삭제
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingGoal?.icon}
        selectedColor={editingGoal?.color}
        onColorSelect={handleColorChange}
      />

      {/* 프로젝트 편집 다이얼로그 */}
      <ProjectEditDialog
        open={projectDialogOpen}
        editingProject={editingProject}
        goals={goals}
        areas={areas}
        resources={resources}
        onSave={handleSaveProject}
        onCancel={handleCancelProjectEdit}
        onDelete={handleDeleteProjectClick}
        onProjectChange={setEditingProject}
      />

      {/* 프로젝트 삭제 확인 모달 - content-height */}
      <Sheet
        isOpen={projectDeleteConfirmOpen && !!projectToDelete}
        onClose={handleCancelProjectDelete}
        detent="content-height"
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="px-4 py-3">
              <h3 className="font-bold text-lg">프로젝트 삭제</h3>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <div className="px-4 py-6">
              <p className="mb-6">
                <strong>{projectToDelete?.title}</strong> 프로젝트를 삭제하시겠습니까?
                <br />
                <span className="text-sm text-base-content/60">
                  이 작업은 되돌릴 수 없습니다.
                </span>
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={handleCancelProjectDelete} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleConfirmProjectDelete} className="btn btn-error">
                  삭제
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
