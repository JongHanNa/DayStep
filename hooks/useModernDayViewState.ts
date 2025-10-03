'use client';

import { useState, useRef, useEffect } from 'react';
import { Todo as DbTodo } from '@/types';

/**
 * ModernDayView 컴포넌트의 상태 관리를 담당하는 커스텀 훅
 */
export const useModernDayViewState = () => {
  // 접기/펼치기 상태 관리
  const [isAllDayCollapsed, setIsAllDayCollapsed] = useState(false);
  const [isTimedCollapsed, setIsTimedCollapsed] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false);
  const [isAnytimeCollapsed, setIsAnytimeCollapsed] = useState(false);
  
  // 할일 수정 모달 상태 관리
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<DbTodo | null>(null);
  
  // 로그가 출력된 할일들을 추적하는 ref (중복 로그 방지)
  const loggedOngoingTasksRef = useRef(new Set<string>());
  
  // 할일 추가 모달 상태 관리
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalStartTime, setAddModalStartTime] = useState<Date | null>(null);
  const [addModalEndTime, setAddModalEndTime] = useState<Date | null>(null);
  
  // 실시간 현재 시간 상태 관리
  const [realTimeNow, setRealTimeNow] = useState(new Date());

  // 1초마다 현재 시간 업데이트 (마커 위치 재계산용)
  useEffect(() => {
    const timer = setInterval(() => {
      setRealTimeNow(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return {
    // 접기/펼치기 상태
    isAllDayCollapsed,
    setIsAllDayCollapsed,
    isTimedCollapsed,
    setIsTimedCollapsed,
    isCompletedCollapsed,
    setIsCompletedCollapsed,
    isAnytimeCollapsed,
    setIsAnytimeCollapsed,
    
    // 모달 상태
    isEditModalOpen,
    setIsEditModalOpen,
    selectedTodo,
    setSelectedTodo,
    isAddModalOpen,
    setIsAddModalOpen,
    addModalStartTime,
    setAddModalStartTime,
    addModalEndTime,
    setAddModalEndTime,
    
    // 기타 상태
    loggedOngoingTasksRef,
    realTimeNow,
    setRealTimeNow,
  };
};