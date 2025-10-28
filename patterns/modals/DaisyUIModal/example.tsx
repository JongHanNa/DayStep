/**
 * DaisyUI Dialog Modal Pattern Example
 *
 * @status 신규 모달에 권장되는 패턴입니다.
 * @usage 새로운 모달 생성 시 이 패턴을 사용하세요.
 * @migration 기존 react-modal-sheet는 점진적으로 이 패턴으로 마이그레이션 중입니다.
 *
 * @see CLAUDE.local.md - 모달 패턴 섹션
 */

'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DaisyUIModalProps {
  open: boolean;
  title: string;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

/**
 * DaisyUI의 <dialog> 컴포넌트를 사용한 모달
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <DaisyUIModal
 *   open={isOpen}
 *   title="프로젝트 편집"
 *   onSave={() => { console.log('저장'); setIsOpen(false); }}
 *   onCancel={() => setIsOpen(false)}
 *   onDelete={() => console.log('삭제')}
 * >
 *   <div className="form-control mb-4">
 *     <label className="label">제목</label>
 *     <input type="text" className="input input-bordered" />
 *   </div>
 * </DaisyUIModal>
 * ```
 */
export default function DaisyUIModal({
  open,
  title,
  onSave,
  onCancel,
  onDelete,
  children,
}: DaisyUIModalProps) {
  if (!open) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box w-full max-w-7xl px-3">
        {/* 헤더 (취소-제목-삭제-저장) */}
        <div className="flex items-center justify-between pt-[30px] mb-6 pb-4 border-b border-base-300">
          <button onClick={onCancel} className="btn btn-ghost btn-sm">
            취소
          </button>

          <h3 className="font-bold text-lg">{title}</h3>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onCancel();
                  onDelete();
                }}
                className="btn btn-ghost btn-sm text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onSave} className="btn btn-primary btn-sm">
              저장
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* 백드롭 */}
      <div className="modal-backdrop" onClick={onCancel} />
    </dialog>
  );
}

// ========== 사용 예시 컴포넌트 ==========

export function DaisyUIModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('새 프로젝트');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    console.log('저장:', { title, description });
    setIsOpen(false);
  };

  const handleDelete = () => {
    console.log('삭제');
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
      >
        모달 열기
      </button>

      <DaisyUIModal
        open={isOpen}
        title="프로젝트 편집"
        onSave={handleSave}
        onCancel={() => setIsOpen(false)}
        onDelete={handleDelete}
      >
        {/* 제목 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">제목</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered"
            placeholder="프로젝트 제목"
          />
        </div>

        {/* 설명 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">설명</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea textarea-bordered h-20"
            placeholder="프로젝트 설명"
          />
        </div>

        {/* 상태 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">진행상황</span>
          </label>
          <select className="select select-bordered">
            <option value="not_started">시작 안함</option>
            <option value="active">진행중</option>
            <option value="on_hold">중단</option>
            <option value="completed">완료</option>
          </select>
        </div>
      </DaisyUIModal>
    </div>
  );
}
