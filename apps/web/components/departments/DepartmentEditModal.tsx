'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Check,
  Trash2,
  Building2,
  Church,
  Users,
  Globe,
  Home,
  Folder,
  Star,
} from 'lucide-react';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useAuth } from '@/app/context/AuthContext';
import type { Department, DepartmentCategory, DepartmentInput } from '@/types/department';
import {
  DEPARTMENT_CATEGORY_LABELS,
  WEEKDAY_LABELS,
} from '@/types/department';

// 기본 색상 팔레트
const COLOR_PALETTE = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

// 카테고리 아이콘 매핑
const CATEGORY_ICONS: Record<DepartmentCategory, React.ReactNode> = {
  church: <Church className="w-5 h-5" />,
  company: <Building2 className="w-5 h-5" />,
  club: <Users className="w-5 h-5" />,
  community: <Globe className="w-5 h-5" />,
  family: <Home className="w-5 h-5" />,
  other: <Folder className="w-5 h-5" />,
};

// 기본 아이콘 목록 (이모지)
const ICON_LIST = [
  '📁', '🏢', '⛪', '🏠', '👥', '🌐', '💼', '🎯',
  '📚', '💡', '🚀', '⭐', '🎵', '🎨', '🏃', '🎮',
];

interface DepartmentEditModalProps {
  department?: Department;
  onClose: () => void;
}

/**
 * 부서 생성/편집 모달
 */
export default function DepartmentEditModal({
  department,
  onClose,
}: DepartmentEditModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    createDepartment,
    updateDepartment,
    deleteDepartment,
    fetchDepartments,
  } = useDepartmentStore();

  const isEditing = !!department;

  // 폼 상태
  const [name, setName] = useState(department?.name || '');
  const [description, setDescription] = useState(department?.description || '');
  const [color, setColor] = useState(department?.color || COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(department?.icon || '');
  const [category, setCategory] = useState<DepartmentCategory>(
    department?.category || 'other'
  );
  const [isFavorite, setIsFavorite] = useState(department?.is_favorite || false);
  const [meetingDay, setMeetingDay] = useState<number | null>(
    department?.meeting_day ?? null
  );
  const [meetingTime, setMeetingTime] = useState(department?.meeting_time || '');
  const [meetingLocation, setMeetingLocation] = useState(
    department?.meeting_location || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 저장
  const handleSave = async () => {
    if (!userId || !name.trim()) return;

    setIsLoading(true);
    try {
      const input: DepartmentInput = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon: icon || null,
        category,
        is_favorite: isFavorite,
        meeting_day: meetingDay,
        meeting_time: meetingTime || null,
        meeting_location: meetingLocation.trim() || null,
      };

      if (isEditing && department) {
        await updateDepartment(userId, department.id, input);
      } else {
        await createDepartment(userId, input);
      }
      await fetchDepartments(userId);
      onClose();
    } catch (error) {
      console.error('부서 저장 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!userId || !department) return;

    setIsLoading(true);
    try {
      await deleteDepartment(userId, department.id);
      await fetchDepartments(userId);
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('부서 삭제 오류:', error);
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
        className="modal-box max-w-md max-h-[90vh] overflow-y-auto !pt-0"
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 pt-[30px] sm:pt-4 pb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm rounded-full"
          >
            취소
          </button>
          <h3 className="text-lg font-bold">
            {isEditing ? '부서 편집' : '새 부서'}
          </h3>
          <div className="flex gap-1">
            {isEditing && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost btn-sm btn-circle text-error"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || isLoading}
              className="btn btn-primary btn-sm rounded-full"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>

        {/* 아이콘 + 이름 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl relative flex-shrink-0"
            style={{
              backgroundColor: color ? `${color}20` : '#f3f4f6',
            }}
          >
            {icon || CATEGORY_ICONS[category]}
            <div
              className="w-5 h-5 rounded-full absolute -bottom-1 -left-1 border-2 border-base-100"
              style={{ backgroundColor: color }}
            />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="부서 이름"
            className="input input-bordered flex-1 text-lg font-semibold"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`btn btn-ghost btn-circle ${
              isFavorite ? 'text-warning' : 'text-base-content/30'
            }`}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* 설명 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">설명 (선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="부서에 대한 간단한 설명..."
            className="textarea textarea-bordered h-20"
          />
        </div>

        {/* 카테고리 선택 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">분류</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DEPARTMENT_CATEGORY_LABELS) as DepartmentCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`btn btn-sm gap-1 ${
                    category === cat ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  <span className="text-xs">{DEPARTMENT_CATEGORY_LABELS[cat]}</span>
                </button>
              )
            )}
          </div>
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
        <div className="form-control mb-4">
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

        {/* 정기 모임 정보 */}
        <div className="border-t border-base-200 pt-4 mb-4">
          <label className="label">
            <span className="label-text font-medium">정기 모임 (선택)</span>
          </label>

          {/* 요일 선택 */}
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              type="button"
              onClick={() => setMeetingDay(null)}
              className={`btn btn-xs ${
                meetingDay === null ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              없음
            </button>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setMeetingDay(day)}
                className={`btn btn-xs ${
                  meetingDay === day ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {WEEKDAY_LABELS[day].charAt(0)}
              </button>
            ))}
          </div>

          {/* 시간 */}
          <div className="flex gap-2 mb-3">
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="input input-bordered input-sm flex-1"
              placeholder="시간"
            />
          </div>

          {/* 장소 */}
          <input
            type="text"
            value={meetingLocation}
            onChange={(e) => setMeetingLocation(e.target.value)}
            placeholder="모임 장소"
            className="input input-bordered input-sm w-full"
          />
        </div>
      </motion.div>

      {/* 배경 클릭으로 닫기 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-base-100 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-lg font-bold mb-2">부서 삭제</h3>
            <p className="text-base-content/70 mb-4">
              &ldquo;{department?.name}&rdquo;을(를) 삭제하시겠습니까?
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              연결된 멤버와 소식은 유지되며, 부서 정보만 삭제됩니다.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost rounded-full"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="btn btn-error rounded-full"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </dialog>
  );
}
