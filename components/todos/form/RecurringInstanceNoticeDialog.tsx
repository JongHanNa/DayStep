'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecurringInstanceNoticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * 반복 일정 안내 다이얼로그
 *
 * 반복 할일의 날짜/시간을 변경하려고 할 때 표시
 * "이 일정만 업데이트됩니다. 다른 일정에는 영향을 주지 않습니다."
 */
const RecurringInstanceNoticeDialog: React.FC<RecurringInstanceNoticeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mx-4 w-full max-w-xs text-center"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 아이콘 */}
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>

        {/* 제목 */}
        <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
          반복 일정이에요
        </h2>

        {/* 설명 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          이 일정만 업데이트됩니다. 다른 일정에는 영향을
          주지 않습니다.
        </p>

        {/* 버튼 */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-full"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-primary hover:bg-primary/90"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RecurringInstanceNoticeDialog;
