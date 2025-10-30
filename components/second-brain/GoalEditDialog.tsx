'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { Goal, AreaResource as Area, AreaResource as Resource, Project } from '@/types/second-brain';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { useModalStore } from '@/state/stores/modalStore';

interface GoalEditDialogProps {
  open: boolean;
  editingGoal: (Goal & { isNew?: boolean; paraSelection?: string }) | null;
  areas: Area[];
  resources: Resource[];
  projects: Project[];
  onSave: (goalData: Partial<Goal>, area_id?: string, resource_id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (goal: Goal) => void;
  onGoalChange: (goal: (Goal & { isNew?: boolean; paraSelection?: string })) => void;
  onAddProject?: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  isCreatingProject?: boolean;
}

export default function GoalEditDialog({
  open,
  editingGoal,
  areas,
  resources,
  projects,
  onSave,
  onCancel,
  onDelete,
  onGoalChange,
  onAddProject,
  onEditProject,
  onDeleteProject,
  isCreatingProject = false,
}: GoalEditDialogProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 아이콘 브라우저 모달
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 아이콘 변경
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingGoal) {
      onGoalChange({ ...editingGoal, icon: iconKey });
    }
  };

  // 색상 변경
  const handleColorChange = (colorId: string) => {
    if (editingGoal) {
      const color = getColorById(colorId).hex;
      onGoalChange({ ...editingGoal, color });
    }
  };

  // 저장
  const handleSave = async () => {
    if (!editingGoal || !editingGoal.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

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

    await onSave(editingGoal, area_id, resource_id);
  };

  // 현재 편집 중인 목표에 연결된 프로젝트 필터링
  const filteredProjects = editingGoal && !editingGoal.isNew
    ? projects.filter((project) => project.goal_id === editingGoal.id)
    : [];

  if (!open || !editingGoal) return null;

  return (
    <>
      <dialog open className="modal modal-open">
        <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (취소-제목-삭제-저장) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
            <button onClick={onCancel} className="btn btn-primary btn-sm rounded-full">
              취소
            </button>
            <h3 className="text-lg font-semibold">
              {editingGoal.isNew ? '새 목표 추가' : '목표 편집'}
            </h3>
            <div className="flex gap-2">
              {!editingGoal.isNew && (
                <button
                  onClick={() => {
                    onCancel();
                    onDelete(editingGoal);
                  }}
                  className="btn btn-ghost btn-sm text-error rounded-full"
                >
                  삭제
                </button>
              )}
              <button onClick={handleSave} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
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
                    const IconComponent = getUnifiedIcon(editingGoal.icon as UnifiedIconKey);
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
                  onChange={(e) => onGoalChange({ ...editingGoal, title: e.target.value })}
                  className="input input-bordered"
                  placeholder="예: 건강한 생활 습관 형성"
                />
              </div>

              {/* 설명 - 현재 DB 스키마에 description 필드 없음. 추후 추가 예정 */}
              {/* <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">설명 (선택)</span>
                </label>
                <textarea
                  value={editingGoal.description || ''}
                  onChange={(e) => onGoalChange({ ...editingGoal, description: e.target.value })}
                  className="textarea textarea-bordered"
                  placeholder="목표에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div> */}

              {/* 상태 */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">상태</span>
                </label>
                <select
                  value={editingGoal.status}
                  onChange={(e) => onGoalChange({ ...editingGoal, status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'suspended' | 'archived' })}
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
                  value={editingGoal.paraSelection || ''}
                  onChange={(e) => onGoalChange({ ...editingGoal, paraSelection: e.target.value })}
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
                    onChange={(e) => onGoalChange({ ...editingGoal, start_date: e.target.value })}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">종료일 (선택)</span>
                  </label>
                  <input
                    type="date"
                    value={editingGoal.end_date || ''}
                    onChange={(e) => onGoalChange({ ...editingGoal, end_date: e.target.value })}
                    className="input input-bordered"
                  />
                </div>
              </div>

              {/* 기간 - DB 스키마에는 year_goal과 quarter_goal로 분리되어 있음 */}
              {/* timeframe 필드는 제거되고 아래 연간목표/분기목표 선택으로 대체 */}

              {/* 연간목표/분기목표 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">연간목표 (선택)</span>
                  </label>
                  <select
                    value={editingGoal.year_goal || new Date().getFullYear()}
                    onChange={(e) => onGoalChange({ ...editingGoal, year_goal: parseInt(e.target.value) })}
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
                    value={editingGoal.quarter_goal || 'Q1'}
                    onChange={(e) => onGoalChange({ ...editingGoal, quarter_goal: e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' })}
                    className="select select-bordered"
                  >
                    <option value="Q1">1분기 (1~3월)</option>
                    <option value="Q2">2분기 (4~6월)</option>
                    <option value="Q3">3분기 (7~9월)</option>
                    <option value="Q4">4분기 (10~12월)</option>
                  </select>
                </div>
              </div>

              {/* 프로젝트 영역 */}
              {!editingGoal.isNew && onAddProject && onEditProject && onDeleteProject && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">연결된 프로젝트</h2>
                      <button
                        onClick={onAddProject}
                        className="btn btn-ghost btn-sm"
                        disabled={isCreatingProject}
                      >
                        {isCreatingProject ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {isCreatingProject ? '생성 중...' : '추가'}
                      </button>
                    </div>

                    {filteredProjects.length === 0 ? (
                      <div className="text-center py-8 text-base-content/60">
                        연결된 프로젝트가 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredProjects.map((project) => {
                          const ProjectIconComponent = getUnifiedIcon(project.icon as UnifiedIconKey);
                          return (
                            <div
                              key={project.id}
                              onClick={() => onEditProject(project)}
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
                                  {project.status === 'in_progress' && '진행중'}
                                  {project.status === 'paused' && '중단'}
                                  {project.status === 'completed' && '완료'}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProject(project);
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
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onCancel} />
      </dialog>

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingGoal?.icon}
        selectedColor={editingGoal?.color}
        onColorSelect={handleColorChange}
      />
    </>
  );
}
