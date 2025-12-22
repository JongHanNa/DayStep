'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface SearchableSelectOption {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allOptionLabel?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '선택',
  allOptionLabel = '전체',
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 선택된 옵션 찾기
  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption ? selectedOption.label : allOptionLabel;

  // 검색어로 필터링
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 드롭다운 열릴 때 input에 포커스
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (id: string | null) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-lg hover:bg-base-200 transition-colors"
      >
        <span className={value ? 'text-base-content' : 'text-base-content/60'}>
          {displayValue}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-base-content/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* 검색 입력 */}
          <div className="p-2 border-b border-base-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-9 pr-8 py-2 bg-base-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-base-300 rounded-full"
                >
                  <X className="w-3 h-3 text-base-content/60" />
                </button>
              )}
            </div>
          </div>

          {/* 옵션 목록 */}
          <div className="max-h-60 overflow-y-auto">
            {/* 전체 옵션 */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-base-200 transition-colors ${
                value === null ? 'bg-primary/10' : ''
              }`}
            >
              <span className={value === null ? 'font-medium text-primary' : ''}>
                {allOptionLabel}
              </span>
              {value === null && <Check className="w-4 h-4 text-primary" />}
            </button>

            {/* 필터링된 옵션들 */}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-base-content/60 text-center">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-base-200 transition-colors ${
                    value === option.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className={value === option.id ? 'font-medium text-primary' : ''}>
                    {option.label}
                  </span>
                  {value === option.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
