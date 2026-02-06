import { useState, useEffect, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<string, { bg: string; color: string; icon: string }> = {
  success: { bg: 'var(--color-accent-success-light)', color: 'var(--color-accent-success)', icon: '✓' },
  info: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)', icon: 'ℹ' },
  warning: { bg: 'var(--color-accent-warn-light)', color: 'var(--color-accent-warn)', icon: '⚠' },
  error: { bg: 'var(--color-accent-danger-light)', color: 'var(--color-accent-danger)', icon: '✕' },
};

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 250);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const style = typeStyles[message.type] || typeStyles.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 18px', borderRadius: '10px',
        backgroundColor: style.bg, color: style.color,
        border: `1px solid ${style.color}20`,
        fontSize: '14px', fontWeight: 500,
        boxShadow: 'var(--shadow-md)',
        transform: visible && !exiting ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'transform 0.25s ease, opacity 0.25s ease',
        cursor: 'pointer',
        maxWidth: '380px',
      }}
      onClick={onDismiss}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true">{style.icon}</span>
      <span>{message.text}</span>
    </div>
  );
}

export default function Toast({ messages, onDismiss }: ToastProps) {
  if (messages.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '72px', right: '24px', zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {messages.map(msg => (
        <ToastItem key={msg.id} message={msg} onDismiss={() => onDismiss(msg.id)} />
      ))}
    </div>
  );
}

// Hook for managing toasts
let toastCounter = 0;
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast-${++toastCounter}`;
    setMessages(prev => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return { messages, addToast, dismissToast };
}
