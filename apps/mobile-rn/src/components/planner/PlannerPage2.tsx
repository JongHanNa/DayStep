/**
 * Planner Page 2
 * 우선순위 매트릭스 + 하기 싫어도 해야 할 일 + 보상/칭찬/감사
 * TodoListScreen의 SwipeablePages Page 1
 * TodoPickerSheet 연동
 */
import React, {useRef, useCallback} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {PriorityMatrixPanel} from './PriorityMatrixPanel';
import {ReluctantTasksPanel} from './ReluctantTasksPanel';
import {ReflectionPanels} from './ReflectionPanels';
import {
  TodoPickerSheet,
  type TodoPickerSheetRef,
} from './TodoPickerSheet';

export function PlannerPage2() {
  const pickerRef = useRef<TodoPickerSheetRef>(null);

  const handleMatrixAdd = useCallback(
    (importance: boolean, urgency: boolean) => {
      pickerRef.current?.open({type: 'matrix', importance, urgency});
    },
    [],
  );

  const handleReluctantAdd = useCallback(() => {
    pickerRef.current?.open({type: 'reluctant'});
  }, []);

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{paddingHorizontal: 4, paddingBottom: 100}}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <PriorityMatrixPanel onAddPress={handleMatrixAdd} />
          <ReluctantTasksPanel onAddPress={handleReluctantAdd} />
          <ReflectionPanels />
        </ScrollView>
      </KeyboardAvoidingView>
      <TodoPickerSheet ref={pickerRef} />
    </>
  );
}
