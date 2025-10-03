import React from 'react';
import { Sheet } from 'react-modal-sheet';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  detent?: 'full-height' | 'content-height';
  disableDrag?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints,
  initialSnap,
  detent = 'content-height',
  disableDrag = false,
  className,
}) => {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      detent={detent}
      disableDrag={disableDrag}
      className={className}
    >
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content>
          <Sheet.Scroller>
            {children}
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop />
    </Sheet>
  );
};

export default BottomSheet;