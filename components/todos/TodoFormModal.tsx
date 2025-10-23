'use client';

import React, { useEffect, useCallback } from 'react';
import { Edit, Trash2, X, Clock, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet } from 'react-modal-sheet';
import ColorPicker from '@/components/ui/ColorPicker';
import { animated } from '@react-spring/web';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import RecurringDeleteDialog from './RecurringDeleteDialog';
import RecurringUpdateDialog from './RecurringUpdateDialog';
import SimpleDeleteDialog from './SimpleDeleteDialog';
import TodoBasicFields from './form/TodoBasicFields';
import ScheduleSettings from './form/ScheduleSettings';
import DepartureSettings from './form/DepartureSettings';
import RecurrenceSettings from './form/RecurrenceSettings';
import TodoMetadata from './form/TodoMetadata';
import LinkedNotes from './form/LinkedNotes';
import NoteInput from './form/NoteInput';
import ContactsSection from './form/ContactsSection';
import MotivationSelection from './form/MotivationSelection';
import { useElasticScroll } from '@/hooks/useElasticScroll';
import { useTodoFormState } from '@/hooks/useTodoFormState';
import { useTodoFormHandlers } from '@/hooks/useTodoFormHandlers';
import type { TodoFormModalProps } from '@/types/todoFormTypes';
import { getColorById, isColorDark } from '@/lib/color-palette';
import { isCapacitorEnvironment } from '@/lib/utils';
import { createModalConfig } from '@/lib/modal-config';

