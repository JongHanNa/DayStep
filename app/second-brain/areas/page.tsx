'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { Plus, X, Pencil, Lightbulb, Tag, Palette, Activity, FileText } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateAreaInput, Area, CreateResourceInput } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';

// 추천 영역 프리셋 (온보딩 step-1과 동일)
const AREA_PRESETS = [
  { title: '직장', icon: 'lucide-Briefcase', color: '#DBAC6C', description: '업무 프로젝트 및 커리어 개발' },
  { title: '가족', icon: 'lucide-Users', color: '#FF6B6B', description: '가족 관계 및 행사' },
  { title: '건강', icon: 'lucide-Heart', color: '#4ECDC4', description: '운동, 식습관, 건강관리' },
  { title: '나', icon: 'lucide-Sparkles', color: '#C7B3E5', description: '나에 대한 생각, 발견, 성찰' },
  { title: '자기개발', icon: 'lucide-Book', color: '#F38181', description: '학습, 성장, 스킬 향상' },
  { title: '취미', icon: 'lucide-Palette', color: '#AA96DA', description: '여가 활동 및 관심사' },
];

type AreaPreset = {
  title: string;
  icon: string;
  color: string;
  description: string;
};

export default function AreasPage() {
  const { createArea, updateArea, deleteArea, areas, fetchAreas, archiveArea, unarchiveArea } = useAreaStore();
  const { createResource, deleteResource: deleteResourceFromStore } = useResourceStore();
  const { openModal, closeModal } = useModalStore();

  // 편집 관련 state
  const [editingArea, setEditingArea] = useState<(Area & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [itemType, setItemType] = useState<SecondBrainItemType>('area');
  const [isCreatingArea, setIsCreatingArea] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);

  // 추천 항목 추가 다이얼로그
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<AreaPreset[]>([]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  // 편집 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (editDialogOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [editDialogOpen, openModal, closeModal]);

  // 추천 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (presetDialogOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [presetDialogOpen, openModal, closeModal]);

  // 새 영역 추가 핸들러 - 즉시 생성
  const handleAddArea = async () => {
    if (isCreatingArea) return; // 중복 클릭 방지

    setIsCreatingArea(true);
    try {
      // 영역 즉시 생성
      const createdArea = await createArea({
        title: '새 영역',
        description: '',
        icon: 'lucide-MapPin',
        color: '#A8DADC',
        order_index: areas.length,
        is_archived: false,
      });

      console.log('새 영역 생성 완료:', createdArea);
    } catch (error) {
      console.error('영역 생성 실패:', error);
      alert('영역 생성에 실패했습니다.');
    } finally {
      setIsCreatingArea(false);
    }
  };

  // 영역 편집 핸들러
  const handleEditArea = (area: Area) => {
    setEditingArea({ ...area, isNew: false });
    setItemType(area.is_archived ? 'archive' : 'area');
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingArea) {
      setEditingArea({ ...editingArea, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingArea) {
      const color = getColorById(colorId).hex;
      setEditingArea({ ...editingArea, color });
    }
  };

  // 상태 변경 핸들러
  const handleItemTypeChange = async (newType: SecondBrainItemType) => {
    setItemType(newType);
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingArea || !editingArea.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      if (editingArea.isNew) {
        // 새 항목 생성
        if (itemType === 'resource') {
          // 자원으로 생성
          const resourceData: CreateResourceInput = {
            title: editingArea.title,
            description: editingArea.description || '',
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: 0,
            is_archived: false,
          };
          await createResource(resourceData);
        } else if (itemType === 'area') {
          // 영역으로 생성
          const areaData: CreateAreaInput = {
            title: editingArea.title,
            description: editingArea.description || '',
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: areas.length,
            is_archived: false,
          };
          await createArea(areaData);
        } else if (itemType === 'archive') {
          // 아카이브 상태로 생성
          const areaData: CreateAreaInput = {
            title: editingArea.title,
            description: editingArea.description || '',
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: areas.length,
            is_archived: true,
          };
          const newArea = await createArea(areaData);
          await archiveArea(newArea.id);
        }
      } else {
        // 기존 항목 수정
        const originalType: SecondBrainItemType = editingArea.is_archived ? 'archive' : 'area';

        if (originalType === itemType) {
          // 같은 타입 내에서 수정
          if (itemType === 'archive') {
            // 아카이브 상태 유지
            await updateArea(editingArea.id, {
              title: editingArea.title,
              description: editingArea.description || '',
              icon: editingArea.icon,
              color: editingArea.color,
            });
          } else {
            // 일반 영역 수정
            await updateArea(editingArea.id, {
              title: editingArea.title,
              description: editingArea.description || '',
              icon: editingArea.icon,
              color: editingArea.color,
            });
          }
        } else {
          // 타입 변경
          if (itemType === 'resource') {
            // Area → Resource 변환
            const resourceData: CreateResourceInput = {
              title: editingArea.title,
              description: editingArea.description || '',
              icon: editingArea.icon,
              color: editingArea.color,
              order_index: 0,
              is_archived: false,
            };
            await deleteArea(editingArea.id);
            await createResource(resourceData);
          } else if (itemType === 'archive') {
            // Area → Archive
            await archiveArea(editingArea.id);
          } else if (itemType === 'area' && originalType === 'archive') {
            // Archive → Area
            await unarchiveArea(editingArea.id);
          }
        }
      }

      setEditDialogOpen(false);
      setEditingArea(null);
      await fetchAreas();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingArea(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (area: Area) => {
    setAreaToDelete(area);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;

    try {
      await deleteArea(areaToDelete.id);
      setDeleteConfirmOpen(false);
      setAreaToDelete(null);
      await fetchAreas();
    } catch (error) {
      console.error('영역 삭제 실패:', error);
      alert('영역 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setAreaToDelete(null);
  };

  // 추천 항목 추가 다이얼로그 열기
  const handleOpenPresetDialog = () => {
    setSelectedPresets([]);
    setPresetDialogOpen(true);
  };

  // 추천 항목 토글
  const handleTogglePreset = (preset: AreaPreset) => {
    if (selectedPresets.some((p) => p.title === preset.title)) {
      setSelectedPresets(selectedPresets.filter((p) => p.title !== preset.title));
    } else {
      setSelectedPresets([...selectedPresets, preset]);
    }
  };

  // 추천 항목 일괄 추가
  const handleAddPresets = async () => {
    if (selectedPresets.length === 0) {
      alert('최소 1개 이상의 영역을 선택해주세요.');
      return;
    }

    try {
      // 선택한 영역들을 생성
      for (const [index, preset] of selectedPresets.entries()) {
        const areaData: CreateAreaInput = {
          title: preset.title,
          description: preset.description,
          icon: preset.icon,
          color: preset.color,
          order_index: areas.length + index,
          is_archived: false,
        };
        await createArea(areaData);
      }

      setPresetDialogOpen(false);
      setSelectedPresets([]);
      await fetchAreas();
    } catch (error) {
      console.error('영역 추가 실패:', error);
      alert('영역 추가에 실패했습니다.');
    }
  };

  // 추천 항목 추가 취소
  const handleCancelPresets = () => {
    setPresetDialogOpen(false);
    setSelectedPresets([]);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
          <h1 className="text-2xl font-bold">책임 영역 (Areas)</h1>
          <p className="text-sm text-base-content/70 mt-1">
            지속적으로 관심을 가져야 하는 영역을 관리하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 영역 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">영역 목록 ({areas.length}개)</h2>
            <div className="flex gap-2">
              <button onClick={handleOpenPresetDialog} className="btn btn-ghost btn-sm rounded-full">
                <Lightbulb className="w-4 h-4" />
                추천 항목 추가
              </button>
              <button
                onClick={handleAddArea}
                className="btn btn-primary btn-sm rounded-full"
                disabled={isCreatingArea}
              >
                {isCreatingArea ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingArea ? '생성 중...' : '새 영역 추가'}
              </button>
            </div>
          </div>

          {areas.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 영역이 없습니다. 새 영역을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {areas.map((area) => {
                const IconComponent = getUnifiedIcon(area.icon as UnifiedIconKey);
                return (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: area.color,
                        }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{area.title}</div>
                        {area.description && (
                          <div className="text-sm text-base-content/60">{area.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditArea(area)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(area)}
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
      {editDialogOpen && editingArea && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">
                {editingArea.isNew ? '새 항목 추가' : '항목 편집'}
              </h3>
              <div className="flex gap-2">
                {!editingArea.isNew && (
                  <button
                    onClick={() => {
                      setEditDialogOpen(false);
                      handleDeleteClick(editingArea);
                    }}
                    className="btn btn-ghost btn-sm text-error rounded-full"
                  >
                    삭제
                  </button>
                )}
                <button onClick={handleSaveEdit} className="btn btn-primary btn-sm rounded-full">
                  저장
                </button>
              </div>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {/* 상태 선택 */}
                <div className="my-4">
                  {/* 섹션 제목 */}
                  <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                    <Activity className="h-5 w-5" style={{ color: editingArea.color }} />
                    상태
                  </label>

                  {/* 셀렉트 박스 */}
                  <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                    <select
                      value={itemType}
                      onChange={(e) => handleItemTypeChange(e.target.value as SecondBrainItemType)}
                      className="select select-bordered w-full"
                    >
                      <option value="area">책임 영역</option>
                      <option value="resource">관심 자원</option>
                      <option value="archive">아카이브</option>
                    </select>
                  </div>
                </div>

                {/* 아이콘 및 제목 - TodoMetadata 스타일 적용 */}
                <div className="my-4">
                  {/* 섹션 제목 */}
                  <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                    <Tag className="h-5 w-5" style={{ color: editingArea.color }} />
                    책임 아이콘 및 제목
                  </label>

                  {/* 아이콘 + 제목 입력 */}
                  <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                    <div className="flex items-center gap-3">
                      {/* 아이콘 버튼 */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIconBrowserOpen(true)}
                          className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                          style={{ backgroundColor: '#f3f4f6' }}
                          title="아이콘 변경하기"
                        >
                          {(() => {
                            const IconComponent = getUnifiedIcon(editingArea.icon as UnifiedIconKey).component;
                            return <IconComponent
                              className="group-hover:scale-110 transition-transform"
                              style={{ color: editingArea.color }}
                              size={24}
                            />;
                          })()}
                        </button>

                        {/* 색상 인디케이터 */}
                        <div
                          className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                          style={{
                            backgroundColor: editingArea.color,
                            border: '2px solid white'
                          }}
                        >
                          <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* 제목 입력 */}
                      <input
                        type="text"
                        value={editingArea.title}
                        onChange={(e) => setEditingArea({ ...editingArea, title: e.target.value })}
                        placeholder="책임 제목을 입력하세요"
                        className="flex-1 bg-base-100 border-0 border-b-2 rounded-none focus:outline-none transition-none"
                        style={{
                          fontSize: '20px',
                          color: '#333333',
                          borderBottomColor: '#D1D5DB',
                          outline: 'none',
                          boxShadow: 'none',
                          fontWeight: '600',
                          height: '44px',
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 설명 */}
                <div className="my-4">
                  {/* 섹션 제목 */}
                  <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                    <FileText className="h-5 w-5" style={{ color: editingArea.color }} />
                    설명
                  </label>

                  {/* 텍스트 영역 */}
                  <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                    <textarea
                      value={editingArea.description || ''}
                      onChange={(e) => setEditingArea({ ...editingArea, description: e.target.value })}
                      className="textarea textarea-bordered w-full h-20"
                      placeholder="예: 업무 프로젝트 및 커리어 개발"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && areaToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">영역 삭제</h3>
            <p className="mb-6">
              <strong>{areaToDelete.title}</strong> 영역을 삭제하시겠습니까?
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
        selectedIcon={editingArea?.icon}
        selectedColor={editingArea?.color}
        onColorSelect={handleColorChange}
      />

      {/* 추천 항목 추가 다이얼로그 */}
      {presetDialogOpen && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelPresets} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">추천 영역 추가하기</h3>
              <button
                onClick={handleAddPresets}
                disabled={selectedPresets.length === 0}
                className="btn btn-primary btn-sm rounded-full"
              >
                {selectedPresets.length > 0 ? `${selectedPresets.length}개 추가` : '항목 선택'}
              </button>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <p className="text-sm text-base-content/70 mb-6">
                  시작하기 좋은 영역들을 준비했어요. 여러 개를 선택할 수 있습니다.
                </p>

                {/* 프리셋 영역 그리드 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {AREA_PRESETS.map((preset) => {
                    const isSelected = selectedPresets.some((p) => p.title === preset.title);
                    const IconComponent = getUnifiedIcon(preset.icon as UnifiedIconKey).component;

                    return (
                      <button
                        key={preset.title}
                        onClick={() => handleTogglePreset(preset)}
                        className={`card transition-all w-full ${
                          isSelected
                            ? 'bg-primary text-primary-content ring-2 ring-primary'
                            : 'bg-base-200 hover:bg-base-300'
                        }`}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start justify-between">
                            <IconComponent className="w-8 h-8" />
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary-content text-primary flex items-center justify-center">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold mt-2">{preset.title}</h3>
                          <p className={`text-xs ${isSelected ? 'opacity-90' : 'text-base-content/60'}`}>
                            {preset.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 선택된 항목 표시 */}
                {selectedPresets.length > 0 && (
                  <div className="alert alert-info mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">
                      {selectedPresets.length}개 영역이 선택되었습니다
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelPresets} />
        </dialog>
      )}

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
