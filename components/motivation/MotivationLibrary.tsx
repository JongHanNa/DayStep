'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MotivationTag,
  MotivationMessage as MotivationMessageType
} from '@/types/motivation';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { getUnifiedIcon, UnifiedIconKey } from '@/lib/icon-collection';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import MotivationMessage from './MotivationMessage';
import { Search, Plus, Filter, Edit3, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MotivationLibraryProps {
  onSelectMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  selectedMessageId?: string;
  showHeader?: boolean;
  showSearch?: boolean;
  showTags?: boolean;
  showCustom?: boolean;
  compact?: boolean;
  className?: string;
  // 연결 기능 관련 props
  showConnectionButton?: boolean;
  todoId?: string; // 현재 할일 ID
  connectedMessages?: string[]; // 현재 연결된 메시지 ID 배열
  onToggleConnection?: (messageId: string, isConnected: boolean) => void;
}

const MotivationLibrary: React.FC<MotivationLibraryProps> = ({
  onSelectMessage,
  onEditMessage,
  onDeleteMessage,
  selectedMessageId,
  showHeader = true,
  showSearch = true,
  showTags = true,
  showCustom = true,
  compact = false,
  className,
  // 연결 기능 관련 props
  showConnectionButton = false,
  todoId,
  connectedMessages = [],
  onToggleConnection
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');

  const {
    getAllMessages,
    searchMessages,
    getTemplatesByTags,
    customMessages,
    templates,
    getAllTags,
    initializeStore
  } = useMotivationStore();

  // 스토어 초기화
  React.useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const allTags = getAllTags();

  // 메시지 필터링
  const filteredMessages = useMemo(() => {
    let messages = activeTab === 'templates'
      ? templates.map(t => {
          // 첫 번째 태그의 색상 사용
          const firstTag = t.tags[0];
          const tagData = allTags.find(tag => tag.id === firstTag);
          return {
            ...t,
            isDefault: true,
            color: tagData?.color,
            tags: t.tags || [] // tags 배열이 항상 존재하도록 보장
          };
        })
      : customMessages.map(m => ({
          ...m,
          tags: m.tags || [] // customMessages에서도 tags 배열 보장
        }));

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      messages = messages.filter(message => {
        // content 내용 검색
        const contentMatch = message.content.toLowerCase().includes(query);

        // 태그명 검색
        const tagMatch = (message.tags || []).some(tagId => {
          const tag = allTags.find(t => t.id === tagId);
          return tag && tag.name.toLowerCase().includes(query);
        });

        return contentMatch || tagMatch;
      });
    }

    // 태그 필터
    if (selectedTag !== 'all') {
      messages = messages.filter(message => (message.tags || []).includes(selectedTag));
    }

    return messages;
  }, [templates, customMessages, searchQuery, selectedTag, activeTab, allTags]);

  const handleSelectMessage = (messageId: string) => {
    if (onSelectMessage) {
      onSelectMessage(messageId);
    }
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* 헤더 */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              동기부여 메시지
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              할일에 연결할 동기부여 메시지를 선택하세요
            </p>
          </div>

          <Button variant="outline" size="sm" className="gap-2">
            <Plus size={16} />
            새 메시지
          </Button>
        </div>
      )}

      {/* 검색 및 필터 */}
      {(showSearch || showTags) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {showSearch && (
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="메시지 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {showTags && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-fit">
                  <Filter size={16} />
                  {selectedTag === 'all' ? '모든 태그' : allTags.find(t => t.id === selectedTag)?.name || '태그 선택'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSelectedTag('all')}>
                  모든 태그
                </DropdownMenuItem>
                {allTags.map(tag => {
                  const IconComponent = getUnifiedIcon(tag.icon as UnifiedIconKey);
                  return (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => setSelectedTag(tag.id)}
                      className="flex items-center gap-2"
                    >
                      <IconComponent size={16} style={{ color: tag.color }} />
                      {tag.name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* 탭 (템플릿 vs 커스텀) */}
      {showCustom && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'templates' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="gap-2">
              기본 메시지 ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              내가 만든 메시지 ({customMessages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <MotivationMessageList
              messages={filteredMessages}
              onSelectMessage={handleSelectMessage}
              selectedMessageId={selectedMessageId}
              compact={compact}
              showManageButtons={false}
              showConnectionButton={showConnectionButton}
              todoId={todoId}
              connectedMessages={connectedMessages}
              onToggleConnection={onToggleConnection}
            />
          </TabsContent>

          <TabsContent value="custom">
            <MotivationMessageList
              messages={filteredMessages}
              onSelectMessage={handleSelectMessage}
              selectedMessageId={selectedMessageId}
              compact={compact}
              showManageButtons={true}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              showConnectionButton={showConnectionButton}
              todoId={todoId}
              connectedMessages={connectedMessages}
              onToggleConnection={onToggleConnection}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* 메시지 목록 (탭 없는 경우) */}
      {!showCustom && (
        <MotivationMessageList
          messages={filteredMessages}
          onSelectMessage={handleSelectMessage}
          selectedMessageId={selectedMessageId}
          compact={compact}
          showConnectionButton={showConnectionButton}
          todoId={todoId}
          connectedMessages={connectedMessages}
          onToggleConnection={onToggleConnection}
        />
      )}
    </div>
  );
};

// 메시지 목록 컴포넌트
interface MotivationMessageListProps {
  messages: MotivationMessageType[];
  onSelectMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  selectedMessageId?: string;
  compact?: boolean;
  showManageButtons?: boolean;
  // 연결 기능 관련 props
  showConnectionButton?: boolean;
  todoId?: string;
  connectedMessages?: string[];
  onToggleConnection?: (messageId: string, isConnected: boolean) => void;
}

const MotivationMessageList: React.FC<MotivationMessageListProps> = ({
  messages,
  onSelectMessage,
  onEditMessage,
  onDeleteMessage,
  selectedMessageId,
  compact = false,
  showManageButtons = false,
  // 연결 기능 관련 props
  showConnectionButton = false,
  todoId,
  connectedMessages = [],
  onToggleConnection
}) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>검색 조건에 맞는 메시지가 없습니다.</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn(compact ? "h-64" : "h-96")}>
      <div className="space-y-3 pr-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'transition-all duration-200 group relative',
              selectedMessageId === message.id && 'ring-2 ring-blue-500/50 ring-offset-2 rounded-lg'
            )}
          >
            <MotivationMessage
              message={message}
              variant={compact ? 'compact' : 'default'}
              onClick={() => onSelectMessage?.(message.id)}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
              // 연결 기능 관련 props
              showConnectionButton={showConnectionButton}
              isConnected={connectedMessages.includes(message.id)}
              todoId={todoId}
              onToggleConnection={onToggleConnection}
            />
            {showManageButtons && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMessage?.(message.id);
                  }}
                  className="h-8 w-8 p-0 shadow-sm bg-card"
                >
                  <Edit3 size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMessage?.(message.id);
                  }}
                  className="h-8 w-8 p-0 shadow-sm bg-card text-destructive hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default MotivationLibrary;