'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, User, ChevronRight, Clock, Heart } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { RELATIONSHIP_LABELS, PRIORITY_LABELS } from '@/types/cherished-people';
import type { CherishedPerson, RelationshipType } from '@/types/cherished-people';
import AddPersonModal from './AddPersonModal';

interface CherishedPeopleListProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 소중한 사람 목록 시트
 * 설정 > 관계 균형 섹션에서 "소중한 사람 관리" 클릭 시 열림
 */
export default function CherishedPeopleList({
  userId,
  isOpen,
  onClose,
}: CherishedPeopleListProps) {
  const {
    people,
    isLoadingPeople,
    loadPeople,
    recommendations,
    loadRecommendations,
    openAddPersonModal,
    showAddPersonModal,
    closeAddPersonModal,
    editingPerson,
  } = useCherishedPeopleStore();

  // 데이터 로드
  useEffect(() => {
    if (isOpen && userId) {
      loadPeople(userId);
      loadRecommendations(userId, 7);
    }
  }, [isOpen, userId, loadPeople, loadRecommendations]);

  // 사람 추가 클릭
  const handleAddPerson = () => {
    openAddPersonModal();
  };

  // 사람 편집 클릭
  const handleEditPerson = (person: CherishedPerson) => {
    openAddPersonModal(person);
  };

  // 7일 이상 연락 안 한 사람인지 확인
  const getDaysSinceLastContact = (person: CherishedPerson): number => {
    const rec = recommendations.find(r => r.person.id === person.id);
    return rec?.daysSinceLastContact ?? 0;
  };

  if (!isOpen) return null;

  return (
    <>
      <dialog open className="modal z-[110]">
        <div className="modal-box max-w-md max-h-[90vh] p-0 overflow-hidden">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-base-100 px-4 pt-4 pb-3 border-b border-base-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                소중한 사람들
              </h3>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* 로딩 */}
            {isLoadingPeople ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : (
              <>
                {/* 사람 목록 */}
                <div className="space-y-2">
                  {people.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                      <p className="text-base-content/60">
                        아직 등록된 소중한 사람이 없어요
                      </p>
                      <p className="text-sm text-base-content/40 mt-1">
                        마음을 전하고 싶은 분을 추가해보세요
                      </p>
                    </div>
                  ) : (
                    people.map((person) => {
                      const daysSince = getDaysSinceLastContact(person);
                      const isOverdue = daysSince >= 7 || daysSince === -1;

                      return (
                        <motion.button
                          key={person.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleEditPerson(person)}
                          className="w-full p-4 rounded-xl bg-base-200 hover:bg-base-300 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{person.name}</span>
                                {person.priority > 0 && (
                                  <span className={`text-xs ${PRIORITY_LABELS[person.priority].color}`}>
                                    {PRIORITY_LABELS[person.priority].label}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                {person.relationship && (
                                  <span className="text-xs text-base-content/50">
                                    {RELATIONSHIP_LABELS[person.relationship as RelationshipType]}
                                  </span>
                                )}
                                {person.last_interaction_at && (
                                  <span className="text-xs text-base-content/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {CherishedPeopleService.formatDaysSince(daysSince)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isOverdue && (
                                <span className="badge badge-warning badge-sm">연락 필요</span>
                              )}
                              <ChevronRight className="w-4 h-4 text-base-content/40" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })
                  )}

                  {/* 새 사람 추가 버튼 */}
                  <button
                    onClick={handleAddPerson}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-base-300 text-base-content/60 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    소중한 사람 추가하기
                  </button>
                </div>

                {/* 통계 정보 */}
                {people.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl bg-pink-50 border border-pink-200">
                    <p className="text-sm text-pink-700 text-center">
                      <span className="font-semibold">{people.length}</span>명의 소중한 사람,{' '}
                      <span className="font-semibold">
                        {people.reduce((sum, p) => sum + p.interaction_count, 0)}
                      </span>번의 마음 전함
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </dialog>

      {/* 사람 추가/편집 모달 */}
      {showAddPersonModal && (
        <AddPersonModal
          userId={userId}
          isOpen={showAddPersonModal}
          onClose={closeAddPersonModal}
          editingPerson={editingPerson}
        />
      )}
    </>
  );
}
