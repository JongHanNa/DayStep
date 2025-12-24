'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { TagInput } from '@/components/ui/TagInput';
import type { CherishedPerson, CherishedPersonInput } from '@/types/cherished-people';

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
    loadSuggestions,
    relationshipSuggestions,
    roleSuggestions,
  } = useCherishedPeopleStore();
  const { checkAndProceed, limitResult, isModalOpen, closeModal, onCreateSuccess, onDeleteSuccess } = useUsageLimitCheck();

  // 폼 상태
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationships, setRelationships] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 모달 열릴 때 추천 목록 로드
  useEffect(() => {
    if (isOpen && userId) {
      loadSuggestions(userId);
    }
  }, [isOpen, userId, loadSuggestions]);

  // 편집 모드일 때 데이터 로드
  useEffect(() => {
    if (editingPerson) {
      setName(editingPerson.name);
      setNickname(editingPerson.nickname || '');
      setRelationships(editingPerson.relationships || []);
      setRoles(editingPerson.roles || []);
      setNotes(editingPerson.notes || '');
    } else {
      resetForm();
    }
  }, [editingPerson]);

  // 폼 리셋
  const resetForm = () => {
    setName('');
    setNickname('');
    setRelationships([]);
    setRoles([]);
    setNotes('');
    setShowDeleteConfirm(false);
  };

  // 저장
  const handleSave = async () => {
    if (!name.trim()) return;

    const input: CherishedPersonInput = {
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      relationships,
      roles,
      notes: notes.trim() || undefined,
    };

    // 새로 추가하는 경우에만 용량 체크
    if (!editingPerson) {
      await checkAndProceed('cherished_people', async () => {
        setIsSaving(true);
        try {
          await addPerson(userId, input);
          onCreateSuccess('cherished_people');
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
          <TagInput
            label="관계"
            value={relationships}
            onChange={setRelationships}
            suggestions={relationshipSuggestions}
            placeholder="관계를 입력하세요 (예: 가족, 친구)"
          />

          {/* 역할/직분 */}
          <TagInput
            label="역할/직분 (선택)"
            value={roles}
            onChange={setRoles}
            suggestions={roleSuggestions}
            placeholder="역할을 입력하세요 (예: 팀장, 교구장)"
          />

          {/* 메모 */}
          <div>
            <label className="text-sm font-medium block mb-2">메모 (선택)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="기억해두고 싶은 것들..."
              className="textarea textarea-bordered w-full h-24 resize-none"
            />
          </div>
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
