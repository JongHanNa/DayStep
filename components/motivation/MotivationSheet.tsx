'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { createModalConfig } from '@/lib/modal-config';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { Sheet } from 'react-modal-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MotivationLibrary from './MotivationLibrary';
import MotivationMessage from './MotivationMessage';
import {
  MotivationTag,
  DEFAULT_MOTIVATION_IMAGES
} from '@/types/motivation';
import { getUnifiedIcon, UnifiedIconKey } from '@/lib/icon-collection';
import { Heart, Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MotivationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoId?: string; // 할일과 연결하는 경우
  todoContent?: string; // 추천을 위한 할일 내용
  onSelectMessage?: (messageId: string) => void; // 외부 핸들러 (optional)
}

const MotivationSheet: React.FC<MotivationSheetProps> = ({
  open,
  onOpenChange,
  todoId,
  todoContent,
  onSelectMessage
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [isCreating, setIsCreating] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // 새 메시지 생성 폼 상태
  const [newMessage, setNewMessage] = useState({
    content: '',
    tags: ['positive_affirmation'],
    icon: 'lucide-Heart',
    imageUrl: '',
    useDefaultImage: false
  });

  const { toast } = useToast();

  const {
    getAllMessages,
    addCustomMessage,
    updateCustomMessage,
    deleteCustomMessage,
    linkMotivationToTodo,
    unlinkMotivationFromTodo,
    getMotivationForTodo,
    getMotivationsForTodo,
    getRecommendedMessages,
    customMessages,
    getAllTags
  } = useMotivationStore();

  const allTags = getAllTags();

  // 현재 할일에 연결된 메시지들 (Many-to-Many)
  const currentLinkedMessages = todoId ? getMotivationsForTodo(todoId) : [];

  // 추천 메시지
  const recommendedMessages = todoContent ? getRecommendedMessages(todoContent) : [];

  // 연결 토글 핸들러 (Many-to-Many 방식)
  const handleToggleConnection = async (messageId: string, isConnected: boolean) => {
    if (!todoId) return;

    try {
      if (isConnected) {
        // 연결 해제
        await unlinkMotivationFromTodo(todoId, messageId);
        toast({
          title: '메시지 연결 해제됨',
          description: '동기부여 메시지 연결이 해제되었습니다.',
        });
      } else {
        // 연결
        await linkMotivationToTodo(todoId, messageId);
        toast({
          title: '메시지 연결됨',
          description: '동기부여 메시지가 연결되었습니다.',
        });
      }
    } catch (error) {
      toast({
        title: '연결 실패',
        description: '메시지 연결 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);

    // 외부 핸들러가 있으면 우선 사용
    if (onSelectMessage) {
      onSelectMessage(messageId);
      onOpenChange(false);
      return;
    }

    // 기본 동작 - 이제 토글 방식으로 처리
    handleToggleConnection(messageId, currentLinkedMessages.some(m => m.id === messageId));
  };

  const handleCreateMessage = async () => {
    if (!newMessage.content.trim()) {
      toast({
        title: '입력 확인',
        description: '메시지 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 선택된 이미지 URL 결정
    let finalImageUrl = '';
    if (newMessage.useDefaultImage) {
      const imageKeys = Object.keys(DEFAULT_MOTIVATION_IMAGES);
      finalImageUrl = DEFAULT_MOTIVATION_IMAGES[imageKeys[0] as keyof typeof DEFAULT_MOTIVATION_IMAGES];
    } else if (newMessage.imageUrl) {
      finalImageUrl = newMessage.imageUrl;
    }

    // 첫 번째 태그의 색상 사용
    const firstTag = allTags.find(tag => tag.id === newMessage.tags[0]);
    const color = firstTag?.color || 'rgb(156, 163, 175)';

    await addCustomMessage({
      content: newMessage.content,
      tags: newMessage.tags,
      icon: newMessage.icon as UnifiedIconKey,
      color,
      imageUrl: finalImageUrl,
      isDefault: false
    });

    setNewMessage({
      content: '',
      tags: ['positive_affirmation'],
      icon: 'lucide-Heart',
      imageUrl: '',
      useDefaultImage: false
    });
    setIsCreating(false);

    toast({
      title: '메시지 생성됨',
      description: '새로운 동기부여 메시지가 생성되었습니다.',
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteCustomMessage(messageId);
    setEditingMessageId(null);

    toast({
      title: '메시지 삭제됨',
      description: '동기부여 메시지가 삭제되었습니다.',
    });
  };

  const handleEditMessage = (messageId: string) => {
    const messageToEdit = customMessages.find(msg => msg.id === messageId);
    if (messageToEdit) {
      setNewMessage({
        content: messageToEdit.content,
        tags: messageToEdit.tags,
        icon: messageToEdit.icon,
        imageUrl: messageToEdit.imageUrl || '',
        useDefaultImage: !messageToEdit.imageUrl
      });
      setEditingMessageId(messageId);
      setActiveTab('create');
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessageId || !newMessage.content.trim()) {
      toast({
        title: '입력 확인',
        description: '메시지 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 선택된 이미지 URL 결정
    let finalImageUrl = '';
    if (newMessage.useDefaultImage) {
      const imageKeys = Object.keys(DEFAULT_MOTIVATION_IMAGES);
      finalImageUrl = DEFAULT_MOTIVATION_IMAGES[imageKeys[0] as keyof typeof DEFAULT_MOTIVATION_IMAGES];
    } else if (newMessage.imageUrl) {
      finalImageUrl = newMessage.imageUrl;
    }

    // 첫 번째 태그의 색상 사용
    const firstTag = allTags.find(tag => tag.id === newMessage.tags[0]);
    const color = firstTag?.color || 'rgb(156, 163, 175)';

    await updateCustomMessage(editingMessageId, {
      content: newMessage.content,
      tags: newMessage.tags,
      icon: newMessage.icon as UnifiedIconKey,
      color,
      imageUrl: finalImageUrl,
      isDefault: false
    });

    setNewMessage({
      content: '',
      tags: ['positive_affirmation'],
      icon: 'lucide-Heart',
      imageUrl: '',
      useDefaultImage: false
    });
    setEditingMessageId(null);
    setActiveTab('browse');

    toast({
      title: '메시지 수정됨',
      description: '동기부여 메시지가 수정되었습니다.',
    });
  };

  const resetForm = () => {
    setNewMessage({
      content: '',
      tags: ['positive_affirmation'],
      icon: 'lucide-Heart',
      imageUrl: '',
      useDefaultImage: false
    });
    setIsCreating(false);
    setEditingMessageId(null);
    setActiveTab('browse');
  };

  // 중앙 집중식 모달 설정 - 100% 높이 통일
  const modalConfig = createModalConfig('FULLSCREEN');

  return (
    <Sheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      {...modalConfig}
    >
      <Sheet.Container className="bg-background">
        <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand" />
                동기부여 메시지
              </h2>
              {todoContent && (
                <p className="text-sm text-muted-foreground mt-1">
                  &ldquo;{todoContent.slice(0, 50)}...&rdquo; 에 대한 메시지
                </p>
              )}
            </div>

            {currentLinkedMessages.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                연결됨: {currentLinkedMessages.length}개 메시지
              </div>
            )}
          </div>
        </Sheet.Header>

        <div className="flex flex-col h-full">

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-2 mx-6 mt-4 bg-muted shadow-sm">
                <TabsTrigger value="browse" className="data-[state=active]:bg-card data-[state=active]:shadow-sm" style={{'--tw-shadow-color': 'var(--brand-primary-light)'} as React.CSSProperties}>찾아보기</TabsTrigger>
                <TabsTrigger value="create" className="data-[state=active]:bg-card data-[state=active]:shadow-sm" style={{'--tw-shadow-color': 'var(--brand-primary-light)'} as React.CSSProperties}>
                  {editingMessageId ? '수정하기' : '만들기'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-6 pb-6">
                    {/* 추천 메시지 */}
                    {recommendedMessages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full" style={{backgroundColor: 'var(--brand-primary)'}}></div>
                          추천 메시지
                        </h4>
                        <div className="space-y-2">
                          {recommendedMessages.map((message) => (
                            <MotivationMessage
                              key={message.id}
                              message={message}
                              variant="default"
                              onClick={() => handleSelectMessage(message.id)}
                              className="cursor-pointer bg-card hover:shadow-md transition-shadow duration-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 전체 메시지 라이브러리 */}
                    <MotivationLibrary
                      onSelectMessage={handleSelectMessage}
                      selectedMessageId={selectedMessageId || undefined}
                      showHeader={false}
                      compact={false}
                      onEditMessage={handleEditMessage}
                      onDeleteMessage={handleDeleteMessage}
                      // Many-to-Many 연결 기능
                      showConnectionButton={true}
                      todoId={todoId}
                      connectedMessages={currentLinkedMessages.map(m => m.id)}
                      onToggleConnection={handleToggleConnection}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="create" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-4 pb-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="content">메시지 내용 *</Label>
                        <Textarea
                          id="content"
                          placeholder="첫 줄: 제목 (예: 지금 이 순간이 중요해요)&#10;&#10;나머지: 세부 내용을 입력하세요..."
                          value={newMessage.content}
                          onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                          rows={5}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 첫 번째 줄이 제목으로 사용됩니다
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="tags">태그</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {allTags.map(tag => {
                            const iconData = getUnifiedIcon(tag.icon);
                            const IconComponent = iconData.component;
                            const isSelected = newMessage.tags.includes(tag.id);

                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  setNewMessage(prev => ({
                                    ...prev,
                                    tags: isSelected
                                      ? prev.tags.filter(t => t !== tag.id)
                                      : [...prev.tags, tag.id]
                                  }));
                                }}
                                className={cn(
                                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors",
                                  isSelected
                                    ? "text-white"
                                    : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                                )}
                                style={isSelected ? {
                                  backgroundColor: tag.color,
                                } : {}}
                              >
                                <IconComponent size={14} className="mr-1" />
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">
                          💡 여러 태그를 선택할 수 있습니다
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="icon">아이콘</Label>
                          <Select
                            value={newMessage.icon}
                            onValueChange={(value) => setNewMessage(prev => ({ ...prev, icon: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allTags.map(tag => {
                                const iconData = getUnifiedIcon(tag.icon);
                                const IconComponent = iconData.component;
                                return (
                                  <SelectItem key={tag.icon} value={tag.icon}>
                                    <div className="flex items-center gap-2">
                                      <IconComponent size={16} />
                                      {tag.icon}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>이미지</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="useDefaultImage"
                                checked={newMessage.useDefaultImage}
                                onChange={(e) => setNewMessage(prev => ({
                                  ...prev,
                                  useDefaultImage: e.target.checked,
                                  imageUrl: e.target.checked ? '' : prev.imageUrl
                                }))}
                                className="rounded"
                              />
                              <Label htmlFor="useDefaultImage" className="text-sm">
                                기본 이미지 사용
                              </Label>
                            </div>

                            {!newMessage.useDefaultImage && (
                              <Input
                                placeholder="이미지 URL"
                                value={newMessage.imageUrl}
                                onChange={(e) => setNewMessage(prev => ({ ...prev, imageUrl: e.target.value }))}
                              />
                            )}
                          </div>
                        </div>
                      </div>


                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={editingMessageId ? handleUpdateMessage : handleCreateMessage}
                          className="flex-1 gap-2 shadow-sm hover:shadow-md transition-shadow"
                          style={{backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)'}}
                        >
                          <Save size={16} />
                          {editingMessageId ? '메시지 수정' : '메시지 저장'}
                        </Button>
                        <Button variant="outline" onClick={resetForm} className="gap-2 shadow-sm hover:shadow-md transition-shadow">
                          <X size={16} />
                          취소
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </Sheet.Container>
    </Sheet>
  );
};

export default MotivationSheet;