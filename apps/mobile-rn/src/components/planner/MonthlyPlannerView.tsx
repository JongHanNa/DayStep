/**
 * MonthlyPlannerView — MonthlyPlannerScreen 내부 로직 추출
 * PlannerScreen에서 viewMode='monthlyPlanner'일 때 렌더링
 * ScreenContainer 없이 내부 컨텐츠만 제공
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  TodoFormBottomSheet,
  type TodoFormBottomSheetRef,
} from '@/components/todo/TodoFormBottomSheet';
import {MonthlyFAB} from '@/components/monthly-planner';
import {NativeMonthCalendarNative, LiquidGlassMenu} from '@/components/native';
import {useTodoStore} from '@/stores/todoStore';
import {useCalendarStore} from '@/stores/calendarStore';
import {useSettingsStore} from '@/stores/settingsStore';
import {format} from 'date-fns';
import {Calendar} from 'lucide-react-native';
import {useTheme} from '@/theme';

interface MonthlyPlannerViewProps {
  menuItems: Array<{title: string; key: string}>;
  onMenuSelect: (key: string) => void;
}

export function MonthlyPlannerView({menuItems, onMenuSelect}: MonthlyPlannerViewProps): React.ReactElement {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const {monthViewData, fetchTodosForMonthView, setSelectedDate} =
    useTodoStore();
  const {isConnected, monthEvents, fetchEventsForMonth} = useCalendarStore();
  const setPlannerViewMode = useSettingsStore(s => s.setPlannerViewMode);

  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const formSheetRef = useRef<TodoFormBottomSheetRef>(null);

  const loadMonth = useCallback(
    (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      fetchTodosForMonthView(year, month);
      if (isConnected) {
        fetchEventsForMonth(year, month);
      }
    },
    [fetchTodosForMonthView, isConnected, fetchEventsForMonth],
  );

  useEffect(() => {
    loadMonth(currentMonth);
  }, [currentMonth, loadMonth]);

  const handleDayPress = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
    },
    [setSelectedDate],
  );

  const handleMonthChange = useCallback(
    (year: number, month: number) => {
      const d = new Date(year, month - 1, 1);
      setCurrentMonth(d);
    },
    [],
  );

  const handleNavigateToPlanner = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      setPlannerViewMode('dailyPlanner');
    },
    [setSelectedDate, setPlannerViewMode],
  );

  const handleFABPress = useCallback(() => {
    formSheetRef.current?.openCreate(format(currentMonth, 'yyyy-MM-dd'));
  }, [currentMonth]);

  const monthDataJson = useMemo(
    () => JSON.stringify(monthViewData ?? {}),
    [monthViewData],
  );

  const eventDataJson = useMemo(
    () => JSON.stringify(isConnected ? monthEvents : {}),
    [isConnected, monthEvents],
  );

  return (
    <View style={{flex: 1}}>
      <View style={{flex: 1, paddingBottom: 64 + insets.bottom, position: 'relative'}}>
        <NativeMonthCalendarNative
          selectedDate=""
          primaryColor={primaryColor}
          monthData={monthDataJson}
          eventData={eventDataJson}
          onDateSelect={e => handleDayPress(e.nativeEvent.date)}
          onMonthChange={e => {
            handleMonthChange(e.nativeEvent.year, e.nativeEvent.month);
          }}
          onNavigateToPlanner={e => {
            handleNavigateToPlanner(e.nativeEvent.date);
          }}
          onHeightChange={() => {}}
          style={{flex: 1}}
        />
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <LiquidGlassMenu
            systemIconName="calendar"
            iconColor={primaryColor}
            size={36}
            menuItems={menuItems}
            onSelect={onMenuSelect}
            fallbackIcon={<Calendar size={18} color={primaryColor} />}
          />
        </View>
      </View>

      {/* FAB */}
      <MonthlyFAB onPress={handleFABPress} />

      {/* Todo 생성/편집 시트 */}
      <TodoFormBottomSheet ref={formSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
