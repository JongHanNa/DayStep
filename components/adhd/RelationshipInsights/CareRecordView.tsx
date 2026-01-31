'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Plus,
  Heart,
  Gift,
  MessageCircle,
  Check,
  Users,
  Search,
  X,
  Phone,
  Home,
  Utensils,
  Mail,
  HandHelping,
  Sparkles,
  MoreVertical,
  Pencil,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import AddPersonModal from '../../cherished/AddPersonModal';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useRelationshipStore } from '@/state/stores/relationshipStore';
import { useRoleStore } from '@/state/stores/roleStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { DepartmentService } from '@/services/department.service';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import type { CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import type { PersonDepartment } from '@/types/department';
import { INTERACTION_TYPE_LABELS } from '@/types/cherished-people';

interface CareRecordViewProps {
  userId: string;
}

type ViewState = 'select-person' | 'write-news' | 'completed';

// Lucide 아이콘 매핑 객체
const INTERACTION_ICONS: Record<string, LucideIcon> = {
  Phone,
  MessageCircle,
  Home,
  Utensils,
  Gift,
  Mail,
  HandHelping,
  Heart,
  Sparkles,
};

/**
 * 관계 기록 뷰 - CareMode에서 기록 기능만 분리
 * RelationshipInsightsMode의 '기록' 탭에서 사용
 */
