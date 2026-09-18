/* ============================================================
   徽标组件：重要程度 / 分类 / 日期状态 / 阶段
   ============================================================ */

import {
  PRIORITY_ROMAN, CATEGORY_LABEL, type Priority, type TaskCategory,
} from '../types';
import { countdown, today } from '../utils';

/** 重要程度徽标（罗马数字 Ⅰ-Ⅳ） */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const cls =
    priority === 1 ? 'badge badge--p1' :
    priority === 2 ? 'badge badge--p2' : 'badge badge--priority';
  return (
    <span className={cls} title={`重要程度 ${PRIORITY_ROMAN[priority]}`}>
      {PRIORITY_ROMAN[priority]}
    </span>
  );
}

/** 分类徽标：工作 / 学习 / 生活 */
export function CategoryBadge({ category }: { category: TaskCategory }) {
  return <span className={`badge badge--${category}`}>{CATEGORY_LABEL[category]}</span>;
}

/** 截止日期徽标：已完成不显示，过期标红，今天截止标橙 */
export function DueBadge({ endDate, done }: { endDate: string; done: boolean }) {
  if (!endDate) return null;
  if (done) return <span className="badge badge--date">{endDate}</span>;

  const days = countdown(endDate);
  if (days < 0) {
    return <span className="badge badge--overdue">逾期 {Math.abs(days)} 天</span>;
  }
  if (days === 0) {
    return <span className="badge badge--due-today">今天截止</span>;
  }
  return <span className="badge badge--date">还剩 {days} 天</span>;
}

/** 起止日期徽标 */
export function DateRangeBadge({ start, end }: { start: string; end: string }) {
  if (!start && !end) return null;
  return (
    <span className="badge badge--date" title="任务起止日期">
      {start || '?'} → {end || '?'}
    </span>
  );
}

/** 所属阶段徽标 */
export function StageBadge({ stageName }: { stageName?: string }) {
  if (!stageName) return null;
  return <span className="badge badge--stage">{stageName}</span>;
}

/** 今天徽标 */
export function TodayBadge({ date }: { date: string }) {
  if (date !== today()) return null;
  return <span className="date-nav__today-badge">今天</span>;
}
