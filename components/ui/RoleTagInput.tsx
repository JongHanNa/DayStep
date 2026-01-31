'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Settings } from 'lucide-react';
import { useRoleStore } from '@/state/stores/roleStore';
import { useAuth } from '@/app/context/AuthContext';
import type { Role, RoleInput } from '@/types/role';
import { ROLE_PRESET_COLORS } from '@/types/role';

interface RoleTagInputProps {
  /** 선택된 역할 ID 배열 */
  value: string[];
  /** 역할 ID 배열 변경 콜백 */
  onChange: (roleIds: string[]) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 라벨 */
  label?: string;
  /** 최대 선택 가능 수 */
  maxTags?: number;
  /** 관리 버튼 표시 여부 */
  showManageButton?: boolean;
}

/**
 * 역할 태그 입력 컴포넌트
 * - 기존 역할 선택 또는 새 역할 생성
 * - ID 기반 관리 (부서와 동일한 패턴)
 * - "관리" 버튼으로 편집/삭제
 */
export function RoleTagInput({
  value,
  onChange,
  placeholder = '역할 입력 (예: 담당자, 리더)',
  label,
  maxTags = 10,
  showManageButton = true,
}: RoleTagInputProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    roles,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    initialized,
  } = useRoleStore();

  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 역할 목록 초기 로드
  useEffect(() => {
    if (userId && !initialized) {
      fetchRoles(userId);
    }
  }, [userId, initialized, fetchRoles]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 선택된 역할 객체들
  const selectedRoles = roles.filter((r) => value.includes(r.id));

  // 필터링된 추천 목록
  const filteredSuggestions = roles.filter(
    (r) =>
      !value.includes(r.id) &&
      r.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // 입력값과 정확히 일치하는 역할이 있는지
  const exactMatch = roles.find(
    (r) => r.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  // 역할 선택
  const selectRole = (role: Role) => {
    if (!value.includes(role.id) && value.length < maxTags) {
      onChange([...value, role.id]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  // 역할 제거
  const removeRole = (roleId: string) => {
    onChange(value.filter((id) => id !== roleId));
  };

  // 새 역할 생성
  const handleCreateRole = async () => {
    if (!userId || !inputValue.trim() || isCreating) return;

    // 이미 존재하는 역할명인 경우 선택만
    if (exactMatch) {
      selectRole(exactMatch);
      return;
    }

    setIsCreating(true);
    try {
      const newRole = await createRole(userId, {
        name: inputValue.trim(),
        color: ROLE_PRESET_COLORS[roles.length % ROLE_PRESET_COLORS.length],
      });

      if (newRole && value.length < maxTags) {
        onChange([...value, newRole.id]);
      }
      setInputValue('');
      setShowDropdown(false);
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
          selectRole(exactMatch);
        } else {
          handleCreateRole();
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeRole(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // 역할 수정
  const handleUpdateRole = async (updates: Partial<RoleInput>) => {
    if (!userId || !editingRole) return;
    await updateRole(userId, editingRole.id, updates);
    setEditingRole(null);
  };

  // 역할 삭제
  const handleDeleteRole = async (roleId: string) => {
    if (!userId) return;
    // 선택 목록에서도 제거
    onChange(value.filter((id) => id !== roleId));
    await deleteRole(userId, roleId);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 라벨 + 관리 버튼 */}
      {(label || showManageButton) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm font-medium">{label}</label>}
          {showManageButton && (
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

      {/* 입력 영역 */}
      <div
        className="flex flex-wrap gap-2 p-3 rounded-lg bg-base-200 border border-base-300 min-h-[48px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* 선택된 역할 태그들 */}
        {selectedRoles.map((role) => (
          <span
            key={role.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${role.color}20`,
              color: role.color,
            }}
          >
            <span>{role.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeRole(role.id);
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
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-base"
          disabled={value.length >= maxTags}
        />
      </div>

      {/* 드롭다운 */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {/* 기존 역할 선택 */}
          {filteredSuggestions.map((role) => (
            <button
              key={role.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectRole(role);
              }}
              className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              {role.name}
            </button>
          ))}

          {/* 새 역할 생성 옵션 */}
          {inputValue.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreateRole();
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
              역할을 입력하세요
            </div>
          )}
        </div>
      )}

      {/* 최대 수 도달 */}
      {value.length >= maxTags && (
        <p className="text-xs text-warning mt-1">
          최대 {maxTags}개까지 추가할 수 있습니다
        </p>
      )}

      {/* 관리 모달 */}
      {showManageModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">역할 관리</h3>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setEditingRole(null);
                }}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 역할 목록 */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-4">
                  등록된 역할이 없습니다
                </p>
              ) : (
                roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-base-200"
                  >
                    {editingRole?.id === role.id ? (
                      // 수정 모드
                      <>
                        <input
                          type="text"
                          defaultValue={role.name}
                          autoFocus
                          className="input input-sm input-bordered flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateRole({ name: e.currentTarget.value });
                            } else if (e.key === 'Escape') {
                              setEditingRole(null);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== role.name) {
                              handleUpdateRole({ name: e.target.value });
                            } else {
                              setEditingRole(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingRole(null)}
                          className="btn btn-sm btn-ghost"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      // 보기 모드
                      <>
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="flex-1 text-sm">{role.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditingRole(role)}
                          className="btn btn-xs btn-ghost"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="btn btn-xs btn-ghost text-error"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              onClick={() => {
                setShowManageModal(false);
                setEditingRole(null);
              }}
            >
              닫기
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
