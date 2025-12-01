'use client';

import { useState, useMemo } from 'react';
import { Check, Circle } from 'lucide-react';
import { PopoverContainer } from './PopoverContainer';
import { PopoverSearchInput } from './PopoverSearchInput';
import type { AreaResource } from '@/types/second-brain';

interface AreaResourceSelectPopoverProps {
  position: { x: number; y: number };
  areas: AreaResource[];
  resources: AreaResource[];
  selectedId: string | undefined; // 'area-{id}' 또는 'resource-{id}' 형식
  onSelect: (id: string | undefined) => Promise<void>;
  onClose: () => void;
}

export function AreaResourceSelectPopover({
  position,
  areas,
  resources,
  selectedId,
  onSelect,
  onClose,
}: AreaResourceSelectPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 검색 필터링
  const filteredAreas = useMemo(() => {
    if (!searchQuery) return areas;
    const query = searchQuery.toLowerCase();
    return areas.filter((area) =>
      area.title.toLowerCase().includes(query)
    );
  }, [areas, searchQuery]);

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter((resource) =>
      resource.title.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  const handleSelect = async (id: string | undefined) => {
    if (isSaving) return;
    if (id === selectedId) {
      // 같은 항목 클릭 시 선택 해제
      id = undefined;
    }

    setIsSaving(true);
    try {
      await onSelect(id);
      onClose();
    } catch (error) {
      console.error('영역/자원 선택 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PopoverContainer
      position={position}
      onClose={onClose}
      title="영역/자원 선택"
      width={280}
      maxHeight={400}
    >
      <PopoverSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="영역/자원 검색..."
      />

      <div className="px-2 pb-2 space-y-1 max-h-[300px] overflow-y-auto">
        {/* 선택 안 함 옵션 */}
        <button
          onClick={() => handleSelect(undefined)}
          disabled={isSaving}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
            !selectedId ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
              !selectedId ? 'bg-primary border-primary' : 'border-base-300'
            }`}
          >
            {!selectedId && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-base-content/60">선택 안 함</span>
        </button>

        {/* 영역 그룹 */}
        {filteredAreas.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50 mt-2">
              영역
            </div>
            {filteredAreas.map((area) => {
              const itemId = `area-${area.id}`;
              const isSelected = selectedId === itemId;

              return (
                <button
                  key={area.id}
                  onClick={() => handleSelect(itemId)}
                  disabled={isSaving}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-base-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Circle
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: area.color || '#6366f1' }}
                    fill={area.color || '#6366f1'}
                  />
                  <span className="text-sm truncate">{area.title}</span>
                </button>
              );
            })}
          </>
        )}

        {/* 자원 그룹 */}
        {filteredResources.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50 mt-2">
              자원
            </div>
            {filteredResources.map((resource) => {
              const itemId = `resource-${resource.id}`;
              const isSelected = selectedId === itemId;

              return (
                <button
                  key={resource.id}
                  onClick={() => handleSelect(itemId)}
                  disabled={isSaving}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-base-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Circle
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: resource.color || '#8b5cf6' }}
                    fill={resource.color || '#8b5cf6'}
                  />
                  <span className="text-sm truncate">{resource.title}</span>
                </button>
              );
            })}
          </>
        )}

        {/* 검색 결과 없음 */}
        {filteredAreas.length === 0 && filteredResources.length === 0 && searchQuery && (
          <div className="px-2 py-3 text-sm text-base-content/40 text-center">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </PopoverContainer>
  );
}
