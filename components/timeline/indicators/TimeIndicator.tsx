'use client';

import React, { memo } from 'react';
import { useSettingsStore } from '@/state/stores/settingsStore';

interface TimeIndicatorProps {
  time: string | Date;
  label?: string;
  showIfNotConsecutive?: boolean;
  className?: string;
}

const TimeIndicator: React.FC<TimeIndicatorProps> = memo(({
  time,
  label,
  showIfNotConsecutive = true,
  className = ""
}) => {
  // 🔧 Hook은 항상 컴포넌트 최상단에서 호출 (조건부 return 전에)
  const { timeFormat } = useSettingsStore();
  
  if (!showIfNotConsecutive) return null;

  const timeDate = typeof time === 'string' ? new Date(time) : time;
  
  // 🔧 시간대 변환 디버깅 (성능 최적화를 위해 주석 처리)
  // console.log('🕐 TimeIndicator 시간 변환:', {
  //   originalTime: time,
  //   timeDate: timeDate.toISOString(),
  //   timeDateLocal: timeDate.toLocaleString('ko-KR'),
  //   timeFormat,
  //   getHours: timeDate.getHours(),
  //   getUTCHours: timeDate.getUTCHours()
  // });
  
  // 🕐 설정에 따른 시간 표기법 적용 (UTC 기준으로 올바른 시간 추출)
  let timeString: string;
  
  if (timeFormat === '24h') {
    // 24시간 표기법: HH:mm 형식 (로컬 시간 사용)
    const hours = timeDate.getHours().toString().padStart(2, '0');
    const minutes = timeDate.getMinutes().toString().padStart(2, '0');
    timeString = `${hours}:${minutes}`;
  } else {
    // 12시간 표기법: 오전/오후 h:mm 형식 (로컬 시간 사용)
    const localHours = timeDate.getHours();
    const minutes = timeDate.getMinutes().toString().padStart(2, '0');
    
    if (localHours === 0) {
      timeString = `오전 12:${minutes}`;
    } else if (localHours < 12) {
      timeString = `오전 ${localHours}:${minutes}`;
    } else if (localHours === 12) {
      timeString = `오후 12:${minutes}`;
    } else {
      timeString = `오후 ${localHours - 12}:${minutes}`;
    }
  }
  
  return (
    <div className={`flex items-center gap-2 text-base text-muted-foreground ${className}`}>
      <span className="font-semibold">
        {timeString}{label && ` ${label}`}
      </span>
    </div>
  );
});

TimeIndicator.displayName = 'TimeIndicator';

export default TimeIndicator;