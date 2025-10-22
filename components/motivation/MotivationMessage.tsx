'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MotivationMessage as MotivationMessageType } from '@/types/motivation';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { Check, Link } from 'lucide-react';

interface MotivationMessageProps {
  message: MotivationMessageType;
  variant?: 'default' | 'compact' | 'popup';
  showIcon?: boolean;
  showTags?: boolean;
  showConnectionButton?: boolean;
  isConnected?: boolean;
  todoId?: string; // 할일 ID (연결 확인용)
  className?: string;
  onClick?: () => void;
  onToggleConnection?: (messageId: string, isConnected: boolean) => void;
}

const MotivationMessage: React.FC<MotivationMessageProps> = ({
  message,
  variant = 'default',
  showIcon = true,
  showTags = true,
  showConnectionButton = false,
  isConnected = false,
  todoId,
  className,
  onClick,
  onToggleConnection
}) => {
  const { getAllTags } = useMotivationStore();
  const allTags = getAllTags();

  const iconData = showIcon && message.icon ? getUnifiedIcon(message.icon) : getUnifiedIcon('lucide-Heart');
  const IconComponent = showIcon ? iconData.component : null;

  // content의 첫 줄을 제목으로, 나머지를 본문으로 분리
  const lines = message.content.split('\n');
  const title = lines[0] || '';
  const content = lines.slice(1).join('\n').trim();

  // 해당 메시지의 태그 정보 가져오기
  const messageTags = (message.tags || []).map(tagId =>
    allTags.find(tag => tag.id === tagId)
  ).filter(Boolean);

  // 연결 버튼 클릭 핸들러
  const handleToggleConnection = (e: React.MouseEvent) => {
    e.stopPropagation(); // 부모의 onClick 이벤트 방지
    if (onToggleConnection) {
      onToggleConnection(message.id, isConnected);
    }
  };

  const baseClasses = cn(
    'transition-all duration-200 ease-in-out relative',
    onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
    isConnected && showConnectionButton && 'ring-2 ring-brand/20 bg-brand/5',
    className
  );

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          baseClasses,
          'flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-0 shadow-sm'
        )}
        onClick={onClick}
      >
        {IconComponent && (
          <div
            className="flex-shrink-0 p-1.5 rounded-full"
            style={{ backgroundColor: message.color + '20' }}
          >
            <IconComponent
              size={14}
              style={{ color: message.color }}
              className="opacity-80"
            />
          </div>
        )}

        {/* 이미지가 있는 경우 표시 */}
        {message.imageUrl && (
          <div className="flex-shrink-0 w-6 h-6 rounded overflow-hidden">
            <img
              src={message.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {title}
          </p>
          {content && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {content.slice(0, 30)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'popup') {
    return (
      <Card className={cn(baseClasses, 'p-6 max-w-md mx-auto border-0 shadow-lg bg-white dark:bg-gray-900')}>
        <div className="text-center space-y-4">
          {/* 이미지가 있으면 이미지를, 없으면 아이콘을 표시 */}
          {message.imageUrl ? (
            <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-sm">
              <img
                src={message.imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : IconComponent ? (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
              style={{ backgroundColor: message.color + '15' }}
            >
              <IconComponent
                size={32}
                style={{ color: message.color }}
                className="opacity-90"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {content && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {content}
              </p>
            )}
          </div>

          {showTags && messageTags.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap gap-1 justify-center">
                {messageTags.map(tag => (
                  <span
                    key={tag!.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: tag!.color + '15',
                      color: tag!.color
                    }}
                  >
                    {tag!.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn(baseClasses, 'p-4 border-0 shadow-sm bg-white dark:bg-gray-900')}>
      {/* 연결 상태 표시 - 퀵노트 스타일 */}
      {showConnectionButton && isConnected && (
        <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
          <Link className="h-3 w-3" />
          <span>연결됨</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 이미지가 있으면 이미지를, 없으면 아이콘을 표시 */}
        {message.imageUrl ? (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
            <img
              src={message.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : IconComponent ? (
          <div
            className="flex-shrink-0 p-2 rounded-lg"
            style={{ backgroundColor: message.color + '15' }}
          >
            <IconComponent
              size={20}
              style={{ color: message.color }}
              className="opacity-80"
            />
          </div>
        ) : null}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h4>
            {showTags && messageTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {messageTags.slice(0, 2).map(tag => (
                  <span
                    key={tag!.id}
                    className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: tag!.color + '15',
                      color: tag!.color
                    }}
                  >
                    {tag!.name}
                  </span>
                ))}
                {messageTags.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{messageTags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>

          {content && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {content}
            </p>
          )}
        </div>

        {/* 연결 버튼 - 퀵노트 스타일 Link 아이콘 */}
        {showConnectionButton && (
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant={isConnected ? "default" : "ghost"}
              onClick={handleToggleConnection}
              className={cn(
                "h-8 w-8 p-0 transition-colors hover:scale-105",
                isConnected
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
              )}
            >
              <Link className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MotivationMessage;