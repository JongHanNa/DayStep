/**
 * Planner Page 2
 * 우선순위 매트릭스 + 브레인 덤프 + 회고 패널
 * TodoListScreen의 SwipeablePages Page 1
 */
import React, {useRef} from 'react';
import {ScrollView} from 'react-native';
import {PriorityMatrixPanel} from './PriorityMatrixPanel';
import {BrainDumpPanel} from './BrainDumpPanel';
import {ReflectionPanels} from './ReflectionPanels';

interface PlannerPage2Props {
  onMatrixAdd: (importance: boolean, urgency: boolean) => void;
}

export function PlannerPage2({onMatrixAdd}: PlannerPage2Props) {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={{paddingHorizontal: 4, paddingBottom: 100}}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      automaticallyAdjustKeyboardInsets>
      <PriorityMatrixPanel onAddPress={onMatrixAdd} />
      <BrainDumpPanel scrollViewRef={scrollViewRef} />
      <ReflectionPanels scrollViewRef={scrollViewRef} />
    </ScrollView>
  );
}
