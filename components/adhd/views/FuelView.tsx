'use client';

import FuelContainer from '../fuel/FuelContainer';

interface FuelViewProps {
  onExit: () => void;
}

/**
 * 원동력 모드 뷰
 *
 * ADHDContainer에서 사용되는 원동력 모드 래퍼입니다.
 */
export default function FuelView({ onExit }: FuelViewProps) {
  return <FuelContainer onExit={onExit} />;
}
