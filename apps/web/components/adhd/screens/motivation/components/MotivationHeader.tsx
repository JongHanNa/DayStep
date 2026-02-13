'use client';

import React from 'react';
import { Flame, ArrowRightLeft, Calendar } from 'lucide-react';

interface MotivationHeaderProps {
  totalCount: number;
  convertedCount: number;
  streak: number;
  xp: { total: number; level: number; progress: number };
}

export function MotivationHeader({ totalCount, convertedCount, streak, xp }: MotivationHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-rose-900/20 rounded-2xl p-4 mx-4 mb-4">
      {/* 제목 */}
      <div className="mb-3">
        <h2 className="text-lg font-bold text-base-content">원동력 새기기</h2>
        <p className="text-sm text-base-content/60">마음에 불을 붙여보세요 🔥</p>
      </div>

      {/* 통계 3칸 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCard icon={<Flame className="w-4 h-4 text-amber-500" />} value={totalCount} label="총 원동력" />
        <StatCard icon={<ArrowRightLeft className="w-4 h-4 text-emerald-500" />} value={convertedCount} label="할일 전환" />
        <StatCard icon={<Calendar className="w-4 h-4 text-blue-500" />} value={`${streak}일`} label="연속 기록" />
      </div>

      {/* XP 바 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">⭐ {xp.total} XP</span>
        <div className="flex-1 h-2 bg-base-300/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${xp.progress * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-base-content/70">Lv.{xp.level}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/60 dark:bg-base-200/60 rounded-xl py-2 px-1">
      {icon}
      <span className="text-lg font-bold text-base-content">{value}</span>
      <span className="text-[10px] text-base-content/50">{label}</span>
    </div>
  );
}
