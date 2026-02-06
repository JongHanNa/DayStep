'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Users,
  Calendar,
  Megaphone,
  MapPin,
  Clock,
  Church,
  Building2,
  Globe,
  Home,
  Folder,
} from 'lucide-react';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useAuth } from '@/app/context/AuthContext';
import type { Department, DepartmentCategory } from '@/types/department';
import {
  DEPARTMENT_CATEGORY_LABELS,
  WEEKDAY_SHORT_LABELS,
} from '@/types/department';

// 카테고리 아이콘 매핑
const CATEGORY_ICONS: Record<DepartmentCategory, React.ReactNode> = {
  church: <Church className="w-4 h-4" />,
  company: <Building2 className="w-4 h-4" />,
  club: <Users className="w-4 h-4" />,
  community: <Globe className="w-4 h-4" />,
  family: <Home className="w-4 h-4" />,
  other: <Folder className="w-4 h-4" />,
};

interface DepartmentCardProps {
  department: Department;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * 부서 카드 컴포넌트
 */
export default function DepartmentCard({
  department,
  onClick,
  compact = false,
}: DepartmentCardProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { toggleFavorite, fetchDepartmentStats, departmentStats } =
    useDepartmentStore();

  const stats = departmentStats.get(department.id);

  // 통계 로드
  useEffect(() => {
    if (userId && !compact) {
      fetchDepartmentStats(userId, department.id);
    }
  }, [userId, department.id, compact, fetchDepartmentStats]);

  // 즐겨찾기 토글
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    await toggleFavorite(userId, department.id);
  };

  // 정기 모임 정보 포맷
  const formatMeetingInfo = () => {
    const parts: string[] = [];
    if (department.meeting_day !== null) {
      parts.push(`${WEEKDAY_SHORT_LABELS[department.meeting_day]}요일`);
    }
    if (department.meeting_time) {
      parts.push(department.meeting_time.slice(0, 5));
    }
    return parts.join(' ');
  };

  if (compact) {
    // 컴팩트 모드 (선택 목록용)
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{
            backgroundColor: department.color ? `${department.color}20` : '#f3f4f6',
            color: department.color,
          }}
        >
          {department.icon || CATEGORY_ICONS[department.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{department.name}</div>
          <div className="text-xs text-base-content/50">
            {DEPARTMENT_CATEGORY_LABELS[department.category]}
          </div>
        </div>
        {department.is_favorite && (
          <Star className="w-4 h-4 text-warning fill-current flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-base-100 rounded-xl p-4 border border-base-200 hover:border-base-300 hover:shadow-md transition-all cursor-pointer"
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{
            backgroundColor: department.color ? `${department.color}20` : '#f3f4f6',
            color: department.color,
          }}
        >
          {department.icon || CATEGORY_ICONS[department.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{department.name}</h3>
            <button
              onClick={handleToggleFavorite}
              className={`flex-shrink-0 ${
                department.is_favorite
                  ? 'text-warning'
                  : 'text-base-content/20 hover:text-base-content/40'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  department.is_favorite ? 'fill-current' : ''
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-base-content/50">
            {CATEGORY_ICONS[department.category]}
            <span>{DEPARTMENT_CATEGORY_LABELS[department.category]}</span>
          </div>
        </div>
      </div>

      {/* 설명 */}
      {department.description && (
        <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
          {department.description}
        </p>
      )}

      {/* 정기 모임 정보 */}
      {(department.meeting_day !== null || department.meeting_location) && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {formatMeetingInfo() && (
            <div className="flex items-center gap-1 text-base-content/60">
              <Clock className="w-3 h-3" />
              <span>{formatMeetingInfo()}</span>
            </div>
          )}
          {department.meeting_location && (
            <div className="flex items-center gap-1 text-base-content/60">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[120px]">
                {department.meeting_location}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 통계 */}
      {stats && (
        <div className="flex gap-4 pt-3 border-t border-base-200 text-xs text-base-content/50">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{stats.memberCount}명</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{stats.todoCount}개</span>
          </div>
          <div className="flex items-center gap-1">
            <Megaphone className="w-3 h-3" />
            <span>{stats.announcementCount}개</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
