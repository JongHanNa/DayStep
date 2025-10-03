'use client';

import React, { memo, useCallback } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PASTEL_COLORS, type ColorOption, getColorById, isColorDark } from '@/lib/color-palette';

export interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (colorId: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  className = '',
}) => {
  const selectedColorData = getColorById(selectedColor);

  const handleColorClick = useCallback((colorId: string) => {
    onColorSelect(colorId);
  }, [onColorSelect]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* 색상 팔레트 그리드 - 13개 색상을 한 줄에 배치 */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {PASTEL_COLORS.map((color) => {
          const isSelected = selectedColor === color.id;
          const isDark = isColorDark(color.hex);

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => handleColorClick(color.id)}
              className={cn(
                'relative w-10 h-10 rounded-full border-2 transition-all duration-200 flex-shrink-0',
                'hover:scale-105 hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isSelected
                  ? 'border-gray-800 dark:border-white scale-105 shadow-md'
                  : 'border-gray-300 dark:border-gray-500'
              )}
              style={{ backgroundColor: color.hex }}
              title={`${color.name} (${color.hex})`}
              aria-label={`색상 선택: ${color.name}`}
            >
              {/* 선택 체크 아이콘 - 인라인으로 표시 */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check
                    className={cn(
                      'w-4 h-4 drop-shadow-sm',
                      isDark ? 'text-white' : 'text-gray-800'
                    )}
                  />
                </div>
              )}

              {/* 접근성을 위한 숨겨진 텍스트 */}
              <span className="sr-only">
                {color.name} ({color.hex})
                {isSelected && ' - 현재 선택됨'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(ColorPicker);