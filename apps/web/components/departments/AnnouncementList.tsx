'use client';

import { motion } from 'framer-motion';
import {
  Megaphone,
  Calendar,
  Newspaper,
  Heart,
  Pin,
  MapPin,
  Clock,
} from 'lucide-react';
import type { DepartmentAnnouncement, AnnouncementType } from '@/types/department';
import { ANNOUNCEMENT_TYPE_LABELS } from '@/types/department';

// 소식 타입 아이콘 매핑
const TYPE_ICONS: Record<AnnouncementType, React.ReactNode> = {
  notice: <Megaphone className="w-4 h-4" />,
  event: <Calendar className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  prayer: <Heart className="w-4 h-4" />,
};

// 소식 타입 색상 매핑
const TYPE_COLORS: Record<AnnouncementType, string> = {
  notice: 'badge-primary',
  event: 'badge-success',
  news: 'badge-info',
  prayer: 'badge-secondary',
};

interface AnnouncementListProps {
  announcements: DepartmentAnnouncement[];
  onEdit?: (announcement: DepartmentAnnouncement) => void;
}

/**
 * 소식 목록 컴포넌트
 */
export default function AnnouncementList({
  announcements,
  onEdit,
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/50">
        <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>등록된 소식이 없습니다</p>
      </div>
    );
  }

  // 고정된 소식 먼저, 나머지는 최신순
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-3">
      {sortedAnnouncements.map((announcement, index) => (
        <motion.div
          key={announcement.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onEdit?.(announcement)}
          className={`p-4 rounded-xl cursor-pointer transition-colors ${
            announcement.is_pinned
              ? 'bg-primary/10 border border-primary/30'
              : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          {/* 헤더 */}
          <div className="flex items-start gap-3 mb-2">
            <div
              className={`p-2 rounded-lg ${
                announcement.is_pinned ? 'bg-primary/20' : 'bg-base-300'
              }`}
            >
              {TYPE_ICONS[announcement.announcement_type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {announcement.is_pinned && (
                  <Pin className="w-3 h-3 text-primary fill-current" />
                )}
                <h4 className="font-semibold truncate">{announcement.title}</h4>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`badge badge-xs ${
                    TYPE_COLORS[announcement.announcement_type]
                  }`}
                >
                  {ANNOUNCEMENT_TYPE_LABELS[announcement.announcement_type]}
                </span>
                <span className="text-xs text-base-content/50">
                  {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>

          {/* 내용 */}
          {announcement.content && (
            <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
              {announcement.content}
            </p>
          )}

          {/* 행사 정보 (event 타입인 경우) */}
          {announcement.announcement_type === 'event' &&
            (announcement.event_date ||
              announcement.event_time ||
              announcement.event_location) && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-base-300 text-xs text-base-content/60">
                {announcement.event_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(announcement.event_date).toLocaleDateString(
                        'ko-KR',
                        {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        }
                      )}
                    </span>
                  </div>
                )}
                {announcement.event_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{announcement.event_time.slice(0, 5)}</span>
                  </div>
                )}
                {announcement.event_location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">
                      {announcement.event_location}
                    </span>
                  </div>
                )}
              </div>
            )}
        </motion.div>
      ))}
    </div>
  );
}
