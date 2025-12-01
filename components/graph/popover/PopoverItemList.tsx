'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopoverItemListProps<T> {
  items: T[];
  selectedIds: string[];
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSubLabel?: (item: T) => string | undefined;
  onToggle: (id: string) => void;
  label?: string;
  emptyMessage?: string;
  maxHeight?: number;
  className?: string;
}

export function PopoverItemList<T>({
  items,
  selectedIds,
  getItemId,
  getItemLabel,
  getItemSubLabel,
  onToggle,
  label,
  emptyMessage = '항목이 없습니다',
  maxHeight = 200,
  className,
}: PopoverItemListProps<T>) {
  if (items.length === 0 && !label) {
    return null;
  }

  return (
    <div className={cn('px-2', className)}>
      {label && (
        <div className="px-1 py-1.5 text-xs font-medium text-base-content/50">
          {label}
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-2 py-3 text-sm text-base-content/40 text-center">
          {emptyMessage}
        </div>
      ) : (
        <div
          className="space-y-0.5 overflow-y-auto"
          style={{ maxHeight }}
        >
          {items.map((item) => {
            const id = getItemId(item);
            const isSelected = selectedIds.includes(id);
            const subLabel = getItemSubLabel?.(item);

            return (
              <button
                key={id}
                onClick={() => onToggle(id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-base-200'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-base-300'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {getItemLabel(item)}
                  </div>
                  {subLabel && (
                    <div className="text-xs text-base-content/50 truncate">
                      {subLabel}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
