'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Star,
  Filter,
  Church,
  Building2,
  Users,
  Globe,
  Home,
  Folder,
} from 'lucide-react';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useAuth } from '@/app/context/AuthContext';
import DepartmentCard from './DepartmentCard';
import DepartmentEditModal from './DepartmentEditModal';
import DepartmentDetailView from './DepartmentDetailView';
import type { Department, DepartmentCategory } from '@/types/department';
import { DEPARTMENT_CATEGORY_LABELS } from '@/types/department';

// 카테고리 아이콘 매핑
const CATEGORY_ICONS: Record<DepartmentCategory, React.ReactNode> = {
  church: <Church className="w-4 h-4" />,
  company: <Building2 className="w-4 h-4" />,
  club: <Users className="w-4 h-4" />,
  community: <Globe className="w-4 h-4" />,
  family: <Home className="w-4 h-4" />,
  other: <Folder className="w-4 h-4" />,
};

/**
 * 부서 목록 컴포넌트
 */
export default function DepartmentList() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    departments,
    loading,
    error,
    categoryFilter,
    showFavoritesOnly,
    fetchDepartments,
    setCategoryFilter,
    setShowFavoritesOnly,
    getFilteredDepartments,
    showAddDepartmentModal,
    editingDepartment,
    openAddDepartmentModal,
    closeAddDepartmentModal,
    openEditDepartmentModal,
    closeEditDepartmentModal,
  } = useDepartmentStore();

  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 상세 보기 상태
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(
    null
  );

  // 초기 로드
  useEffect(() => {
    if (userId) {
      fetchDepartments(userId);
    }
  }, [userId, fetchDepartments]);

  // 필터링된 부서 목록
  const filteredDepartments = getFilteredDepartments().filter((d) => {
    if (!searchQuery.trim()) return true;
    return (
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // 즐겨찾기 부서
  const favoriteDepartments = filteredDepartments.filter((d) => d.is_favorite);
  // 일반 부서
  const regularDepartments = filteredDepartments.filter((d) => !d.is_favorite);

  // 부서 클릭 핸들러
  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
  };

  // 부서 편집 핸들러
  const handleEditClick = (department: Department) => {
    openEditDepartmentModal(department);
  };

  if (loading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-error">{error}</p>
        <button
          onClick={() => userId && fetchDepartments(userId)}
          className="btn btn-sm btn-ghost"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 상세 보기 모드
  if (selectedDepartment) {
    return (
      <DepartmentDetailView
        department={selectedDepartment}
        onBack={() => setSelectedDepartment(null)}
        onEdit={() => handleEditClick(selectedDepartment)}
      />
    );
  }

  return (
    <div className="pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 pb-4">
        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="부서 검색..."
            className="input input-bordered w-full pl-10 input-sm"
          />
        </div>

        {/* 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {/* 즐겨찾기 필터 */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`btn btn-xs gap-1 flex-shrink-0 ${
              showFavoritesOnly ? 'btn-warning' : 'btn-ghost'
            }`}
          >
            <Star
              className={`w-3 h-3 ${showFavoritesOnly ? 'fill-current' : ''}`}
            />
            즐겨찾기
          </button>

          <div className="divider divider-horizontal mx-0" />

          {/* 전체 */}
          <button
            onClick={() => setCategoryFilter('all')}
            className={`btn btn-xs gap-1 flex-shrink-0 ${
              categoryFilter === 'all' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            전체
          </button>

          {/* 카테고리 필터 */}
          {(Object.keys(DEPARTMENT_CATEGORY_LABELS) as DepartmentCategory[]).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`btn btn-xs gap-1 flex-shrink-0 ${
                  categoryFilter === cat ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {CATEGORY_ICONS[cat]}
                {DEPARTMENT_CATEGORY_LABELS[cat]}
              </button>
            )
          )}
        </div>
      </div>

      {/* 부서 목록 */}
      {filteredDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-base-content/40 text-center">
            <Users className="w-12 h-12 mx-auto mb-2" />
            <p>등록된 부서가 없습니다</p>
          </div>
          <button
            onClick={openAddDepartmentModal}
            className="btn btn-primary btn-sm rounded-full gap-1"
          >
            <Plus className="w-4 h-4" />
            부서 추가
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 즐겨찾기 섹션 */}
          {favoriteDepartments.length > 0 && !showFavoritesOnly && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-base-content/60 mb-2">
                <Star className="w-4 h-4 text-warning fill-warning" />
                즐겨찾기
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {favoriteDepartments.map((department) => (
                    <DepartmentCard
                      key={department.id}
                      department={department}
                      onClick={() => handleDepartmentClick(department)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* 일반 부서 섹션 */}
          {regularDepartments.length > 0 && !showFavoritesOnly && (
            <div>
              {favoriteDepartments.length > 0 && (
                <h3 className="text-sm font-medium text-base-content/60 mb-2">
                  모든 부서
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {regularDepartments.map((department) => (
                    <DepartmentCard
                      key={department.id}
                      department={department}
                      onClick={() => handleDepartmentClick(department)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* 즐겨찾기만 보기 모드 */}
          {showFavoritesOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {favoriteDepartments.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    onClick={() => handleDepartmentClick(department)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* FAB - 부서 추가 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={openAddDepartmentModal}
        className="fixed bottom-24 right-4 btn btn-primary btn-circle shadow-lg z-20"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* 부서 추가/편집 모달 */}
      {showAddDepartmentModal && (
        <DepartmentEditModal
          department={editingDepartment || undefined}
          onClose={() => {
            closeAddDepartmentModal();
            closeEditDepartmentModal();
          }}
        />
      )}
    </div>
  );
}
