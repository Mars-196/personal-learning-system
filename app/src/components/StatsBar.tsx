/* ============================================================
   统计栏：已完成 / 未完成 / 总数 / 完成率
   ============================================================ */

import { useMemo } from 'react';
import type { Task, TaskStats } from '../types';
import { calcStats } from '../utils';

export function StatsBar({ tasks }: { tasks: Task[] }) {
  const stats: TaskStats = useMemo(() => calcStats(tasks), [tasks]);

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-card__label">任务总数</div>
        <div className="stat-card__value stat-card__value--primary">{stats.total}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">已完成</div>
        <div className="stat-card__value stat-card__value--success">{stats.done}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">未完成</div>
        <div className="stat-card__value stat-card__value--warning">{stats.pending}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">完成率</div>
        <div className="stat-card__value stat-card__value--primary">{stats.rate}%</div>
        <div className="rate-bar" role="presentation">
          <div
            className="rate-bar__fill"
            style={{ width: `${Math.min(stats.rate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
