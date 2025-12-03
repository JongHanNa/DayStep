'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Tag, Palette, Activity, Layers, Calendar, Target, FolderKanban } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { cn } from '@/lib/utils';

import 'swiper/css';
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
        <div className={`modal-box bg-base-200 w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-200 z-10`}>
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

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {editingGoal && (
                <>
                  {/* 아이콘 및 제목 - 통합 패턴 적용 */}
                  <div className="my-4">
                    {/* 섹션 제목 */}
                    <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                      <Tag className="h-5 w-5" style={{ color: editingGoal.color }} />
                      목표 아이콘 및 제목
                    </label>

                    {/* 아이콘 + 제목 입력 */}
                    <div className="rounded-lg bg-base-200">
                      <div className="flex items-center gap-3 pl-2 pr-16 pt-2 pb-2">
                        {/* 아이콘 버튼 */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIconBrowserOpen(true)}
                            className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group bg-base-100"
                            title="아이콘 변경하기"
                          >
                            {(() => {
                              const IconComponent = getUnifiedIcon(editingGoal.icon as UnifiedIconKey);
                              return <IconComponent
                                className="group-hover:scale-110 transition-transform"
                                style={{ color: editingGoal.color }}
                                size={24}
                              />;
                            })()}
                          </button>

                          {/* 색상 인디케이터 */}
                          <div
                            className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                            style={{
                              backgroundColor: editingGoal.color,
                              border: '2px solid white'
                            }}
                          >
                            <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        </div>

                        {/* 제목 입력 - TodoFormFields와 동일한 스타일 */}
                        <div className="flex-1">
                          <div className="input-scale-wrapper" style={{
                            transform: 'scale(1.6)',
                            transformOrigin: 'left bottom',
                            WebkitTransform: 'scale(1.6)',
                            WebkitTransformOrigin: 'left bottom',
                            width: '80%',
                            height: '44px',
                            position: 'relative'
                          }}>
                            <input
                              type="text"
                              value={editingGoal.title}
                              onChange={(e) => onGoalChange({ ...editingGoal, title: e.target.value })}
                              placeholder="목표 제목을 입력하세요"
                              className="bg-base-200 border-0 border-b-2 border-base-300 rounded-none focus:outline-none transition-none text-base-content"
                              style={{
                                fontSize: '20px',
                                outline: 'none',
                                boxShadow: 'none',
                                fontWeight: '600',
                                height: '44px',
                                lineHeight: '0.9',
                                paddingTop: '16px',
                                paddingBottom: '0px',
                                width: '100%',
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 상태 */}
                  <div className="my-4">
                    {/* 섹션 제목 */}
                    <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                      <Activity className="h-5 w-5" style={{ color: editingGoal.color }} />
                      상태
                    </label>

                    {/* 셀렉트 박스 */}
                    <div className="py-3 px-1 rounded-lg bg-base-200">
                      <select
                        value={editingGoal.status}
                        onChange={(e) => onGoalChange({ ...editingGoal, status: e.target.value as 'not_started' | 'in_progress' | 'paused' | 'completed' })}
                        className="select select-bordered w-full bg-base-100"
                      >
                        <option value="not_started">시작 안함</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                        <option value="paused">중단</option>
                      </select>
                    </div>
                  </div>

                  {/* 영역/자원 */}
                  <div className="my-4">
                    {/* 섹션 제목 */}
                    <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                      <Layers className="h-5 w-5" style={{ color: editingGoal.color }} />
                      영역/자원
                    </label>

                    {/* 셀렉트 박스 */}
                    <div className="py-3 px-1 rounded-lg bg-base-200">
                      <select
                        value={editingGoal.paraSelection}
                        onChange={(e) => onGoalChange({ ...editingGoal, paraSelection: e.target.value })}
                        className="select select-bordered w-full bg-base-100"
                      >
                        <option value="">선택 안 함</option>
                        <optgroup label="영역">
                          {areas.map((area) => (
                            <option key={area.id} value={`area-${area.id}`}>
                              {area.title}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="자원">
                          {resources.map((resource) => (
                            <option key={resource.id} value={`resource-${resource.id}`}>
                              {resource.title}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* 시작일/종료일 */}
                  <div className="my-4">
                    {/* 섹션 제목 */}
                    <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                      <Calendar className="h-5 w-5" style={{ color: editingGoal.color }} />
                      시작일/종료일
                    </label>

                    {/* 날짜 입력 그리드 */}
                    <div className="py-3 px-1 rounded-lg bg-base-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">시작일</span>
                          </label>
                          <input
                            type="date"
                            value={editingGoal.start_date || ''}
                            onChange={(e) => onGoalChange({ ...editingGoal, start_date: e.target.value })}
                            className="input input-bordered w-full bg-base-100"
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">종료일</span>
                          </label>
                          <input
                            type="date"
                            value={editingGoal.end_date || ''}
                            onChange={(e) => onGoalChange({ ...editingGoal, end_date: e.target.value })}
                            className="input input-bordered w-full bg-base-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 연간목표/분기목표 */}
                  <div className="my-4">
                    {/* 섹션 제목 */}
                    <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                      <Target className="h-5 w-5" style={{ color: editingGoal.color }} />
                      연간목표/분기목표
                    </label>

                    {/* 입력 그리드 */}
                    <div className="py-3 px-1 rounded-lg bg-base-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">연간목표</span>
                          </label>
                          <select
                            value={editingGoal.year_goal ?? ''}
                            onChange={(e) => onGoalChange({ ...editingGoal, year_goal: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="select select-bordered w-full bg-base-100"
                          >
                            <option value="">선택 안 함</option>
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
                            <span className="label-text">분기목표</span>
                          </label>
                          <select
                            value={editingGoal.quarter_goal ?? ''}
                            onChange={(e) => onGoalChange({ ...editingGoal, quarter_goal: e.target.value ? e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' : undefined })}
                            className="select select-bordered w-full bg-base-100"
                          >
                            <option value="">선택 안 함</option>
                            <option value="Q1">1분기 (1~3월)</option>
                            <option value="Q2">2분기 (4~6월)</option>
                            <option value="Q3">3분기 (7~9월)</option>
                            <option value="Q4">4분기 (10~12월)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 프로젝트 영역 - 상태별 슬라이드 그룹화 */}
                  {!editingGoal.isNew && onAddProject && onEditProject && onDeleteProject && (
                    <ProjectStatusSlider
                      projects={filteredProjects}
                      isCreatingProject={isCreatingProject}
                      onAddProject={onAddProject}
                      onEditProject={onEditProject}
                      onDeleteProject={onDeleteProject}
                      goalColor={editingGoal.color}
                    />
                  )}
                </>
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

// 상태 그룹 정의 (진행중 우선 순서)
const STATUS_GROUPS = [
  { key: 'in_progress', label: '진행중', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { key: 'not_started', label: '시작 안함', color: 'bg-gray-400', textColor: 'text-gray-600' },
  { key: 'paused', label: '중단', color: 'bg-orange-500', textColor: 'text-orange-600' },
  { key: 'completed', label: '완료', color: 'bg-green-500', textColor: 'text-green-600' },
] as const;

interface ProjectStatusSliderProps {
  projects: Project[];
  isCreatingProject: boolean;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  goalColor: string;
}

function ProjectStatusSlider({
  projects,
  isCreatingProject,
  onAddProject,
  onEditProject,
  onDeleteProject,
  goalColor,
}: ProjectStatusSliderProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);

  // 상태별 프로젝트 그룹화
  const groupedProjects = useMemo(() => {
    return STATUS_GROUPS.map(group => ({
      ...group,
      projects: projects.filter(p => p.status === group.key)
    }));
  }, [projects]);

  return (
    <div className="my-4">
      {/* 섹션 제목 */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-3 text-lg font-semibold" style={{ color: '#666666' }}>
          <FolderKanban className="h-5 w-5" style={{ color: goalColor }} />
          연결된 프로젝트
        </label>
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

      {/* 상단 탭 네비게이션 */}
      <div className="flex gap-2 py-2 overflow-x-auto scrollbar-hide">
        {groupedProjects.map((group, index) => (
          <button
            key={group.key}
            onClick={() => {
              setActiveGroupIndex(index);
              swiperRef.current?.slideTo(index);
            }}
            aria-selected={activeGroupIndex === index}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              activeGroupIndex === index
                ? "bg-primary text-primary-content"
                : "bg-base-200 text-base-content/60 hover:text-base-content hover:bg-base-300"
            )}
          >
            {group.label}
            <span className="ml-1 opacity-70">({group.projects.length})</span>
          </button>
        ))}
      </div>

      {/* 슬라이드 컨테이너 - Swiper */}
      <div className="rounded-lg bg-base-200 mt-2 py-3">
        <Swiper
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          slidesPerView={1.15}
          centeredSlides={true}
          spaceBetween={12}
          onSlideChange={(swiper) => setActiveGroupIndex(swiper.activeIndex)}
          initialSlide={activeGroupIndex}
          className="!overflow-visible"
        >
          {groupedProjects.map((group) => (
            <SwiperSlide key={group.key}>
              <div className="p-3 min-h-[120px] bg-base-100 rounded-lg">
                {group.projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-base-content/50">
                    <span className="text-sm">{group.label} 프로젝트가 없습니다</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.projects.map((project) => {
                      const ProjectIconComponent = getUnifiedIcon(project.icon as UnifiedIconKey);
                      return (
                        <div
                          key={project.id}
                          onClick={() => onEditProject(project)}
                          className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          >
                            <ProjectIconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{project.title}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(project);
                            }}
                            className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                            aria-label="프로젝트 연결 해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 슬라이드 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {groupedProjects.map((group, index) => (
          <button
            key={group.key}
            onClick={() => {
              setActiveGroupIndex(index);
              swiperRef.current?.slideTo(index);
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              activeGroupIndex === index
                ? "bg-primary w-4"
                : "bg-base-300 hover:bg-base-content/30"
            )}
            aria-label={`${group.label} 그룹으로 이동`}
          />
        ))}
      </div>
    </div>
  );
}
