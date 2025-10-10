'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { Plus, X, Pencil, ArrowLeft } from 'lucide-react';
import type { CreateResourceInput, Resource, CreateAreaInput } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

export default function ResourcesSettingsPage() {
  const router = useRouter();
  const { createResource, updateResource, deleteResource, resources, fetchResources, archiveResource, unarchiveResource } = useResourceStore();
  const { createArea, deleteArea: deleteAreaFromStore } = useAreaStore();

  // 편집 관련 state
  const [editingResource, setEditingResource] = useState<(Resource & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [itemType, setItemType] = useState<SecondBrainItemType>('resource');

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // 새 자원 추가 핸들러
  const handleAddResource = () => {
    setEditingResource({
      id: '',
      title: '',
      description: '',
      icon: 'lucide-BookOpen',
      color: '#A8DADC',
      order_index: resources.length,
      is_archived: false,
      created_at: '',
      updated_at: '',
      user_id: '',
      isNew: true,
    });
    setItemType('resource');
    setEditDialogOpen(true);
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

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">관심 자원 (Resources)</h1>
              <p className="text-sm text-base-content/70">
                관심 있는 주제와 자료를 관리하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 자원 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">자원 목록 ({resources.length}개)</h2>
            <button onClick={handleAddResource} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              새 자원 추가
            </button>
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
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingResource.isNew ? '새 항목 추가' : '항목 편집'}
            </h3>

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
    </div>
  );
}
