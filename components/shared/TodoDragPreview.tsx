'use client';

import { Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

interface TodoDragPreviewProps {
  title: string;
  isHighlight?: boolean;
  scheduledDate?: Date | string;
}

/**
 * 드래그앤드롭 시 표시되는 할일 프리뷰 카드
 * 프로젝트 편집 모달과 달력 페이지에서 공통으로 사용
 */
export default function TodoDragPreview({
  title,
  isHighlight,
  scheduledDate
}: TodoDragPreviewProps) {
  return (
    <div className="bg-base-100 border-2 border-primary rounded-lg p-3 shadow-2xl max-w-xs opacity-90">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm">{title}</p>
        {isHighlight && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        )}
      </div>
      {scheduledDate && (
        <p className="text-xs text-base-content/60 mt-1">
          <Calendar className="w-3 h-3 inline mr-1" />
          {format(new Date(scheduledDate), 'M/d')}
        </p>
      )}
    </div>
  );
}
