'use client';

import React from 'react';

interface MotivationEmptyStateProps {
  xpReward?: number;
}

export function MotivationEmptyState({ xpReward = 50 }: MotivationEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
      <div className="text-5xl mb-4">🕯️</div>
      <p className="text-base font-semibold text-base-content/70 mb-1">
        마음에 불을 붙여보세요
      </p>
      <p className="text-sm text-base-content/50">
        첫 원동력을 작성하고 <span className="text-amber-500 font-medium">+{xpReward} XP!</span>
      </p>
    </div>
  );
}
