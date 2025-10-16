'use client';

import { Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';

/**
 * 할일 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface TodoFormData {
  title: string;
  clarification?: string;
  nextActionStatus?: string;
  scheduledDate?: Date;
  isHighlight: boolean;
  completed: boolean;
}

interface TodoFormFieldsProps {
  todo: TodoFormData;
  onChange: (updatedTodo: TodoFormData) => void;
  titlePlaceholder?: string;
  clarificationPlaceholder?: string;
  nextActionStatusPlaceholder?: string;
}

/**
 * 할일 입력 폼 필드 (재사용 컴포넌트)
 * - 프로젝트 편집 모달의 할일 편집
 * - 수집 페이지의 할일 추가
 */
export default function TodoFormFields({
  todo,
  onChange,
  titlePlaceholder = '예: 요구사항 정리',
  clarificationPlaceholder = '할일에 대한 자세한 설명을 입력하세요',
  nextActionStatusPlaceholder = '예: 팀장님께 확인 필요',
}: TodoFormFieldsProps) {
  return (
    <>
      {/* 제목 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">제목</span>
        </label>
        <input
          type="text"
          value={todo.title}
          onChange={(e) => onChange({ ...todo, title: e.target.value })}
          className="input input-bordered"
          placeholder={titlePlaceholder}
        />
      </div>

      {/* 명료화 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">명료화 (선택)</span>
        </label>
        <textarea
          value={todo.clarification || ''}
          onChange={(e) => onChange({ ...todo, clarification: e.target.value })}
          className="textarea textarea-bordered h-20"
          placeholder={clarificationPlaceholder}
        />
      </div>

      {/* 다음행동상황 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">다음행동상황 (선택)</span>
        </label>
        <input
          type="text"
          value={todo.nextActionStatus || ''}
          onChange={(e) => onChange({ ...todo, nextActionStatus: e.target.value })}
          className="input input-bordered"
          placeholder={nextActionStatusPlaceholder}
        />
      </div>

      {/* 날짜 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">날짜 (선택)</span>
        </label>
        <input
          type="date"
          value={todo.scheduledDate ? format(todo.scheduledDate, 'yyyy-MM-dd') : ''}
          onChange={(e) =>
            onChange({
              ...todo,
              scheduledDate: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="input input-bordered"
        />
      </div>

      {/* 오늘의 하이라이트 */}
      <div className="form-control mb-4">
        <label className="cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.isHighlight}
            onChange={(e) => onChange({ ...todo, isHighlight: e.target.checked })}
            className="checkbox"
          />
          <span className="label-text flex items-center gap-1">
            <Star className="w-4 h-4" />
            오늘의 하이라이트
          </span>
        </label>
      </div>

      {/* 완료 여부 */}
      <div className="form-control mb-6">
        <label className="cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => onChange({ ...todo, completed: e.target.checked })}
            className="checkbox"
          />
          <span className="label-text">완료됨</span>
        </label>
      </div>
    </>
  );
}
