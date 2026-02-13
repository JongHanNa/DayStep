'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { type EmotionTag, type StatusFilter, EMOTION_CONFIG, EMOTION_TAGS } from '../utils';

interface MotivationFilterBarProps {
  statusFilter: StatusFilter;
  emotionFilter: EmotionTag | null;
  counts: { all: number; pending: number; processed: number };
  searchQuery: string;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onEmotionFilterChange: (tag: EmotionTag | null) => void;
  onSearchChange: (query: string) => void;
}

export function MotivationFilterBar({
  statusFilter,
  emotionFilter,
  counts,
  searchQuery,
  onStatusFilterChange,
  onEmotionFilterChange,
  onSearchChange,
}: MotivationFilterBarProps) {
  const [showSearch, setShowSearch] = useState(false);

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: counts.all },
    { key: 'pending', label: '미처리', count: counts.pending },
    { key: 'processed', label: '처리완료', count: counts.processed },
  ];

  return (
    <div className="px-4 mb-3 space-y-2">
      {/* 상태 필터 + 검색 */}
      <div className="flex items-center gap-1">
        {statusFilters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onStatusFilterChange(key)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === key
                ? 'bg-primary text-primary-content font-medium'
                : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}
          >
            {label} {count}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => {
            setShowSearch(!showSearch);
            if (showSearch) onSearchChange('');
          }}
          className={`btn btn-ghost btn-xs btn-circle ${showSearch ? 'text-primary' : ''}`}
        >
          {showSearch ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 검색 입력 */}
      {showSearch && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="원동력 검색..."
          className="input input-sm input-bordered w-full bg-base-200"
          autoFocus
        />
      )}

      {/* 감정 태그 필터 */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onEmotionFilterChange(null)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
            emotionFilter === null
              ? 'bg-base-content/10 border-base-content/20 text-base-content font-medium'
              : 'border-base-300 text-base-content/50 hover:border-base-content/30'
          }`}
        >
          ✨전체
        </button>
        {EMOTION_TAGS.map((tag) => {
          const config = EMOTION_CONFIG[tag];
          const isSelected = emotionFilter === tag;
          return (
            <button
              key={tag}
              onClick={() => onEmotionFilterChange(isSelected ? null : tag)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                isSelected
                  ? `${config.bgColor} ${config.borderColor} ${config.color} font-medium`
                  : 'border-base-300 text-base-content/50 hover:border-base-content/30'
              }`}
            >
              {config.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
