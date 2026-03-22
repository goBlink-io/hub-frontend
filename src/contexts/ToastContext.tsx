'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export function useToast() { return useContext(ToastContext); }

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const iconMap = {
    success: <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />,
    error: <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />,
    warning: <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />,
    info: <Info className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />,
  };

  const bgMap = {
    success: 'var(--success-bg)',
    error: 'var(--error-bg)',
    warning: 'var(--warning-bg)',
    info: 'var(--info-bg)',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — bottom center on mobile, bottom right on desktop */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up"
            style={{ background: bgMap[t.type], borderColor: 'var(--color-border)' }}>
            {iconMap[t.type]}
            <span className="text-body-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>{t.message}</span>
            <button onClick={() => dismiss(t.id)} style={{ color: 'var(--color-text-muted)' }} aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
