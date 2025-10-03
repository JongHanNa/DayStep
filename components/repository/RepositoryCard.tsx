'use client';

import { useState } from 'react';
import { useRepositoryStore } from '@/state/stores/repositoryStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy,
  Clock,
  GripVertical,
  Target,
  CheckSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RepositoryCardProps {
  item: any;
  onEdit: () => void;
  onCopyToTodo?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  searchQuery?: string;
}

/**
 * 보관함 아이템 카드 컴포넌트
 */
export function RepositoryCard({ 
  item, 
  onEdit, 
  onCopyToTodo, 
  isDragging, 
  dragHandleProps,
  searchQuery 
}: RepositoryCardProps) {
  const { deleteItem, startDrag, endDrag } = useRepositoryStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent) => {
    startDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'repository-item',
      item: item
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 드래그 종료
  const handleDragEnd = (e: React.DragEvent) => {
    endDrag();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('보관함 아이템 삭제 오류:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyToTodo = async () => {
    if (onCopyToTodo) {
      onCopyToTodo();
    }
  };

  const formatCreatedAt = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'todo':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'todo':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'todo':
        return '할일';
      default:
        return '기타';
    }
  };

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query?: string) => {
    if (!query || query.trim() === '') {
      return text;
    }

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <Card 
        className={`transition-all duration-200 hover:shadow-md bg-white border ${
          isDragging ? 'shadow-lg transform rotate-1 opacity-80' : ''
        }`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* 드래그 핸들 */}
              <div 
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {/* 타입 배지 */}
              <Badge 
                variant="outline" 
                className={`text-xs ${getTypeColor(item.type)}`}
              >
                {getTypeIcon(item.type)}
                <span className="ml-1">{getTypeLabel(item.type)}</span>
              </Badge>

              {/* 카테고리 배지 */}
              {item.category && (
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              )}
            </div>

            {/* 액션 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit3 className="w-4 h-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleCopyToTodo}
                  className="cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  할일로 복사
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {/* 제목 */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {highlightText(item.title, searchQuery)}
          </h3>

          {/* 내용 미리보기 */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {highlightText(item.content, searchQuery)}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatCreatedAt(new Date(item.created_at))}</span>
            </div>
            
            {item.source_id && (
              <Badge variant="outline" className="text-xs">
                원본 연결됨
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>보관함 아이템을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 보관함 아이템이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}