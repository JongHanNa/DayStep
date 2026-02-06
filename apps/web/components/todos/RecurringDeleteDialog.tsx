'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Calendar, CalendarX, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useNoteStore } from '@/state/stores/noteStore';
import type { Todo } from '@/types';

interface RecurringDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: 'this' | 'future' | 'all', deleteLinkedMemos?: boolean) => void;
  todo: Todo;
  isDeleting?: boolean;
}

const RecurringDeleteDialog: React.FC<RecurringDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  todo,
  isDeleting = false
}) => {
  const [selectedDeleteType, setSelectedDeleteType] = useState<'this' | 'future' | 'all'>('this');
  const [deleteLinkedNotes, setDeleteLinkedNotes] = useState(false);
  const [linkedNotes, setLinkedNotes] = useState<any[]>([]);
  const { getLinkedNotesByTaskId } = useNoteStore();

  const hasLinkedNotes = linkedNotes.length > 0;

  // 연결된 노트 비동기 조회
  useEffect(() => {
    if (isOpen && todo?.id) {
      getLinkedNotesByTaskId(todo.id).then(notes => {
        setLinkedNotes(notes);
      }).catch(error => {
        console.error('연결된 노트 조회 실패:', error);
        setLinkedNotes([]);
      });
    } else {
      setLinkedNotes([]);
    }
  }, [isOpen, todo?.id, getLinkedNotesByTaskId]);

  // 모달이 열릴 때만 로그 출력 (무한 렌더링 방지)
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔍 [RecurringDeleteDialog] 모달 열림:', {
        todoId: todo.id,
        recurrencePattern: todo.recurrence_pattern,
        isDeleting
      });
      // 모달이 열릴 때마다 체크박스 상태 초기화
      setDeleteLinkedNotes(false);
    }
  }, [isOpen, todo.id, todo.recurrence_pattern, isDeleting]);

  const handleConfirm = () => {
    onConfirm(selectedDeleteType, deleteLinkedNotes);
  };

  // 반복 패턴에 따른 설명 텍스트
  const getRecurrenceDescription = () => {
    switch (todo.recurrence_pattern) {
      case 'daily':
        return '매일 반복';
      case 'weekly':
        return '매주 반복';
      case 'monthly':
        return '매월 반복';
      case 'custom':
        return '사용자 정의 반복';
      default:
        return '반복 일정';
    }
  };

  const deleteOptions = [
    {
      value: 'this' as const,
      icon: Calendar,
      title: '이것만 삭제',
      description: '현재 선택한 일정만 삭제합니다.',
      detail: '다른 반복 일정은 그대로 유지되며, 삭제된 날짜는 앞으로도 일정이 생성되지 않습니다.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      value: 'future' as const,
      icon: CalendarX,
      title: '모든 미래항목 삭제',
      description: '이 일정부터 앞으로의 모든 반복 일정을 삭제합니다.',
      detail: '과거의 일정은 유지되며, 반복 일정이 오늘 이전에 종료됩니다.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      value: 'all' as const,
      icon: Trash2,
      title: '모두 삭제',
      description: '과거, 현재, 미래의 모든 반복 일정을 삭제합니다.',
      detail: '이 반복 일정과 관련된 모든 데이터가 완전히 삭제됩니다.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  // Portal을 사용하여 document.body에 직접 렌더링
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mx-4 w-full max-w-md"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            반복 일정 삭제
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            &ldquo;{todo.title}&rdquo; ({getRecurrenceDescription()})를 어떻게 삭제하시겠습니까?
          </p>
        </div>

        <div className="py-4">
          <RadioGroup
            value={selectedDeleteType}
            onValueChange={(value) => setSelectedDeleteType(value as 'this' | 'future' | 'all')}
            className="space-y-3"
          >
            {deleteOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="space-y-2">
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedDeleteType === option.value
                        ? `${option.bgColor} ${option.borderColor}`
                        : "bg-muted border-border hover:bg-accent"
                    )}
                  >
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-4 w-4", option.color)} />
                        <span className="font-medium text-sm">
                          {option.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {option.description}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {option.detail}
                      </p>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {/* 연결된 퀵노트 정보 및 삭제 옵션 */}
          {hasLinkedNotes && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <StickyNote className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    연결된 퀵노트 {linkedNotes.length}개 발견
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    이 할일에 연결된 노트들을 어떻게 처리할지 선택해주세요.
                  </p>
                </div>
              </div>

              {/* 연결된 노트 미리보기 (최대 2개, 공간 절약) */}
              <div className="space-y-1 mb-3">
                {linkedNotes.slice(0, 2).map((note) => (
                  <div key={note.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                    <StickyNote className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 line-clamp-1">
                      {note.content}
                    </p>
                  </div>
                ))}
                {linkedNotes.length > 2 && (
                  <p className="text-xs text-blue-600">
                    +{linkedNotes.length - 2}개 더...
                  </p>
                )}
              </div>

              {/* 퀵노트 삭제 선택 체크박스 */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="delete-recurring-linked-notes"
                  checked={deleteLinkedNotes}
                  onCheckedChange={(checked) => setDeleteLinkedNotes(checked === true)}
                  disabled={isDeleting}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="delete-recurring-linked-notes"
                    className="text-sm font-medium text-blue-800 cursor-pointer"
                  >
                    연결된 퀵노트도 함께 삭제
                  </label>
                  <p className="text-xs text-blue-600">
                    체크하지 않으면 노트들은 남아있고, 할일과의 연결만 해제됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedDeleteType === 'all' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    주의사항
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    이 작업은 되돌릴 수 없습니다. 모든 반복 일정 데이터가 영구적으로 삭제됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="min-w-[80px]"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RecurringDeleteDialog;