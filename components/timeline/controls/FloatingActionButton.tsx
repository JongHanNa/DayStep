'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import TodoFormModal from '@/components/todos/TodoFormModal';

interface FloatingActionButtonProps {
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ className }) => {
  const [todoModalOpen, setTodoModalOpen] = useState(false);

  const handleAddTodo = () => {
    setTodoModalOpen(true);
  };

  return (
    <>
      <div className={cn('fixed bottom-24 right-6 z-10', className)}>
        <Button
          size="lg"
          onClick={handleAddTodo}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
            'bg-primary hover:bg-primary/90 text-primary-content border-0',
            'hover:scale-110 active:scale-95',
            'flex items-center justify-center p-0'
          )}
        >
          <Plus className="h-8 w-8 stroke-[3]" />
        </Button>
      </div>

      {/* 할일 추가 모달 */}
      <TodoFormModal
        open={todoModalOpen}
        onOpenChange={setTodoModalOpen}
      />
    </>
  );
};

export default FloatingActionButton;