export function CareRecordView({ userId }: CareRecordViewProps) {
  const {
    careMode,
    setCareModePerson,
    setCareModeLinkedTodo,
    endCareMode,
  } = useADHDModeStore();

  const {
    people,
    recommendations,
    loadPeople,
    loadRecommendations,
    addPerson,
    addInteractionWithTodo,
    showAddPersonModal,
    closeAddPersonModal,
    editingPerson,
    openAddPersonModal,
    deactivatePerson,
  } = useCherishedPeopleStore();

  const {
    departments,
    fetchDepartments,
  } = useDepartmentStore();

  const {
    relationships,
    fetchRelationships,
    getPersonRelationshipIds,
    fetchAllPersonRelationships,
    personRelationshipMap,
  } = useRelationshipStore();

  const {
    roles,
    fetchRoles,
    getPersonRoleIds,
    fetchAllPersonRoles,
    personRoleMap,
  } = useRoleStore();

  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  const [viewState, setViewState] = useState<ViewState>('select-person');
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [personToDelete, setPersonToDelete] = useState<CherishedPerson | null>(null);

  // 검색+생성 통합
  const [searchQuery, setSearchQuery] = useState('');

  // 아코디언 상태
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(true);
  const [isPeopleOpen, setIsPeopleOpen] = useState(true);

  // 필터링 상태
  const [filterRelationship, setFilterRelationship] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  // person-department 매핑 캐시
  const [personDepartmentMap, setPersonDepartmentMap] = useState<Map<string, string[]>>(new Map());

  // 검색어와 정확히 일치하는 사람이 있는지 확인
  const exactMatchExists = useMemo(() => {
    return people.some(
      person => person.name.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [people, searchQuery]);

  // 새 사람 추가 가능 여부 (검색어 있고 + 정확히 일치 없음)
  const canCreateNew = searchQuery.trim() && !exactMatchExists;

  // 사용 중인 관계/역할 ID 추출 (필터 드롭다운용)
  const usedRelationshipIds = useMemo(() => {
    const ids = new Set<string>();
    personRelationshipMap.forEach((relIds) => {
      relIds.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [personRelationshipMap]);

  const usedRoleIds = useMemo(() => {
    const ids = new Set<string>();
    personRoleMap.forEach((roleIds) => {
      roleIds.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [personRoleMap]);

  // 필터 드롭다운에 표시할 관계/역할 목록
  const filterRelationships = useMemo(() =>
    relationships.filter(r => usedRelationshipIds.includes(r.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [relationships, usedRelationshipIds]);
  const filterRoles = useMemo(() =>
    roles.filter(r => usedRoleIds.includes(r.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [roles, usedRoleIds]);

  // 필터 함수 (ID 기반)
  const matchesFilter = useCallback((person: CherishedPerson) => {
    if (filterRelationship) {
      const personRelIds = personRelationshipMap.get(person.id) || [];
      if (!personRelIds.includes(filterRelationship)) return false;
    }
    if (filterRole) {
      const personRoleIds = personRoleMap.get(person.id) || [];
      if (!personRoleIds.includes(filterRole)) return false;
    }
    if (filterDepartment) {
      const personDepts = personDepartmentMap.get(person.id) || [];
      if (!personDepts.includes(filterDepartment)) return false;
    }
    return true;
  }, [filterRelationship, filterRole, filterDepartment, personRelationshipMap, personRoleMap, personDepartmentMap]);

  // 관계/역할 이름 조회 헬퍼
  const getRelationshipNames = useCallback((personId: string) => {
    const relIds = personRelationshipMap.get(personId) || [];
    return relIds
      .map(id => relationships.find(r => r.id === id)?.name)
      .filter(Boolean) as string[];
  }, [personRelationshipMap, relationships]);

  const getRoleNames = useCallback((personId: string) => {
    const roleIds = personRoleMap.get(personId) || [];
    return roleIds
      .map(id => roles.find(r => r.id === id)?.name)
      .filter(Boolean) as string[];
  }, [personRoleMap, roles]);

  // 필터링된 추천 목록 (오래 연락 안한 분들)
  const filteredRecommendations = useMemo(() =>
    recommendations.filter(rec => matchesFilter(rec.person)),
    [recommendations, matchesFilter]);

  // 필터링된 전체 목록 (소중한 사람들) - 검색 + 카테고리 필터 적용
  const filteredPeopleByCategory = useMemo(() => {
    let result = people;
    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(person => person.name.toLowerCase().includes(query));
    }
    // 카테고리 필터
    result = result.filter(matchesFilter);
    return result;
  }, [people, searchQuery, matchesFilter]);

  // 소식 작성 폼
  const [interactionType, setInteractionType] = useState<InteractionType | null>(null);
  const [skipInteractionType, setSkipInteractionType] = useState(true); // 소식만 기록할게요 (기본 체크)
  const [recentNews, setRecentNews] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [requestFromThem, setRequestFromThem] = useState(''); // 상대방이 나에게 한 부탁
  const [requestToThem, setRequestToThem] = useState(''); // 내가 상대방에게 한 부탁
  const [meetingNote, setMeetingNote] = useState(''); // 회의 내용
  const [giftPlan, setGiftPlan] = useState('');
  const [createGiftTodo, setCreateGiftTodo] = useState(false); // 할일로 추가하기
  const [giftTodoDate, setGiftTodoDate] = useState(''); // 할일 날짜
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      loadPeople(userId);
      loadRecommendations(userId, 7);
      loadReminderMessage();
      fetchDepartments(userId);
      fetchRelationships(userId);
      fetchRoles(userId);
      fetchAllPersonRelationships(userId);
      fetchAllPersonRoles(userId);

      // person-department 매핑 로드
      const loadPersonDepartmentMap = async () => {
        const mappings = await DepartmentService.getAllPersonDepartments(userId);
        const map = new Map<string, string[]>();
        mappings.forEach((mapping: PersonDepartment) => {
          const existing = map.get(mapping.person_id) || [];
          map.set(mapping.person_id, [...existing, mapping.department_id]);
        });
        setPersonDepartmentMap(map);
      };
      loadPersonDepartmentMap();
    }
  }, [userId, loadPeople, loadRecommendations, fetchDepartments, fetchRelationships, fetchRoles, fetchAllPersonRelationships, fetchAllPersonRoles]);

  // 성찰 메시지 로드
  const loadReminderMessage = async () => {
    const reminder = await CherishedPeopleService.getRandomPriorityReminder();
    if (reminder) {
      setReminderMessage(reminder.message_text);
    }
  };

  // 사람 선택 - 바로 소식 입력으로 이동
  const handleSelectPerson = (person: CherishedPerson) => {
    setCareModePerson(person.id, person.name);
    setViewState('write-news');
  };

  // 검색어로 새 사람 추가 (용량 체크 포함)
  const handleAddNewPersonFromSearch = async () => {
    if (!searchQuery.trim() || !userId) return;

    // 소중한 사람 용량 체크 후 추가
    await checkAndProceed('cherished_people', async () => {
      const person = await addPerson(userId, { name: searchQuery.trim() });
      if (person) {
        onCreateSuccess('cherished_people');
        handleSelectPerson(person);
        setSearchQuery('');
      }
    });
  };

  // 사람 삭제
  const handleDeletePerson = async (person: CherishedPerson) => {
    if (!userId) return;
    await deactivatePerson(person.id, userId);
    setPersonToDelete(null);
    loadPeople(userId);
    loadRecommendations(userId, 7);
  };

  // 모달 닫을 때 데이터 리로드
  const handleCloseAddPersonModal = async () => {
    closeAddPersonModal();
    if (userId) {
      await loadPeople(userId);
      await loadRecommendations(userId, 7);
    }
  };

  // 뒤로가기 - 소식 입력에서 바로 선택 화면으로
  const handleBack = () => {
    if (viewState === 'write-news') {
      setCareModePerson(null as any, null as any);
      // 폼 초기화
      setInteractionType(null);
      setSkipInteractionType(true);
      setRecentNews('');
      setGratitudeNote('');
      setRequestFromThem('');
      setRequestToThem('');
      setMeetingNote('');
      setGiftPlan('');
      setCreateGiftTodo(false);
      setGiftTodoDate('');
      setViewState('select-person');
    }
  };

  // 소식 저장
  const handleSave = async () => {
    if (!careMode.selectedPersonId || !userId) return;

    const input: CareInteractionInput = {
      person_id: careMode.selectedPersonId,
      interaction_type: skipInteractionType ? 'other' : (interactionType || 'other'),
      interaction_date: CherishedPeopleService.getTodayDateString(),
      description: giftPlan.trim() || undefined,
      gratitude_note: gratitudeNote.trim() || undefined,
      recent_news: recentNews.trim() || undefined,
      request_from_them: requestFromThem.trim() || undefined,
      request_to_them: requestToThem.trim() || undefined,
      meeting_note: meetingNote.trim() || undefined,
    };

    // todos 제목 생성
    const todoTitle = `${careMode.selectedPersonName}님 소식 기록`;

    // 용량 체크 후 저장
    await checkAndProceed('care_interaction', async () => {
      setIsSaving(true);
      try {
        // addInteractionWithTodo로 저장 (todos + care_interactions 연결)
        const result = await addInteractionWithTodo(userId, input, todoTitle);

        if (result) {
          onCreateSuccess('care_interaction');
          setCareModeLinkedTodo(result.todoId);

          // 해드리고 싶은 것 할일로 추가
          if (createGiftTodo && giftPlan.trim()) {
            const { useTodoStore } = await import('@/state/stores/todoStore');
            const todoStore = useTodoStore.getState();
            const giftTodoTitle = `${careMode.selectedPersonName}님께: ${giftPlan.trim().slice(0, 30)}${giftPlan.length > 30 ? '...' : ''}`;
            await todoStore.createTodo({
              user_id: userId,
              title: giftTodoTitle,
              schedule_type: giftTodoDate ? 'timed' : 'none',
              start_time: giftTodoDate ? new Date(`${giftTodoDate}T00:00:00+09:00`).toISOString() : undefined,
            });
          }

          setViewState('completed');
        }
      } catch (error) {
        console.error('소식 저장 실패:', error);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // 완료 후 다시 기록하기
  const handleRecordAnother = () => {
    // 폼 초기화
    setCareModePerson(null as any, null as any);
    setInteractionType(null);
    setSkipInteractionType(true);
    setRecentNews('');
    setGratitudeNote('');
    setRequestFromThem('');
    setRequestToThem('');
    setMeetingNote('');
    setGiftPlan('');
    setCreateGiftTodo(false);
    setGiftTodoDate('');
    setViewState('select-person');
  };

  return (
    <div className="p-4">
      {/* 사람 선택 화면 - 항상 표시 */}
      <div className="space-y-4">
            {/* 용량 경고 배너 */}
            <UsageWarningBanner
              entities={['cherished_people', 'care_interaction']}
            />

            {/* 성찰 메시지 */}
            {reminderMessage && (
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950">
                <p className="text-sm text-sky-700 dark:text-sky-300 text-center italic">
                  &ldquo;{reminderMessage}&rdquo;
                </p>
              </div>
            )}

            {/* 검색 입력란 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름을 검색하거나 새로 추가하세요"
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-base-200 border-0 text-base placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
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

            {/* 필터 드롭다운 */}
            {(filterRelationships.length > 0 || filterRoles.length > 0 || departments.length > 0) && (
              <div className="flex gap-2 flex-wrap">
                {filterRelationships.length > 0 && (
                  <select
                    value={filterRelationship || ''}
                    onChange={(e) => setFilterRelationship(e.target.value || null)}
                    className="select select-xs select-bordered bg-base-200"
                  >
                    <option value="">관계 전체</option>
                    {filterRelationships.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                {filterRoles.length > 0 && (
                  <select
                    value={filterRole || ''}
                    onChange={(e) => setFilterRole(e.target.value || null)}
                    className="select select-xs select-bordered bg-base-200"
                  >
                    <option value="">역할 전체</option>
                    {filterRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                {departments.length > 0 && (
                  <select
                    value={filterDepartment || ''}
                    onChange={(e) => setFilterDepartment(e.target.value || null)}
                    className="select select-xs select-bordered bg-base-200"
                  >
                    <option value="">부서 전체</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* 새 사람 추가 버튼 (검색어가 있고, 정확히 일치하는 사람이 없을 때) */}
            {canCreateNew && (
              <button
                onClick={handleAddNewPersonFromSearch}
                className="w-full p-4 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-left transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>&quot;{searchQuery}&quot;</span> 새로 추가
              </button>
            )}

            {/* 검색 결과 또는 추천/전체 목록 */}
            {searchQuery.trim() ? (
              // 검색어가 있을 때: 필터링된 목록
              <div className="space-y-2">
                {filteredPeopleByCategory.length > 0 ? (
                  filteredPeopleByCategory.map((person) => {
                    const rec = recommendations.find(r => r.person.id === person.id);
                    const days = rec?.daysSinceLastContact;
                    return (
                      <button
                        key={person.id}
                        onClick={() => handleSelectPerson(person)}
                        className="w-full p-4 rounded-xl bg-base-200 text-left hover:bg-base-300 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium">{person.name}</span>
                        {days !== undefined && (days === -1 || days >= 7) && (
                          <span className="badge badge-warning badge-sm">
                            {days === -1 ? '미연락' : `${days}일 전`}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-center text-base-content/50 py-4">
                    검색 결과가 없습니다
                  </p>
                )}
              </div>
            ) : (
              // 검색어 없을 때: 추천 섹션 + 전체 목록
              <>
                {/* 추천 섹션 (7일 이상 연락 안 한 사람) - 아코디언 */}
                {filteredRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsRecommendationsOpen(!isRecommendationsOpen)}
                      className="text-xs text-base-content/50 flex items-center gap-1 w-full hover:text-base-content/70 transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${!isRecommendationsOpen ? '-rotate-90' : ''}`} />
                      <Clock className="w-3 h-3" />
                      오래 연락 안 한 분들 ({filteredRecommendations.length})
                    </button>
                    {isRecommendationsOpen && filteredRecommendations.map((rec) => (
                      <div
                        key={rec.person.id}
                        className="w-full p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSelectPerson(rec.person)}
                            className="flex-1 text-left"
                          >
                            <div>
                              <span className="font-medium text-lg">{rec.person.name}</span>
                              {(() => {
                                const relNames = getRelationshipNames(rec.person.id);
                                const roleNames = getRoleNames(rec.person.id);
                                return (relNames.length > 0 || roleNames.length > 0) && (
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {relNames.length > 0 && (
                                      <span className="text-xs text-base-content/50">
                                        {relNames.join(', ')}
                                      </span>
                                    )}
                                    {roleNames.length > 0 && (
                                      <span className="text-xs text-primary/70">
                                        {roleNames.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-base-content/60">
                              {CherishedPeopleService.formatDaysSince(rec.daysSinceLastContact)}
                            </span>
                            <div className="dropdown dropdown-end">
                              <button
                                tabIndex={0}
                                onClick={(e) => e.stopPropagation()}
                                className="btn btn-ghost btn-xs btn-circle"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                                <li>
                                  <button onClick={() => openAddPersonModal(rec.person)}>
                                    수정
                                  </button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => setPersonToDelete(rec.person)}
                                    className="text-error"
                                  >
                                    삭제
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 전체 목록 - 아코디언 */}
                <div className="space-y-2">
                  <button
                    onClick={() => setIsPeopleOpen(!isPeopleOpen)}
                    className="text-xs text-base-content/50 flex items-center gap-1 w-full hover:text-base-content/70 transition-colors"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${!isPeopleOpen ? '-rotate-90' : ''}`} />
                    <Users className="w-3 h-3" />
                    소중한 사람들 ({filteredPeopleByCategory.length})
                  </button>
                  {isPeopleOpen && filteredPeopleByCategory.map((person) => {
                    const rec = recommendations.find(r => r.person.id === person.id);
                    const days = rec?.daysSinceLastContact;
                    return (
                      <div
                        key={person.id}
                        className="w-full p-4 rounded-xl bg-base-200 hover:bg-base-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSelectPerson(person)}
                            className="flex-1 text-left"
                          >
                            <div>
                              <span className="font-medium">{person.name}</span>
                              {(() => {
                                const relNames = getRelationshipNames(person.id);
                                const roleNames = getRoleNames(person.id);
                                return (relNames.length > 0 || roleNames.length > 0) && (
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {relNames.length > 0 && (
                                      <span className="text-xs text-base-content/50">
                                        {relNames.join(', ')}
                                      </span>
                                    )}
                                    {roleNames.length > 0 && (
                                      <span className="text-xs text-primary/70">
                                        {roleNames.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            {days !== undefined && (days === -1 || days >= 7) && (
                              <span className="badge badge-warning badge-sm">
                                {days === -1 ? '미연락' : `${days}일 전`}
                              </span>
                            )}
                            <div className="dropdown dropdown-end">
                              <button
                                tabIndex={0}
                                onClick={(e) => e.stopPropagation()}
                                className="btn btn-ghost btn-xs btn-circle"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                                <li>
                                  <button onClick={() => openAddPersonModal(person)}>
                                    수정
                                  </button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => setPersonToDelete(person)}
                                    className="text-error"
                                  >
                                    삭제
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
      </div>

      {/* 기록하기/완료 모달 */}
      <dialog
        open={viewState !== 'select-person'}
        className="modal z-[110]"
      >
        <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <AnimatePresence mode="wait">
            {/* 소식 작성 화면 */}
            {viewState === 'write-news' && (
              <motion.div
                key="write"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-4 pb-24"
              >
                {/* 뒤로가기 + 헤더 */}
                <div className="flex items-center gap-2 mb-4 sticky top-0 bg-base-100 z-10 -mx-4 px-4 py-2">
                  <button
                    onClick={handleBack}
                    className="btn btn-ghost btn-circle btn-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-base-content/60">기록하기</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary">
                        {careMode.selectedPersonName}님과의 시간
                      </p>
                      <button
                        onClick={() => {
                          const selectedPerson = people.find(p => p.id === careMode.selectedPersonId);
                          if (selectedPerson) {
                            openAddPersonModal(selectedPerson);
                          }
                        }}
                        className="btn btn-ghost btn-xs btn-circle"
                        title="인물 정보 수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 1. 들은 소식 - 최상단 */}
                <div>
                  <p className="text-sm font-medium mb-2">
                  오늘 그분과 무슨 시간을 보냈고, 요즘 그분은 어떻게 지내고 계세요?
                  </p>
                  <textarea
                    value={recentNews}
                    onChange={(e) => setRecentNews(e.target.value)}
                    placeholder="들은 소식을 적어보세요..."
                    className="textarea textarea-bordered w-full h-24 resize-none"
                  />
                </div>

                {/* 2. 어떻게 연락했나요? */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    마음을 전했다면, 기록으로 남겨보세요. 어떻게 마음을 전했나요?
                  </p>
                  {/* 소식만 기록할게요 옵션 */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInteractionType}
                      onChange={(e) => {
                        setSkipInteractionType(e.target.checked);
                        if (e.target.checked) setInteractionType(null);
                      }}
                      className="checkbox checkbox-sm checkbox-primary"
                    />
                    <span className="text-sm text-base-content/70">소식만 기록할게요</span>
                  </label>
                  {!skipInteractionType && (
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.entries(INTERACTION_TYPE_LABELS) as [InteractionType, { label: string; icon: string }][]).map(
                        ([type, { label, icon }]) => {
                          const IconComponent = INTERACTION_ICONS[icon];
                          return (
                            <button
                              key={type}
                              onClick={() => setInteractionType(type)}
                              className={`p-2 rounded-lg text-center transition-all ${
                                interactionType === type
                                  ? 'bg-pink-500 text-white scale-105'
                                  : 'bg-base-200 hover:bg-base-300'
                              }`}
                            >
                              <div className="flex justify-center">
                                {IconComponent && <IconComponent className="w-5 h-5" />}
                              </div>
                              <div className="text-xs mt-1">{label}</div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* 3. 감사했던 점 */}
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

                {/* 4. 받은 부탁 (상대방 → 나) */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                    받은 부탁이 있나요?
                  </p>
                  <textarea
                    value={requestFromThem}
                    onChange={(e) => setRequestFromThem(e.target.value)}
                    placeholder="상대방이 나에게 부탁한 내용 (선택사항)"
                    className="textarea textarea-bordered w-full h-20 resize-none"
                  />
                </div>

                {/* 5. 한 부탁 (나 → 상대방) */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    부탁한 것이 있나요?
                  </p>
                  <textarea
                    value={requestToThem}
                    onChange={(e) => setRequestToThem(e.target.value)}
                    placeholder="내가 상대방에게 부탁한 내용 (선택사항)"
                    className="textarea textarea-bordered w-full h-20 resize-none"
                  />
                </div>

                {/* 6. 회의 내용 */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    회의 내용이 있나요?
                  </p>
                  <textarea
                    value={meetingNote}
                    onChange={(e) => setMeetingNote(e.target.value)}
                    placeholder="회의/미팅에서 나온 주요 내용 (선택사항)"
                    className="textarea textarea-bordered w-full h-20 resize-none"
                  />
                </div>

                {/* 7. 선물/도움 계획 + 할일 연동 */}
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
                  {/* 할일로 추가 옵션 */}
                  {giftPlan.trim() && (
                    <div className="mt-3 p-3 rounded-lg bg-base-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createGiftTodo}
                          onChange={(e) => {
                            setCreateGiftTodo(e.target.checked);
                            if (e.target.checked && !giftTodoDate) {
                              const today = new Date();
                              const yyyy = today.getFullYear();
                              const mm = String(today.getMonth() + 1).padStart(2, '0');
                              const dd = String(today.getDate()).padStart(2, '0');
                              setGiftTodoDate(`${yyyy}-${mm}-${dd}`);
                            }
                          }}
                          className="checkbox checkbox-sm checkbox-primary"
                        />
                        <span className="text-sm">할일로 추가하기</span>
                      </label>
                      {createGiftTodo && (
                        <input
                          type="date"
                          value={giftTodoDate}
                          onChange={(e) => setGiftTodoDate(e.target.value)}
                          className="input input-sm input-bordered w-full mt-2"
                          placeholder="날짜 선택 (선택사항)"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* 저장 버튼 */}
                <div className="sticky bottom-0 -mx-4 px-4 py-4 bg-base-100 border-t border-base-200">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-primary w-full rounded-full btn-lg"
                  >
                    {isSaving ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 완료 화면 */}
            {viewState === 'completed' && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center min-h-[50vh] p-4 space-y-6"
              >
                {/* 완료 아이콘 */}
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-primary" fill="currentColor" />
                </div>

                {/* 완료 메시지 - 소식만 기록 vs 마음 전함 구분 */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2">
                    {skipInteractionType ? '소식을 기록했어요!' : '따뜻한 마음을 전했어요!'}
                  </h2>
                  <p className="text-base-content/70">
                    {skipInteractionType
                      ? `${careMode.selectedPersonName}님의 소식을 잊지 않을게요`
                      : `${careMode.selectedPersonName}님이 기뻐하실 거예요`}
                  </p>
                </div>

                {/* 성찰 메시지 */}
                <div className="p-4 rounded-xl bg-base-200 max-w-xs">
                  <p className="text-sm text-base-content/80 text-center">
                    관계에 투자한 시간은 절대 낭비가 아닙니다
                  </p>
                </div>

                {/* 다시 기록하기 버튼 */}
                <button
                  onClick={handleRecordAnother}
                  className="btn btn-primary btn-lg rounded-full px-8"
                >
                  <Check className="w-5 h-5 mr-2" />
                  또 기록하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleBack}>close</button>
        </form>
      </dialog>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}

      {/* 사람 추가/편집 모달 */}
      {showAddPersonModal && userId && (
        <AddPersonModal
          userId={userId}
          isOpen={showAddPersonModal}
          onClose={handleCloseAddPersonModal}
          editingPerson={editingPerson}
        />
      )}

      {/* 삭제 확인 모달 */}
      {personToDelete && (
        <dialog open className="modal z-[130]">
          <div className="modal-box">
            <h3 className="font-bold text-lg">삭제 확인</h3>
            <p className="py-4">
              &quot;{personToDelete.name}&quot;님을 목록에서 삭제하시겠습니까?
            </p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setPersonToDelete(null)}
              >
                취소
              </button>
              <button
                className="btn btn-error"
                onClick={() => handleDeletePerson(personToDelete)}
              >
                삭제
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setPersonToDelete(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
