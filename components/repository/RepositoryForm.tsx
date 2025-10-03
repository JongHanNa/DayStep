'use client';

import { useState, useEffect } from 'react';
import { useRepositoryStore } from '@/state/stores/repositoryStore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface RepositoryFormProps {
  item?: any;
  onClose: () => void;
  userId: string;
}

/**
 * 보관함 아이템 생성/편집 폼 컴포넌트
 */
export function RepositoryForm({ item, onClose, userId }: RepositoryFormProps) {
  const { createItem, updateItem, getAllCategories } = useRepositoryStore();
  const [formData, setFormData] = useState({
    type: 'todo' as 'todo',
    title: '',
    content: '',
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      setFormData({
        type: item.type || 'todo',
        title: item.title || '',
        content: item.content || '',
        category: item.category || '',
      });
    }
  }, [item]);

  useEffect(() => {
    // 기존 카테고리 목록 로드
    const cats = getAllCategories();
    setCategories(cats);
  }, [getAllCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalCategory = showCustomCategory && customCategory.trim() 
        ? customCategory.trim() 
        : formData.category || null;

      if (isEditing) {
        await updateItem(item.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: finalCategory,
        });
      } else {
        await createItem({
          user_id: userId,
          type: formData.type,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: finalCategory,
          source_id: null,
        });
      }
      
      onClose();
    } catch (error) {
      console.error('보관함 아이템 저장 오류:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : '보관함 아이템 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 메시지 초기화
    if (error) {
      setError(null);
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim() && !categories.includes(customCategory.trim())) {
      setCategories(prev => [...prev, customCategory.trim()]);
      setFormData(prev => ({ ...prev, category: customCategory.trim() }));
      setCustomCategory('');
      setShowCustomCategory(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? '보관함 아이템 수정' : '새 보관함 아이템 추가'}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 타입 선택 (편집 시에는 변경 불가) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="type">아이템 타입 *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">할일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              placeholder="제목을 입력하세요..."
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>간결하고 명확한 제목을 작성해보세요</span>
              <span>{formData.title.length}/100</span>
            </div>
          </div>

          {/* 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">내용 *</Label>
            <Textarea
              id="content"
              placeholder="내용을 입력하세요..."
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>자세한 내용을 작성해보세요</span>
              <span>{formData.content.length}/1000</span>
            </div>
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            
            {!showCustomCategory ? (
              <div className="flex gap-2">
                <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="카테고리 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">카테고리 없음</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomCategory(true)}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 카테고리
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="새 카테고리 이름..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  maxLength={50}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomCategory}
                  disabled={!customCategory.trim()}
                >
                  추가
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setCustomCategory('');
                  }}
                >
                  취소
                </Button>
              </div>
            )}

            {/* 기존 카테고리 표시 */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 5).map((category) => (
                  <Badge 
                    key={category} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-gray-200"
                    onClick={() => handleChange('category', category)}
                  >
                    {category}
                  </Badge>
                ))}
                {categories.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{categories.length - 5}개 더
                  </Badge>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isSubmitting 
                ? (isEditing ? '수정 중...' : '추가 중...')
                : (isEditing ? '수정' : '추가')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}