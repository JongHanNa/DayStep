'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, FolderKanban } from 'lucide-react';
import { useProjectStore } from '@/state/stores/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import type { Project } from '@/types';

// 기본 색상 팔레트
const COLOR_PALETTE = [
  '#A8DADC', // 민트
  '#F4A261', // 오렌지
  '#E76F51', // 코랄
  '#2A9D8F', // 틸
  '#E9C46A', // 골드
  '#457B9D', // 블루
  '#8338EC', // 퍼플
  '#FF6B6B', // 레드
  '#4ECDC4', // 시안
  '#95E1D3', // 라이트그린
];

// 기본 아이콘 목록 (이모지)
const ICON_LIST = [
  '📁', '🎯', '💼', '🎨', '📚', '💡', '🚀', '⭐',
  '🏠', '💪', '🎵', '✈️', '🌱', '🔧', '📱', '🎮',
];

interface ProjectEditModalProps {
  project?: Project;
  onClose: () => void;
}

/**
 * 프로젝트 생성/편집 모달
 */
export default function ProjectEditModal({ project, onClose }: ProjectEditModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { createProject, updateProject } = useProjectStore();

  const isEditing = !!project;

  // 폼 상태
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(project?.icon || '');
  const [isLoading, setIsLoading] = useState(false);

  // 저장
  const handleSave = async () => {
    if (!userId || !title.trim()) return;

    setIsLoading(true);
    try {
      if (isEditing && project) {
        await updateProject(userId, {
          id: project.id,
          title: title.trim(),
          description: description.trim() || null,
          color,
          icon: icon || null,
        });
      } else {
        await createProject(userId, {
          title: title.trim(),
          description: description.trim() || null,
          color,
          icon: icon || null,
          status: 'active',
        });
      }
      onClose();
    } catch (error) {
      console.error('프로젝트 저장 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog open className="modal z-[110]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-box max-w-md"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">
            {isEditing ? '프로젝트 편집' : '새 프로젝트'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 아이콘 + 제목 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl relative flex-shrink-0"
            style={{
              backgroundColor: color ? `${color}20` : '#f3f4f6',
            }}
          >
            {icon || <FolderKanban className="w-6 h-6" style={{ color }} />}
            <div
              className="w-5 h-5 rounded-full absolute -bottom-1 -left-1 border-2 border-base-100"
              style={{ backgroundColor: color }}
            />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="프로젝트 이름"
            className="input input-bordered flex-1 text-lg font-semibold"
            autoFocus
          />
        </div>

        {/* 설명 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">설명 (선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="프로젝트에 대한 간단한 설명..."
            className="textarea textarea-bordered h-20"
          />
        </div>

        {/* 색상 선택 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">색상</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* 아이콘 선택 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-medium">아이콘 (선택)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIcon('')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center bg-base-200 ${
                !icon ? 'ring-2 ring-primary' : ''
              }`}
            >
              <X className="w-4 h-4 text-base-content/40" />
            </button>
            {ICON_LIST.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-base-200 ${
                  icon === i ? 'ring-2 ring-primary' : ''
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="btn btn-ghost flex-1 rounded-full"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            className="btn btn-primary flex-1 rounded-full"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditing ? '저장' : '만들기'}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 배경 클릭으로 닫기 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
