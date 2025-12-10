'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Plus, Clock, Heart, Gift, MessageCircle } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type { CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import { INTERACTION_TYPE_LABELS, FEELING_RATINGS } from '@/types/cherished-people';

interface WriteNewsSheetProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select-person' | 'write-news';

/**
 * 소식 적어보기 시트
 * ADHDEntryScreen에서 "마음 전해보기" 클릭 시 열림
 */
export default function WriteNewsSheet({ userId, isOpen, onClose }: WriteNewsSheetProps) {
  const {
    people,
    recommendations,
    loadPeople,
    loadRecommendations,
    addPerson,
    addInteraction,
  } = useCherishedPeopleStore();

  const [step, setStep] = useState<Step>('select-person');
  const [selectedPerson, setSelectedPerson] = useState<CherishedPerson | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>('');

  // 새 사람 추가 모드
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  // 소식 작성 폼
  const [interactionType, setInteractionType] = useState<InteractionType>('message');
  const [recentNews, setRecentNews] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [giftPlan, setGiftPlan] = useState('');
  const [feelingRating, setFeelingRating] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 로드 및 성찰 메시지
  useEffect(() => {
    if (isOpen && userId) {
      loadPeople(userId);
      loadRecommendations(userId, 7);
      loadReminderMessage();
    }
  }, [isOpen, userId, loadPeople, loadRecommendations]);

  // 성찰 메시지 로드
  const loadReminderMessage = async () => {
    const reminder = await CherishedPeopleService.getRandomPriorityReminder();
    if (reminder) {
      setReminderMessage(reminder.message_text);
    }
  };

  // 시트 닫기
  const handleClose = () => {
    setStep('select-person');
    setSelectedPerson(null);
    setIsAddingNew(false);
    setNewPersonName('');
    resetForm();
    onClose();
  };

  // 폼 리셋
  const resetForm = () => {
    setInteractionType('message');
    setRecentNews('');
    setGratitudeNote('');
    setGiftPlan('');
    setFeelingRating(null);
  };

  // 사람 선택
  const handleSelectPerson = (person: CherishedPerson) => {
    setSelectedPerson(person);
    setStep('write-news');
  };

  // 새 사람 추가
  const handleAddNewPerson = async () => {
    if (!newPersonName.trim()) return;

    const person = await addPerson(userId, { name: newPersonName.trim() });
    if (person) {
      setSelectedPerson(person);
      setIsAddingNew(false);
      setNewPersonName('');
      setStep('write-news');
    }
  };

  // 소식 저장
  const handleSave = async () => {
    if (!selectedPerson) return;

    setIsSaving(true);
    try {
      const input: CareInteractionInput = {
        person_id: selectedPerson.id,
        interaction_type: interactionType,
        interaction_date: CherishedPeopleService.getTodayDateString(),
        description: giftPlan.trim() || undefined,
        gratitude_note: gratitudeNote.trim() || undefined,
        recent_news: recentNews.trim() || undefined,
        feeling_rating: feelingRating ?? undefined,
      };

      await addInteraction(userId, input);
      handleClose();
    } catch (error) {
      console.error('소식 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    setStep('select-person');
    setSelectedPerson(null);
    resetForm();
  };

  // 7일 이상 연락 안 한 사람인지 확인
  const isOverdue = (person: CherishedPerson) => {
    const rec = recommendations.find(r => r.person.id === person.id);
    return rec && (rec.daysSinceLastContact >= 7 || rec.daysSinceLastContact === -1);
  };

  if (!isOpen) return null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box max-w-md max-h-[90vh] p-0 overflow-hidden">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 px-4 pt-4 pb-3 border-b border-base-200">
          <div className="flex items-center justify-between">
            {step === 'write-news' ? (
              <button
                onClick={handleBack}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <h3 className="text-lg font-bold">
              {step === 'select-person' ? '마음 전해보기' : selectedPerson?.name}
            </h3>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <AnimatePresence mode="wait">
            {step === 'select-person' ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* 성찰 메시지 */}
                {reminderMessage && (
                  <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 mb-4">
                    <p className="text-sm text-pink-700 text-center italic">
                      "{reminderMessage}"
                    </p>
                  </div>
                )}

                {/* 질문 프롬프트 */}
                <p className="text-center text-base-content/70 mb-4">
                  요즘 누구의 소식이 궁금하세요?
                </p>

                {/* 추천 섹션 (7일 이상 연락 안 한 사람) */}
                {recommendations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-base-content/50 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      오래 연락 안 한 분들
                    </p>
                    <div className="space-y-2">
                      {recommendations.slice(0, 3).map((rec) => (
                        <button
                          key={rec.person.id}
                          onClick={() => handleSelectPerson(rec.person)}
                          className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{rec.person.name}</span>
                            <span className="text-xs text-amber-600">
                              {CherishedPeopleService.formatDaysSince(rec.daysSinceLastContact)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 전체 목록 */}
                <div className="space-y-2">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleSelectPerson(person)}
                      className={`w-full p-3 rounded-xl text-left transition-colors flex items-center justify-between ${
                        isOverdue(person)
                          ? 'bg-base-200 hover:bg-base-300'
                          : 'bg-base-200 hover:bg-base-300'
                      }`}
                    >
                      <span className="font-medium">{person.name}</span>
                      {isOverdue(person) && (
                        <span className="badge badge-warning badge-sm">오래됨</span>
                      )}
                    </button>
                  ))}

                  {/* 새 사람 추가 */}
                  {isAddingNew ? (
                    <div className="p-3 rounded-xl bg-base-200 space-y-3">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="이름을 입력하세요"
                        className="input input-bordered w-full"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsAddingNew(false)}
                          className="btn btn-ghost flex-1"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleAddNewPerson}
                          disabled={!newPersonName.trim()}
                          className="btn btn-primary flex-1"
                        >
                          추가
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingNew(true)}
                      className="w-full p-3 rounded-xl border-2 border-dashed border-base-300 text-base-content/60 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      새로운 소중한 사람 추가
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="write"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* 어떻게 연락했나요? */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    어떻게 마음을 전했나요?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(INTERACTION_TYPE_LABELS) as [InteractionType, { label: string; emoji: string }][]).map(
                      ([type, { label, emoji }]) => (
                        <button
                          key={type}
                          onClick={() => setInteractionType(type)}
                          className={`p-2 rounded-lg text-center transition-all ${
                            interactionType === type
                              ? 'bg-primary text-primary-content scale-105'
                              : 'bg-base-200 hover:bg-base-300'
                          }`}
                        >
                          <div className="text-lg">{emoji}</div>
                          <div className="text-xs mt-1">{label}</div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* 들은 소식 */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    요즘 그분은 어떻게 지내고 계세요?
                  </p>
                  <textarea
                    value={recentNews}
                    onChange={(e) => setRecentNews(e.target.value)}
                    placeholder="들은 소식을 적어보세요..."
                    className="textarea textarea-bordered w-full h-24 resize-none"
                  />
                </div>

                {/* 감사했던 점 */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    감사했던 점이 있다면?
                  </p>
                  <textarea
                    value={gratitudeNote}
                    onChange={(e) => setGratitudeNote(e.target.value)}
                    placeholder="선택사항"
                    className="textarea textarea-bordered w-full h-20 resize-none"
                  />
                </div>

                {/* 선물/도움 계획 */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" />
                    해드리고 싶은 것이 있나요?
                  </p>
                  <p className="text-xs text-base-content/50 mb-2">
                    커피 한 잔의 마음도 좋아요
                  </p>
                  <textarea
                    value={giftPlan}
                    onChange={(e) => setGiftPlan(e.target.value)}
                    placeholder="작은 선물, 도움, 함께하는 시간..."
                    className="textarea textarea-bordered w-full h-20 resize-none"
                  />
                </div>

                {/* 느낌 */}
                <div>
                  <p className="text-sm font-medium mb-2">오늘 기분은 어때요?</p>
                  <div className="flex justify-between">
                    {FEELING_RATINGS.map(({ value, emoji, label }) => (
                      <button
                        key={value}
                        onClick={() => setFeelingRating(value)}
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          feelingRating === value
                            ? 'bg-primary/20 scale-110'
                            : 'hover:bg-base-200'
                        }`}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-xs mt-1 text-base-content/60">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary w-full rounded-full"
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    '마음 전하기 완료'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
