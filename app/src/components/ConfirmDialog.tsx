/* ============================================================
   确认弹窗 —— 由 uiStore.askConfirm 驱动
   ============================================================ */

import { useState } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../store/uiStore';

export function ConfirmDialog() {
  const config = useUIStore((s) => s.confirm);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!config) return;
    setBusy(true);
    try {
      await config.onConfirm();
    } finally {
      setBusy(false);
      resolveConfirm();
    }
  };

  return (
    <Modal
      open={config !== null}
      title={config?.title ?? ''}
      onClose={busy ? () => undefined : resolveConfirm}
      size="narrow"
      footer={
        <>
          <button
            className="btn btn--ghost"
            onClick={resolveConfirm}
            disabled={busy}
            type="button"
          >
            取消
          </button>
          <button
            className="btn btn--danger"
            onClick={handleConfirm}
            disabled={busy}
            type="button"
          >
            {busy ? '处理中…' : (config?.confirmText ?? '确认')}
          </button>
        </>
      }
    >
      <p className="modal__text">{config?.message}</p>
    </Modal>
  );
}
