/* ============================================================
   任务列表项
   ============================================================ */

import { useState } from 'react';
import type { Task } from '../types';
import { PriorityBadge, CategoryBadge, DueBadge, DateRangeBadge, StageBadge } from './Badges';
import { truncate } from '../utils';

interface TaskItemProps {
  task: Task;
  /** 阶段 id → 名称映射，用于显示所属阶段 */
  stageNames: Record<string, string>;
  /** 是否显示起止日期（列表视图显示，阶段视图可隐藏） */
  showDateRange?: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (task: Task) => void;
}

export function TaskItem({
  task, stageNames, showDateRange = true, onToggle, onEdit, onDelete,
}: TaskItemProps) {
  const done = task.status === 'done';
  const [isRemoving, setIsRemoving] = useState(false);

  /** 触发删除动画（300ms）后再调用 onDelete，避免动画被瞬间中断 */
  const handleDelete = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onDelete(task);
    }, 300);
  };

  return (
    <div
      className={`task-item task-item--${task.category}${done ? ' task-item--done' : ''}`}
      style={{
        animation: isRemoving ? 'taskOut 0.3s ease forwards' : undefined,
      }}
    >
      {/* 复选框 */}
      <button
        type="button"
        className={`task-item__check${done ? ' is-checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label={done ? `标记「${task.title}」为未完成` : `标记「${task.title}」为已完成`}
        aria-pressed={done}
      >
        {done ? '✓' : ''}
      </button>

      {/* 主体 */}
      <div className="task-item__body">
        <div className="task-item__title-row">
          <span className="task-item__title">{task.title || '无标题'}</span>
          <PriorityBadge priority={task.priority} />
          <CategoryBadge category={task.category} />
        </div>

        {task.description && (
          <div className="task-item__desc">{truncate(task.description, 120)}</div>
        )}

        <div className="task-item__meta">
          {showDateRange && <DateRangeBadge start={task.startDate} end={task.endDate} />}
          <DueBadge endDate={task.endDate} done={done} />
          <StageBadge stageName={stageNames[task.stageId]} />
        </div>
      </div>

      {/* 操作 */}
      <div className="task-item__actions">
        <button
          className="icon-btn"
          onClick={() => onEdit(task.id)}
          aria-label={`编辑「${task.title}」`}
          title="编辑"
          type="button"
        >
          ✎
        </button>
        <button
          className="icon-btn icon-btn--danger"
          onClick={handleDelete}
          aria-label={`删除「${task.title}」`}
          title="删除"
          type="button"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
