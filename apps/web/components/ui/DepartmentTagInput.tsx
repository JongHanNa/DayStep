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
  /** 관리 버튼 표시 여부 */
  showManageButton?: boolean;
}

/**
 * 부서 태그 입력 컴포넌트
 * - RelationshipTagInput/RoleTagInput과 동일한 UI 패턴
 * - 기존 부서 선택 또는 새 부서 생성
 * - "관리" 버튼으로 모달 열어 편집/삭제
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
  showManageButton = true,
}: DepartmentTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 선택된 부서 객체들
  const selectedDepartments = departments.filter((d) => selectedIds.includes(d.id));

  // 필터링된 추천 목록
  const filteredSuggestions = departments.filter(
    (d) =>
      !selectedIds.includes(d.id) &&
      d.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // 입력값과 정확히 일치하는 부서가 있는지
  const exactMatch = departments.find(
    (d) => d.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
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
    setShowDropdown(false);
  };

  // 부서 선택 해제
  const removeDepartment = (departmentId: string) => {
    onSelectedIdsChange(selectedIds.filter((id) => id !== departmentId));
  };

  // 새 부서 생성
  const handleCreateDepartment = async () => {
    if (!inputValue.trim() || isCreating) return;

    // 이미 존재하는 부서명인 경우 선택만
    if (exactMatch) {
      selectDepartment(exactMatch);
      return;
    }

    setIsCreating(true);
    try {
      const newDepartment = await onCreateDepartment(inputValue.trim());
      if (newDepartment) {
        onSelectedIdsChange([...selectedIds, newDepartment.id]);
        setInputValue('');
        setShowDropdown(false);
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
        if (exactMatch) {
          selectDepartment(exactMatch);
        } else {
          handleCreateDepartment();
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedIds.length > 0) {
      removeDepartment(selectedIds[selectedIds.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // 부서 삭제
  const handleDeleteDepartment = (department: Department) => {
    // 선택 목록에서도 제거
    onSelectedIdsChange(selectedIds.filter((id) => id !== department.id));
    // 실제 삭제
    if (onDeleteDepartment) {
      onDeleteDepartment(department);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 라벨 + 관리 버튼 */}
      {(label || showManageButton) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm font-medium">{label}</label>}
          {showManageButton && (onEditDepartment || onDeleteDepartment) && departments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowManageModal(true)}
              className="text-xs text-base-content/60 hover:text-primary flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              관리
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="loading loading-spinner loading-sm" />
        </div>
      ) : (
        <>
          {/* 입력 영역 */}
          <div
            className="flex flex-wrap gap-2 p-3 rounded-lg bg-base-200 border border-base-300 min-h-[48px] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {/* 선택된 부서 태그들 */}
            {selectedDepartments.map((department) => (
              <span
                key={department.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: `${department.color}20`,
                  color: department.color,
                }}
              >
                <span>{department.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDepartment(department.id);
                  }}
                  className="hover:opacity-70 rounded-full p-0.5 transition-opacity"
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
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedIds.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[100px] bg-transparent outline-none text-base"
            />
          </div>

          {/* 드롭다운 */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {/* 기존 부서 선택 */}
              {filteredSuggestions.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectDepartment(department);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: department.color }}
                  />
                  {department.name}
                </button>
              ))}

              {/* 새 부서 생성 옵션 */}
              {inputValue.trim() && !exactMatch && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateDepartment();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm flex items-center gap-2 text-primary border-t border-base-300"
                  disabled={isCreating}
                >
                  <Plus className="w-4 h-4" />
                  {isCreating ? '생성 중...' : `"${inputValue.trim()}" 새로 만들기`}
                </button>
              )}

              {/* 목록이 비어있을 때 */}
              {filteredSuggestions.length === 0 && !inputValue.trim() && (
                <div className="px-4 py-3 text-sm text-base-content/50 text-center">
                  부서를 입력하세요
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 관리 모달 */}
      {showManageModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">부서 관리</h3>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 부서 목록 */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {departments.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-4">
                  등록된 부서가 없습니다
                </p>
              ) : (
                departments.map((department) => (
                  <div
                    key={department.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-base-200"
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: department.color }}
                    />
                    <span className="flex-1 text-sm">{department.name}</span>
                    {onEditDepartment && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowManageModal(false);
                          onEditDepartment(department);
                        }}
                        className="btn btn-xs btn-ghost"
                      >
                        수정
                      </button>
                    )}
                    {onDeleteDepartment && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(department)}
                        className="btn btn-xs btn-ghost text-error"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              onClick={() => setShowManageModal(false)}
            >
              닫기
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
