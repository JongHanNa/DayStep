'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  maxTags?: number;
}

/**
 * 태그 입력 컴포넌트
 * - 자유 입력 + 자동완성 드롭다운
 * - 복수 선택 가능
 * - 태그 삭제 (X 버튼)
 * - Backspace로 마지막 태그 삭제
 */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = '입력 후 Enter',
  label,
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 입력값에 따른 추천 필터링
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.includes(s) // 이미 선택된 것 제외
        )
        .slice(0, 8);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      // 입력 없으면 미선택 추천 목록 표시
      const unselected = suggestions
        .filter((s) => !value.includes(s))
        .slice(0, 8);
      setFilteredSuggestions(unselected);
    }
  }, [inputValue, suggestions, value]);

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

  // 태그 추가
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  // 태그 삭제
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // 입력 없이 백스페이스 → 마지막 태그 삭제
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // 포커스 시 추천 목록 표시
  const handleFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // 포커스 잃을 때 입력 중인 값 자동 추가
  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-sm font-medium block mb-2">{label}</label>
      )}

      <div
        className="flex flex-wrap gap-2 p-3 rounded-lg bg-base-200 border border-base-300 min-h-[48px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* 선택된 태그들 */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
          disabled={value.length >= maxTags}
        />
      </div>

      {/* 자동완성 드롭다운 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 최대 태그 수 도달 시 안내 */}
      {value.length >= maxTags && (
        <p className="text-xs text-warning mt-1">
          최대 {maxTags}개까지 추가할 수 있습니다
        </p>
      )}
    </div>
  );
}
