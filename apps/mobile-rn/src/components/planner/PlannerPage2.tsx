/**
 * Planner Page 2
 * 우선순위 매트릭스 + 하기 싫어도 해야 할 일 + 보상/칭찬/감사
 * TodoListScreen의 SwipeablePages Page 1
 */
import React from 'react';
import {ScrollView} from 'react-native';
import {PriorityMatrixPanel} from './PriorityMatrixPanel';
import {ReluctantTasksPanel} from './ReluctantTasksPanel';
import {ReflectionPanels} from './ReflectionPanels';

export function PlannerPage2() {
  return (
    <ScrollView
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 100}}
      showsVerticalScrollIndicator={false}>
      <PriorityMatrixPanel />
      <ReluctantTasksPanel />
      <ReflectionPanels />
    </ScrollView>
  );
}