const TodoFormModal: React.FC<TodoFormModalProps> = ({
  open,
  onOpenChange,
  editingTodo,
  initialStartTime,
  initialEndTime
}) => {
  // 폼 상태 관리 훅
  const { values, actions, uiState, computed, initializeForm } = useTodoFormState({
    editingTodo,
    initialStartTime,
    initialEndTime,
    open,
  });

  // 비즈니스 로직 핸들러 훅
  const handlers = useTodoFormHandlers({
    values,
    actions,
    editingTodo,
    onOpenChange,
    isSubmitting: uiState.isSubmitting,
    setIsSubmitting: uiState.setIsSubmitting,
    isDeleting: uiState.isDeleting,
    setIsDeleting: uiState.setIsDeleting,
    setShowDeleteDialog: uiState.setShowDeleteDialog,
    setShowRecurringDeleteDialog: uiState.setShowRecurringDeleteDialog,
    // 반복 할일 시간 변경 모달 관련
    showRecurringUpdateDialog: uiState.showRecurringUpdateDialog,
    setShowRecurringUpdateDialog: uiState.setShowRecurringUpdateDialog,
    originalTimeForUpdate: uiState.originalTimeForUpdate,
    setOriginalTimeForUpdate: uiState.setOriginalTimeForUpdate,
    newTimeForUpdate: uiState.newTimeForUpdate,
    setNewTimeForUpdate: uiState.setNewTimeForUpdate,
    occurrenceDate: uiState.occurrenceDate,
    setOccurrenceDate: uiState.setOccurrenceDate,
  });

  // 탄성 스크롤 효과
  const { containerRef, springs } = useElasticScroll({
    bounceDistance: 80,
    bounceStrength: 1.0,
    bounceDuration: 400,
    desktopOnly: false,
    enabled: open
  });

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      initializeForm();
    }
  }, [open, initializeForm]);

  // 🔧 모달 열림 시 스크롤 초기화 (react-spring 탄성 효과와 통합)
  useEffect(() => {
    if (open && containerRef.current) {
      const container = containerRef.current;

      // 모달 열림 후 약간의 지연을 두고 스크롤 초기화
      const timer = setTimeout(() => {
        container.scrollTop = 0;
        console.log('🎯 react-spring 탄성 스크롤 효과 초기화 완료');
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, containerRef]);

  // 터치 핸들러
  const handleTouchStart = useCallback((_e: React.TouchEvent) => {
    uiState.setDragDisabled(true);
  }, [uiState]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => uiState.setDragDisabled(false), 100);
  }, [uiState]);



  // 스크롤 위치 추적 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    uiState.setScrollTop(target.scrollTop);
  }, [uiState]);


  // 중앙 집중식 모달 설정 - 100% 높이 통일
  const modalConfig = createModalConfig('FULLSCREEN', {
    disableDrag: uiState.dragDisabled,
  });

  return (
    <>
    <Sheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      {...modalConfig}
    >
      <Sheet.Container className="bg-background">
        <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
          {computed.isEditMode ? (
            /* 수정 모드: 취소/완료 버튼 레이아웃 */
            <div className="flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 취소 버튼 */}
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-content font-medium px-4 py-2 rounded-full"
              >
                취소
              </Button>

              {/* 가운데: 제목 */}
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">할일 수정</h2>
              </div>

              {/* 오른쪽: 완료 버튼 */}
              <Button
                type="button"
                size="sm"
                onClick={handlers.handleSubmit}
                disabled={uiState.isSubmitting || uiState.isDeleting || !values.content.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-content font-medium px-4 py-2 rounded-full disabled:bg-gray-400 disabled:opacity-60"
              >
                {uiState.isSubmitting ? '수정 중...' : '완료'}
              </Button>
            </div>
          ) : (
            /* 추가 모드: 취소 버튼만 있는 헤더 */
            <div className="flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 취소 버튼 */}
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-content font-medium px-4 py-2 rounded-full"
              >
                취소
              </Button>

              {/* 가운데: 제목 */}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">새 할일 추가</h2>
              </div>

              {/* 오른쪽: 빈 공간 (대칭을 위해) */}
              <div className="w-12"></div>
            </div>
          )}
        </Sheet.Header>

        {/* 🎯 react-spring 기반 탄성 스크롤 컨테이너 */}
        <animated.div
          ref={containerRef}
          className="scrollable-container scrollbar-hide"
          style={{
            // 기본 스크롤 설정
            height: '80vh',
            maxHeight: '80vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none', // react-spring 탄성 효과를 위해 브라우저 기본 동작 차단
            // 스크롤바 숨김
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // 터치 및 위치 설정
            touchAction: 'pan-y',
            padding: '0', // 양옆 패딩 제거
            background: 'white',
            position: 'relative',
            // react-spring 애니메이션 적용
            transform: springs.y.to(y => `translateY(${y}px)`),
          }}
          // 스크롤 위치 추적
          onScroll={handleScroll}
          // 🎯 react-spring 통합 터치 핸들러
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          >
            <form
              onSubmit={handlers.handleSubmit}
              className="bg-white todo-form"
            >
              {/* 아이콘 및 내용 입력 */}
              <TodoMetadata
                selectedIcon={values.selectedIcon}
                content={values.content}
                onIconSelectClick={() => uiState.setIconBrowserOpen(true)}
                onContentChange={actions.setContent}
                selectedColor={values.selectedColor}
              />

              {/* 기본 할일 필드 - 할일 내용은 TodoMetadata로 이동됨 */}
              {/* <TodoBasicFields
                content={values.content}
                priority={values.priority}
                onContentChange={actions.setContent}
                onPriorityChange={actions.setPriority}
              /> */}

              {/* 스케줄 설정 - 아이콘/내용 영역 바로 아래로 이동 */}
              <ScheduleSettings
                scheduleType={values.scheduleType}
                startDate={values.startDate}
                startTime={values.startTime}
                endDate={values.endDate}
                endTime={values.endTime}
                durationHours={values.durationHours}
                durationMins={values.durationMins}
                onScheduleTypeChange={handlers.handleScheduleTypeChange}
                onStartDateChange={handlers.handleStartDateChange}
                onStartTimeChange={handlers.handleStartTimeChange}
                onDurationHoursChange={handlers.handleDurationHoursChange}
                onDurationMinsChange={handlers.handleDurationMinsChange}
                selectedColor={values.selectedColor}
              />

              {/* 출발 정보 설정 */}
              <DepartureSettings
                departureLocation={values.departureLocation}
                departureDate={values.departureDate}
                departureTime={values.departureTime}
                onLocationChange={actions.setDepartureLocation}
                onDateChange={actions.setDepartureDate}
                onTimeChange={actions.setDepartureTime}
                selectedColor={values.selectedColor}
              />

              {/* 반복 설정 - 스케줄 설정 바로 아래 */}
              <RecurrenceSettings
                showRecurrenceSettings={values.showRecurrenceSettings}
                recurrencePattern={values.recurrencePattern}
                recurrenceInterval={values.recurrenceInterval}
                recurrenceEndDate={values.recurrenceEndDate}
                recurrenceCount={values.recurrenceCount}
                recurrenceEndType={values.recurrenceEndType}
                selectedDaysOfWeek={values.selectedDaysOfWeek}
                onRecurrencePatternChange={handlers.handleRecurrencePatternChange}
                onRecurrenceIntervalChange={actions.setRecurrenceInterval}
                onRecurrenceEndDateChange={actions.setRecurrenceEndDate}
                onRecurrenceCountChange={actions.setRecurrenceCount}
                onRecurrenceEndTypeChange={actions.setRecurrenceEndType}
                onDayOfWeekToggle={handlers.handleDayOfWeekToggle}
                selectedColor={values.selectedColor}
              />


              {/* 연결된 노트 표시 (수정 모드일 때만) */}
              {computed.isEditMode && editingTodo && (
                <LinkedNotes taskId={editingTodo.id} />
              )}

              {/* 노트 입력 (항상 표시) */}
              <NoteInput
                memos={values.memos}
                onMemosChange={actions.setMemos}
                selectedColor={values.selectedColor}
              />

              {/* 동기부여 메시지 선택 섹션 */}
              <MotivationSelection
                todoId={editingTodo?.id}
                todoContent={values.content}
                selectedMotivations={values.selectedMotivations}
                onMotivationsChange={actions.setSelectedMotivations}
                selectedColor={values.selectedColor}
              />

              {/* 연락처 연결 섹션 */}
              <ContactsSection
                selectedContacts={values.selectedContacts}
                onContactsChange={actions.setSelectedContacts}
                selectedColor={values.selectedColor}
              />

              {/* 하단 여백을 위한 빈 공간 */}
              <div className="pb-20" />
            </form>
        </animated.div>

        {/* 떠있는 하단 버튼 - 모드별 다른 레이아웃 */}
        <div
          className={`fixed left-1/2 transform -translate-x-1/2 z-50 flex gap-3 ${
            isCapacitorEnvironment() ? 'bottom-32' : 'bottom-16'
          }`}
        >
          {computed.isEditMode ? (
            /* 수정 모드: 삭제 버튼만 표시 */
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handlers.handleDeleteClick(e)}
              disabled={uiState.isSubmitting || uiState.isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white shadow-lg"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {uiState.isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          ) : (
            /* 추가 모드: 할일 추가 버튼만 표시 */
            <div
              className="font-semibold px-24 py-3 rounded-full shadow-lg min-w-[364px] transition-all duration-200 ease-in-out cursor-pointer hover:scale-105 active:scale-95 text-center"
              onClick={handlers.handleSubmit}
              style={{
                backgroundColor: getColorById(values.selectedColor).hex,
                color: 'white',
                border: 'none',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: (uiState.isSubmitting || uiState.isDeleting || !values.content.trim()) ? 'none' : 'auto',
              }}
            >
              {uiState.isSubmitting ? '추가 중...' : '할일 추가'}
            </div>
          )}
        </div>
      </Sheet.Container>
    </Sheet>

    {/* 반복 일정 삭제 다이얼로그 */}
    {editingTodo && (
      <RecurringDeleteDialog
        isOpen={uiState.showRecurringDeleteDialog}
        onClose={() => {
          console.log('🔍 [MODAL] 반복 삭제 다이얼로그 닫기 호출');
          uiState.setShowRecurringDeleteDialog(false);
        }}
        onConfirm={handlers.handleRecurringDelete}
        todo={editingTodo}
        isDeleting={uiState.isDeleting}
      />
    )}

    {/* 일반 할일 삭제 다이얼로그 */}
    {editingTodo && (
      <SimpleDeleteDialog
        isOpen={uiState.showDeleteDialog}
        onClose={() => uiState.setShowDeleteDialog(false)}
        onConfirm={handlers.handleSimpleDelete}
        todo={editingTodo}
        isDeleting={uiState.isDeleting}
      />
    )}

    {/* 반복 할일 시간 변경 다이얼로그 */}
    {editingTodo && uiState.originalTimeForUpdate && uiState.newTimeForUpdate && uiState.occurrenceDate && (
      <RecurringUpdateDialog
        open={uiState.showRecurringUpdateDialog}
        onOpenChange={(open) => {
          if (!open) {
            uiState.setShowRecurringUpdateDialog(false);
          }
        }}
        todoTitle={editingTodo.title}
        originalTime={uiState.originalTimeForUpdate}
        newTime={uiState.newTimeForUpdate}
        occurrenceDate={uiState.occurrenceDate}
        onUpdateChoice={handlers.handleRecurringTimeUpdate}
      />
    )}

    {/* 아이콘 브라우저 모달 - Sheet 외부에 위치 */}
    <EnhancedIconBrowserModal
      open={uiState.iconBrowserOpen}
      onClose={() => uiState.setIconBrowserOpen(false)}
      onIconSelect={actions.setSelectedIcon}
      selectedIcon={values.selectedIcon}
      selectedColor={values.selectedColor}
      onColorSelect={actions.setSelectedColor}
    />
    </>
  );
};

export default TodoFormModal;