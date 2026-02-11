'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, isToday, startOfMonth, subMonths, differenceInMonths } from 'date-fns';
import { Clock, ChevronUp, ChevronDown, Zap, Plus, Cloud } from 'lucide-react';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useProjectStore } from '@/state/stores/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import TodoEditModal from '@/components/todos/TodoEditModal';
import QuickLogModal from '@/components/adhd/QuickLogModal';
import PostponeOptionsSheet from '@/components/todos/PostponeOptionsSheet';
import AnytimeInboxSheet from '@/components/todos/AnytimeInboxSheet';
import { calculateTimeGaps, type TimeGap } from '@/lib/timeGapUtils';
import { MonthNavigator } from './MonthNavigator';
import { TimelineItemCard } from './TimelineItemCard';
import { TimelineGapButton } from './TimelineGapButton';
import { useTimelineData } from '../hooks/useTimelineData';
import { useTimelineNavigation } from '../hooks/useTimelineNavigation';
import { useTimelineActions } from '../hooks/useTimelineActions';
import { DailyPlannerView } from '../../daily-planner/components/DailyPlannerView';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import type { TodoTimelineViewProps, RenderItem, TimelineViewMode } from '../types';

/**
 * 타임라인 탭 - 할일 생성 기록 시간순
 *
 * ADHD 관점:
 * - 성취감: 완료한 일들을 시각적으로 확인
 * - 맥락: 프로젝트/목표 배지로 어떤 목표를 위한 건지 표시
 */
