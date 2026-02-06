'use client';

import React from 'react';
import { EnhancedIconBrowserModal } from './EnhancedIconBrowserModal';
import { UnifiedIconKey } from '@/lib/icon-collection';

interface IconBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onIconSelect: (iconKey: UnifiedIconKey) => void;
  selectedIcon?: string;
  className?: string;
}

// 이제 IconBrowserModal을 EnhancedIconBrowserModal로 리디렉션합니다
export const IconBrowserModal: React.FC<IconBrowserModalProps> = (props) => {
  return <EnhancedIconBrowserModal {...props} />;
};

export default IconBrowserModal;