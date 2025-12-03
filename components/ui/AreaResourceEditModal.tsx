'use client';

import { useState } from 'react';
import { Tag, Palette, Activity } from 'lucide-react';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import CollapsibleGoalSection from '@/components/second-brain/shared/CollapsibleGoalSection';
import CollapsibleProjectSection from '@/components/second-brain/shared/CollapsibleProjectSection';
import CollapsibleNoteSection from '@/components/second-brain/shared/CollapsibleNoteSection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import type { SecondBrainItemType } from '@/types/settings';
import type { Area, Resource, Goal, Project, Note } from '@/types/second-brain';

interface AreaResourceEditModalProps {
  open: boolean;
  editingItem: (Area | Resource) & { isNew?: boolean };
  itemType: SecondBrainItemType;
  pageType: 'area' | 'resource';
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onItemChange: (item: (Area | Resource) & { isNew?: boolean }) => void;
  onItemTypeChange: (type: SecondBrainItemType) => void;
  // 목표, 프로젝트, 노트 관련 props
  goals?: Goal[];
  projects?: Project[];
  notes?: Note[];
  linkedGoalIds?: string[];
  linkedProjectIds?: string[];
  linkedNoteIds?: string[];
  onLinkedGoalsChange?: (ids: string[]) => void;
  onLinkedProjectsChange?: (ids: string[]) => void;
  onLinkedNotesChange?: (ids: string[]) => void;
  onGoalClick?: (goal: Goal) => void;
  onProjectClick?: (project: Project) => void;
  onNoteClick?: (note: Note) => void;
  onCreateGoal?: (title: string) => Promise<Goal>;
  onCreateProject?: (title: string) => Promise<Project>;
  onCreateNote?: (title: string) => Promise<Note>;
  onGoalImmediateSave?: (goalIds: string[]) => Promise<void>;
  onProjectImmediateSave?: (projectIds: string[]) => Promise<void>;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
}

export default function AreaResourceEditModal({
  open,
  editingItem,
  itemType,
  pageType,
  onCancel,
  onSave,
  onDelete,
  onItemChange,
  onItemTypeChange,
  // 목표, 프로젝트, 노트 관련 props
  goals = [],
  projects = [],
  notes = [],
  linkedGoalIds = [],
  linkedProjectIds = [],
  linkedNoteIds = [],
  onLinkedGoalsChange,
  onLinkedProjectsChange,
  onLinkedNotesChange,
  onGoalClick,
  onProjectClick,
  onNoteClick,
  onCreateGoal,
  onCreateProject,
  onCreateNote,
  onGoalImmediateSave,
  onProjectImmediateSave,
  onNoteImmediateSave,
}: AreaResourceEditModalProps) {
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    onItemChange({ ...editingItem, icon: iconKey });
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    onItemChange({ ...editingItem, color });
  };

  // 헤더 텍스트 결정
  const getHeaderText = () => {
    if (editingItem.isNew) {
      return pageType === 'area' ? '새 책임 추가' : '새 자원 추가';
    }
    return '책임/자원 편집';
  };

  // 제목 플레이스홀더 결정
  const getTitlePlaceholder = () => {
    return pageType === 'area' ? '책임 제목을 입력하세요' : '자원 제목을 입력하세요';
  };

  // 섹션 제목 결정
  const getSectionTitle = () => {
    return '아이콘 및 제목';
  };

  if (!open) return null;

  return (
    <>
      <dialog open className="modal modal-open">
        <div className={`modal-box bg-base-200 w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-200 z-10`}>
            <button onClick={onCancel} className="btn btn-primary btn-sm rounded-full">
              취소
            </button>
            <h3 className="font-bold text-lg">
              {getHeaderText()}
            </h3>
            <div className="flex gap-2">
              {!editingItem.isNew && (
                <button
                  onClick={onDelete}
                  className="btn btn-ghost btn-sm text-error rounded-full"
                >
                  삭제
                </button>
              )}
              <button onClick={onSave} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* 아이콘 및 제목 - 통합 패턴 적용 */}
              <div className="my-4">
                {/* 섹션 제목 */}
                <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                  <Tag className="h-5 w-5" style={{ color: editingItem.color }} />
                  {getSectionTitle()}
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
                          const IconComponent = getUnifiedIcon(editingItem.icon as UnifiedIconKey);
                          return <IconComponent
                            className="group-hover:scale-110 transition-transform"
                            style={{ color: editingItem.color }}
                            size={24}
                          />;
                        })()}
                      </button>

                      {/* 색상 인디케이터 */}
                      <div
                        className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                        style={{
                          backgroundColor: editingItem.color,
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
                          value={editingItem.title}
                          onChange={(e) => onItemChange({ ...editingItem, title: e.target.value })}
                          placeholder={getTitlePlaceholder()}
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

              {/* 상태 선택 */}
              <div className="my-4">
                {/* 섹션 제목 */}
                <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                  <Activity className="h-5 w-5" style={{ color: editingItem.color }} />
                  상태
                </label>

                {/* 셀렉트 박스 */}
                <div className="py-3 px-1 rounded-lg bg-base-200">
                  <select
                    value={itemType}
                    onChange={(e) => onItemTypeChange(e.target.value as SecondBrainItemType)}
                    className="select select-bordered w-full bg-base-100"
                  >
                    <option value="area">책임 영역</option>
                    <option value="resource">관심 자원</option>
                    <option value="archive">아카이브</option>
                  </select>
                </div>
              </div>

              {/* 목표 섹션 */}
              {onLinkedGoalsChange && (
                <CollapsibleGoalSection
                  selectedGoalIds={linkedGoalIds}
                  allGoals={goals}
                  onChange={onLinkedGoalsChange}
                  onCreateGoal={onCreateGoal}
                  onGoalClick={onGoalClick}
                  areaResourceColor={editingItem.color}
                  areaResourceId={editingItem.id}
                  onImmediateSave={onGoalImmediateSave}
                />
              )}

              {/* 프로젝트 섹션 */}
              {onLinkedProjectsChange && (
                <CollapsibleProjectSection
                  selectedProjectIds={linkedProjectIds}
                  allProjects={projects}
                  onChange={onLinkedProjectsChange}
                  onCreateProject={onCreateProject}
                  onProjectClick={onProjectClick}
                  todoColor={editingItem.color}
                  onImmediateSave={onProjectImmediateSave}
                />
              )}

              {/* 노트 섹션 */}
              {onLinkedNotesChange && (
                <CollapsibleNoteSection
                  selectedNoteIds={linkedNoteIds}
                  allNotes={notes}
                  onChange={onLinkedNotesChange}
                  onCreateNote={onCreateNote}
                  onNoteClick={onNoteClick}
                  todoColor={editingItem.color}
                  onImmediateSave={onNoteImmediateSave}
                />
              )}

{/* 고정하기 섹션 - 숨김 처리
              <div className="my-4">
                <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                  <Pin className="h-5 w-5" style={{ color: editingItem.color }} />
                  고정하기
                </label>
                <div className="p-3 rounded-lg bg-base-100 border border-base-300">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editingItem as any).is_pinned || false}
                      onChange={(e) => onItemChange({ ...editingItem, is_pinned: e.target.checked } as any)}
                      className="checkbox checkbox-primary"
                    />
                    <span className="text-sm">상단에 고정</span>
                  </label>
                </div>
              </div>
              */}
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
        selectedIcon={editingItem?.icon}
        selectedColor={editingItem?.color}
        onColorSelect={handleColorChange}
      />
    </>
  );
}
