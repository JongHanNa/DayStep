'use client';

import { motion, PanInfo } from 'framer-motion';
import { Folder, Trash2 } from 'lucide-react';
import type { Project } from '@/types/second-brain';

interface ProjectInboxListProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;

  // 편집 모드 관련
  isEditMode: boolean;
  selectedIds: Set<string>;
  swipedItemId: string | null;
  onSelectionChange: (id: string, isChecked: boolean, shiftKey: boolean, index: number) => void;
  onSwipe: (itemId: string | null) => void;
  onDeleteClick: (e: React.MouseEvent, itemId: string) => void;
  dragStartX: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
}

export default function ProjectInboxList({
  projects,
  onProjectClick,
  isEditMode,
  selectedIds,
  swipedItemId,
  onSelectionChange,
  onSwipe,
  onDeleteClick,
  dragStartX,
  isDragging
}: ProjectInboxListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📂</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          프로젝트 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          시작 &gt; 프로젝트 페이지에서 새 프로젝트를 추가해보세요
        </p>
      </div>
    );
  }

  // 드래그 시작 핸들러
  const handleDragStart = () => (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    dragStartX.current = info.point.x;
    isDragging.current = true;
  };

  // 스와이프 핸들러 (카드 열기/닫기)
  const handleSwipe = (project: Project) => (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const dragDistance = Math.abs(info.point.x - dragStartX.current);

    if (dragDistance > 5) {
      // 5px 이상 드래그 → 실제 스와이프로 판단
      const threshold = -40; // 40px 이상 왼쪽으로 드래그 시 버튼 노출

      if (info.offset.x < threshold) {
        // 카드 열기 (휴지통 버튼 노출)
        onSwipe(project.id);
      } else {
        // 카드 닫기
        onSwipe(null);
      }
    } else {
      // 5px 미만 드래그 → 클릭으로 간주 (onClick에서 처리)
      isDragging.current = false;
    }
  };

  return (
    <div className="space-y-2">
      {projects.map((project, index) => (
        <div key={project.id} className="relative overflow-hidden rounded-lg">
          {/* 배경 레이어: 삭제 버튼 */}
          {!isEditMode && (
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-end bg-error"
              style={{ width: '85px' }}
            >
              <button
                onClick={(e) => onDeleteClick(e, project.id)}
                className="btn btn-circle btn-ghost mr-2"
                title="삭제"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* 카드 레이어 */}
          <motion.div
            className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full"
            style={{
              borderTopLeftRadius: '0.5rem',
              borderBottomLeftRadius: '0.5rem',
            }}
            // 일반 모드에서만 드래그 활성화
            drag={!isEditMode ? "x" : false}
            dragConstraints={{ left: -80, right: 0 }}
            dragElastic={0.2}
            onDragStart={!isEditMode ? handleDragStart() : undefined}
            onDragEnd={!isEditMode ? handleSwipe(project) : undefined}
            animate={{
              x: swipedItemId === project.id ? -80 : 0,
              borderTopRightRadius: swipedItemId === project.id ? 0 : '0.5rem',
              borderBottomRightRadius: swipedItemId === project.id ? 0 : '0.5rem',
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => {
              // 드래그 직후에는 클릭 무시
              if (isDragging.current) {
                isDragging.current = false;
                return;
              }

              if (isEditMode) {
                // 편집 모드: 체크박스 토글
                const newChecked = !selectedIds.has(project.id);
                onSelectionChange(project.id, newChecked, false, index);
              } else {
                // 일반 모드: 편집 모달 열기
                onProjectClick?.(project);
              }
            }}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* 편집 모드 체크박스 */}
                {isEditMode && (
                  <input
                    type="checkbox"
                    className="checkbox mt-0.5"
                    checked={selectedIds.has(project.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelectionChange(
                        project.id,
                        e.target.checked,
                        (e.nativeEvent as MouseEvent).shiftKey,
                        index
                      );
                    }}
                  />
                )}

                <Folder className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    종료일, 영역/자원, 할일을 설정하면 수집함에서 사라집니다
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
