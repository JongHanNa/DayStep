'use client';

import React, { memo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { formatTimeForMarker } from '@/lib/utils/timeFormat';

interface CurrentTimeMarkerProps {
  className?: string;
}

// 현재 시간 마커 컴포넌트 - 미니멀하고 우아한 디자인
const CurrentTimeMarker: React.FC<CurrentTimeMarkerProps> = memo(({ className }) => {
  const now = useCurrentTime();
  const { timeFormat } = useSettingsStore();

  return (
    <motion.div
      id="current-time-marker"
      className={`relative flex items-center gap-4 my-6 px-3 ${className || ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* 현재 시간 라벨 - 미니멀하면서 눈에 띄는 디자인 */}
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium bg-blue-50/60 dark:bg-blue-900/20 rounded-full px-3 py-1.5 z-10">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">NOW</span>
        <span className="whitespace-nowrap">
          {formatTimeForMarker(now, timeFormat)}
        </span>
      </div>

      {/* 현재 시간 흐름 라인 - 미니멀하면서 눈에 띄는 디자인 */}
      <div className="flex-1 relative">
        {/* 베이스 라인 - 블루 톤으로 현재시간 강조 */}
        <div className="h-0.5 bg-blue-300/50 dark:bg-blue-500/40 rounded-full" />

        {/* 현재 위치 강조 도트 - 블루 톤으로 적절한 강조 */}
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full shadow-sm" />
      </div>
    </motion.div>
  );
});

CurrentTimeMarker.displayName = 'CurrentTimeMarker';

export default CurrentTimeMarker;