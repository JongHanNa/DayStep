'use client';

import { X, Check } from 'lucide-react';
import { COLOR_THEMES, ColorTheme, getColorThemeConfig } from '@/lib/color-themes';
import { useSettingsStore } from '@/state/stores/settingsStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ColorThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ColorThemeModal({ isOpen, onClose }: ColorThemeModalProps) {
  const { colorTheme, setColorTheme } = useSettingsStore();
  const currentTheme = getColorThemeConfig(colorTheme);

  const handleSelectTheme = (themeId: ColorTheme) => {
    setColorTheme(themeId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl p-0 bg-base-100" hideOverlay hideCloseButton>
        {/* 헤더 */}
        <SheetHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <SheetTitle className="text-lg font-semibold">컬러 테마 선택</SheetTitle>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </SheetHeader>

        {/* 현재 테마 표시 */}
        <div className="px-6 py-4">
          <div
            className="p-4 rounded-xl border-2 border-primary"
            style={{ backgroundColor: `${currentTheme.colors.primary}15` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Object.values(currentTheme.colors).map((color, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div>
                <div className="font-semibold text-base-content">
                  현재: {currentTheme.name}
                </div>
                <div className="text-sm text-base-content/70">
                  {currentTheme.description}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 테마 그리드 */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-3 gap-3">
            {COLOR_THEMES.map((theme) => {
              const isSelected = colorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-base-content/30 hover:bg-base-200'
                  }`}
                >
                  {/* 선택 체크마크 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-content" />
                    </div>
                  )}

                  {/* 색상 프리뷰 */}
                  <div className="flex gap-1 mb-2">
                    {Object.values(theme.colors).map((color, index) => (
                      <div
                        key={index}
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* 아이콘 */}
                  <span className="text-lg mb-1">{theme.icon}</span>

                  {/* 테마 이름 */}
                  <span className="text-xs font-medium text-base-content text-center">
                    {theme.name}
                  </span>

                  {/* 한글 설명 */}
                  <span className="text-[10px] text-base-content/60 text-center">
                    {theme.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Safe Area Bottom */}
        <div className="safe-area-bottom" />
      </SheetContent>
    </Sheet>
  );
}
