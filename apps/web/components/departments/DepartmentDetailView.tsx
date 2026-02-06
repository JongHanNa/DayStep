'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Edit2,
  Users,
  Calendar,
  Megaphone,
  MapPin,
  Clock,
  Plus,
  Star,
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
  WEEKDAY_LABELS,
} from '@/types/department';
import DepartmentMemberList from './DepartmentMemberList';
import AnnouncementList from './AnnouncementList';
import AnnouncementEditModal from './AnnouncementEditModal';

// 카테고리 아이콘 매핑
const CATEGORY_ICONS: Record<DepartmentCategory, React.ReactNode> = {
  church: <Church className="w-5 h-5" />,
  company: <Building2 className="w-5 h-5" />,
  club: <Users className="w-5 h-5" />,
  community: <Globe className="w-5 h-5" />,
  family: <Home className="w-5 h-5" />,
  other: <Folder className="w-5 h-5" />,
};

// 탭 타입
type TabType = 'info' | 'members' | 'todos' | 'announcements';

interface DepartmentDetailViewProps {
  department: Department;
  onBack: () => void;
  onEdit: () => void;
}

/**
 * 부서 상세 뷰
 */
export default function DepartmentDetailView({
  department,
  onBack,
  onEdit,
}: DepartmentDetailViewProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    toggleFavorite,
    fetchDepartmentMembers,
    fetchDepartmentTodos,
    fetchAnnouncements,
    fetchDepartmentStats,
    departmentMembers,
    departmentTodos,
    departmentAnnouncements,
    departmentStats,
    showAnnouncementModal,
    editingAnnouncement,
    openAnnouncementModal,
    closeAnnouncementModal,
  } = useDepartmentStore();

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const stats = departmentStats.get(department.id);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      fetchDepartmentStats(userId, department.id);
      fetchDepartmentMembers(userId, department.id);
      fetchAnnouncements(userId, department.id);
      fetchDepartmentTodos(userId, department.id);
    }
  }, [
    userId,
    department.id,
    fetchDepartmentStats,
    fetchDepartmentMembers,
    fetchAnnouncements,
    fetchDepartmentTodos,
  ]);

  // 즐겨찾기 토글
  const handleToggleFavorite = async () => {
    if (!userId) return;
    await toggleFavorite(userId, department.id);
  };

  // 정기 모임 정보 포맷
  const formatMeetingInfo = () => {
    const parts: string[] = [];
    if (department.meeting_day !== null) {
      parts.push(WEEKDAY_LABELS[department.meeting_day]);
    }
    if (department.meeting_time) {
      parts.push(department.meeting_time.slice(0, 5));
    }
    return parts.join(' ');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'info', label: '정보', icon: <Building2 className="w-4 h-4" /> },
    {
      id: 'members',
      label: '멤버',
      icon: <Users className="w-4 h-4" />,
      count: stats?.memberCount,
    },
    {
      id: 'todos',
      label: '일정',
      icon: <Calendar className="w-4 h-4" />,
      count: stats?.todoCount,
    },
    {
      id: 'announcements',
      label: '소식',
      icon: <Megaphone className="w-4 h-4" />,
      count: stats?.announcementCount,
    },
  ];

  return (
    <div className="pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1">
            <button
              onClick={handleToggleFavorite}
              className={`btn btn-ghost btn-sm btn-circle ${
                department.is_favorite ? 'text-warning' : ''
              }`}
            >
              <Star
                className={`w-5 h-5 ${
                  department.is_favorite ? 'fill-current' : ''
                }`}
              />
            </button>
            <button onClick={onEdit} className="btn btn-ghost btn-sm btn-circle">
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 부서 정보 헤더 */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              backgroundColor: department.color ? `${department.color}20` : '#f3f4f6',
              color: department.color,
            }}
          >
            {department.icon || CATEGORY_ICONS[department.category]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{department.name}</h1>
            <div className="flex items-center gap-1 text-sm text-base-content/60">
              {CATEGORY_ICONS[department.category]}
              <span>{DEPARTMENT_CATEGORY_LABELS[department.category]}</span>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm gap-1 flex-shrink-0 ${
                activeTab === tab.id ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="badge badge-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="mt-4">
        {/* 정보 탭 */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 설명 */}
            {department.description && (
              <div className="p-4 bg-base-200 rounded-xl">
                <h3 className="text-sm font-medium text-base-content/60 mb-2">
                  설명
                </h3>
                <p className="text-base-content">{department.description}</p>
              </div>
            )}

            {/* 정기 모임 */}
            {(department.meeting_day !== null || department.meeting_location) && (
              <div className="p-4 bg-base-200 rounded-xl">
                <h3 className="text-sm font-medium text-base-content/60 mb-3">
                  정기 모임
                </h3>
                <div className="space-y-2">
                  {formatMeetingInfo() && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-base-content/40" />
                      <span>{formatMeetingInfo()}</span>
                    </div>
                  )}
                  {department.meeting_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-base-content/40" />
                      <span>{department.meeting_location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 통계 */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-base-200 rounded-xl text-center">
                  <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-2xl font-bold">{stats.memberCount}</div>
                  <div className="text-xs text-base-content/60">멤버</div>
                </div>
                <div className="p-4 bg-base-200 rounded-xl text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-1 text-success" />
                  <div className="text-2xl font-bold">{stats.todoCount}</div>
                  <div className="text-xs text-base-content/60">일정</div>
                </div>
                <div className="p-4 bg-base-200 rounded-xl text-center">
                  <Megaphone className="w-6 h-6 mx-auto mb-1 text-warning" />
                  <div className="text-2xl font-bold">{stats.announcementCount}</div>
                  <div className="text-xs text-base-content/60">소식</div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 멤버 탭 */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DepartmentMemberList
              departmentId={department.id}
              members={departmentMembers}
            />
          </motion.div>
        )}

        {/* 일정 탭 */}
        {activeTab === 'todos' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {departmentTodos.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>등록된 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {departmentTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="p-3 bg-base-200 rounded-lg flex items-center gap-3"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        todo.completed
                          ? 'bg-success border-success'
                          : 'border-base-content/30'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate ${
                          todo.completed ? 'line-through text-base-content/50' : ''
                        }`}
                      >
                        {todo.title}
                      </p>
                      {todo.start_time && (
                        <p className="text-xs text-base-content/50">
                          {new Date(todo.start_time).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 소식 탭 */}
        {activeTab === 'announcements' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-end mb-3">
              <button
                onClick={() => openAnnouncementModal()}
                className="btn btn-sm btn-primary rounded-full gap-1"
              >
                <Plus className="w-4 h-4" />
                소식 추가
              </button>
            </div>
            <AnnouncementList
              announcements={departmentAnnouncements}
              onEdit={(announcement) => openAnnouncementModal(announcement)}
            />
          </motion.div>
        )}
      </div>

      {/* 소식 추가/편집 모달 */}
      {showAnnouncementModal && (
        <AnnouncementEditModal
          departmentId={department.id}
          announcement={editingAnnouncement || undefined}
          onClose={closeAnnouncementModal}
        />
      )}
    </div>
  );
}
