/**
 * TodoPickerSheet
 * 미배치 할일을 선택하는 바텀시트
 * PriorityMatrix / ReluctantTasks에서 "+" 버튼으로 열림
 */
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Check} from 'lucide-react-native';
import type {Todo} from '@daystep/shared-core';

type PickerMode =
  | {type: 'matrix'; importance: boolean; urgency: boolean}
  | {type: 'reluctant'};

export interface TodoPickerSheetRef {
  open: (mode: PickerMode) => void;
  close: () => void;
}

interface TodoPickerSheetProps {
  onRecurringTodo?: (todo: Todo, updates: Partial<Todo>) => void;
}

export const TodoPickerSheet = forwardRef<TodoPickerSheetRef, TodoPickerSheetProps>(
  function TodoPickerSheet({onRecurringTodo}, ref) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [mode, setMode] = useState<PickerMode | null>(null);
    const {todos, updateTodo} = useTodoStore();
    const {primaryColor} = useTheme();

    const snapPoints = useMemo(() => ['50%', '80%'], []);

    useImperativeHandle(ref, () => ({
      open: (m: PickerMode) => {
        setMode(m);
        bottomSheetRef.current?.present();
      },
      close: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const availableTodos = useMemo(() => {
      return todos.filter((t: any) => {
        if (t.completed) return false;
        if (mode?.type === 'reluctant') {
          return !t.is_reluctant_must_do;
        }
        // matrix: 미배치 할일 (importance/urgency 둘 다 null)
        return t.importance === null || t.importance === undefined;
      });
    }, [todos, mode]);

    const handleSelect = useCallback(
      async (todo: Todo) => {
        if (!mode) return;

        let updates: Partial<any>;
        if (mode.type === 'matrix') {
          updates = {importance: mode.importance, urgency: mode.urgency};
        } else {
          updates = {is_reluctant_must_do: true};
        }

        // 반복 할일이면 다이얼로그 위임
        if (
          todo.recurrence_pattern &&
          todo.recurrence_pattern !== 'none' &&
          onRecurringTodo
        ) {
          bottomSheetRef.current?.dismiss();
          onRecurringTodo(todo, updates);
          return;
        }

        await updateTodo(todo.id, updates);
        bottomSheetRef.current?.dismiss();
      },
      [mode, updateTodo, onRecurringTodo],
    );

    const getTitle = () => {
      if (!mode) return '할일 선택';
      if (mode.type === 'reluctant') return '하기 싫어도 해야 할 일 추가';
      const {importance, urgency} = mode;
      if (importance && urgency) return '긴급 + 중요 추가';
      if (importance) return '중요 (비긴급) 추가';
      if (urgency) return '긴급 (비중요) 추가';
      return '나중에 추가';
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    const renderItem = useCallback(
      ({item}: {item: Todo}) => (
        <AnimatedPressable
          onPress={() => handleSelect(item)}
          hapticType="light"
          scaleValue={0.98}
          style={styles.todoItem}>
          <View style={styles.todoInfo}>
            <Text style={styles.todoTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.recurrence_pattern && item.recurrence_pattern !== 'none' && (
              <Text style={styles.recurrenceBadge}>반복</Text>
            )}
          </View>
          <Check size={18} color={primaryColor} style={{opacity: 0.3}} />
        </AnimatedPressable>
      ),
      [handleSelect, primaryColor],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={() => setMode(null)}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.headerSubtitle}>
            {availableTodos.length}개 할일
          </Text>
        </View>
        <BottomSheetFlatList
          data={availableTodos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>배치할 수 있는 할일이 없어요</Text>
            </View>
          }
        />
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  todoInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todoTitle: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  recurrenceBadge: {
    fontSize: 11,
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
