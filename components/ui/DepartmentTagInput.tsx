'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Settings } from 'lucide-react';
import type { Department } from '@/types/department';

interface DepartmentTagInputProps {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  departments: Department[];
  onCreateDepartment: (name: string) => Promise<Department | null>;
  onEditDepartment?: (department: Department) => void;
  onDeleteDepartment?: (department: Department) => void;
  placeholder?: string;
  label?: string;
  isLoading?: boolean;
}

/**
 * 부서 태그 입력 컴포넌트
 * - TagInput과 동일한 UI 패턴
 * - 기존 부서 선택 또는 새 부서 생성
 * - 편집/삭제는 관리 모드에서 처리
 */
export function DepartmentTagInput({
  selectedIds,
  onSelectedIdsChange,
  departments,
  onCreateDepartment,
  onEditDepartment,
  onDeleteDepartment,
  placeholder = '부서를 입력하세요',
  label,
  isLoading = false,
}: DepartmentTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showManageMode, setShowManageMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 선택된 부서 객체들
  const selectedDepartments = departments.filter((d) => selectedIds.includes(d.id));

  // 입력값에 따른 부서 필터링
  useEffect(() => {
    const unselected = departments.filter((d) => !selectedIds.includes(d.id));

    if (inputValue.trim()) {
      const filtered = unselected.filter((d) =>
        d.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredDepartments(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredDepartments(unselected);
    }
  }, [inputValue, departments, selectedIds]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 부서 선택
  const selectDepartment = (department: Department) => {
    if (!selectedIds.includes(department.id)) {
      onSelectedIdsChange([...selectedIds, department.id]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  // 부서 선택 해제
  const removeDepartment = (departmentId: string) => {
    onSelectedIdsChange(selectedIds.filter((id) => id !== departmentId));
  };

  // 새 부서 생성
  const handleCreateDepartment = async () => {
    if (!inputValue.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newDepartment = await onCreateDepartment(inputValue.trim());
      if (newDepartment) {
        onSelectedIdsChange([...selectedIds, newDepartment.id]);
        setInputValue('');
        setShowSuggestions(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        // 정확히 일치하는 부서가 있으면 선택
        const exactMatch = departments.find(
          (d) => d.name.toLowerCase() === inputValue.toLowerCase() && !selectedIds.includes(d.id)
        );
        if (exactMatch) {
          selectDepartment(exactMatch);
        } else if (filteredDepartments.length > 0) {
          // 필터된 첫 번째 부서 선택
          selectDepartment(filteredDepartments[0]);
        } else {
          // 새 부서 생성
          handleCreateDepartment();
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedIds.length > 0) {
      removeDepartment(selectedIds[selectedIds.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  // 입력값이 기존 부서와 일치하지 않으면 "새 부서 추가" 옵션 표시
  const showCreateOption =
    inputValue.trim() &&
    !departments.some((d) => d.name.toLowerCase() === inputValue.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{label}</label>
          {(onEditDepartment || onDeleteDepartment) && departments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowManageMode(!showManageMode)}
              className={`btn btn-ghost btn-xs gap-1 ${showManageMode ? 'text-primary' : ''}`}
            >
              <Settings className="w-3.5 h-3.5" />
              {showManageMode ? '완료' : '관리'}
            </button>
          )}
        </div>
      )}

      {/* 관리 모드 */}
      {showManageMode && (
        <div className="mb-2 p-2 rounded-lg bg-base-200 border border-base-300">
          <p className="text-xs text-base-content/60 mb-2">부서를 선택하여 편집하거나 삭제하세요</p>
          <div className="flex flex-wrap gap-2">
            {departments.map((department) => (
              <div key={department.id} className="flex items-center gap-1">
                <span className="px-2 py-1 rounded-full bg-base-100 text-sm border border-base-300">
                  {department.name}
                </span>
                {onEditDepartment && (
                  <button
                    type="button"
                    onClick={() => onEditDepartment(department)}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="편집"
                  >
                    ✏️
                  </button>
                )}
                {onDeleteDepartment && (
                  <button
                    type="button"
                    onClick={() => onDeleteDepartment(department)}
                    className="btn btn-ghost btn-xs btn-circle text-error"
                    title="삭제"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="loading loading-spinner loading-sm" />
        </div>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-2 p-3 rounded-lg bg-base-200 border border-base-300 min-h-[48px] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {/* 선택된 부서들 */}
            {selectedDepartments.map((department) => (
              <span
                key={department.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
              >
                <span>{department.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDepartment(department.id);
                  }}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* 입력 필드 */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedIds.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[100px] bg-transparent outline-none text-base"
            />
          </div>

          {/* 자동완성 드롭다운 */}
          {showSuggestions && (filteredDepartments.length > 0 || showCreateOption) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {/* 기존 부서 목록 */}
              {filteredDepartments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectDepartment(department);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                >
                  {department.name}
                </button>
              ))}

              {/* 새 부서 추가 옵션 */}
              {showCreateOption && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateDepartment();
                  }}
                  disabled={isCreating}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm text-primary flex items-center gap-2 border-t border-base-200"
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  &quot;{inputValue}&quot; 새 부서 추가
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
