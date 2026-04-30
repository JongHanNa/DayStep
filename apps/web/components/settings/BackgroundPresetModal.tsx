'use client';

import { X, Check } from 'lucide-react';
import {
  BACKGROUND_PRESET_META,
  BACKGROUND_PRESET_ORDER,
  PRESET_MAIN_COLORS,
  type BackgroundPreset,
} from '@/lib/color-presets';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { hexWithOpacity } from '@/lib/colors';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface BackgroundPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 배경 테마 선택 모달
 * 모바일 RN의 4개 BackgroundPreset(calm/warm/evening/execution)과 단일 소스 공유
 */
export default function BackgroundPresetModal({ isOpen, onClose }: BackgroundPresetModalProps) {
  const { backgroundPreset, setBackgroundPreset } = useSettingsStore();
  const currentColor = PRESET_MAIN_COLORS[backgroundPreset];
  const currentMeta = BACKGROUND_PRESET_META[backgroundPreset];

  const handleSelect = (preset: BackgroundPreset) => {
    setBackgroundPreset(preset);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[85vh] rounded-t-3xl p-0 bg-base-100"
        hideOverlay
        hideCloseButton
      >
        <SheetHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-base-300">
          <SheetTitle className="text-lg font-semibold">배경 테마</SheetTitle>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </SheetHeader>

        {/* 현재 선택 미리보기 */}
        <div className="px-6 py-4">
          <div
            className="p-4 rounded-xl border-2 flex items-center gap-3"
            style={{
              borderColor: currentColor,
              backgroundColor: hexWithOpacity(currentColor, 0.08),
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: hexWithOpacity(currentColor, 0.2) }}
            >
              {currentMeta.icon}
            </div>
            <div>
              <div className="font-semibold text-base-content">
                현재: {currentMeta.labelKo}
              </div>
              <div className="text-sm text-base-content/70">
                {currentMeta.description}
              </div>
            </div>
          </div>
        </div>

        {/* 프리셋 그리드 (4개) */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {BACKGROUND_PRESET_ORDER.map((preset) => {
              const meta = BACKGROUND_PRESET_META[preset];
              const color = PRESET_MAIN_COLORS[preset];
              const isSelected = backgroundPreset === preset;

              return (
                <button
                  key={preset}
                  onClick={() => handleSelect(preset)}
                  className="relative flex flex-col items-center p-4 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: isSelected ? color : 'transparent',
                    backgroundColor: isSelected
                      ? hexWithOpacity(color, 0.08)
                      : 'var(--color-base-200, rgba(0,0,0,0.03))',
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2"
                    style={{ backgroundColor: hexWithOpacity(color, 0.18) }}
                  >
                    {meta.icon}
                  </div>

                  <span className="text-sm font-semibold text-base-content text-center">
                    {meta.labelKo}
                  </span>
                  <span className="text-[11px] text-base-content/60 text-center mt-1 line-clamp-2">
                    {meta.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="safe-area-bottom" />
      </SheetContent>
    </Sheet>
  );
}
