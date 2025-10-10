'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTodoStore } from '@/state/stores/todoStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateTodoInput } from '@/types';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

const TODO_PRESETS = [
  { content: '독서 시간 30분', priority: 'medium' as const, description: '매일 책 읽는 습관 만들기' },
  { content: '운동하기', priority: 'medium' as const, description: '건강한 몸 만들기' },
  { content: '프로젝트 계획 세우기', priority: 'high' as const, description: '체계적인 업무 진행' },
  { content: '정리 정돈하기', priority: 'low' as const, description: '깔끔한 환경 유지' },
  { content: '새로운 기술 학습', priority: 'medium' as const, description: '지속적인 성장' },
  { content: '건강 체크하기', priority: 'high' as const, description: '규칙적인 건강 관리' },
];

type TodoPreset = {
  content: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
};

export default function OnboardingStep5Page() {
  const router = useRouter();
  const { createTodo } = useTodoStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  const [selectedTodos, setSelectedTodos] = useState<TodoPreset[]>([]);

  // 커스텀 할일 추가 state
  const [customTodoModalOpen, setCustomTodoModalOpen] = useState(false);
  const [newCustomTodo, setNewCustomTodo] = useState<TodoPreset>({
    content: '',
    priority: 'medium',
    description: ''
  });

  const handleToggleTodo = (todo: TodoPreset) => {
    if (selectedTodos.some((t) => t.content === todo.content)) {
      setSelectedTodos(selectedTodos.filter((t) => t.content !== todo.content));
    } else {
      setSelectedTodos([...selectedTodos, todo]);
    }
  };

  // 커스텀 할일 추가 핸들러
  const handleOpenCustomTodoModal = () => {
    setNewCustomTodo({
      content: '',
      priority: 'medium',
      description: ''
    });
    setCustomTodoModalOpen(true);
  };

  const handleSaveCustomTodo = () => {
    if (!newCustomTodo.content.trim()) {
      alert('할일 내용을 입력해주세요.');
      return;
    }
    setSelectedTodos([...selectedTodos, newCustomTodo]);
    setCustomTodoModalOpen(false);
  };

  const handleCancelCustomTodo = () => {
    setCustomTodoModalOpen(false);
  };

  const handleRemoveTodo = (content: string) => {
    setSelectedTodos(selectedTodos.filter((t) => t.content !== content));
  };

  const handleNext = async () => {
    if (selectedTodos.length === 0) {
      // 할일 없이 건너뛰기 허용
      await completeStep(5);
      router.push('/second-brain/start');
      return;
    }

    try {
      // 선택한 할일들을 생성
      for (const todo of selectedTodos) {
        const todoData: CreateTodoInput = {
          content: todo.content,
          completed: false,
          priority: todo.priority,
          schedule_type: 'anytime',
          recurrence_pattern: 'none',
        };
        await createTodo(todoData);
      }

      // 온보딩 5단계에서 생성한 할일 개수 업데이트
      incrementCreatedCount(5, selectedTodos.length);

      // 온보딩 5단계 완료
      await completeStep(5);

      // 완료 후 시작 페이지로 이동
      router.push('/second-brain/start');
    } catch (error) {
      console.error('할일 생성 실패:', error);
      alert('할일 생성에 실패했습니다.');
    }
  };

  const handleSkip = async () => {
    await completeStep(5);
    router.push('/second-brain/start');
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* 스텝 네비게이션 */}
      <div className="sticky top-0 z-10">
        <OnboardingStepNav />
      </div>

      {/* 페이지 헤더 */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">할일 설정하기</h1>
          <p className="text-sm text-base-content/70">
            시작할 할일을 추가하세요 (선택사항)
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 안내 메시지 */}
        <div className="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <strong>추천 할일!</strong> 시작하기 좋은 할일들을 준비했어요.
            <br />
            선택하거나 직접 추가할 수 있습니다.
          </div>
        </div>

        {/* 프리셋 할일 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">추천 할일</h2>
          <div className="grid grid-cols-2 gap-3">
            {TODO_PRESETS.map((todo) => {
              const isSelected = selectedTodos.some((t) => t.content === todo.content);
              return (
                <button
                  key={todo.content}
                  onClick={() => handleToggleTodo(todo)}
                  className={`card transition-all w-full ${
                    isSelected
                      ? 'bg-primary text-primary-content ring-2 ring-primary'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-left flex-1">
                        <h3 className="font-semibold">{todo.content}</h3>
                        <p className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-base-content/60'}`}>
                          {todo.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary-content text-primary flex items-center justify-center ml-2">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 커스텀 할일 추가 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">직접 추가</h2>
          <button onClick={handleOpenCustomTodoModal} className="btn btn-outline w-full">
            <Plus className="w-4 h-4" />
            새 할일 추가하기
          </button>
        </div>

        {/* 선택된 할일 목록 */}
        {selectedTodos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">선택된 할일 ({selectedTodos.length}개)</h2>
            <div className="space-y-2">
              {selectedTodos.map((todo) => (
                <div
                  key={todo.content}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{todo.content}</div>
                    {todo.description && (
                      <div className="text-xs text-base-content/60">{todo.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveTodo(todo.content)}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTodos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-base-content/50">아직 선택된 할일이 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              할일 없이도 건너뛸 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={() => router.push('/second-brain/start')}
            className="btn btn-ghost"
          >
            나가기
          </button>
          {selectedTodos.length === 0 ? (
            <button onClick={handleSkip} className="btn btn-primary flex-1">
              건너뛰고 완료
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary flex-1">
              저장하고 완료 ({selectedTodos.length}개)
            </button>
          )}
        </div>
      </div>

      {/* 커스텀 할일 추가 다이얼로그 */}
      {customTodoModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">새 할일 추가</h3>

            {/* 할일 내용 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">할일 내용</span>
              </label>
              <input
                type="text"
                value={newCustomTodo.content}
                onChange={(e) => setNewCustomTodo({ ...newCustomTodo, content: e.target.value })}
                className="input input-bordered"
                placeholder="예: 아침 명상하기, 블로그 글쓰기"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">설명 (선택)</span>
              </label>
              <textarea
                value={newCustomTodo.description}
                onChange={(e) => setNewCustomTodo({ ...newCustomTodo, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="할일에 대한 설명"
              />
            </div>

            {/* 우선순위 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">우선순위</span>
              </label>
              <select
                value={newCustomTodo.priority}
                onChange={(e) => setNewCustomTodo({ ...newCustomTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="select select-bordered"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelCustomTodo} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveCustomTodo} className="btn btn-primary">
                추가
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelCustomTodo} />
        </dialog>
      )}
    </div>
  );
}
