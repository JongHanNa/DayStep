'use client';

import { CheckCircle2, Pause, MinusCircle, XCircle } from 'lucide-react';

interface MissedTodoActionPanelProps {
  onComplete: () => void;
  onPostpone: () => void;
  onSkipNotNeeded: () => void;
  onSkipMissed: () => void;
  /** 'chip': DraggableTodoChip 하단 부착용, 'card': TimelineItemCard 내부 독립 박스 */
  variant?: 'chip' | 'card';
}

export function MissedTodoActionPanel({
  onComplete,
  onPostpone,
  onSkipNotNeeded,
  onSkipMissed,
  variant = 'card',
}: MissedTodoActionPanelProps) {
  const containerClass = variant === 'chip'
    ? 'px-2 py-1.5 bg-warning/5 border border-t-0 border-warning/20 rounded-b-lg'
    : 'mt-2 p-2 bg-warning/10 rounded-lg border border-warning/20';

  return (
    <div
      className={containerClass}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] text-base-content/55 mb-1">어떻게 기록할까요?</p>
      <div className="flex flex-wrap gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="btn btn-xs btn-ghost text-[11px] text-success gap-1"
        >
          <CheckCircle2 className="w-3 h-3" />
          완료했음
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPostpone();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="btn btn-xs btn-ghost text-[11px] text-warning gap-1"
        >
          <Pause className="w-3 h-3" />
          미뤘음
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkipNotNeeded();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="btn btn-xs btn-ghost text-[11px] text-base-content/60 gap-1"
        >
          <MinusCircle className="w-3 h-3" />
          필요없었음
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkipMissed();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="btn btn-xs btn-ghost text-[11px] text-error gap-1"
        >
          <XCircle className="w-3 h-3" />
          놓침
        </button>
      </div>
    </div>
  );
}
