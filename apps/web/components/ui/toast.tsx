'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { Toast } from '@/hooks/use-toast';

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const toastVariants = {
  initial: {
    opacity: 0,
    y: -50,
    scale: 0.95,
    x: '100%'
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
      mass: 0.8
    }
  },
  exit: {
    opacity: 0,
    x: '100%',
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeInOut' as const
    }
  }
};

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { colors, primaryColor, hexWithOpacity } = useTheme();

  // 시맨틱 + 메인컬러 매핑
  // - success/destructive는 시맨틱 고정 (의미 전달)
  // - info(default)는 사용자 메인컬러를 따라 톤 통일
  const accent = (() => {
    switch (toast.variant) {
      case 'success':
        return colors.success;
      case 'destructive':
        return colors.error;
      default:
        return primaryColor;
    }
  })();

  const Icon = (() => {
    switch (toast.variant) {
      case 'success':
        return CheckCircle;
      case 'destructive':
        return AlertCircle;
      default:
        return Info;
    }
  })();

  const containerStyle: React.CSSProperties = {
    backgroundColor: hexWithOpacity(accent, 0.08),
    borderColor: hexWithOpacity(accent, 0.25),
    color: accent,
  };

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={containerStyle}
      className={cn(
        'relative flex items-start gap-3 p-4 pr-8 rounded-lg border shadow-lg backdrop-blur-sm min-w-80 max-w-md',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="font-semibold text-sm mb-1">
            {toast.title}
          </div>
        )}
        <div className="text-sm opacity-90">
          {toast.description}
        </div>

        {toast.action && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toast.action.onClick}
              className="h-7 px-2 text-xs font-medium"
            >
              {toast.action.label}
            </Button>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-70 hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </Button>

      {toast.duration && toast.duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 opacity-30 rounded-b-lg"
          style={{ backgroundColor: accent }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{
            duration: toast.duration / 1000,
            ease: 'linear'
          }}
        />
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              toast={toast}
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
