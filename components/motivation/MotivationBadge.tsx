'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MotivationMessage } from '@/types/motivation';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import MotivationMessageComponent from './MotivationMessage';
import { OptimizedMotion } from '@/components/ui/optimized-motion';

interface MotivationBadgeProps {
  message: MotivationMessage;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon-only' | 'with-text' | 'preview' | 'compact';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const MotivationBadge: React.FC<MotivationBadgeProps> = ({
  message,
  size = 'md',
  variant = 'icon-only',
  className,
  onClick,
  disabled = false
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const IconComponent = message.icon ? getUnifiedIcon(message.icon) : getUnifiedIcon('lucide-Heart');

  // content에서 제목 추출
  const lines = message.content.split('\n');
  const title = lines[0] || '';
  const content = lines.slice(1).join('\n').trim();
  // compact variant를 위한 전체 content (줄바꿈을 공백으로 변환)
  const fullContent = message.content.replace(/\n/g, ' ').trim();

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }

    if (onClick) {
      onClick();
    } else {
      setIsPopupOpen(true);
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  if (variant === 'icon-only') {
    return (
      <>
        <OptimizedMotion>
          <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              'inline-flex items-center justify-center rounded-full border-0 shadow-sm transition-all duration-200 backdrop-blur-sm',
              'transform hover:scale-105 active:scale-95',
              sizeClasses[size],
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-md cursor-pointer',
              className
            )}
            style={{
              backgroundColor: message.color ? message.color + '20' : 'rgba(156, 163, 175, 0.2)'
            }}
            title={`${title}: ${content.slice(0, 50)}...`}
          >
            <IconComponent
              size={iconSizes[size]}
              style={{ color: message.color || 'rgb(107, 114, 128)' }}
              className="opacity-80"
            />
          </button>
        </OptimizedMotion>

        <Dialog open={isPopupOpen} onOpenChange={handleClosePopup}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">
              {title || '동기부여 메시지'}
            </DialogTitle>
            <MotivationMessageComponent
              message={message}
              variant="popup"
              onClick={handleClosePopup}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (variant === 'with-text') {
    return (
      <>
        <OptimizedMotion>
          <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 px-2 py-1 rounded-full border-0 shadow-sm transition-all duration-200 backdrop-blur-sm',
              'transform hover:scale-102 active:scale-98',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-md cursor-pointer',
              className
            )}
            style={{
              backgroundColor: message.color ? message.color + '15' : 'rgba(156, 163, 175, 0.15)'
            }}
          >
            <IconComponent
              size={14}
              style={{ color: message.color || 'rgb(107, 114, 128)' }}
              className="opacity-80 flex-shrink-0"
            />
            <span
              className="text-xs font-medium truncate max-w-20"
              style={{ color: message.color || 'rgb(107, 114, 128)' }}
            >
              {title}
            </span>
          </button>
        </OptimizedMotion>

        <Dialog open={isPopupOpen} onOpenChange={handleClosePopup}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">
              {title || '동기부여 메시지'}
            </DialogTitle>
            <MotivationMessageComponent
              message={message}
              variant="popup"
              onClick={handleClosePopup}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Compact variant - 할일 카드에 최적화된 초미니멀 디자인
  if (variant === 'compact') {
    return (
      <>
        <OptimizedMotion className="flex-1 min-w-0">
          <div
            onClick={handleClick}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md shadow-sm transition-all duration-200 w-full',
              'transform hover:scale-101 active:scale-99',
              disabled
                ? 'opacity-50'
                : 'hover:shadow cursor-pointer',
              className
            )}
            style={{
              backgroundColor: message.color ? message.color + '08' : 'rgba(156, 163, 175, 0.08)'
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = message.color ? message.color + '15' : 'rgba(156, 163, 175, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = message.color ? message.color + '08' : 'rgba(156, 163, 175, 0.08)';
            }}
          >
            <IconComponent
              size={10}
              style={{ color: message.color || 'rgb(107, 114, 128)' }}
              className="opacity-70 flex-shrink-0"
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
              {fullContent}
            </span>
          </div>
        </OptimizedMotion>

        <Dialog open={isPopupOpen} onOpenChange={handleClosePopup}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-lg">
            <DialogTitle className="sr-only">
              {title || '동기부여 메시지'}
            </DialogTitle>
            <MotivationMessageComponent
              message={message}
              variant="popup"
              onClick={handleClosePopup}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Preview variant - 타임라인 카드에 적합한 미리보기
  return (
    <>
      <OptimizedMotion>
        <div
          onClick={handleClick}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg border-0 shadow-sm transition-all duration-200 backdrop-blur-sm',
            'transform hover:scale-101 active:scale-99',
            disabled
              ? 'opacity-50'
              : 'hover:shadow-md cursor-pointer hover:bg-opacity-30',
            className
          )}
          style={{
            backgroundColor: message.color ? message.color + '10' : 'rgba(156, 163, 175, 0.1)',
            borderLeft: `3px solid ${message.color || 'rgb(156, 163, 175)'}`
          }}
        >
          <div
            className="flex-shrink-0 p-1 rounded-full"
            style={{
              backgroundColor: message.color ? message.color + '20' : 'rgba(156, 163, 175, 0.2)'
            }}
          >
            <IconComponent
              size={12}
              style={{ color: message.color || 'rgb(107, 114, 128)' }}
              className="opacity-80"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
              {message.content.slice(0, 40)}...
            </p>
          </div>
        </div>
      </OptimizedMotion>

      <Dialog open={isPopupOpen} onOpenChange={handleClosePopup}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-lg">
          <DialogTitle className="sr-only">
            {title || '동기부여 메시지'}
          </DialogTitle>
          <MotivationMessageComponent
            message={message}
            variant="popup"
            onClick={handleClosePopup}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MotivationBadge;