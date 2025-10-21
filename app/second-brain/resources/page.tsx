'use client';

import { useState, useEffect } from 'react';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { Plus, X, Pencil, Lightbulb } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateResourceInput, Resource, CreateAreaInput } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';

// 추천 자원 프리셋 (온보딩 step-2와 동일)
const RESOURCE_PRESETS = [
  { title: '독서', icon: 'lucide-Book', color: '#FF6B6B', description: '읽고 싶은 책, 독서 노트' },
  { title: '프로그래밍', icon: 'lucide-Laptop', color: '#4ECDC4', description: '코딩, 개발 자료' },
  { title: '영화', icon: 'lucide-Film', color: '#95E1D3', description: '영화 리뷰, 추천 목록' },
  { title: '여행', icon: 'lucide-Plane', color: '#F38181', description: '여행지 정보, 계획' },
  { title: '요리', icon: 'lucide-ChefHat', color: '#AA96DA', description: '레시피, 맛집 정보' },
  { title: '음악', icon: 'lucide-Music', color: '#DBAC6C', description: '플레이리스트, 음악 감상' },
];

type ResourcePreset = {
  title: string;
  icon: string;
  color: string;
  description: string;
};

export default function ResourcesPage() {
  const { createResource, updateResource, deleteResource, resources, fetchResources, archiveResource, unarchiveResource } = useResourceStore();
  const { createArea, deleteArea: deleteAreaFromStore } = useAreaStore();
  const { openModal, closeModal } = useModalStore();

  // 편집 관련 state
  const [editingResource, setEditingResource] = useState<(Resource & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [itemType, setItemType] = useState<SecondBrainItemType>('resource');
  const [isCreatingResource, setIsCreatingResource] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  // 추천 항목 추가 다이얼로그
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<ResourcePreset[]>([]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

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

  // 새 자원 추가 핸들러 - 즉시 생성
  const handleAddResource = async () => {
    if (isCreatingResource) return; // 중복 클릭 방지

    setIsCreatingResource(true);
    try {
      // 자원 즉시 생성
      const createdResource = await createResource({
        title: '새 자원',
        description: '',
        icon: 'lucide-BookOpen',
        color: '#A8DADC',
        order_index: resources.length,
        is_archived: false,
      });

      console.log('새 자원 생성 완료:', createdResource);
    } catch (error) {
      console.error('자원 생성 실패:', error);
      alert('자원 생성에 실패했습니다.');
    } finally {
      setIsCreatingResource(false);
    }
  };

  // 자원 편집 핸들러
  const handleEditResource = (resource: Resource) => {
    setEditingResource({ ...resource, isNew: false });
    setItemType(resource.is_archived ? 'archive' : 'resource');
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingResource) {
      setEditingResource({ ...editingResource, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingResource) {
      const color = getColorById(colorId).hex;
      setEditingResource({ ...editingResource, color });
    }
  };

  // 상태 변경 핸들러
  const handleItemTypeChange = async (newType: SecondBrainItemType) => {
    setItemType(newType);
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingResource || !editingResource.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      if (editingResource.isNew) {
        // 새 항목 생성
        if (itemType === 'area') {
          // 영역으로 생성
          const areaData: CreateAreaInput = {
            title: editingResource.title,
            description: editingResource.description || '',
            icon: editingResource.icon,
            color: editingResource.color,
            order_index: 0,
            is_archived: false,
          };
          await createArea(areaData);
        } else if (itemType === 'resource') {
          // 자원으로 생성
          const resourceData: CreateResourceInput = {
            title: editingResource.title,
            description: editingResource.description || '',
            icon: editingResource.icon,
            color: editingResource.color,
            order_index: resources.length,
            is_archived: false,
          };
          await createResource(resourceData);
        } else if (itemType === 'archive') {
          // 아카이브 상태로 생성
          const resourceData: CreateResourceInput = {
            title: editingResource.title,
            description: editingResource.description || '',
            icon: editingResource.icon,
            color: editingResource.color,
            order_index: resources.length,
            is_archived: true,
          };
          const newResource = await createResource(resourceData);
          await archiveResource(newResource.id);
        }
      } else {
        // 기존 항목 수정
        const originalType: SecondBrainItemType = editingResource.is_archived ? 'archive' : 'resource';

        if (originalType === itemType) {
          // 같은 타입 내에서 수정
          if (itemType === 'archive') {
            // 아카이브 상태 유지
            await updateResource(editingResource.id, {
              title: editingResource.title,
              description: editingResource.description || '',
              icon: editingResource.icon,
              color: editingResource.color,
            });
          } else {
            // 일반 자원 수정
            await updateResource(editingResource.id, {
              title: editingResource.title,
              description: editingResource.description || '',
              icon: editingResource.icon,
              color: editingResource.color,
            });
          }
        } else {
          // 타입 변경
          if (itemType === 'area') {
            // Resource → Area 변환
            const areaData: CreateAreaInput = {
              title: editingResource.title,
              description: editingResource.description || '',
              icon: editingResource.icon,
              color: editingResource.color,
              order_index: 0,
              is_archived: false,
            };
            await deleteResource(editingResource.id);
            await createArea(areaData);
          } else if (itemType === 'archive') {
            // Resource → Archive
            await archiveResource(editingResource.id);
          } else if (itemType === 'resource' && originalType === 'archive') {
            // Archive → Resource
            await unarchiveResource(editingResource.id);
          }
        }
      }

      setEditDialogOpen(false);
      setEditingResource(null);
      await fetchResources();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingResource(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (resource: Resource) => {
    setResourceToDelete(resource);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteResource(resourceToDelete.id);
      setDeleteConfirmOpen(false);
      setResourceToDelete(null);
      await fetchResources();
    } catch (error) {
      console.error('자원 삭제 실패:', error);
      alert('자원 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setResourceToDelete(null);
  };

  // 추천 항목 추가 다이얼로그 열기
  const handleOpenPresetDialog = () => {
    setSelectedPresets([]);
    setPresetDialogOpen(true);
  };

  // 추천 항목 토글
  const handleTogglePreset = (preset: ResourcePreset) => {
    if (selectedPresets.some((p) => p.title === preset.title)) {
      setSelectedPresets(selectedPresets.filter((p) => p.title !== preset.title));
    } else {
      setSelectedPresets([...selectedPresets, preset]);
    }
  };

  // 추천 항목 일괄 추가
  const handleAddPresets = async () => {
    if (selectedPresets.length === 0) {
      alert('최소 1개 이상의 자원을 선택해주세요.');
      return;
    }

    try {
      // 선택한 자원들을 생성
      for (const [index, preset] of selectedPresets.entries()) {
        const resourceData: CreateResourceInput = {
          title: preset.title,
          description: preset.description,
          icon: preset.icon,
          color: preset.color,
          order_index: resources.length + index,
          is_archived: false,
        };
        await createResource(resourceData);
      }

      setPresetDialogOpen(false);
      setSelectedPresets([]);
      await fetchResources();
    } catch (error) {
      console.error('자원 추가 실패:', error);
      alert('자원 추가에 실패했습니다.');
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
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">관심 자원 (Resources)</h1>
          <p className="text-sm text-base-content/70 mt-1">
            관심 있는 주제와 자료를 관리하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 자원 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">자원 목록 ({resources.length}개)</h2>
            <div className="flex gap-2">
              <button onClick={handleOpenPresetDialog} className="btn btn-ghost btn-sm">
                <Lightbulb className="w-4 h-4" />
                추천 항목 추가
              </button>
              <button
                onClick={handleAddResource}
                className="btn btn-primary btn-sm"
                disabled={isCreatingResource}
              >
                {isCreatingResource ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingResource ? '생성 중...' : '새 자원 추가'}
              </button>
            </div>
          </div>

          {resources.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 자원이 없습니다. 새 자원을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map((resource) => {
                const IconComponent = getUnifiedIcon(resource.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: resource.color + '30',
                          borderColor: resource.color,
                          borderWidth: '2px',
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: resource.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{resource.title}</div>
                        {resource.description && (
                          <div className="text-sm text-base-content/60">{resource.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditResource(resource)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(resource)}
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
      {editDialogOpen && editingResource && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">
                {editingResource.isNew ? '새 항목 추가' : '항목 편집'}
              </h3>
              <div className="flex gap-2">
                {!editingResource.isNew && (
                  <button
                    onClick={() => {
                      setEditDialogOpen(false);
                      handleDeleteClick(editingResource);
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
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">상태</span>
                  </label>
                  <select
                    value={itemType}
                    onChange={(e) => handleItemTypeChange(e.target.value as SecondBrainItemType)}
                    className="select select-bordered"
                  >
                    <option value="area">책임 영역</option>
                    <option value="resource">관심 자원</option>
                    <option value="archive">아카이브</option>
                  </select>
                </div>

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
                      backgroundColor: editingResource.color + '20',
                      borderColor: editingResource.color,
                    }}
                  >
                    {(() => {
                      const IconComponent = getUnifiedIcon(editingResource.icon as UnifiedIconKey).component;
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
                    value={editingResource.title}
                    onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                    className="input input-bordered"
                    placeholder="예: 프로그래밍"
                  />
                </div>

                {/* 설명 */}
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">설명</span>
                  </label>
                  <textarea
                    value={editingResource.description || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                    className="textarea textarea-bordered h-20"
                    placeholder="예: 개발 언어 및 프레임워크 학습"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && resourceToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">자원 삭제</h3>
            <p className="mb-6">
              <strong>{resourceToDelete.title}</strong> 자원을 삭제하시겠습니까?
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
        selectedIcon={editingResource?.icon}
        selectedColor={editingResource?.color}
        onColorSelect={handleColorChange}
      />

      {/* 추천 항목 추가 다이얼로그 */}
      {presetDialogOpen && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelPresets} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">추천 자원 추가하기</h3>
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
                  시작하기 좋은 자원들을 준비했어요. 여러 개를 선택할 수 있습니다.
                </p>

                {/* 프리셋 자원 그리드 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {RESOURCE_PRESETS.map((preset) => {
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
                      {selectedPresets.length}개 자원이 선택되었습니다
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
