'use client';

import { useState, useMemo } from 'react';
import { Zap, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleNextActionSectionProps {
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
  options: string[];
}

export default function CollapsibleNextActionSection({
  selectedStatuses = [],
  onChange,
  options = [],
}: CollapsibleNextActionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // 선택된 항목과 다른 항목 분리
  const selectedItems = useMemo(() =>
    filteredOptions.filter(opt => selectedStatuses.includes(opt)),
    [filteredOptions, selectedStatuses]
  );

  const unselectedItems = useMemo(() =>
    filteredOptions.filter(opt => !selectedStatuses.includes(opt)),
    [filteredOptions, selectedStatuses]
  );

  // 항목 선택/해제 토글
  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];

    onChange(newStatuses);
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-secondary" />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                다음행동상황 {selectedStatuses.length}개
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-secondary" />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              다음행동상황 {selectedStatuses.length}개
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="다음행동상황 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 선택된 항목 */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              선택됨 {selectedItems.length}개
            </div>
            <div className="space-y-1">
              {selectedItems.map(status => (
                <label
                  key={status}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleStatus(status)}
                    className="checkbox checkbox-sm checkbox-secondary"
                  />
                  <Zap className="h-4 w-4 text-secondary" />
                  <span className="text-sm flex-1">{status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 미선택 항목 */}
        {unselectedItems.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 항목들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {unselectedItems.map(status => (
                <label
                  key={status}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleStatus(status)}
                    className="checkbox checkbox-sm"
                  />
                  <Zap className="h-4 w-4 text-base-content/50" />
                  <span className="text-sm flex-1">{status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 검색 결과가 없을 때 */}
        {filteredOptions.length === 0 && searchQuery && (
          <div className="p-8 text-center text-base-content/50">
            "{searchQuery}"에 대한 검색 결과가 없습니다
          </div>
        )}

        {/* 항목이 없을 때 (검색어 없을 때만) */}
        {filteredOptions.length === 0 && !searchQuery && (
          <div className="p-8 text-center text-base-content/50">
            다음행동상황 항목이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
