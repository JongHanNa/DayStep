import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import type { TimeGap } from '@/lib/timeGapUtils';

interface TimelineGapButtonProps {
  gap: TimeGap;
  currentTime: Date;
  onClick: (gap: TimeGap) => void;
}

export function TimelineGapButton({ gap, currentTime, onClick }: TimelineGapButtonProps) {
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  const getLabel = (): string => {
    const start = format(gap.startTime, 'HH:mm');
    const end = format(gap.endTime, 'HH:mm');

    if (gap.startTime <= currentTime && currentTime <= gap.endTime) {
      // 현재 진행 중
      const remaining = formatDuration(gap.endTime.getTime() - currentTime.getTime());
      return `${start} ~ ${end} 현재 ${format(currentTime, 'HH:mm')} 뭐하는 중이세요? (다음 일정까지 ${remaining})`;
    }

    const duration = formatDuration(gap.endTime.getTime() - gap.startTime.getTime());

    if (gap.endTime < currentTime) {
      // 과거
      return `${start} ~ ${end} 이 시간에 뭐 했어요? (${duration})`;
    }

    // 미래
    return `${start} ~ ${end} 뭐 할 예정이에요? (${duration})`;
  };

  return (
    <button
      onClick={() => onClick(gap)}
      className="w-full flex items-center gap-2 p-2 rounded-lg border-2 border-dashed border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-base-content/50 hover:text-primary"
    >
      <Plus className="w-4 h-4" />
      <span className="text-xs">{getLabel()}</span>
    </button>
  );
}
