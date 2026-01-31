'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useRelationshipStore } from '@/state/stores/relationshipStore';
import { useRoleStore } from '@/state/stores/roleStore';
import { DepartmentService } from '@/services/department.service';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { DepartmentTagInput } from '@/components/ui/DepartmentTagInput';
import { RelationshipTagInput } from '@/components/ui/RelationshipTagInput';
import { RoleTagInput } from '@/components/ui/RoleTagInput';
import type { CherishedPerson, CherishedPersonInput } from '@/types/cherished-people';
import type { Department } from '@/types/department';

interface AddPersonModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  editingPerson: CherishedPerson | null;
}

/**
 * 소중한 사람 추가/편집 모달
 */
export default function AddPersonModal({
  userId,
  isOpen,
  onClose,
  editingPerson,
}: AddPersonModalProps) {
  const {
    addPerson,
    updatePerson,
    deactivatePerson,
    loadPeople,
  } = useCherishedPeopleStore();
  const {
    departments: departmentList,
    fetchDepartments,
    createDepartment,
    updateDepartment: updateDepartmentStore,
    deleteDepartment: deleteDepartmentStore,
    linkPersonToDepartment,
    unlinkPersonFromDepartment,
  } = useDepartmentStore();
  const {
    fetchRelationships,
    fetchAllPersonRelationships,
    updatePersonRelationships,
    getPersonRelationshipIds,
  } = useRelationshipStore();
  const {
    fetchRoles,
    fetchAllPersonRoles,
    updatePersonRoles,
    getPersonRoleIds,
  } = useRoleStore();
  const { checkAndProceed, limitResult, isModalOpen, closeModal, onCreateSuccess, onDeleteSuccess } = useUsageLimitCheck();

  // 폼 상태
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedRelationshipIds, setSelectedRelationshipIds] = useState<string[]>([]);
  const [originalRelationshipIds, setOriginalRelationshipIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [originalRoleIds, setOriginalRoleIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [originalDepartmentIds, setOriginalDepartmentIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 부서 관리 상태
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState('');
  const [isDepartmentSaving, setIsDepartmentSaving] = useState(false);

  // 모달 열릴 때 데이터 로드 (관계, 역할, 부서)
  useEffect(() => {
    if (isOpen && userId) {
      fetchRelationships(userId);
      fetchRoles(userId);
      fetchDepartments(userId);
      fetchAllPersonRelationships(userId);
      fetchAllPersonRoles(userId);
    }
  }, [isOpen, userId, fetchRelationships, fetchRoles, fetchDepartments, fetchAllPersonRelationships, fetchAllPersonRoles]);

  // 편집 모드일 때 데이터 로드
  useEffect(() => {
    const loadPersonData = async () => {
      if (editingPerson) {
        setName(editingPerson.name);
        setNickname(editingPerson.nickname || '');

        // 현재 연결된 관계/역할/부서 목록 조회
        setIsLoadingData(true);
        try {
          // 관계 ID 로드 (스토어 캐시 사용)
          const relationshipIds = getPersonRelationshipIds(editingPerson.id);
          setSelectedRelationshipIds(relationshipIds);
          setOriginalRelationshipIds(relationshipIds);

          // 역할 ID 로드 (스토어 캐시 사용)
          const roleIds = getPersonRoleIds(editingPerson.id);
          setSelectedRoleIds(roleIds);
          setOriginalRoleIds(roleIds);

          // 부서 ID 로드
          const personDepartments = await DepartmentService.getPersonDepartments(userId, editingPerson.id);
          const departmentIds = personDepartments.map((d: Department) => d.id);
          setSelectedDepartmentIds(departmentIds);
          setOriginalDepartmentIds(departmentIds);
        } catch (error) {
          console.error('데이터 로드 실패:', error);
        } finally {
          setIsLoadingData(false);
        }
      } else {
        resetForm();
      }
    };

    loadPersonData();
  }, [editingPerson, userId, getPersonRelationshipIds, getPersonRoleIds]);

  // 폼 리셋
  const resetForm = () => {
    setName('');
    setNickname('');
    setSelectedRelationshipIds([]);
    setOriginalRelationshipIds([]);
    setSelectedRoleIds([]);
    setOriginalRoleIds([]);
    setSelectedDepartmentIds([]);
    setOriginalDepartmentIds([]);
    setShowDeleteConfirm(false);
    // 부서 관리 상태 초기화
    setDepartmentToDelete(null);
    setEditingDepartment(null);
    setEditingDepartmentName('');
  };

  // 부서 연결 업데이트
  const updateDepartmentLinks = async (personId: string) => {
    // 추가된 부서 연결
    const addedIds = selectedDepartmentIds.filter((id) => !originalDepartmentIds.includes(id));
    // 제거된 부서 연결
    const removedIds = originalDepartmentIds.filter((id) => !selectedDepartmentIds.includes(id));

    // 추가
    for (const departmentId of addedIds) {
      await linkPersonToDepartment(userId, personId, departmentId);
    }

    // 제거
    for (const departmentId of removedIds) {
      await unlinkPersonFromDepartment(userId, personId, departmentId);
    }
  };

  // 새 부서 생성 (DepartmentTagInput용)
  const handleCreateDepartment = async (name: string): Promise<Department | null> => {
    if (!userId) return null;

    try {
      const newDepartment = await createDepartment(userId, { name });
      return newDepartment;
    } catch (error) {
      console.error('부서 추가 실패:', error);
      return null;
    }
  };

  // 부서 편집 시작
  const handleStartEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setEditingDepartmentName(department.name);
  };

  // 부서 편집 저장
  const handleSaveDepartmentEdit = async () => {
    if (!editingDepartment || !editingDepartmentName.trim() || !userId) return;

    setIsDepartmentSaving(true);
    try {
      await updateDepartmentStore(userId, editingDepartment.id, { name: editingDepartmentName.trim() });
      setEditingDepartment(null);
      setEditingDepartmentName('');
    } catch (error) {
      console.error('부서 수정 실패:', error);
    } finally {
      setIsDepartmentSaving(false);
    }
  };

  // 부서 삭제
  const handleDeleteDepartment = async () => {
    if (!departmentToDelete || !userId) return;

    setIsDepartmentSaving(true);
    try {
      await deleteDepartmentStore(userId, departmentToDelete.id);
      // 삭제된 부서를 선택 목록에서 제거
      setSelectedDepartmentIds((prev) => prev.filter((id) => id !== departmentToDelete.id));
      setDepartmentToDelete(null);
    } catch (error) {
      console.error('부서 삭제 실패:', error);
    } finally {
      setIsDepartmentSaving(false);
    }
  };

  // 저장
  const handleSave = async () => {
    if (!name.trim()) return;

    // 기존 text[] 필드는 빈 배열로 유지 (새 조인 테이블 사용)
    const input: CherishedPersonInput = {
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      relationships: [], // 더 이상 사용하지 않음 - person_relationships 테이블 사용
      roles: [], // 더 이상 사용하지 않음 - person_roles 테이블 사용
    };

    // 새로 추가하는 경우에만 용량 체크
    if (!editingPerson) {
      await checkAndProceed('cherished_people', async () => {
        setIsSaving(true);
        try {
          const newPerson = await addPerson(userId, input);
          if (newPerson) {
            // 관계 연결
            await updatePersonRelationships(userId, newPerson.id, selectedRelationshipIds);
            // 역할 연결
            await updatePersonRoles(userId, newPerson.id, selectedRoleIds);
            // 부서 연결
            for (const departmentId of selectedDepartmentIds) {
              await linkPersonToDepartment(userId, newPerson.id, departmentId);
            }
            onCreateSuccess('cherished_people');
          }
          onClose();
          resetForm();
        } catch (error) {
          console.error('저장 실패:', error);
        } finally {
          setIsSaving(false);
        }
      });
    } else {
      // 편집은 용량 체크 없이 바로 저장
      setIsSaving(true);
      try {
        await updatePerson(editingPerson.id, userId, input);
        // 관계 연결 업데이트
        await updatePersonRelationships(userId, editingPerson.id, selectedRelationshipIds);
        // 역할 연결 업데이트
        await updatePersonRoles(userId, editingPerson.id, selectedRoleIds);
        // 부서 연결 업데이트
        await updateDepartmentLinks(editingPerson.id);
        await loadPeople(userId); // 최신 데이터 리로드
        onClose();
        resetForm();
      } catch (error) {
        console.error('저장 실패:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!editingPerson) return;

    setIsSaving(true);
    try {
      await deactivatePerson(editingPerson.id, userId);
      onDeleteSuccess('cherished_people');
      onClose();
      resetForm();
    } catch (error) {
      console.error('삭제 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog open className="modal z-[120]">
      <div className="modal-box max-w-md">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold">
            {editingPerson ? '정보 수정' : '소중한 사람 추가'}
          </h3>
          <div className="flex items-center gap-2">
            {editingPerson && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-ghost btn-sm btn-circle text-error"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="btn btn-primary btn-sm rounded-full"
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>

        {/* 폼 */}
        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="text-sm font-medium block mb-2">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="input input-bordered w-full"
              autoFocus
            />
          </div>

          {/* 별명 */}
          <div>
            <label className="text-sm font-medium block mb-2">별명 (선택)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="나만의 별명"
              className="input input-bordered w-full"
            />
          </div>

          {/* 관계 */}
          <RelationshipTagInput
            label="관계"
            value={selectedRelationshipIds}
            onChange={setSelectedRelationshipIds}
            placeholder="관계를 입력하세요 (예: 가족, 친구)"
          />

          {/* 부서/소속 - TagInput 스타일 */}
          <DepartmentTagInput
            selectedIds={selectedDepartmentIds}
            onSelectedIdsChange={setSelectedDepartmentIds}
            departments={departmentList}
            onCreateDepartment={handleCreateDepartment}
            onEditDepartment={handleStartEditDepartment}
            onDeleteDepartment={setDepartmentToDelete}
            label="부서/소속 (선택)"
            placeholder="부서를 입력하세요"
            isLoading={isLoadingData}
          />

          {/* 부서 편집 모달 */}
          {editingDepartment && (
            <div className="p-3 rounded-xl bg-base-200 border border-base-300">
              <p className="text-sm font-medium mb-2">부서 이름 수정</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingDepartmentName}
                  onChange={(e) => setEditingDepartmentName(e.target.value)}
                  className="input input-sm input-bordered flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDepartmentEdit();
                    if (e.key === 'Escape') {
                      setEditingDepartment(null);
                      setEditingDepartmentName('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveDepartmentEdit}
                  disabled={isDepartmentSaving || !editingDepartmentName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isDepartmentSaving ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    '저장'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDepartment(null);
                    setEditingDepartmentName('');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 부서 삭제 확인 */}
          {departmentToDelete && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20">
              <p className="text-sm text-error mb-2">
                &quot;{departmentToDelete.name}&quot; 부서를 삭제하시겠습니까?
              </p>
              <p className="text-xs text-base-content/60 mb-3">
                이 부서에 연결된 모든 사람의 부서 정보도 함께 삭제됩니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDepartmentToDelete(null)}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDepartment}
                  disabled={isDepartmentSaving}
                  className="btn btn-error btn-sm flex-1"
                >
                  {isDepartmentSaving ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 역할/직분 */}
          <RoleTagInput
            label="역할/직분 (선택)"
            value={selectedRoleIds}
            onChange={setSelectedRoleIds}
            placeholder="역할을 입력하세요 (예: 팀장, 부장)"
          />
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/20">
            <p className="text-sm text-error mb-3">
              정말 {editingPerson?.name}님을 목록에서 제거할까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost btn-sm flex-1"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="btn btn-error btn-sm flex-1"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isModalOpen}
          onClose={closeModal}
          result={limitResult}
        />
      )}
    </dialog>
  );
}
