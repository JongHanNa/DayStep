'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { Plus, X, Pencil, ArrowLeft } from 'lucide-react';
import type { CreateGoalInput, Goal } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

export default function GoalsSettingsPage() {
  const router = useRouter();
  const { createGoal, updateGoal, deleteGoal, goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  // 편집 관련 state
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchGoals, fetchAreas, fetchResources]);

  // 새 목표 추가 핸들러
  const handleAddGoal = () => {
    setEditingGoal({
      id: '',
      title: '',
      description: '',
      icon: 'lucide-Target',
      color: '#A8DADC',
      status: 'not_started',
      start_date: '',
      target_date: '',
      timeframe: 'year',
      target_year: new Date().getFullYear(),
      target_quarter: 1,
      progress: 0,
      created_at: '',
      updated_at: '',
      user_id: '',
      paraSelection: '',
      isNew: true,
    });
    setEditDialogOpen(true);
  };

  // 목표 편집 핸들러
  const handleEditGoal = (goal: Goal) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingGoal) {
      const color = getColorById(colorId).hex;
      setEditingGoal({ ...editingGoal, color });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingGoal || !editingGoal.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (editingGoal.paraSelection) {
        if (editingGoal.paraSelection.startsWith('area-')) {
          area_id = editingGoal.paraSelection.replace('area-', '');
        } else if (editingGoal.paraSelection.startsWith('resource-')) {
          resource_id = editingGoal.paraSelection.replace('resource-', '');
        }
      }

      if (editingGoal.isNew) {
        // 새 목표 생성
        const goalData: CreateGoalInput = {
          title: editingGoal.title,
          description: editingGoal.description || '',
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          target_date: editingGoal.target_date || undefined,
          timeframe: editingGoal.timeframe,
          target_year: editingGoal.target_year || undefined,
          target_quarter: editingGoal.target_quarter || undefined,
        };
        await createGoal(goalData);
      } else {
        // 기존 목표 수정
        await updateGoal(editingGoal.id, {
          title: editingGoal.title,
          description: editingGoal.description || '',
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          target_date: editingGoal.target_date || undefined,
          timeframe: editingGoal.timeframe,
          target_year: editingGoal.target_year || undefined,
          target_quarter: editingGoal.target_quarter || undefined,
        });
      }

      setEditDialogOpen(false);
      setEditingGoal(null);
      await fetchGoals();
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingGoal(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;

    try {
      await deleteGoal(goalToDelete.id);
      setDeleteConfirmOpen(false);
      setGoalToDelete(null);
      await fetchGoals();
    } catch (error) {
      console.error('목표 삭제 실패:', error);
      alert('목표 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setGoalToDelete(null);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">목표 (Goals)</h1>
              <p className="text-sm text-base-content/70">
                장기 목표를 설정하고 관리하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 목표 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">목표 목록 ({goals.length}개)</h2>
            <button onClick={handleAddGoal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              새 목표 추가
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 목표가 없습니다. 새 목표를 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => {
                const IconComponent = getUnifiedIcon(goal.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: goal.color + '30',
                          borderColor: goal.color,
                          borderWidth: '2px',
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: goal.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{goal.title}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(goal)}
                        className="btn btn-ghost btn-sm btn-circle text-error"
                        aria-label="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 편집/추가 다이얼로그 */}
      {editDialogOpen && editingGoal && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingGoal.isNew ? '새 목표 추가' : '목표 편집'}
            </h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: editingGoal.color + '20',
                  borderColor: editingGoal.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(editingGoal.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingGoal.title}
                onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 건강한 생활 습관 형성"
              />
            </div>

            {/* 상태 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">상태</span>
              </label>
              <select
                value={editingGoal.status}
                onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'suspended' | 'archived' })}
                className="select select-bordered"
              >
                <option value="not_started">시작 안함</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
                <option value="suspended">중단</option>
              </select>
            </div>

            {/* 영역/자원 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">영역/자원 (선택)</span>
              </label>
              <select
                value={editingGoal.paraSelection}
                onChange={(e) => setEditingGoal({ ...editingGoal, paraSelection: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => (
                    <option key={area.id} value={`area-${area.id}`}>
                      {area.icon} {area.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => (
                    <option key={resource.id} value={`resource-${resource.id}`}>
                      {resource.icon} {resource.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 시작일/종료일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingGoal.start_date || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, start_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingGoal.target_date || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>
            </div>

            {/* 기간 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">기간</span>
              </label>
              <select
                value={editingGoal.timeframe}
                onChange={(e) => setEditingGoal({ ...editingGoal, timeframe: e.target.value as 'quarter' | 'year' | '5_years' })}
                className="select select-bordered"
              >
                <option value="quarter">분기 (3개월)</option>
                <option value="year">연간 (1년)</option>
                <option value="5_years">장기 (5년)</option>
              </select>
            </div>

            {/* 연간목표/분기목표 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">연간목표 (선택)</span>
                </label>
                <select
                  value={editingGoal.target_year || new Date().getFullYear()}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_year: parseInt(e.target.value) })}
                  className="select select-bordered"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">분기목표 (선택)</span>
                </label>
                <select
                  value={editingGoal.target_quarter || 1}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_quarter: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                  className="select select-bordered"
                >
                  <option value={1}>1분기 (1~3월)</option>
                  <option value={2}>2분기 (4~6월)</option>
                  <option value={3}>3분기 (7~9월)</option>
                  <option value={4}>4분기 (10~12월)</option>
                </select>
              </div>
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && goalToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">목표 삭제</h3>
            <p className="mb-6">
              <strong>{goalToDelete.title}</strong> 목표를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingGoal?.icon}
        selectedColor={editingGoal?.color}
        onColorSelect={handleColorChange}
      />
    </div>
  );
}
