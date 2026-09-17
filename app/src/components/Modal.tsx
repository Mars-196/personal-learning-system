/* ============================================================
   通用弹窗组件
   ============================================================ */

import { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'default' | 'wide' | 'narrow';
}

export function Modal({ open, title, onClose, children, footer, size = 'default' }: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // ESC 关闭 + 滚动锁定
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setIsAnimating(true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      setIsAnimating(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'wide' ? ' modal--wide' : size === 'narrow' ? ' modal--narrow' : '';
  const animationClass = isAnimating ? '' : 'modal--closing';

  return (
    <div
      className={`modal-overlay ${animationClass}`}
      onMouseDown={(e) => {
        // 点击遮罩关闭（点到弹窗内部不关）
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className={`modal${sizeClass}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="关闭" type="button">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