export function TodoTimelineView({ userId, viewMode = 'agenda' }: TodoTimelineViewProps) {
  const { showFuelBadges, setShowFuelBadges } = useSettingsStore();
  const { projects } = useProjectStore();
  const { todos } = useTodoStore();
  const { goScreen } = useADHDNavigation();

  // 뷰 모드 변경 시 URL 네비게이션
  const handleViewModeChange = useCallback((mode: TimelineViewMode) => {
    if (mode === 'daily') {
      goScreen('daily-planner');
    } else {
      goScreen('timeline');
    }
  }, [goScreen]);

  // 시간 미정 인박스 상태
  const [anytimeInboxOpen, setAnytimeInboxOpen] = useState(false);

  // 1. 데이터 훅
  const data = useTimelineData({ userId });

  // 2. 네비게이션 훅
  const nav = useTimelineNavigation({
    userId,
    isLoading: data.isLoading,
    dateRange: data.dateRange,
    recurrenceInstances: data.recurrenceInstances,
    pastMonthsLoaded: data.pastMonthsLoaded,
    futureMonthsLoaded: data.futureMonthsLoaded,
    setPastMonthsLoaded: data.setPastMonthsLoaded,
    setFutureMonthsLoaded: data.setFutureMonthsLoaded,
  });

  // 3. 액션 훅
  const actions = useTimelineActions({
    userId,
    setRecurrenceInstances: data.setRecurrenceInstances,
    setCompletions: data.setCompletions,
    loadAnytimeCount: data.loadAnytimeCount,
    navigatedMonth: nav.navigatedMonth,
  });

  // 4. 교차 관심사 핸들러 (data + nav 양쪽 호출)
  const handleLoadMorePast = useCallback(() => {
    data.setIsLoadingMore(true);
    data.setPastMonthsLoaded(prev => prev + 1);
    nav.setViewAnchorMonth(prev => subMonths(prev, 1));
    data.setIsLoadingMore(false);
  }, [data, nav]);

  const handleLoadMoreFuture = useCallback(async () => {
    data.setIsLoadingMore(true);
    data.setFutureMonthsLoaded(prev => prev + 1);
    data.setIsLoadingMore(false);
  }, [data]);

  // 월 변경 시 범위 확장 (nav.handleMonthChange를 확장)
  const handleMonthChange = useCallback((date: Date) => {
    const targetMonth = startOfMonth(date);

    if (targetMonth < data.dateRange.rangeStart) {
      const monthsToExtend = differenceInMonths(data.dateRange.rangeStart, targetMonth) + 1;
      data.setPastMonthsLoaded(prev => prev + monthsToExtend);
    } else if (targetMonth > data.dateRange.rangeEnd) {
      const monthsToExtend = differenceInMonths(targetMonth, data.dateRange.rangeEnd) + 1;
      data.setFutureMonthsLoaded(prev => prev + monthsToExtend);
    }

    nav.handleMonthChange(date);
  }, [data, nav]);

  // 시간 미정 할일 개수 로드 (날짜 변경 시)
  useEffect(() => {
    if (userId) {
      data.loadAnytimeCount(nav.navigatedMonth);
    }
  }, [data.loadAnytimeCount, userId, nav.navigatedMonth]);

  // ─── 공통 헤더 JSX ───
  const renderHeader = () => (
    <div className="sticky top-0 z-10 bg-base-100">
      <div className="flex items-center">
        <div className="flex-1">
          <MonthNavigator
            currentDate={nav.navigatedMonth}
            onMonthChange={handleMonthChange}
            onTodayClick={nav.handleTodayClick}
            onAddClick={actions.handleAddTodo}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>
        <button
          onClick={() => setShowFuelBadges(!showFuelBadges)}
          className={`btn btn-ghost btn-sm btn-circle ${showFuelBadges ? 'text-orange-500' : 'text-base-content/40'}`}
          title={showFuelBadges ? '원동력 숨기기' : '원동력 표시'}
        >
          <Zap className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAnytimeInboxOpen(true)}
          className="btn btn-ghost btn-sm btn-circle mr-2 text-purple-500 relative"
          title="시간 미정 할일"
        >
          <Cloud className="w-4 h-4" />
          {data.anytimeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {data.anytimeCount > 9 ? '9+' : data.anytimeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // ─── 공통 모달들 JSX ───
  const renderModals = () => (
    <>
      {/* 편집 모달 */}
      <TodoEditModal
        open={actions.editingTodo !== null && actions.editFormData !== null}
        todo={actions.editFormData}
        onClose={actions.closeEditModal}
        onSave={actions.handleEditSave}
        onChange={actions.setEditFormData}
        onDelete={actions.handleEditDelete}
        onRecurringDelete={actions.handleRecurringDelete}
        onRecurringSave={actions.handleRecurringSave}
        originalTitle={actions.editingItem?.title}
        originalStartTime={actions.editingItem?.startTime?.toISOString()}
        originalEndTime={actions.editingItem?.endTime?.toISOString()}
        originalRecurrencePattern={
          actions.editingTodo
            ? (todos.find(t => t.id === actions.editingTodo!.id)?.recurrencePattern ?? actions.editingTodo.recurrencePattern)
            : undefined
        }
        occurrenceDate={actions.editingItem?.recurrenceOccurrenceDate}
        headerTitle="할일 편집"
        todoId={actions.editingTodo?.id}
        userId={userId}
        showLinkedFuels={true}
        fuelNotes={data.fuelNotes}
        projects={projects}
        onCreateProject={actions.handleCreateProject}
        onProjectImmediateSave={actions.handleProjectImmediateSave}
      />

      {/* 삭제 확인 다이얼로그 */}
      {actions.deletingTodoId && (
        <dialog open className="modal modal-open z-[110]">
          <div className="modal-box bg-base-100 max-w-sm">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="text-base-content/70 mb-2">정말로 이 할일을 삭제하시겠습니까?</p>
            <p className="text-sm font-medium mb-6 break-words">
              &ldquo;{todos.find(t => t.id === actions.deletingTodoId)?.title}&rdquo;
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => actions.setDeletingTodoId(null)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <button
                onClick={() => actions.handleDelete(actions.deletingTodoId!)}
                className="btn btn-error btn-sm rounded-full"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => actions.setDeletingTodoId(null)} />
        </dialog>
      )}

      {/* 빈 시간 사후 기록 모달 */}
      <QuickLogModal
        isOpen={actions.isQuickLogModalOpen}
        onClose={actions.handleCloseQuickLog}
        prefillStartTime={actions.quickLogPrefillTime?.start}
        prefillEndTime={actions.quickLogPrefillTime?.end}
        initialMode={actions.quickLogInitialMode}
      />

      {/* 미루기 옵션 시트 */}
      {actions.postponingItem?.originalTodo && (
        <PostponeOptionsSheet
          isOpen={actions.postponeSheetOpen}
          onClose={() => {
            actions.setPostponeSheetOpen(false);
            actions.setPostponingItem(null);
          }}
          todo={actions.postponingItem.originalTodo}
          occurrenceDate={actions.postponingItem.recurrenceOccurrenceDate || ''}
          onPostpone={actions.handlePostpone}
          isProcessing={actions.isPostponeProcessing}
        />
      )}

      {/* 시간 미정 인박스 시트 */}
      <AnytimeInboxSheet
        isOpen={anytimeInboxOpen}
        onClose={() => setAnytimeInboxOpen(false)}
        selectedDate={format(nav.navigatedMonth, 'yyyy-MM-dd')}
        onRefresh={() => data.loadAnytimeCount(nav.navigatedMonth)}
      />
    </>
  );

  // ─── 로딩 상태 ───
  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  // ─── 하루 뷰 모드 ───
  if (viewMode === 'daily') {
    return (
      <div className="flex flex-col">
        {renderHeader()}
        <DailyPlannerView
          userId={userId}
          date={nav.navigatedMonth}
          timelineItems={nav.timelineItems}
          onEditClick={actions.handleEditClick}
          onToggleComplete={actions.handleToggleComplete}
          onUnskipTodo={actions.handleUnskipTodo}
          onSkipTodo={actions.handleSkipTodo}
          onOpenPostponeSheet={actions.handleOpenPostponeSheet}
          onAddTodo={actions.handleAddTodoWithPrefill}
        />
        {renderModals()}
      </div>
    );
  }

  // ─── 빈 상태 ───
  if (nav.timelineItems.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {renderHeader()}

        <div ref={nav.scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div className="p-4">
            <button
              onClick={handleLoadMorePast}
              disabled={data.isLoadingMore}
              className="w-full py-3 mb-4 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronUp className="w-4 h-4" />
              과거 1개월 더 보기
            </button>

            <div className="flex flex-col items-center justify-center h-48 text-base-content/60">
              <Clock className="w-12 h-12 mb-4 opacity-50" />
              <p>이 기간에 할일이 없어요</p>
              <p className="text-sm text-base-content/40 mt-1">{nav.rangeInfoText}</p>
              <button
                onClick={actions.handleAddTodo}
                className="btn btn-primary btn-sm mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                할일 추가하기
              </button>
            </div>

            <button
              onClick={handleLoadMoreFuture}
              disabled={data.isLoadingMore}
              className="w-full py-3 mt-4 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              미래 1개월 더 보기
            </button>
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // ─── 메인 타임라인 ───
  return (
    <div className="flex flex-col h-full">
      {renderHeader()}

      <div ref={nav.scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
      <div className={`p-4 space-y-8 transition-opacity duration-100 ${nav.isScrollReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* 과거 더 보기 버튼 */}
        <button
          onClick={handleLoadMorePast}
          disabled={data.isLoadingMore}
          className="w-full py-3 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
        >
          {data.isLoadingMore ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              과거 1개월 더 보기
            </>
          )}
        </button>

        {/* 월별 섹션 */}
        {nav.visibleMonthKeys.map(monthKey => {
          const dayGroups = nav.groupedByMonth[monthKey];
          const sortedDayKeys = Object.keys(dayGroups).sort((a, b) => {
            const numA = parseInt(a.split('_')[0]);
            const numB = parseInt(b.split('_')[0]);
            return numA - numB;
          });

          return (
            <div
              key={monthKey}
              ref={el => { nav.monthSectionRefs.current[monthKey] = el; }}
            >
              <h2 className="text-xl font-bold mb-6 text-base-content">{monthKey}</h2>

              <div className="space-y-6">
                {sortedDayKeys.map(dayKey => {
                  const { date, items } = dayGroups[dayKey];
                  const [dayNumber, dayOfWeek] = dayKey.split('_');
                  const isTodayDate = isToday(date);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const isPastOrToday = itemDate.getTime() <= today.getTime();

                  // 빈 시간 계산
                  let timeGaps: TimeGap[] = [];
                  if (isPastOrToday) {
                    const timedItems = items
                      .filter(item => item.scheduleType === 'timed' && item.startTime instanceof Date)
                      .map(item => ({
                        id: item.id,
                        title: item.title,
                        startTime: item.startTime instanceof Date ? item.startTime.toISOString() : undefined,
                        endTime: item.endTime instanceof Date ? item.endTime.toISOString() : undefined,
                        type: 'todo'
                      }));

                    timeGaps = calculateTimeGaps({
                      timedItems,
                      currentDate: date,
                      isTodayDate,
                      realTimeNow: new Date(),
                      showPastGaps: true,
                      loggedOngoingTasksRef: nav.loggedOngoingTasksRef
                    }).filter(gap => gap.type === 'between-items');
                  }

                  // 할일과 빈 시간을 시간순으로 병합
                  const renderItems: RenderItem[] = [];

                  items.forEach(item => {
                    renderItems.push({ type: 'todo', data: item });
                  });

                  timeGaps.forEach((gap, idx) => {
                    renderItems.push({ type: 'gap', data: gap, index: idx });
                  });

                  renderItems.sort((a, b) => {
                    const getStartTime = (item: RenderItem): number => {
                      let time: Date | string | null;
                      if (item.type === 'todo') {
                        time = item.data.startTime || item.data.createdAt;
                      } else {
                        time = item.data.startTime;
                      }
                      if (time instanceof Date) {
                        return time.getTime();
                      }
                      return time ? new Date(time).getTime() : 0;
                    };
                    return getStartTime(a) - getStartTime(b);
                  });

                  return (
                    <div
                      key={dayKey}
                      ref={isTodayDate ? nav.todaySectionRef : undefined}
                      data-date={format(date, 'yyyy-MM-dd')}
                      className="flex flex-col sm:flex-row sm:gap-4"
                    >
                      {/* 날짜 헤더 */}
                      <div className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-0 sm:w-12 flex-shrink-0 mb-2 sm:mb-0 sm:pt-1">
                        <div className={`text-2xl font-bold ${isTodayDate ? 'text-primary' : 'text-base-content'}`}>
                          {dayNumber}
                        </div>
                        <div className={`text-sm ${isTodayDate ? 'text-primary' : 'text-base-content/60'}`}>
                          {dayOfWeek}
                        </div>
                      </div>

                      {/* 할일 목록 */}
                      <div className="flex-1 space-y-2">
                        {renderItems.map((renderItem) => {
                          if (renderItem.type === 'gap') {
                            return (
                              <TimelineGapButton
                                key={`gap-${renderItem.index}`}
                                gap={renderItem.data}
                                currentTime={data.currentTime}
                                onClick={actions.handleTimeGapClick}
                              />
                            );
                          }

                          return (
                            <TimelineItemCard
                              key={renderItem.data.id}
                              item={renderItem.data}
                              date={date}
                              currentTime={data.currentTime}
                              projectMap={data.projectMap}
                              goalMap={data.goalMap}
                              departmentMap={data.departmentMap}
                              showFuelBadges={showFuelBadges}
                              getLinkedFuels={data.getLinkedFuels}
                              expandedFuelId={nav.expandedFuelId}
                              onExpandFuel={nav.setExpandedFuelId}
                              onToggleComplete={actions.handleToggleComplete}
                              onCancelExclusion={actions.handleCancelExclusion}
                              onUnskipTodo={actions.handleUnskipTodo}
                              onEditClick={actions.handleEditClick}
                              onDelete={actions.setDeletingTodoId}
                              onRestoreOriginal={actions.handleRestoreOriginal}
                              onOpenPostponeSheet={actions.handleOpenPostponeSheet}
                              onSkipTodo={actions.handleSkipTodo}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 미래 더 보기 버튼 */}
        <button
          onClick={handleLoadMoreFuture}
          disabled={data.isLoadingMore}
          className="w-full py-3 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
        >
          {data.isLoadingMore ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              미래 1개월 더 보기
            </>
          )}
        </button>
      </div>
      </div>

      {renderModals()}
    </div>
  );
}
