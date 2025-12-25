'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, Heart, AlertCircle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import type { CherishedPerson } from '@/types/cherished-people';

export type PersonLinkType = 'joyful' | 'shameful';

interface PersonSelectorProps {
  selectedPeopleIds: string[];
  onSelectionChange: (peopleIds: string[]) => void;
  linkType: PersonLinkType;
  compact?: boolean;
  className?: string;
}

/**
 * 재사용 가능한 인물 선택 컴포넌트
 * - 복수 선택 지원
 * - 관계/부서/역할 필터
 * - 검색 기능
 */
export function PersonSelector({
  selectedPeopleIds,
  onSelectionChange,
  linkType,
  compact = false,
  className = '',
}: PersonSelectorProps) {
  const { people } = useCherishedPeopleStore();

  // UI 상태
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 필터 상태
  const [filterRelationship, setFilterRelationship] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);

  // 선택된 인물 정보
  const selectedPeople = useMemo(() =>
    people.filter(p => selectedPeopleIds.includes(p.id)),
    [people, selectedPeopleIds]
  );

  // 고유값 추출 (필터 드롭다운용)
  const uniqueRelationships = useMemo(() =>
    [...new Set(people.flatMap(p => p.relationships || []))].filter(Boolean).sort(),
    [people]
  );
  const uniqueDepartments = useMemo(() =>
    [...new Set(people.flatMap(p => p.departments || []))].filter(Boolean).sort(),
    [people]
  );
  const uniqueRoles = useMemo(() =>
    [...new Set(people.flatMap(p => p.roles || []))].filter(Boolean).sort(),
    [people]
  );

  // 필터 함수
  const matchesFilter = useCallback((person: CherishedPerson) => {
    if (filterRelationship && !person.relationships?.includes(filterRelationship)) return false;
    if (filterDepartment && !person.departments?.includes(filterDepartment)) return false;
    if (filterRole && !person.roles?.includes(filterRole)) return false;
    return true;
  }, [filterRelationship, filterDepartment, filterRole]);

  // 필터링된 인물 목록
  const filteredPeople = useMemo(() => {
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

  // 인물 선택/해제
  const togglePerson = (personId: string) => {
    if (selectedPeopleIds.includes(personId)) {
      onSelectionChange(selectedPeopleIds.filter(id => id !== personId));
    } else {
      onSelectionChange([...selectedPeopleIds, personId]);
    }
  };

  // 인물 제거
  const removePerson = (personId: string) => {
    onSelectionChange(selectedPeopleIds.filter(id => id !== personId));
  };

  // 스타일 설정
  const getTypeConfig = () => {
    if (linkType === 'joyful') {
      return {
        icon: Heart,
        label: '이 일로 기뻐하실 분들',
        shortLabel: '기쁘게 할 분들',
        placeholder: '기쁘게 할 분을 선택하세요',
        iconColor: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/30',
        chipBg: 'bg-pink-500/20',
        chipText: 'text-pink-600 dark:text-pink-400',
      };
    } else {
      return {
        icon: AlertCircle,
        label: '이 분들 앞에선 부끄러운 행동',
        shortLabel: '부끄러운 분들',
        placeholder: '부끄러운 분을 선택하세요',
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        chipBg: 'bg-amber-500/20',
        chipText: 'text-amber-600 dark:text-amber-400',
      };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  // 컴팩트 모드 (선택된 인물만 표시)
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full p-2 rounded-lg ${config.bgColor} ${config.borderColor} border flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
      >
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        {selectedPeople.length > 0 ? (
          <span className="text-sm text-base-content truncate">
            {selectedPeople.map(p => p.name).join(', ')}
          </span>
        ) : (
          <span className="text-sm text-base-content/50">
            {config.shortLabel} 선택
          </span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto text-base-content/50" />
      </button>
    );
  }

  return (
    <div className={`rounded-lg ${config.bgColor} ${config.borderColor} border ${className}`}>
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center gap-2"
      >
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
        <span className="font-medium text-base-content">{config.label}</span>
        {selectedPeople.length > 0 && (
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${config.chipBg} ${config.chipText}`}>
            {selectedPeople.length}
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-auto text-base-content/50" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto text-base-content/50" />
        )}
      </button>

      {/* 선택된 인물 칩 */}
      {selectedPeople.length > 0 && !isExpanded && (
        <div className="px-3 pb-3 flex flex-wrap gap-1">
          {selectedPeople.map(person => (
            <span
              key={person.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.chipBg} ${config.chipText}`}
            >
              {person.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePerson(person.id);
                }}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 확장된 선택 UI */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름으로 검색"
                  className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* 필터 */}
              {(uniqueRelationships.length > 0 || uniqueDepartments.length > 0 || uniqueRoles.length > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {uniqueRelationships.length > 0 && (
                    <select
                      value={filterRelationship || ''}
                      onChange={(e) => setFilterRelationship(e.target.value || null)}
                      className="select select-xs select-bordered bg-base-100"
                    >
                      <option value="">관계 전체</option>
                      {uniqueRelationships.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                  {uniqueDepartments.length > 0 && (
                    <select
                      value={filterDepartment || ''}
                      onChange={(e) => setFilterDepartment(e.target.value || null)}
                      className="select select-xs select-bordered bg-base-100"
                    >
                      <option value="">부서 전체</option>
                      {uniqueDepartments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                  {uniqueRoles.length > 0 && (
                    <select
                      value={filterRole || ''}
                      onChange={(e) => setFilterRole(e.target.value || null)}
                      className="select select-xs select-bordered bg-base-100"
                    >
                      <option value="">역할 전체</option>
                      {uniqueRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* 인물 목록 */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredPeople.length === 0 ? (
                  <p className="text-sm text-base-content/50 text-center py-4">
                    {searchQuery ? '검색 결과가 없습니다' : '등록된 소중한 사람이 없습니다'}
                  </p>
                ) : (
                  filteredPeople.map(person => {
                    const isSelected = selectedPeopleIds.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        onClick={() => togglePerson(person.id)}
                        className={`w-full p-2 rounded-lg flex items-center gap-2 transition-colors ${
                          isSelected
                            ? `${config.chipBg} ${config.chipText}`
                            : 'bg-base-100 hover:bg-base-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected
                            ? `${config.borderColor} ${config.chipBg}`
                            : 'border-base-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{person.name}</div>
                          {(person.relationships?.length > 0 || person.departments?.length > 0) && (
                            <div className="text-xs text-base-content/60">
                              {[
                                ...(person.relationships || []),
                                ...(person.departments || [])
                              ].join(', ')}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* 완료 버튼 */}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-full py-2 bg-base-100 hover:bg-base-200 rounded-lg text-sm font-medium transition-colors"
              >
                완료
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 선택된 인물 미리보기 (컴팩트 표시용)
 */
interface PersonLinksPreviewProps {
  joyfulPeopleIds: string[];
  shamefulPeopleIds: string[];
  onEdit: () => void;
  className?: string;
}

export function PersonLinksPreview({
  joyfulPeopleIds,
  shamefulPeopleIds,
  onEdit,
  className = '',
}: PersonLinksPreviewProps) {
  const { people } = useCherishedPeopleStore();

  const joyfulPeople = useMemo(() =>
    people.filter(p => joyfulPeopleIds.includes(p.id)),
    [people, joyfulPeopleIds]
  );

  const shamefulPeople = useMemo(() =>
    people.filter(p => shamefulPeopleIds.includes(p.id)),
    [people, shamefulPeopleIds]
  );

  const hasAnyPeople = joyfulPeople.length > 0 || shamefulPeople.length > 0;

  if (!hasAnyPeople) {
    return (
      <button
        onClick={onEdit}
        className={`w-full p-3 rounded-lg bg-base-200 border border-base-300 text-center text-sm text-base-content/60 hover:bg-base-300 transition-colors ${className}`}
      >
        누구를 위한 일인지 선택하기
      </button>
    );
  }

  return (
    <button
      onClick={onEdit}
      className={`w-full p-3 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors ${className}`}
    >
      <div className="space-y-1">
        {joyfulPeople.length > 0 && (
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-base-content">
              {joyfulPeople.map(p => p.name).join(', ')}
            </span>
          </div>
        )}
        {shamefulPeople.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-base-content">
              {shamefulPeople.map(p => p.name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
