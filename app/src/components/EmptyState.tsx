/* ============================================================
   空状态占位
   ============================================================ */

interface EmptyStateProps {
  icon?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📋', title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <div className="empty-state__title">{title}</div>
      {text && <p className="empty-state__text">{text}</p>}
      {action}
    </div>
  );
}
