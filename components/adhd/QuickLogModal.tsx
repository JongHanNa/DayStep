'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Check, CalendarPlus } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { CreateTodoInput } from '@/types';
import { format, subMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 사전 설정된 시작 시간 (타임라인에서 빈 시간 클릭 시 사용) */
  prefillStartTime?: Date;
  /** 사전 설정된 종료 시간 */
  prefillEndTime?: Date;
}

type ModalMode = 'select' | 'detailed' | 'quick' | 'new';
type QuickDuration = 15 | 30 | 60;

/**
 * 빈 시간 기록/등록 모달
 *
 * 타임라인의 빈 시간을 클릭했을 때 열리는 모달
 * - 상세 입력: 이미 완료한 일 기록 (제목, 시작 시간, 소요 시간)
 * - 간단 기록: "앱 없이 무언가 함" + 시간 선택 (15분/30분/1시간)
 * - 새 일정: 앞으로 할 일 등록 (미완료 상태)
 */
export default function QuickLogModal({
  isOpen,
  onClose,
  prefillStartTime,
  prefillEndTime,
}: QuickLogModalProps) {
  const { createTodo } = useTodoStore();

  // 모달 모드: select(선택), detailed(상세), quick(간단)
  const [mode, setMode] = useState<ModalMode>(
    prefillStartTime ? 'detailed' : 'select'
  );

  // 상세 입력 폼 상태
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(() => {
    if (prefillStartTime) {
      return format(prefillStartTime, 'HH:mm');
    }
    return format(subMinutes(new Date(), 30), 'HH:mm');
  });
  const [duration, setDuration] = useState(30); // 분 단위

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 시작 시간과 소요 시간으로 종료 시간 계산
  const calculateEndTime = (start: string, durationMinutes: number): Date => {
    const [hours, minutes] = start.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  };

  // 상세 입력으로 저장
  const handleDetailedSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = calculateEndTime(startTime, duration);

      const todoInput: CreateTodoInput = {
        title: title.trim(),
        schedule_type: 'timed',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        completed: true, // 이미 완료한 일이므로
      };

      await createTodo(todoInput);

      // 성공 피드백
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('사후 기록 저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 간단 기록으로 저장
  const handleQuickSave = async (selectedDuration: QuickDuration) => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startDate = subMinutes(now, selectedDuration);

      const todoInput: CreateTodoInput = {
        title: '앱 없이 무언가 함',
        schedule_type: 'timed',
        start_time: startDate.toISOString(),
        end_time: now.toISOString(),
        completed: true,
      };

      await createTodo(todoInput);

      // 성공 피드백
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('간단 기록 저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 새 일정/할일 등록으로 저장 (미완료 상태)
  const handleNewSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = calculateEndTime(startTime, duration);

      const todoInput: CreateTodoInput = {
        title: title.trim(),
        schedule_type: 'timed',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        completed: false, // 미완료 상태로 등록
      };

      await createTodo(todoInput);

      // 성공 피드백
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('새 일정 등록 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기 (상태 초기화)
  const handleClose = () => {
    setMode(prefillStartTime ? 'detailed' : 'select');
    setTitle('');
    setStartTime(format(subMinutes(new Date(), 30), 'HH:mm'));
    setDuration(30);
    setIsLoading(false);
    setShowSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <dialog open className="modal z-[110]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-box max-w-sm"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">
              {mode === 'select' && '이 시간에 무엇을 하셨나요?'}
              {mode === 'detailed' && '방금 한 일 기록하기'}
              {mode === 'quick' && '간단하게 기록하기'}
              {mode === 'new' && '새 일정 등록하기'}
            </h3>
            <button
              onClick={handleClose}
              className="btn btn-circle btn-sm btn-ghost"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 성공 피드백 */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-success mb-4"
            >
              <Check className="w-5 h-5" />
              <span>기록되었어요!</span>
            </motion.div>
          )}

          {/* 모드 선택 화면 */}
          {mode === 'select' && !showSuccess && (
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('detailed')}
                className="btn btn-lg w-full rounded-xl h-16 flex items-center justify-center gap-3 bg-primary text-primary-content"
              >
                <Clock className="w-5 h-5" />
                <span className="font-semibold">앱없이 방금 한 일 기록하기</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('quick')}
                className="btn btn-lg w-full rounded-xl h-16 flex items-center justify-center gap-3 bg-base-200"
              >
                <Zap className="w-5 h-5" />
                <span className="font-semibold">간단하게 &apos;무언가 함&apos; 기록</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('new')}
                className="btn btn-lg w-full rounded-xl h-16 flex items-center justify-center gap-3 bg-accent text-accent-content"
              >
                <CalendarPlus className="w-5 h-5" />
                <span className="font-semibold">새 일정/할일 등록하기</span>
              </motion.button>
            </div>
          )}

          {/* 상세 입력 화면 */}
          {mode === 'detailed' && !showSuccess && (
            <div className="flex flex-col gap-4">
              {/* 제목 입력 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">무엇을 했나요?</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 방 청소, 운동, 독서..."
                  className="input input-bordered w-full"
                  autoFocus
                />
              </div>

              {/* 시작 시간 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">시작 시간</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              {/* 소요 시간 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">소요 시간</span>
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      className={`btn btn-sm flex-1 ${
                        duration === mins ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 예상 종료 시간 표시 */}
              <div className="text-sm text-base-content/60 text-center">
                {startTime} ~ {format(calculateEndTime(startTime, duration), 'HH:mm')} ({duration}분)
              </div>

              {/* 저장 버튼 */}
              <div className="flex gap-2 mt-2">
                {!prefillStartTime && (
                  <button
                    onClick={() => setMode('select')}
                    className="btn btn-ghost flex-1"
                  >
                    뒤로
                  </button>
                )}
                <button
                  onClick={handleDetailedSave}
                  disabled={!title.trim() || isLoading}
                  className={`btn btn-primary ${prefillStartTime ? 'w-full' : 'flex-1'}`}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    '기록하기'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 간단 기록 화면 */}
          {mode === 'quick' && !showSuccess && (
            <div className="flex flex-col gap-4">
              <p className="text-center text-base-content/70">
                얼마나 했나요?
              </p>

              <div className="flex flex-col gap-2">
                {([15, 30, 60] as QuickDuration[]).map((mins) => (
                  <motion.button
                    key={mins}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickSave(mins)}
                    disabled={isLoading}
                    className="btn btn-lg w-full rounded-xl h-14 bg-base-200 hover:bg-base-300"
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>{mins}분</span>
                        <span className="text-sm text-base-content/50">
                          ({format(subMinutes(new Date(), mins), 'HH:mm', { locale: ko })} ~ 지금)
                        </span>
                      </>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* 뒤로 버튼 */}
              <button
                onClick={() => setMode('select')}
                className="btn btn-ghost mt-2"
              >
                뒤로
              </button>
            </div>
          )}

          {/* 새 일정 등록 화면 */}
          {mode === 'new' && !showSuccess && (
            <div className="flex flex-col gap-4">
              {/* 제목 입력 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">무엇을 할 예정인가요?</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 회의, 운동, 공부..."
                  className="input input-bordered w-full"
                  autoFocus
                />
              </div>

              {/* 시작 시간 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">시작 시간</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              {/* 소요 시간 */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">예상 소요 시간</span>
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      className={`btn btn-sm flex-1 ${
                        duration === mins ? 'btn-accent' : 'btn-ghost bg-base-200'
                      }`}
                    >
                      {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 예상 시간 표시 */}
              <div className="text-sm text-base-content/60 text-center">
                {startTime} ~ {format(calculateEndTime(startTime, duration), 'HH:mm')} ({duration}분)
              </div>

              {/* 저장 버튼 */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setMode('select')}
                  className="btn btn-ghost flex-1"
                >
                  뒤로
                </button>
                <button
                  onClick={handleNewSave}
                  disabled={!title.trim() || isLoading}
                  className="btn btn-accent flex-1"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    '등록하기'
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* 배경 클릭으로 닫기 */}
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleClose}>close</button>
        </form>
      </dialog>
    </AnimatePresence>
  );
}
