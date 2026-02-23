/**
 * useFocusRefetch
 * 화면 포커스 시 debounced refetch 수행.
 * - useFocusEffect로 화면 전환 감지
 * - 5초 debounce로 빠른 탭 전환 시 중복 fetch 방지
 */
import {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';

const DEBOUNCE_MS = 5000;

export function useFocusRefetch(refetchFn: () => void) {
  const lastFetchRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchRef.current > DEBOUNCE_MS) {
        lastFetchRef.current = now;
        refetchFn();
      }
    }, [refetchFn]),
  );
}
