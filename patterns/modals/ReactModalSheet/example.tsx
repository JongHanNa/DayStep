/**
 * React Modal Sheet Pattern Example
 *
 * CLAUDE.md 권장 패턴 - 웹/모바일 양쪽 지원
 * @see /patterns/modals/ReactModalSheet/README.md
 *
 * 현재 사용 중:
 * - app/settings/second-brain/areas/page.tsx (영역 편집)
 * - app/settings/second-brain/projects/page.tsx (프로젝트 삭제 확인)
 */

'use client';

import { useState } from 'react';
import { Sheet } from 'react-modal-sheet';
import { createModalConfig } from '@/lib/modal-config';

// ========== 1. 전체 화면 편집 모달 ==========

interface EditModalProps {
  open: boolean;
  title: string;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

/**
 * 전체 화면 편집 모달 (FULLSCREEN)
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <ReactModalSheetEdit
 *   open={isOpen}
 *   title="프로젝트 편집"
 *   onSave={() => { console.log('저장'); setIsOpen(false); }}
 *   onCancel={() => setIsOpen(false)}
 * >
 *   <div className="form-control mb-4">
 *     <label className="label">제목</label>
 *     <input type="text" className="input input-bordered" />
 *   </div>
 * </ReactModalSheetEdit>
 * ```
 */
export function ReactModalSheetEdit({
  open,
  title,
  onSave,
  onCancel,
  children,
}: EditModalProps) {
  return (
    <Sheet
      isOpen={open}
      onClose={onCancel}
      {...createModalConfig('FULLSCREEN')}
    >
      <Sheet.Container className="bg-background">
        {/* 헤더: 취소-제목-저장 */}
        <Sheet.Header
          className="border-b border-border"
          style={{ backgroundColor: '#f8f8f8' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onCancel}
              className="btn btn-primary btn-sm px-4 py-2 rounded-full"
            >
              취소
            </button>
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onSave}
              className="btn btn-primary btn-sm px-4 py-2 rounded-full"
            >
              저장
            </button>
          </div>
        </Sheet.Header>

        {/* 콘텐츠 */}
        <Sheet.Content>
          <Sheet.Scroller
            draggableAt="top"
            style={{ overflowX: 'hidden', backgroundColor: 'white' }}
          >
            <div
              className="px-4 py-6"
              style={{ overflowX: 'hidden', touchAction: 'pan-y' }}
            >
              {children}
            </div>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}

// ========== 2. 작은 확인 모달 ==========

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

/**
 * 작은 확인 모달 (content-height)
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <ReactModalSheetConfirm
 *   open={isOpen}
 *   title="삭제 확인"
 *   message="정말 삭제하시겠습니까?"
 *   confirmText="삭제"
 *   onConfirm={() => { console.log('삭제'); setIsOpen(false); }}
 *   onCancel={() => setIsOpen(false)}
 *   variant="danger"
 * />
 * ```
 */
export function ReactModalSheetConfirm({
  open,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmModalProps) {
  return (
    <Sheet
      isOpen={open}
      onClose={onCancel}
      detent="content-height"
    >
      <Sheet.Container className="bg-background">
        {/* 헤더 */}
        <Sheet.Header
          className="border-b border-border"
          style={{ backgroundColor: '#f8f8f8' }}
        >
          <div className="px-4 py-3">
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
        </Sheet.Header>

        {/* 콘텐츠 */}
        <Sheet.Content>
          <div className="px-4 py-6">
            <p className="mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="btn btn-ghost">
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`btn ${variant === 'danger' ? 'btn-error' : 'btn-primary'}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}

// ========== 3. 사용 예시 컴포넌트 ==========

interface AreaItem {
  id: string;
  title: string;
  description: string;
}

export function ReactModalSheetExample() {
  // 편집 모달 상태
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AreaItem>({
    id: '1',
    title: '직장',
    description: '업무 프로젝트 및 커리어 개발',
  });

  // 삭제 확인 모달 상태
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSave = () => {
    console.log('저장:', editingItem);
    setEditOpen(false);
  };

  const handleDelete = () => {
    console.log('삭제:', editingItem.id);
    setDeleteOpen(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">React Modal Sheet 예시</h1>

      {/* 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="btn btn-primary"
        >
          편집 모달 열기
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="btn btn-error"
        >
          삭제 확인 모달 열기
        </button>
      </div>

      {/* 전체 화면 편집 모달 */}
      <ReactModalSheetEdit
        open={editOpen}
        title="영역 편집"
        onSave={handleSave}
        onCancel={() => setEditOpen(false)}
      >
        {/* 제목 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">제목</span>
          </label>
          <input
            type="text"
            value={editingItem.title}
            onChange={(e) =>
              setEditingItem({ ...editingItem, title: e.target.value })
            }
            className="input input-bordered"
            placeholder="예: 직장"
          />
        </div>

        {/* 설명 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">설명</span>
          </label>
          <textarea
            value={editingItem.description}
            onChange={(e) =>
              setEditingItem({ ...editingItem, description: e.target.value })
            }
            className="textarea textarea-bordered h-20"
            placeholder="예: 업무 프로젝트 및 커리어 개발"
          />
        </div>

        {/* 상태 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">상태</span>
          </label>
          <select className="select select-bordered">
            <option value="area">책임 영역</option>
            <option value="resource">관심 자원</option>
            <option value="archive">아카이브</option>
          </select>
        </div>
      </ReactModalSheetEdit>

      {/* 삭제 확인 모달 */}
      <ReactModalSheetConfirm
        open={deleteOpen}
        title="영역 삭제"
        message={`"${editingItem.title}" 영역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        variant="danger"
      />
    </div>
  );
}

// ========== 4. 고급 예시: 조건부 데이터 체크 ==========

export function ReactModalSheetAdvancedExample() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);

  const handleEdit = (area: AreaItem) => {
    setEditingArea(area);
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingArea || !editingArea.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    console.log('저장:', editingArea);
    setEditDialogOpen(false);
    setEditingArea(null);
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingArea(null);
  };

  return (
    <div className="p-4">
      <button
        onClick={() =>
          handleEdit({
            id: '1',
            title: '직장',
            description: '업무 프로젝트 및 커리어 개발',
          })
        }
        className="btn btn-primary"
      >
        영역 편집
      </button>

      {/* ✅ Good: 데이터 존재 시에만 모달 열기 */}
      <Sheet
        isOpen={editDialogOpen && !!editingArea}
        onClose={handleCancel}
        {...createModalConfig('FULLSCREEN')}
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header
            className="border-b border-border"
            style={{ backgroundColor: '#f8f8f8' }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={handleCancel}
                className="btn btn-primary btn-sm px-4 py-2 rounded-full"
              >
                취소
              </button>
              <h3 className="text-lg font-semibold">영역 편집</h3>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm px-4 py-2 rounded-full"
              >
                저장
              </button>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <Sheet.Scroller
              draggableAt="top"
              style={{ overflowX: 'hidden', backgroundColor: 'white' }}
            >
              <div
                className="px-4 py-6"
                style={{ overflowX: 'hidden', touchAction: 'pan-y' }}
              >
                {editingArea && (
                  <>
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">제목</span>
                      </label>
                      <input
                        type="text"
                        value={editingArea.title}
                        onChange={(e) =>
                          setEditingArea({ ...editingArea, title: e.target.value })
                        }
                        className="input input-bordered"
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">설명</span>
                      </label>
                      <textarea
                        value={editingArea.description}
                        onChange={(e) =>
                          setEditingArea({ ...editingArea, description: e.target.value })
                        }
                        className="textarea textarea-bordered h-20"
                      />
                    </div>
                  </>
                )}
              </div>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </div>
  );
}
