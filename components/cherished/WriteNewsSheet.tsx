'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Plus, Clock, Heart, Gift, MessageCircle, Search } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useBalanceStore } from '@/state/stores/balanceStore';
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

  const { settings } = useBalanceStore();

  const [step, setStep] = useState<Step>('select-person');
  const [selectedPerson, setSelectedPerson] = useState<CherishedPerson | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>('');

  // 검색+생성 통합
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링 로직
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(person =>
      person.name.toLowerCase().includes(query)
    );
  }, [people, searchQuery]);

  // 검색어와 정확히 일치하는 사람이 있는지 확인
  const exactMatchExists = useMemo(() => {
    return people.some(
      person => person.name.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [people, searchQuery]);

  // 새 사람 추가 가능 여부 (검색어 있고 + 정확히 일치 없음)
  const canCreateNew = searchQuery.trim() && !exactMatchExists;

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
    setSearchQuery('');
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

  // 검색어로 새 사람 추가
  const handleAddNewPersonFromSearch = async () => {
    if (!searchQuery.trim()) return;

    const person = await addPerson(userId, { name: searchQuery.trim() });
    if (person) {
      setSelectedPerson(person);
      setSearchQuery('');
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
                      &ldquo;{reminderMessage}&rdquo;
                    </p>
                  </div>
                )}

                {/* 검색 입력란 */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름을 검색하거나 새로 추가하세요"
                    className="w-full h-10 pl-10 pr-10 rounded-lg bg-base-200 border-0 text-sm placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-base-300"
                    >
                      <X className="w-4 h-4 text-base-content/40" />
                    </button>
                  )}
                </div>

                {/* 새 사람 추가 버튼 (검색어가 있고, 정확히 일치하는 사람이 없을 때) */}
                {canCreateNew && (
                  <button
                    onClick={handleAddNewPersonFromSearch}
                    className="w-full p-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-left transition-colors flex items-center gap-2 mb-3"
                  >
                    <Plus className="w-4 h-4" />
                    <span>&quot;{searchQuery}&quot;</span> 새로 추가
                  </button>
                )}

                {/* 검색 결과 또는 추천/전체 목록 */}
                {searchQuery.trim() ? (
                  // 검색어가 있을 때: 필터링된 목록
                  <div className="space-y-2">
                    {filteredPeople.length > 0 ? (
                      filteredPeople.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => handleSelectPerson(person)}
                          className="w-full p-3 rounded-xl bg-base-200 hover:bg-base-300 text-left transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{person.name}</span>
                          {isOverdue(person) && (
                            <span className="badge badge-warning badge-sm">오래됨</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-base-content/50 py-4">
                        검색 결과가 없습니다
                      </p>
                    )}
                  </div>
                ) : (
                  // 검색어 없을 때: 추천 섹션 + 전체 목록
                  <>
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
                          className="w-full p-3 rounded-xl bg-base-200 hover:bg-base-300 text-left transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{person.name}</span>
                          {isOverdue(person) && (
                            <span className="badge badge-warning badge-sm">오래됨</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                    {settings?.gift_hint_message || '커피 한 잔의 마음도 좋아요'}
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
