/**
 * Planner Page 2
 * 우선순위 매트릭스 + 하기 싫어도 해야 할 일 + 보상/칭찬/감사
 * TodoListScreen의 SwipeablePages Page 1
 */
import React, {useRef} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {PriorityMatrixPanel} from './PriorityMatrixPanel';
import {ReluctantTasksPanel} from './ReluctantTasksPanel';
import {ReflectionPanels} from './ReflectionPanels';

interface PlannerPage2Props {
  onMatrixAdd: (importance: boolean, urgency: boolean) => void;
  onReluctantAdd: () => void;
}

export function PlannerPage2({onMatrixAdd, onReluctantAdd}: PlannerPage2Props) {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{paddingHorizontal: 4, paddingBottom: 100}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <PriorityMatrixPanel onAddPress={onMatrixAdd} />
        <ReluctantTasksPanel onAddPress={onReluctantAdd} />
        <ReflectionPanels scrollViewRef={scrollViewRef} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
