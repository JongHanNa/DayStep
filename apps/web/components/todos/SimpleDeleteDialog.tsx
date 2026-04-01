'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMotivationStore } from '@/state/stores/motivationStore';
import type { Todo } from '@/types';

interface SimpleDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteLinkedNotes?: boolean) => void;
  todo: Todo;
  isDeleting?: boolean;
}

const SimpleDeleteDialog: React.FC<SimpleDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  todo,
  isDeleting = false
}) => {
  const [deleteLinkedNotes, setDeleteLinkedNotes] = useState(false);
  const [linkedNotes, setLinkedNotes] = useState<any[]>([]);
  const { getLinkedNotesByTaskId } = useMotivationStore();

  const hasLinkedNotes = linkedNotes.length > 0;

  // 연결된 노트 비동기 조회 및 체크박스 상태 초기화
  useEffect(() => {
    if (isOpen && todo?.id) {
      setDeleteLinkedNotes(false);
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

  const handleConfirm = () => {
    onConfirm(deleteLinkedNotes);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 10000 }}>
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            할일 삭제
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            정말로 이 할일을 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  삭제할 할일
                </p>
                <p className="text-sm text-gray-700 break-words">
                  &ldquo;{todo.title}&rdquo;
                </p>
              </div>
            </div>
          </div>

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

              {/* 연결된 노트 미리보기 (최대 3개) */}
              <div className="space-y-2 mb-3">
                {linkedNotes.slice(0, 3).map((note) => (
                  <div key={note.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                    <StickyNote className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
                {linkedNotes.length > 3 && (
                  <p className="text-xs text-blue-600">
                    +{linkedNotes.length - 3}개 더...
                  </p>
                )}
              </div>

              {/* 퀵노트 삭제 선택 체크박스 */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="delete-linked-notes"
                  checked={deleteLinkedNotes}
                  onCheckedChange={(checked) => setDeleteLinkedNotes(checked === true)}
                  disabled={isDeleting}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="delete-linked-notes"
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

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  주의사항
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  삭제된 할일은 복구할 수 없습니다. 신중하게 결정해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleDeleteDialog;