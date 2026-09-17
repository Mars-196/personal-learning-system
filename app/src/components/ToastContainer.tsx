/* ============================================================
   消息提示容器
   ============================================================ */

import { useUIStore } from '../store/uiStore';

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span aria-hidden="true">{ICONS[t.kind] ?? ''}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
