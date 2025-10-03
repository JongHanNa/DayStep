'use client';

import React, { createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';
import type { Toast, ToastAction, UseToastOptions } from '@/hooks/use-toast';

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'> & { duration?: number }) => string;
  deleteToast: (itemTitle: string, onUndo: () => void, options?: UseToastOptions) => string;
  successToast: (message: string) => string;
  errorToast: (message: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const {
    toast,
    deleteToast,
    successToast,
    errorToast,
    dismiss,
    dismissAll,
    toasts
  } = useToast();

  const contextValue: ToastContextType = {
    toast,
    deleteToast,
    successToast,
    errorToast,
    dismiss,
    dismissAll,
    toasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;