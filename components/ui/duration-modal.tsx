'use client';

import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import { Sheet } from 'react-modal-sheet';
import { DurationSelector } from '@/components/ui/duration-selector';

interface DurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHours: number;
  selectedMinutes: number;
  onDurationChange: (hours: number, minutes: number) => void;
  accentColor?: string;
}

export function DurationModal({
  isOpen,
  onClose,
  selectedHours,
  selectedMinutes,
  onDurationChange,
  accentColor = '#DBAC6C'
}: DurationModalProps) {

  // 시간 간격 변경 핸들러
  const handleDurationChange = useCallback((hours: number, minutes: number) => {
    onDurationChange(hours, minutes);
  }, [onDurationChange]);

  // 완료 버튼 클릭 핸들러
  const handleComplete = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.6, 0]}
      initialSnap={0}
      dragCloseThreshold={0.6}
      dragVelocityThreshold={500}
      prefersReducedMotion={false}
    >
      <Sheet.Container className="bg-background">
        <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
          <div className="flex items-center justify-between px-4 py-3">
            {/* 왼쪽: 빈 공간 (대칭을 위해) */}
            <div className="w-12"></div>

            {/* 가운데: 제목 */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">시간 간격</h2>
            </div>

            {/* 오른쪽: 닫기 버튼 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </Sheet.Header>

        <Sheet.Content className="px-0">
          <div className="p-4">
            <DurationSelector
              selectedHours={selectedHours}
              selectedMinutes={selectedMinutes}
              onDurationChange={handleDurationChange}
              accentColor={accentColor}
            />

            {/* 완료 버튼 */}
            <div className="mt-6 px-4">
              <button
                onClick={handleComplete}
                className="w-full py-3 rounded-lg font-semibold text-white text-lg transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                완료
              </button>
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}