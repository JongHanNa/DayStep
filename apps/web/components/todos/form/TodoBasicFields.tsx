'use client';

import React, { memo } from 'react';

export interface TodoBasicFieldsProps {
  content: string;
  onContentChange: (value: string) => void;
}

const TodoBasicFields: React.FC<TodoBasicFieldsProps> = ({
  content,
  onContentChange
}) => {
  return (
    <>
      {/* 할일 내용 입력은 TodoMetadata 컴포넌트로 이동됨 */}
    </>
  );
};

export default memo(TodoBasicFields);
