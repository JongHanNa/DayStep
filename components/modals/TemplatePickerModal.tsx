'use client';

import { useState, useCallback } from 'react';
import { Sheet } from 'react-modal-sheet';
import { animated } from '@react-spring/web';
import { useElasticScroll } from '@/hooks/useElasticScroll';
import { createModalConfig } from '@/lib/modal-config';
import {
  Heart,
  FolderOpen,
  Briefcase,
  BookOpen,
  TestTube,
  Brain,
  Users,
  Dumbbell,
  Bell,
  MessageCircle,
  Utensils,
  Bike,
  Dog,
  Bus,
  Clock,
  ArrowUp
} from 'lucide-react';

// 작업 카테고리 타입
interface TaskCategory {
  id: string;
  name: string;
  icon: typeof Heart;
  color: string;
  bgColor: string;
}

// 미리 만들어진 작업 타입
export interface PresetTask {
  id: string;
  title: string;
  description: string;
  duration: number; // 분 단위
  categoryId: string;
  color: string;
}

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (task: PresetTask) => void;
}

export default function TemplatePickerModal({ isOpen, onClose, onTemplateSelect }: TemplatePickerModalProps) {
  const [dragDisabled, setDragDisabled] = useState(false);

  // 탄성 스크롤 효과
  const { containerRef, springs } = useElasticScroll({
    bounceDistance: 80,
    bounceStrength: 1.0,
    bounceDuration: 400,
    desktopOnly: false,
    enabled: isOpen
  });

  // 터치 핸들러
  const handleTouchStart = useCallback((_e: React.TouchEvent) => {
    setDragDisabled(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setDragDisabled(false), 100);
  }, []);

  // 작업 카테고리 mock 데이터
  const categories: TaskCategory[] = [
    { id: 'hobby', name: '가정', icon: Brain, color: '#EC4899', bgColor: '#FCE7F3' },
    { id: 'health', name: '신체적 요구', icon: TestTube, color: '#3B82F6', bgColor: '#DBEAFE' },
    { id: 'self-care', name: '셀프 케어', icon: Heart, color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'work', name: '관리', icon: FolderOpen, color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: 'business', name: '업무', icon: Briefcase, color: '#6B7280', bgColor: '#F3F4F6' },
    { id: 'study', name: '학습', icon: BookOpen, color: '#F97316', bgColor: '#FFEDD5' },
    { id: 'social', name: '관계', icon: Users, color: '#F97316', bgColor: '#FFEDD5' },
    { id: 'exercise', name: '건강', icon: Dumbbell, color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'reminder', name: '준비', icon: Bell, color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: 'communication', name: '소셜', icon: MessageCircle, color: '#6B7280', bgColor: '#F3F4F6' },
    { id: 'meal', name: '취미', icon: Utensils, color: '#EC4899', bgColor: '#FCE7F3' },
    { id: 'transport', name: '운동', icon: Bike, color: '#10B981', bgColor: '#D1FAE5' },
    { id: 'pet', name: '반려동물', icon: Dog, color: '#F97316', bgColor: '#FFEDD5' },
    { id: 'commute', name: '출퇴근', icon: Bus, color: '#3B82F6', bgColor: '#DBEAFE' },
  ];

  // 미리 만들어진 작업들 mock 데이터
  const presetTasks: PresetTask[] = [
    // 가정 카테고리
    { id: '1', title: '화장실 청소하기', description: '깨끗한 집, 깨끗한 마음', duration: 40, categoryId: 'hobby', color: '#EC4899' },
    { id: '2', title: '다림질', description: '깔끔한 옷차림으로', duration: 35, categoryId: 'hobby', color: '#EC4899' },
    { id: '3', title: '베이킹', description: '달콤한 시간', duration: 15, categoryId: 'hobby', color: '#EC4899' },

    // 신체적 요구 카테고리
    { id: '4', title: '속옷 갈아입기', description: '일상의 필수 요소를 관리하세요', duration: 10, categoryId: 'health', color: '#3B82F6' },
    { id: '5', title: '아침 식사 시간', description: '건강한 하루의 시작', duration: 20, categoryId: 'health', color: '#3B82F6' },
    { id: '6', title: '샤워', description: '상쾌한 기분으로', duration: 15, categoryId: 'health', color: '#3B82F6' },

    // 셀프 케어 카테고리
    { id: '7', title: '명상 시간', description: '마음의 평화 찾기', duration: 15, categoryId: 'self-care', color: '#EF4444' },
    { id: '8', title: '스킨케어 루틴', description: '나를 위한 소중한 시간', duration: 20, categoryId: 'self-care', color: '#EF4444' },
    { id: '9', title: '독서하기', description: '책과 함께하는 여유로운 시간', duration: 30, categoryId: 'self-care', color: '#EF4444' },

    // 관리 카테고리
    { id: '10', title: '가계부 정리', description: '현명한 소비 관리', duration: 25, categoryId: 'work', color: '#F59E0B' },
    { id: '11', title: '서류 정리', description: '체계적인 문서 관리', duration: 30, categoryId: 'work', color: '#F59E0B' },
    { id: '12', title: '이메일 확인', description: '소통의 창구 관리', duration: 15, categoryId: 'work', color: '#F59E0B' },

    // 업무 카테고리
    { id: '13', title: '회의 준비', description: '성공적인 미팅을 위한 준비', duration: 45, categoryId: 'business', color: '#6B7280' },
    { id: '14', title: '보고서 작성', description: '체계적인 업무 보고', duration: 60, categoryId: 'business', color: '#6B7280' },
    { id: '15', title: '업무 계획 수립', description: '효율적인 업무 관리', duration: 30, categoryId: 'business', color: '#6B7280' },

    // 학습 카테고리
    { id: '16', title: '온라인 강의 수강', description: '새로운 지식 습득', duration: 60, categoryId: 'study', color: '#F97316' },
    { id: '17', title: '어학 공부', description: '언어 실력 향상', duration: 45, categoryId: 'study', color: '#F97316' },
    { id: '18', title: '자격증 준비', description: '전문성 향상을 위한 학습', duration: 90, categoryId: 'study', color: '#F97316' },

    // 관계 카테고리
    { id: '19', title: '가족과 통화', description: '소중한 사람들과의 소통', duration: 30, categoryId: 'social', color: '#F97316' },
    { id: '20', title: '친구와 만남', description: '우정을 나누는 시간', duration: 120, categoryId: 'social', color: '#F97316' },
    { id: '21', title: '감사 인사 전하기', description: '고마움을 표현하는 시간', duration: 10, categoryId: 'social', color: '#F97316' },

    // 건강 카테고리
    { id: '22', title: '스트레칭', description: '몸의 긴장을 풀어주기', duration: 15, categoryId: 'exercise', color: '#EF4444' },
    { id: '23', title: '산책하기', description: '자연과 함께하는 건강 시간', duration: 30, categoryId: 'exercise', color: '#EF4444' },
    { id: '24', title: '비타민 복용', description: '건강 관리의 기본', duration: 5, categoryId: 'exercise', color: '#EF4444' },

    // 준비 카테고리
    { id: '25', title: '내일 옷 준비', description: '여유로운 아침을 위한 준비', duration: 10, categoryId: 'reminder', color: '#F59E0B' },
    { id: '26', title: '가방 정리', description: '필요한 물건 챙기기', duration: 15, categoryId: 'reminder', color: '#F59E0B' },
    { id: '27', title: '중요한 일정 확인', description: '놓치지 않는 스케줄 관리', duration: 5, categoryId: 'reminder', color: '#F59E0B' },

    // 소셜 카테고리
    { id: '28', title: 'SNS 소통', description: '지인들과의 온라인 교류', duration: 20, categoryId: 'communication', color: '#6B7280' },
    { id: '29', title: '생일 축하 메시지', description: '특별한 날 축하하기', duration: 10, categoryId: 'communication', color: '#6B7280' },
    { id: '30', title: '소식 전하기', description: '가족, 친구와의 안부 나누기', duration: 15, categoryId: 'communication', color: '#6B7280' },

    // 취미 카테고리
    { id: '31', title: '음악 감상', description: '마음을 치유하는 멜로디', duration: 45, categoryId: 'meal', color: '#EC4899' },
    { id: '32', title: '요리하기', description: '창의적인 요리 시간', duration: 60, categoryId: 'meal', color: '#EC4899' },
    { id: '33', title: '취미 활동', description: '나만의 특별한 시간', duration: 90, categoryId: 'meal', color: '#EC4899' },

    // 운동 카테고리
    { id: '34', title: '홈트레이닝', description: '집에서 하는 건강 운동', duration: 30, categoryId: 'transport', color: '#10B981' },
    { id: '35', title: '헬스장 가기', description: '전문적인 운동 시간', duration: 90, categoryId: 'transport', color: '#10B981' },
    { id: '36', title: '요가 수업', description: '몸과 마음의 균형 찾기', duration: 60, categoryId: 'transport', color: '#10B981' },

    // 반려동물 카테고리
    { id: '37', title: '반려동물 산책', description: '함께하는 즐거운 시간', duration: 30, categoryId: 'pet', color: '#F97316' },
    { id: '38', title: '반려동물 목욕', description: '깔끔한 케어 시간', duration: 45, categoryId: 'pet', color: '#F97316' },
    { id: '39', title: '반려동물 놀아주기', description: '사랑하는 가족과의 시간', duration: 20, categoryId: 'pet', color: '#F97316' },

    // 출퇴근 카테고리
    { id: '40', title: '교통편 확인', description: '원활한 이동을 위한 준비', duration: 5, categoryId: 'commute', color: '#3B82F6' },
    { id: '41', title: '출근 준비', description: '완벽한 하루의 시작', duration: 30, categoryId: 'commute', color: '#3B82F6' },
    { id: '42', title: '퇴근 후 정리', description: '하루 마무리와 내일 준비', duration: 15, categoryId: 'commute', color: '#3B82F6' },
  ];

  // 카테고리별 작업 그룹핑
  const getTasksByCategory = (categoryId: string) => {
    return presetTasks.filter(task => task.categoryId === categoryId);
  };

  // 작업 선택 핸들러
  const handleTaskSelect = (task: PresetTask) => {
    onTemplateSelect(task);
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      {...createModalConfig('FULLSCREEN', {
        initialSnap: 1,
        dragCloseThreshold: 0.3,
        disableDrag: dragDisabled,
      })}
    >
      <Sheet.Container className="bg-gray-50 dark:bg-gray-900">
        <Sheet.Header className="bg-gray-50 dark:bg-gray-900">
          {/* 드래그 핸들 영역 */}
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* 헤더 텍스트 */}
          <div className="px-6 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              할 일 템플릿
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              미리 준비된 작업에서 골라보세요
            </p>
          </div>
        </Sheet.Header>

        {/* 🎯 react-spring 기반 탄성 스크롤 컨테이너 */}
        <animated.div
          ref={containerRef}
          className="scrollable-container scrollbar-hide px-6 pb-6 bg-gray-50 dark:bg-gray-900"
          style={{
            // 기본 스크롤 설정
            height: '80vh',
            maxHeight: '80vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-y',
            background: 'var(--background)',
            position: 'relative',
            transform: springs.y.to(y => `translateY(${y}px)`),
            paddingBottom: '60vh',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 카테고리 그리드 */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ backgroundColor: category.bgColor }}
                >
                  <div
                    className="p-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <Icon
                      className="w-3 h-3"
                      style={{ color: category.color }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 추천 작업 섹션들 */}
          {/* 가정 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">가정</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                깨끗한 집, 깨끗한 마음
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('hobby').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 신체적 요구 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">신체적 요구</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                일상의 필수 요소를 관리하세요
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('health').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 셀프 케어 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">셀프 케어</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                나를 위한 소중한 시간
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('self-care').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 관리 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">관리</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                체계적인 일상 관리
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('work').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 업무 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">업무</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                성공적인 업무 성과
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('business').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 학습 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">학습</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                지속적인 성장과 발전
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('study').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 관계 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">관계</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                소중한 사람들과의 연결
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('social').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 건강 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">건강</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                건강한 몸과 마음 관리
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('exercise').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 준비 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">준비</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                완벽한 하루를 위한 준비
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('reminder').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 소셜 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">소셜</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                디지털 소통과 연결
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('communication').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 취미 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">취미</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                나만의 특별한 취미 시간
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('meal').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 운동 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">운동</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                활력 넘치는 운동 시간
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('transport').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 반려동물 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">반려동물</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                사랑하는 반려동물과의 시간
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('pet').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 출퇴근 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">출퇴근</span>
            </div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                효율적인 출퇴근 관리
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getTasksByCategory('commute').map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{task.duration} 분</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div
                      className="w-12 h-12 rounded-full opacity-20"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white dark:text-gray-900" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 하단 여백을 위한 빈 공간 */}
          <div style={{ height: 'calc(2rem + env(safe-area-inset-bottom, 20px))' }} />
        </animated.div>
      </Sheet.Container>
    </Sheet>
  );
}
