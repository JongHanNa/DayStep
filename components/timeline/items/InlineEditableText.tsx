'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Check, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const editSchema = z.object({
  text: z.string().min(1, '내용을 입력해주세요').max(500, '500자 이내로 입력해주세요'),
});

type EditFormData = z.infer<typeof editSchema>;

interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
}

export const InlineEditableText = React.memo(function InlineEditableText({
  value,
  onSave,
  className,
  multiline = false,
  placeholder = '텍스트를 입력하세요',
  disabled = false,
  autoFocus = true,
  maxLength = 500,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema.extend({
      text: z.string().min(1, '내용을 입력해주세요').max(maxLength, `${maxLength}자 이내로 입력해주세요`),
    })),
    defaultValues: {
      text: value,
    },
    mode: 'onChange',
  });

  const currentText = watch('text');

  // Start editing mode
  const startEditing = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    setValue('text', value);
  }, [disabled, value, setValue]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    reset({ text: value });
  }, [value, reset]);

  // Save changes
  const saveChanges = useCallback(async (data: EditFormData) => {
    if (data.text.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(data.text.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
      // Keep editing mode and show error (you might want to add toast notification)
    } finally {
      setIsLoading(false);
    }
  }, [value, onSave]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      if (isValid && !isLoading) {
        handleSubmit(saveChanges)();
      }
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (isValid && !isLoading) {
        handleSubmit(saveChanges)();
      }
    }
  }, [cancelEditing, multiline, isValid, isLoading, handleSubmit, saveChanges]);

  // Handle click outside to save
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const editableElement = editableRef.current;
      
      if (editableElement && !editableElement.contains(target)) {
        if (isValid && !isLoading && currentText.trim() !== value.trim()) {
          handleSubmit(saveChanges)();
        } else {
          cancelEditing();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, isValid, isLoading, currentText, value, handleSubmit, saveChanges, cancelEditing]);

  // Auto focus when editing starts
  useEffect(() => {
    if (isEditing && autoFocus) {
      const element = multiline ? textareaRef.current : inputRef.current;
      if (element) {
        element.focus();
        // Select all text
        element.setSelectionRange(0, element.value.length);
      }
    }
  }, [isEditing, autoFocus, multiline]);

  // Auto resize textarea
  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
    }
  }, [isEditing, multiline, currentText]);

  if (!isEditing) {
    return (
      <div
        className={cn(
          'group relative cursor-pointer rounded px-2 py-1 transition-colors',
          'hover:bg-accent/50',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={startEditing}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            startEditing();
          }
        }}
      >
        <span className={cn(
          'block',
          !value && 'text-muted-foreground italic'
        )}>
          {value || placeholder}
        </span>
        {!disabled && (
          <Edit3 className="absolute right-1 top-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    );
  }

  return (
    <div ref={editableRef} className={cn('relative', className)}>
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={currentText}
          onChange={(e) => setValue('text', e.target.value)}
          className={cn(
            'w-full resize-none rounded border bg-background px-2 py-1 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.text && 'border-destructive'
          )}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={maxLength}
        />
      ) : (
        <input
          ref={inputRef}
          value={currentText}
          onChange={(e) => setValue('text', e.target.value)}
          type="text"
          className={cn(
            'w-full rounded border bg-background px-2 py-1 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.text && 'border-destructive'
          )}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={maxLength}
        />
      )}

      {/* Action buttons */}
      <div className="absolute right-1 top-1 flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={handleSubmit(saveChanges)}
          disabled={!isValid || isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={cancelEditing}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Error message */}
      {errors.text && (
        <p className="mt-1 text-xs text-destructive">
          {errors.text.message}
        </p>
      )}

      {/* Character count */}
      {multiline && (
        <p className="mt-1 text-xs text-muted-foreground text-right">
          {currentText?.length || 0} / {maxLength}
        </p>
      )}
    </div>
  );
});

InlineEditableText.displayName = 'InlineEditableText';

export default InlineEditableText;