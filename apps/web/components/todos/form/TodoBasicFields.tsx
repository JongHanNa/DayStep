'use client';

import React, { memo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface TodoBasicFieldsProps {
  content: string;
  priority: 'low' | 'medium' | 'high';
  onContentChange: (value: string) => void;
  onPriorityChange: (value: 'low' | 'medium' | 'high') => void;
}

const TodoBasicFields: React.FC<TodoBasicFieldsProps> = ({
  content,
  priority,
  onContentChange,
  onPriorityChange
}) => {
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onContentChange(e.target.value);
  }, [onContentChange]);

  return (
    <>
      {/* 할일 내용 입력은 TodoMetadata 컴포넌트로 이동됨 */}
      {/* 현재는 우선순위 기능이 없으므로 빈 컴포넌트 */}
    </>
  );
};

export default memo(TodoBasicFields);