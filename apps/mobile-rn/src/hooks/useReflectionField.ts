/**
 * useReflectionField
 * daily_reflections의 단일 string 필드를 관리하는 훅.
 * - reflectionStore 캐시와 로컬 입력 상태를 양방향 동기화
 * - selectedDate 변경 시 이전 날짜에 미저장 값을 auto-save
 * - selectedDate 변경 시 자동으로 loadReflection 호출
 * - save()는 onBlur 등 명시적 저장 시점에 호출
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useReflectionStore} from '@/stores/reflectionStore';

export type ReflectionStringField =
  | 'reward'
  | 'reflection'
  | 'spending_note'
  | 'thought_archive'
  | 'today_lesson'
  | 'today_resolution'
  | 'current_period'
  | 'today_prayer';

interface UseReflectionFieldResult {
  value: string;
  setValue: (v: string) => void;
  save: () => void;
}

export function useReflectionField(
  fieldName: ReflectionStringField,
): UseReflectionFieldResult {
  const user = useAuthStore(s => s.user);
  const {selectedDate} = useTodoStore();
  const {getReflection, loadReflection, upsertReflection} =
    useReflectionStore();

  const reflection = getReflection(selectedDate);
  const cachedValue =
    (reflection?.[fieldName] as string | undefined) ?? '';

  const [value, setValue] = useState(cachedValue);

  const valueRef = useRef(value);
  const upsertRef = useRef(upsertReflection);
  const getReflectionRef = useRef(getReflection);
  const prevDateRef = useRef(selectedDate);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    upsertRef.current = upsertReflection;
    getReflectionRef.current = getReflection;
  }, [upsertReflection, getReflection]);

  // selectedDate에 대해 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadReflection(user.id, selectedDate);
    }
  }, [user?.id, selectedDate, loadReflection]);

  // 날짜 변경 시 이전 날짜의 미저장 값 auto-save
  useEffect(() => {
    if (prevDateRef.current !== selectedDate && user?.id) {
      const prevDate = prevDateRef.current;
      const prevReflection = getReflectionRef.current(prevDate);
      const prevValue =
        (prevReflection?.[fieldName] as string | undefined) ?? '';
      if (valueRef.current !== prevValue) {
        upsertRef.current(user.id, prevDate, {
          [fieldName]: valueRef.current,
        });
      }
      prevDateRef.current = selectedDate;
    }
  }, [selectedDate, user?.id, fieldName]);

  // 캐시 변경 시 로컬 값 동기화
  // upsertReflection 응답으로 캐시가 갱신될 때 화면도 함께 갱신되도록
  // cachedValue를 의존성에 포함
  useEffect(() => {
    setValue(cachedValue);
  }, [selectedDate, cachedValue]);

  const save = useCallback(() => {
    if (!user?.id) return;
    upsertReflection(user.id, selectedDate, {[fieldName]: value});
  }, [user?.id, selectedDate, fieldName, value, upsertReflection]);

  return {value, setValue, save};
}
