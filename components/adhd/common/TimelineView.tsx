'use client';

import { useState, useEffect, useRef } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { INTERACTION_TYPE_LABELS } from '@/types/cherished-people';
import type { CareInteraction, CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import {
  Clock, MoreVertical, Pencil, Trash2, User,
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Heart, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import AddPersonModal from '@/components/cherished/AddPersonModal';

// Lucide 아이콘 매핑
const INTERACTION_ICONS: Record<string, LucideIcon> = {
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Heart, Sparkles,
};

interface TimelineViewProps {
  userId: string;
}

export function TimelineView({ userId }: TimelineViewProps) {
  const [interactions, setInteractions] = useState<(CareInteraction & { person?: CherishedPerson })[]>([]);
  const [people, setPeople] = useState<CherishedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 편집/삭제 상태
  const [editingInteraction, setEditingInteraction] = useState<(CareInteraction & { person?: CherishedPerson }) | null>(null);
  const [deletingInteraction, setDeletingInteraction] = useState<CareInteraction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 편집 폼 상태
  const [editForm, setEditForm] = useState<Partial<CareInteractionInput>>({});

  // 모달 refs
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  // 인물 수정 모달 상태
  const [editingPerson, setEditingPerson] = useState<CherishedPerson | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId, selectedPersonId]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [interactionsData, peopleData] = await Promise.all([
        CherishedPeopleService.getAllInteractionsWithPerson(userId, selectedPersonId || undefined, 50),
        CherishedPeopleService.getPeople(userId),
      ]);
      setInteractions(interactionsData);
      setPeople(peopleData);
    } catch (error) {
      console.error('타임라인 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 편집 시작
  const handleEdit = (interaction: CareInteraction & { person?: CherishedPerson }) => {
    setEditingInteraction(interaction);
    setEditForm({
      interaction_type: interaction.interaction_type,
      gratitude_note: interaction.gratitude_note || '',
      recent_news: interaction.recent_news || '',
      description: interaction.description || '',
    });
    setOpenMenuId(null);
    editDialogRef.current?.showModal();
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editingInteraction) return;

    setIsSaving(true);
    try {
      const success = await CherishedPeopleService.updateInteraction(
        editingInteraction.id,
        userId,
        editForm
      );
      if (success) {
        await loadData();
        editDialogRef.current?.close();
        setEditingInteraction(null);
      }
    } catch (error) {
      console.error('편집 저장 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제 시작
  const handleDeleteClick = (interaction: CareInteraction) => {
    setDeletingInteraction(interaction);
    setOpenMenuId(null);
    deleteDialogRef.current?.showModal();
  };

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingInteraction) return;

    setIsSaving(true);
    try {
      const success = await CherishedPeopleService.deleteInteraction(
        deletingInteraction.id,
        userId
      );
      if (success) {
        await loadData();
        deleteDialogRef.current?.close();
        setDeletingInteraction(null);
      }
    } catch (error) {
      console.error('삭제 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 인물 수정 모달 열기
  const handleOpenPersonModal = (person: CherishedPerson) => {
    setEditingPerson(person);
    setIsPersonModalOpen(true);
    setOpenMenuId(null);
  };

  // 인물 수정 모달 닫기
  const handleClosePersonModal = () => {
    setIsPersonModalOpen(false);
    setEditingPerson(null);
    loadData(); // 데이터 새로고침
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 사람 필터 */}
      <div className="mb-4">
        <select
          value={selectedPersonId || ''}
          onChange={(e) => setSelectedPersonId(e.target.value || null)}
          className="select select-bordered w-full max-w-xs"
        >
          <option value="">모든 사람</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {/* 타임라인 */}
      {interactions.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전하면 여기에 기록됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const typeInfo = INTERACTION_TYPE_LABELS[interaction.interaction_type];
            const TypeIcon = typeInfo?.icon ? INTERACTION_ICONS[typeInfo.icon] : MessageCircle;

            return (
              <div
                key={interaction.id}
                className="bg-base-200 rounded-xl p-4 space-y-2"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {TypeIcon && <TypeIcon className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <span className="font-medium">{interaction.person?.name || '알 수 없음'}</span>
                      <span className="text-xs text-base-content/60 ml-2">
                        {typeInfo?.label || interaction.interaction_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-base-content/60">
                      {formatDate(interaction.interaction_date)}
                    </span>
                    {/* 더보기 메뉴 */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === interaction.id ? null : interaction.id);
                        }}
                        className="btn btn-ghost btn-circle btn-sm"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === interaction.id && (
                        <div className="absolute right-0 top-full mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 py-1 z-50 min-w-[130px]">
                          {interaction.person && (
                            <button
                              onClick={() => handleOpenPersonModal(interaction.person!)}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200 w-full text-left"
                            >
                              <User className="w-4 h-4" />
                              인물 정보 수정
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(interaction)}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200 w-full text-left"
                          >
                            <Pencil className="w-4 h-4" />
                            편집
                          </button>
                          <button
                            onClick={() => handleDeleteClick(interaction)}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200 w-full text-left text-error"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 내용 */}
                {interaction.gratitude_note && (
                  <div className="text-sm">
                    <span className="text-pink-500 font-medium">감사: </span>
                    {interaction.gratitude_note}
                  </div>
                )}
                {interaction.recent_news && (
                  <div className="text-sm">
                    <span className="text-blue-500 font-medium">소식: </span>
                    {interaction.recent_news}
                  </div>
                )}
                {interaction.description && (
                  <div className="text-sm">
                    <span className="text-green-500 font-medium">해드리고 싶은 것: </span>
                    {interaction.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 편집 모달 */}
      <dialog ref={editDialogRef} className="modal z-[110]">
        <div className="modal-box max-w-md">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => editDialogRef.current?.close()}
              className="btn btn-ghost btn-sm rounded-full"
            >
              취소
            </button>
            <h3 className="font-bold text-lg">기록 편집</h3>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="btn btn-primary btn-sm rounded-full"
            >
              {isSaving ? <span className="loading loading-spinner loading-xs"></span> : '저장'}
            </button>
          </div>

          {/* 편집 폼 */}
          <div className="space-y-4">
            {/* 상호작용 유형 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">연락 방식</span>
              </label>
              <select
                value={editForm.interaction_type || ''}
                onChange={(e) => setEditForm({ ...editForm, interaction_type: e.target.value as InteractionType })}
                className="select select-bordered w-full"
              >
                {Object.entries(INTERACTION_TYPE_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 감사한 점 */}
            <div>
              <label className="label">
                <span className="label-text font-medium text-pink-500">감사한 점</span>
              </label>
              <textarea
                value={editForm.gratitude_note || ''}
                onChange={(e) => setEditForm({ ...editForm, gratitude_note: e.target.value })}
                placeholder="어떤 점이 감사했나요?"
                className="textarea textarea-bordered w-full h-20"
              />
            </div>

            {/* 소식 */}
            <div>
              <label className="label">
                <span className="label-text font-medium text-blue-500">소식</span>
              </label>
              <textarea
                value={editForm.recent_news || ''}
                onChange={(e) => setEditForm({ ...editForm, recent_news: e.target.value })}
                placeholder="어떤 소식을 들었나요?"
                className="textarea textarea-bordered w-full h-20"
              />
            </div>

            {/* 해드리고 싶은 것 */}
            <div>
              <label className="label">
                <span className="label-text font-medium text-green-500">해드리고 싶은 것</span>
              </label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="무엇을 해드리고 싶나요?"
                className="textarea textarea-bordered w-full h-20"
              />
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* 삭제 확인 모달 */}
      <dialog ref={deleteDialogRef} className="modal z-[110]">
        <div className="modal-box max-w-sm">
          <h3 className="font-bold text-lg mb-4">기록 삭제</h3>
          <p className="text-base-content/70">
            이 기록을 삭제하시겠습니까?<br />
            삭제된 기록은 복구할 수 없습니다.
          </p>
          <div className="modal-action">
            <button
              onClick={() => deleteDialogRef.current?.close()}
              className="btn btn-ghost rounded-full"
            >
              취소
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="btn btn-error rounded-full"
            >
              {isSaving ? <span className="loading loading-spinner loading-xs"></span> : '삭제'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* 인물 수정 모달 */}
      <AddPersonModal
        userId={userId}
        isOpen={isPersonModalOpen}
        onClose={handleClosePersonModal}
        editingPerson={editingPerson}
      />
    </div>
  );
}
