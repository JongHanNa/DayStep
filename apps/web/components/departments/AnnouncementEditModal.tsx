'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Check,
  Trash2,
  Pin,
  Megaphone,
  Calendar,
  Newspaper,
  Heart,
} from 'lucide-react';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useAuth } from '@/app/context/AuthContext';
import type {
  DepartmentAnnouncement,
  DepartmentAnnouncementInput,
  AnnouncementType,
} from '@/types/department';
import { ANNOUNCEMENT_TYPE_LABELS } from '@/types/department';

// 소식 타입 아이콘 매핑
const TYPE_ICONS: Record<AnnouncementType, React.ReactNode> = {
  notice: <Megaphone className="w-5 h-5" />,
  event: <Calendar className="w-5 h-5" />,
  news: <Newspaper className="w-5 h-5" />,
  prayer: <Heart className="w-5 h-5" />,
};

interface AnnouncementEditModalProps {
  departmentId: string;
  announcement?: DepartmentAnnouncement;
  onClose: () => void;
}

/**
 * 소식 생성/편집 모달
 */
export default function AnnouncementEditModal({
  departmentId,
  announcement,
  onClose,
}: AnnouncementEditModalProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    fetchAnnouncements,
  } = useDepartmentStore();

  const isEditing = !!announcement;

  // 폼 상태
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>(
    announcement?.announcement_type || 'notice'
  );
  const [isPinned, setIsPinned] = useState(announcement?.is_pinned || false);
  const [eventDate, setEventDate] = useState(announcement?.event_date || '');
  const [eventTime, setEventTime] = useState(announcement?.event_time || '');
  const [eventLocation, setEventLocation] = useState(
    announcement?.event_location || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 저장
  const handleSave = async () => {
    if (!userId || !title.trim()) return;

    setIsLoading(true);
    try {
      const input: DepartmentAnnouncementInput = {
        department_id: departmentId,
        title: title.trim(),
        content: content.trim() || null,
        announcement_type: announcementType,
        is_pinned: isPinned,
        event_date: announcementType === 'event' && eventDate ? eventDate : null,
        event_time: announcementType === 'event' && eventTime ? eventTime : null,
        event_location:
          announcementType === 'event' && eventLocation.trim()
            ? eventLocation.trim()
            : null,
      };

      if (isEditing && announcement) {
        await updateAnnouncement(userId, announcement.id, input);
      } else {
        await createAnnouncement(userId, input);
      }
      await fetchAnnouncements(userId, departmentId);
      onClose();
    } catch (error) {
      console.error('소식 저장 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!userId || !announcement) return;

    setIsLoading(true);
    try {
      await deleteAnnouncement(userId, announcement.id);
      await fetchAnnouncements(userId, departmentId);
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('소식 삭제 오류:', error);
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
            {isEditing ? '소식 편집' : '새 소식'}
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
              disabled={!title.trim() || isLoading}
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

        {/* 제목 + 고정 */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="소식 제목"
            className="input input-bordered flex-1 text-lg font-semibold"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`btn btn-ghost btn-circle ${
              isPinned ? 'text-primary' : 'text-base-content/30'
            }`}
            title={isPinned ? '고정 해제' : '상단 고정'}
          >
            <Pin className={`w-5 h-5 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* 소식 타입 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">분류</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(ANNOUNCEMENT_TYPE_LABELS) as AnnouncementType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAnnouncementType(type)}
                  className={`btn btn-sm flex-col h-auto py-2 ${
                    announcementType === type ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {TYPE_ICONS[type]}
                  <span className="text-xs mt-1">
                    {ANNOUNCEMENT_TYPE_LABELS[type]}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* 내용 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">내용</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="소식 내용을 입력하세요..."
            className="textarea textarea-bordered h-32"
          />
        </div>

        {/* 행사 정보 (event 타입인 경우) */}
        {announcementType === 'event' && (
          <div className="border-t border-base-200 pt-4 space-y-3">
            <label className="label">
              <span className="label-text font-medium">행사 정보</span>
            </label>

            {/* 날짜 */}
            <div className="form-control">
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            {/* 시간 */}
            <div className="form-control">
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            {/* 장소 */}
            <div className="form-control">
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="행사 장소"
                className="input input-bordered input-sm"
              />
            </div>
          </div>
        )}
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
            <h3 className="text-lg font-bold mb-2">소식 삭제</h3>
            <p className="text-base-content/70 mb-6">
              이 소식을 삭제하시겠습니까?
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
