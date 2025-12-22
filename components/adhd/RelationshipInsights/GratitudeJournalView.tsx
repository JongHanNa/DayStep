'use client';

import { useState, useEffect, useRef } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { INTERACTION_TYPE_LABELS, FEELING_RATINGS } from '@/types/cherished-people';
import type { CareInteraction, CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Heart, User, MoreVertical, Pencil, Trash2,
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Sparkles,
  Frown, Meh, Smile, SmilePlus, HeartHandshake,
  type LucideIcon,
} from 'lucide-react';

// Lucide 아이콘 매핑
const INTERACTION_ICONS: Record<string, LucideIcon> = {
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Heart, Sparkles,
};

const FEELING_ICONS: Record<string, LucideIcon> = {
  Frown, Meh, Smile, SmilePlus, HeartHandshake,
};

interface GratitudeJournalViewProps {
  userId: string;
}

export function GratitudeJournalView({ userId }: GratitudeJournalViewProps) {
  const [notes, setNotes] = useState<{ interaction: CareInteraction; person?: CherishedPerson }[]>([]);
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
      const [notesData, peopleData] = await Promise.all([
        CherishedPeopleService.getGratitudeNotes(userId, selectedPersonId || undefined),
        CherishedPeopleService.getPeople(userId),
      ]);
      setNotes(notesData);
      setPeople(peopleData);
    } catch (error) {
      console.error('감사 노트 로드 오류:', error);
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
  const handleEdit = (interaction: CareInteraction, person?: CherishedPerson) => {
    setEditingInteraction({ ...interaction, person });
    setEditForm({
      interaction_type: interaction.interaction_type,
      gratitude_note: interaction.gratitude_note || '',
      recent_news: interaction.recent_news || '',
      description: interaction.description || '',
      feeling_rating: interaction.feeling_rating || undefined,
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

  // 사람별로 그룹화
  const groupedByPerson = notes.reduce((acc, item) => {
    const personId = item.interaction.person_id;
    const personName = item.person?.name || '알 수 없음';
    if (!acc[personId]) {
      acc[personId] = {
        personName,
        person: item.person,
        notes: [],
      };
    }
    acc[personId].notes.push(item);
    return acc;
  }, {} as Record<string, { personName: string; person?: CherishedPerson; notes: typeof notes }>);

  // SearchableSelect용 옵션 변환
  const peopleOptions = people.map((person) => ({
    id: person.id,
    label: person.name,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 사람 필터 (검색 가능) */}
      <div className="mb-4">
        <SearchableSelect
          options={peopleOptions}
          value={selectedPersonId}
          onChange={setSelectedPersonId}
          allOptionLabel="모든 사람"
          className="w-full max-w-xs"
        />
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 감사 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전할 때 감사한 점을 남겨보세요</p>
        </div>
      ) : selectedPersonId ? (
        // 특정 사람 선택 시 리스트로 표시
        <div className="space-y-3">
          {notes.map(({ interaction, person }) => (
            <div key={interaction.id} className="bg-base-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base-content">{interaction.gratitude_note}</p>
                  <p className="text-xs text-base-content/60 mt-2">
                    {formatDate(interaction.interaction_date)}
                  </p>
                </div>
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
                    <div className="absolute right-0 top-full mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 py-1 z-50 min-w-[100px]">
                      <button
                        onClick={() => handleEdit(interaction, person)}
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
          ))}
        </div>
      ) : (
        // 모든 사람: 사람별로 그룹화하여 표시
        <div className="space-y-6">
          {Object.entries(groupedByPerson).map(([personId, { personName, person, notes: personNotes }]) => (
            <div key={personId}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold">{personName}님께 감사한 점들</h3>
                <span className="text-xs text-base-content/60">({personNotes.length})</span>
              </div>
              <div className="space-y-2 pl-10">
                {personNotes.slice(0, 5).map(({ interaction }) => (
                  <div key={interaction.id} className="bg-base-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{interaction.gratitude_note}</p>
                        <p className="text-xs text-base-content/60 mt-1">
                          {formatDate(interaction.interaction_date)}
                        </p>
                      </div>
                      {/* 더보기 메뉴 */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === interaction.id ? null : interaction.id);
                          }}
                          className="btn btn-ghost btn-circle btn-xs"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                        {openMenuId === interaction.id && (
                          <div className="absolute right-0 top-full mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 py-1 z-50 min-w-[100px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(interaction, person);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200 w-full text-left"
                            >
                              <Pencil className="w-4 h-4" />
                              편집
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(interaction);
                              }}
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
                ))}
                {personNotes.length > 5 && (
                  <button
                    onClick={() => setSelectedPersonId(personId)}
                    className="text-sm text-primary hover:underline"
                  >
                    +{personNotes.length - 5}개 더 보기
                  </button>
                )}
              </div>
            </div>
          ))}
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
                <span className="label-text font-medium text-primary">감사한 점</span>
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
                <span className="label-text font-medium text-info">소식</span>
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
                <span className="label-text font-medium text-success">해드리고 싶은 것</span>
              </label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="무엇을 해드리고 싶나요?"
                className="textarea textarea-bordered w-full h-20"
              />
            </div>

            {/* 느낀 감정 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">느낀 감정</span>
              </label>
              <div className="flex justify-between">
                {FEELING_RATINGS.map(({ value, icon, label }) => {
                  const IconComponent = FEELING_ICONS[icon];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, feeling_rating: value })}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                        editForm.feeling_rating === value
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'hover:bg-base-200'
                      }`}
                      title={label}
                    >
                      {IconComponent && <IconComponent className="w-6 h-6" />}
                      <span className="text-xs mt-1 text-base-content/60">{label}</span>
                    </button>
                  );
                })}
              </div>
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
    </div>
  );
}
