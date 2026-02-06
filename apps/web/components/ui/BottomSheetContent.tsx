import React from 'react';
import { Sheet } from 'react-modal-sheet';
import { cn } from '@/lib/utils';

interface BottomSheetContentProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  detent?: 'full-height' | 'content-height';
  disableDrag?: boolean;
  className?: string;
  header?: React.ReactNode;
  showBackdrop?: boolean;
  onSnap?: (snapIndex: number) => void;
}

export const BottomSheetContent: React.FC<BottomSheetContentProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints,
  initialSnap,
  detent = 'content-height',
  disableDrag = false,
  className,
  header,
  showBackdrop = true,
  onSnap,
}) => {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      detent={detent}
      disableDrag={disableDrag}
      onSnap={onSnap}
      className={cn('z-50', className)}
    >
      <Sheet.Container className={cn(
        'bg-white dark:bg-gray-800 rounded-t-xl shadow-2xl',
        'border-t border-gray-200 dark:border-gray-700'
      )}>
        {header ? (
          <Sheet.Header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {header}
          </Sheet.Header>
        ) : (
          <Sheet.Header className="flex justify-center py-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </Sheet.Header>
        )}
        <Sheet.Content className="px-4 pb-4">
          <Sheet.Scroller draggableAt="top" className="max-h-[80vh] overflow-y-auto">
            {children}
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
      {showBackdrop && (
        <Sheet.Backdrop className="bg-black/50 backdrop-blur-sm" />
      )}
    </Sheet>
  );
};

export default BottomSheetContent;