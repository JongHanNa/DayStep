'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  StickyNote,
  Pin,
  PinOff,
  Edit3,
  Check,
  X,
  Minimize2,
  Maximize2,
  Move,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNoteStore, Note } from '@/state/stores/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface FloatingNoteCardProps {
  note: Note;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const FloatingNoteCard: React.FC<FloatingNoteCardProps> = ({
  note,
  onClose,
  className,
  style
}) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const { updateNote, unpinNote } = useNoteStore();
  const { todos } = useTodoStore();

  // 로컬 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 연결된 할일 찾기
  const linkedTodo = note.related_task_id
    ? todos.find(todo => todo.id === note.related_task_id)
    : null;

  // 편집 모드 시작
  const startEditing = () => {
    setIsEditing(true);
    setEditContent(note.content);
  };

  // 편집 저장
  const saveEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: '내용을 입력해주세요',
        description: '노트 내용이 비어있습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateNote({
        id: note.id,
        content: editContent.trim(),
      });
      setIsEditing(false);

      toast({
        title: '노트가 수정되었습니다',
        description: '변경사항이 저장되었습니다.',
      });
    } catch (error) {
      toast({
        title: '노트 수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 편집 취소
  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(note.content);
  };

  // 핀 해제 (플로팅 카드 닫기)
  const handleUnpin = async () => {
    try {
      await unpinNote(note.id);
      onClose?.();
    } catch (error) {
      toast({
        title: '핀 해제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || e.target !== e.currentTarget) return;
    
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startX,
        y: e.clientY - startY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


  return (
    <Card 
      ref={cardRef}
      className={cn(
        'fixed z-50 w-80 shadow-lg border-2',
        'bg-background/95 backdrop-blur-sm',
        isDragging && 'shadow-2xl scale-105',
        isMinimized && 'w-48',
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
        ...style,
      }}
      onMouseDown={handleMouseDown}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-yellow-600" />
            <Badge variant="outline" className="text-xs">
              퀵메모
            </Badge>
            
            {linkedTodo && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Link className="h-3 w-3" />
                연결됨
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="h-3 w-3" />
              ) : (
                <Minimize2 className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnpin}
              className="h-6 w-6 p-0"
            >
              <PinOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-0">
          {isEditing ? (
            /* 편집 모드 */
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] resize-none text-sm"
                placeholder="노트 내용을 입력하세요..."
                autoFocus
              />

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  취소
                </Button>

                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={!editContent.trim()}
                  className="h-8"
                >
                  <Check className="h-3 w-3 mr-1" />
                  저장
                </Button>
              </div>
            </div>
          ) : (
            /* 보기 모드 */
            <div className="space-y-3">
              <div className="relative group">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.content}
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>

              {/* 연결된 할일 정보 */}
              {linkedTodo && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <Link className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {linkedTodo.title}
                  </span>
                </div>
              )}

              {/* 노트 메타 정보 */}
              <div className="text-xs text-muted-foreground">
                {format(new Date(note.created_at), 'M월 d일 HH:mm', { locale: ko })}
                {note.updated_at !== note.created_at && (
                  <span className="ml-2">
                    (수정: {format(new Date(note.updated_at), 'HH:mm', { locale: ko })})
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default FloatingNoteCard;