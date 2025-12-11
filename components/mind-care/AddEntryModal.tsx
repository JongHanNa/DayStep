'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Check } from 'lucide-react';
import { useMindCareStore } from '@/state/stores/mindCareStore';
import { useAuth } from '@/app/context/AuthContext';
import {
  ENTRY_TYPE_LABELS,
  MOOD_LABELS,
  SUGGESTED_TAGS,
  type MindCareEntryType,
  type MoodLevel,
} from '@/types/mind-care';
import { format } from 'date-fns';

export default function AddEntryModal() {
  const { user } = useAuth();
  const {
    showAddEntryModal,
    editingEntry,
    defaultEntryType,
    closeAddEntryModal,
    addEntry,
    updateEntry,
    deleteEntry,
    loadEntries,
  } = useMindCareStore();

  // 폼 상태
  const [entryType, setEntryType] = useState<MindCareEntryType>(defaultEntryType);
  const [content, setContent] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [insight, setInsight] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [moodRating, setMoodRating] = useState<MoodLevel | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editingEntry) {
      setEntryType(editingEntry.entry_type);
      setContent(editingEntry.content);
      setSourceText(editingEntry.source_text || '');
      setSourceReference(editingEntry.source_reference || '');
      setInsight(editingEntry.insight || '');
      setEntryDate(editingEntry.entry_date);
      setMoodRating(editingEntry.mood_rating);
      setTags(editingEntry.tags || []);
      setReminderEnabled(editingEntry.reminder_enabled);
    } else {
      setEntryType(defaultEntryType);
      setContent('');
      setSourceText('');
      setSourceReference('');
      setInsight('');
      setEntryDate(format(new Date(), 'yyyy-MM-dd'));
      setMoodRating(null);
      setTags([]);
      setReminderEnabled(false);
    }
  }, [editingEntry, defaultEntryType]);

  // 태그 토글
  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 저장
  const handleSave = async () => {
    if (!user?.id || !content.trim()) return;

    setIsSaving(true);
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, user.id, {
          content: content.trim(),
          source_text: sourceText.trim() || null,
          source_reference: sourceReference.trim() || null,
          insight: insight.trim() || null,
          entry_date: entryDate,
          mood_rating: moodRating,
          tags: tags.length > 0 ? tags : null,
          reminder_enabled: reminderEnabled,
        });
      } else {
        await addEntry(user.id, {
          entry_type: entryType,
          content: content.trim(),
          source_text: sourceText.trim() || undefined,
          source_reference: sourceReference.trim() || undefined,
          insight: insight.trim() || undefined,
          entry_date: entryDate,
          mood_rating: moodRating || undefined,
          tags: tags.length > 0 ? tags : undefined,
          reminder_enabled: reminderEnabled,
        });
      }
      closeAddEntryModal();
      loadEntries(user.id, entryType);
    } catch (error) {
      console.error('저장 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!user?.id || !editingEntry) return;

    setIsSaving(true);
    try {
      await deleteEntry(editingEntry.id, user.id);
      closeAddEntryModal();
      loadEntries(user.id, entryType);
    } catch (error) {
      console.error('삭제 오류:', error);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!showAddEntryModal) return null;

  return (
    <dialog open className="modal z-[120]">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="modal-box max-w-lg h-[85vh] max-h-[85vh] p-0 flex flex-col"
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 px-4 pt-4 pb-3 border-b border-base-200 flex items-center justify-between">
          <button
            onClick={closeAddEntryModal}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-semibold">
            {editingEntry ? '기록 수정' : '새 기록'}
          </h3>

          <div className="flex items-center gap-2">
            {editingEntry && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-ghost btn-sm btn-circle text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="btn btn-primary btn-sm rounded-full px-4"
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 유형 선택 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              유형
            </label>
            <div className="flex gap-2">
              {(['reflection', 'comfort', 'gratitude'] as MindCareEntryType[]).map((type) => {
                const typeInfo = ENTRY_TYPE_LABELS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setEntryType(type)}
                    className={`btn btn-sm rounded-full flex-1 ${
                      entryType === type ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {typeInfo.emoji} {typeInfo.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 날짜 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              날짜
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          {/* 읽은 글 / 인용문 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              마음에 닿은 글 <span className="text-base-content/40">(선택)</span>
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="기억하고 싶은 문장을 적어보세요..."
              className="textarea textarea-bordered w-full min-h-20"
            />
          </div>

          {/* 출처 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              출처 <span className="text-base-content/40">(선택)</span>
            </label>
            <input
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="책 이름, 영상, 웹사이트 등"
              className="input input-bordered w-full"
            />
          </div>

          {/* 메인 내용 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              {entryType === 'reflection' && '나의 생각 / 깨달은 점'}
              {entryType === 'comfort' && '위로받은 이유'}
              {entryType === 'gratitude' && '감사한 것들'}
              <span className="text-error ml-1">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                entryType === 'reflection'
                  ? '이 글을 통해 느낀 점, 깨달은 점을 적어보세요...'
                  : entryType === 'comfort'
                  ? '이 순간이 왜 마음에 닿았나요?'
                  : '오늘 감사한 것들을 적어보세요...'
              }
              className="textarea textarea-bordered w-full min-h-28"
            />
          </div>

          {/* 기분 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              지금 기분 <span className="text-base-content/40">(선택)</span>
            </label>
            <div className="flex justify-between">
              {MOOD_LABELS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setMoodRating(moodRating === mood.value ? null : mood.value)}
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    moodRating === mood.value
                      ? 'bg-primary/20'
                      : 'hover:bg-base-200'
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs text-base-content/60 mt-1">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              태그 <span className="text-base-content/40">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS[entryType].map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`badge badge-lg cursor-pointer ${
                    tags.includes(tag) ? 'badge-primary' : 'badge-ghost'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* 리마인더 (위로 유형만) */}
          {entryType === 'comfort' && (
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <p className="text-sm font-medium">나중에 다시 보여주기</p>
                <p className="text-xs text-base-content/60">
                  힘들 때 이 기록을 다시 보여드려요
                </p>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="toggle toggle-primary"
              />
            </div>
          )}
        </div>

        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-base-100 p-6 rounded-2xl mx-4 max-w-sm">
              <h4 className="text-lg font-bold mb-2">기록을 삭제할까요?</h4>
              <p className="text-sm text-base-content/70 mb-4">
                삭제된 기록은 복구할 수 없어요.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-ghost flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="btn btn-error flex-1"
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={closeAddEntryModal}>close</button>
      </form>
    </dialog>
  );
}
