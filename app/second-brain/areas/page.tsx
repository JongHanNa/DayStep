'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { Plus, Lightbulb, Pencil } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateAreaInput, AreaResource as Area, CreateResourceInput } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';
import AreaResourceEditModal from '@/components/ui/AreaResourceEditModal';
import { AuthGuard } from '@/components/auth/AuthGuard';

// 추천 영역 프리셋 (온보딩 step-1과 동일)
const AREA_PRESETS = [
  { title: '직장', icon: 'lucide-Briefcase', color: '#DBAC6C' },
  { title: '가족', icon: 'lucide-Users', color: '#FF6B6B' },
  { title: '건강', icon: 'lucide-Heart', color: '#4ECDC4' },
  { title: '나', icon: 'lucide-Sparkles', color: '#C7B3E5' },
  { title: '자기개발', icon: 'lucide-Book', color: '#F38181' },
  { title: '취미', icon: 'lucide-Palette', color: '#AA96DA' },
];

type AreaPreset = {
  title: string;
  icon: string;
  color: string;
};

export default function AreasPage() {
  const { appUser } = useAuth();
  const { createArea, updateArea, deleteArea, areas, fetchAreas, archiveArea, unarchiveArea } = useAreaStore();
  const { createResource, deleteResource: deleteResourceFromStore } = useResourceStore();
  const { openModal, closeModal } = useModalStore();

  // 편집 관련 state
  const [editingArea, setEditingArea] = useState<(Area & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [itemType, setItemType] = useState<SecondBrainItemType>('area');
  const [isCreatingArea, setIsCreatingArea] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);

  // 추천 항목 추가 다이얼로그
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<AreaPreset[]>([]);

  useEffect(() => {
    if (appUser?.id) {
      fetchAreas(appUser.id);
    }
  }, [appUser?.id, fetchAreas]);

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
    if (isCreatingArea || !appUser?.id) return; // 중복 클릭 방지 + 인증 체크

    setIsCreatingArea(true);
    try {
      // 영역 즉시 생성
      const createdArea = await createArea(appUser.id, {
        title: '새 영역',
        icon: 'lucide-MapPin',
        color: '#A8DADC',
        order_index: areas.length,
        is_pinned: false,
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
    setItemType(area.status === 'archived' ? 'archive' : 'area');
    setEditDialogOpen(true);
  };

  // 상태 변경 핸들러
  const handleItemTypeChange = async (newType: SecondBrainItemType) => {
    setItemType(newType);
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingArea || !editingArea.title.trim() || !appUser?.id) {
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
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: 0,
            is_pinned: false,
            status: 'resource',
          };
          await createResource(appUser.id, resourceData);
        } else if (itemType === 'area') {
          // 영역으로 생성
          const areaData: CreateAreaInput = {
            title: editingArea.title,
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: areas.length,
            is_pinned: false,
            status: 'area',
          };
          await createArea(appUser.id, areaData);
        } else if (itemType === 'archive') {
          // 아카이브 상태로 생성
          const areaData: CreateAreaInput = {
            title: editingArea.title,
            icon: editingArea.icon,
            color: editingArea.color,
            order_index: areas.length,
            is_pinned: false,
            status: 'area',
          };
          const newArea = await createArea(appUser.id, areaData);
          await archiveArea(appUser.id, newArea.id);
        }
      } else {
        // 기존 항목 수정
        const originalType: SecondBrainItemType = editingArea.status === 'archived' ? 'archive' : 'area';

        if (originalType === itemType) {
          // 같은 타입 내에서 수정
          await updateArea(appUser.id, editingArea.id, {
            title: editingArea.title,
            icon: editingArea.icon,
            color: editingArea.color,
          });
        } else {
          // 타입 변경
          if (itemType === 'resource') {
            // Area → Resource 변환
            const resourceData: CreateResourceInput = {
              title: editingArea.title,
              icon: editingArea.icon,
              color: editingArea.color,
              order_index: 0,
              is_pinned: false,
              status: 'resource',
            };
            await deleteArea(appUser.id, editingArea.id);
            await createResource(appUser.id, resourceData);
          } else if (itemType === 'archive') {
            // Area → Archive
            await archiveArea(appUser.id, editingArea.id);
          } else if (itemType === 'area' && originalType === 'archive') {
            // Archive → Area
            await unarchiveArea(appUser.id, editingArea.id);
          }
        }
      }

      setEditDialogOpen(false);
      setEditingArea(null);
      await fetchAreas(appUser.id);
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

  // 삭제 핸들러 (모달에서 호출)
  const handleDeleteFromModal = () => {
    if (editingArea) {
      setEditDialogOpen(false);
      setAreaToDelete(editingArea);
      setDeleteConfirmOpen(true);
    }
  };


  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!areaToDelete || !appUser?.id) return;

    try {
      await deleteArea(appUser.id, areaToDelete.id);
      setDeleteConfirmOpen(false);
      setAreaToDelete(null);
      await fetchAreas(appUser.id);
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
    if (selectedPresets.length === 0 || !appUser?.id) {
      alert('최소 1개 이상의 영역을 선택해주세요.');
      return;
    }

    try {
      // 선택한 영역들을 생성
      for (const [index, preset] of selectedPresets.entries()) {
        const areaData: CreateAreaInput = {
          title: preset.title,
          icon: preset.icon,
          color: preset.color,
          order_index: areas.length + index,
          is_pinned: false,
          status: 'area',
        };
        await createArea(appUser.id, areaData);
      }

      setPresetDialogOpen(false);
      setSelectedPresets([]);
      await fetchAreas(appUser.id);
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
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
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
            <div className="card bg-base-100">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 영역이 없습니다. 새 영역을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {areas.map((area) => {
                const IconComponent = getUnifiedIcon(area.icon as UnifiedIconKey);
                return (
                  <div
                    key={area.id}
                    onClick={() => handleEditArea(area)}
                    className="flex flex-col p-3 sm:p-4 md:p-3 lg:p-2.5 bg-base-100 rounded-lg aspect-square transition-all cursor-pointer hover:shadow-md group"
                  >
                    {/* 상단: 제목 (더 크고 두꺼운 폰트) */}
                    <div className="font-bold text-left text-xl sm:text-lg md:text-base lg:text-sm mb-5 sm:mb-4 md:mb-3 lg:mb-2 line-clamp-2">
                      {area.title}
                    </div>

                    {/* 하단: 아이콘(왼쪽) + 버튼(오른쪽) - 남은 공간 채우기 */}
                    <div className="flex items-end justify-between flex-1">
                      {/* 왼쪽: 아이콘 (크기 약간 축소) */}
                      <div
                        className="w-16 h-16 sm:w-18 sm:h-18 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: area.color,
                        }}
                      >
                        <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 lg:w-7 lg:h-7 text-white" />
                      </div>

                      {/* 오른쪽: 액션 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditArea(area);
                        }}
                        className="btn btn-md sm:btn-md md:btn-md lg:btn-sm btn-circle bg-black text-white hover:bg-black/80 border-none"
                      >
                        <Pencil className="w-4.5 h-4.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-4 lg:h-4" />
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
      <AreaResourceEditModal
        open={editDialogOpen && !!editingArea}
        editingItem={editingArea!}
        itemType={itemType}
        pageType="area"
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromModal}
        onItemChange={setEditingArea}
        onItemTypeChange={handleItemTypeChange}
      />

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

      {/* 추천 항목 추가 다이얼로그 */}
      {presetDialogOpen && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-200 z-10`}>
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
                    const IconComponent = getUnifiedIcon(preset.icon as UnifiedIconKey);

                    return (
                      <button
                        key={preset.title}
                        onClick={() => handleTogglePreset(preset)}
                        className={`card transition-all w-full ${
                          isSelected
                            ? 'bg-primary text-primary-content ring-2 ring-primary'
                            : 'bg-base-100'
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
    </AuthGuard>
  );
}
