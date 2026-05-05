/**
 * useRotatingNote — 노트 배열을 N초 간격으로 자동 회전
 *
 * 사용처:
 * - 오늘의 원동력 배너 (MotivationsScreen 상단)
 * - 홈 화면 2페이지의 원동력 카드 (BannerPage)
 *
 * 동작:
 * - notes.length === 0 → null 반환
 * - notes.length === 1 → 그 단일 노트 고정 반환 (interval 미동작)
 * - notes.length >= 2 → intervalMs 마다 순차 회전
 * - notes 갯수 변경 시 index 리셋 + interval 재시작
 */
import {useEffect, useState} from 'react';
import type {Note} from '@/stores/motivationStore';

export function useRotatingNote(
  notes: Note[],
  intervalMs: number = 8000,
): Note | null {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (notes.length <= 1) return;
    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % notes.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [notes.length, intervalMs]);

  if (notes.length === 0) return null;
  return notes[index % notes.length] ?? null;
}
