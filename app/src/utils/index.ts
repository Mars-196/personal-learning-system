/* ============================================================
   通用工具函数
   ============================================================ */

import dayjs from 'dayjs';
import type { Task, TaskStats, Stage, StageNode } from '../types';

export {
  startNotificationChecker,
  stopNotificationChecker,
  sendBrowserNotification,
  startDailySummary,
  stopDailySummary,
} from './notificationHelper';

export { validateServiceImplementation, testServiceSwitch, testDataMigration } from './serviceValidator';

/** 今天的日期字符串 YYYY-MM-DD */
export function today(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 相对今天偏移 n 天的日期字符串 */
export function shiftDate(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

/** 格式化日期为「M月D日」 */
export function formatDateCN(date: string): string {
  return dayjs(date).format('M月D日');
}

/** 格式化日期为「YYYY年M月D日」 */
export function formatFullDateCN(date: string): string {
  return dayjs(date).format('YYYY年M月D日');
}

/** 星期几 */
export function weekdayCN(date: string): string {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[dayjs(date).day()];
}

/** 是否今天 */
export function isToday(date: string): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

/**
 * 计算剩余天数（倒计时）
 * 返回负数表示已过期
 */
export function countdown(endDate: string, fromDate?: string): number {
  const start = dayjs(fromDate ?? today()).startOf('day');
  const end = dayjs(endDate).startOf('day');
  return end.diff(start, 'day');
}

/** 倒计时的人类可读文案 */
export function countdownText(endDate: string): string {
  const days = countdown(endDate);
  if (days > 0) return `还剩 ${days} 天`;
  if (days === 0) return '今天截止';
  return `已过期 ${Math.abs(days)} 天`;
}

/** 计算任务统计 */
export function calcStats(tasks: Task[]): TaskStats {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const pending = total - done;
  const rate = total === 0 ? 0 : Math.round((done / total) * 1000) / 10;
  return { total, done, pending, rate };
}

/** 把扁平的阶段列表组装成树 */
export function buildStageTree(stages: Stage[], tasks: Task[]): StageNode[] {
  const byId = new Map<string, StageNode>();

  stages.forEach((s) => {
    byId.set(s.id, {
      ...s,
      children: [],
      countdown: countdown(s.endDate),
      taskTotal: 0,
      taskDone: 0,
    });
  });

  // 统计每个阶段直属的任务数
  tasks.forEach((t) => {
    if (!t.stageId) return;
    const node = byId.get(t.stageId);
    if (!node) return;
    node.taskTotal++;
    if (t.status === 'done') node.taskDone++;
  });

  // 自底向上汇总子阶段的任务数
  const sumUp = (node: StageNode): void => {
    node.children.forEach((child) => {
      sumUp(child);
      node.taskTotal += child.taskTotal;
      node.taskDone += child.taskDone;
    });
  };

  const roots: StageNode[] = [];
  stages.forEach((s) => {
    const node = byId.get(s.id)!;
    if (s.parentId && byId.has(s.parentId)) {
      byId.get(s.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.forEach(sumUp);

  // 同层按重要程度、开始日期排序
  const sortTree = (nodes: StageNode[]) => {
    nodes.sort((a, b) => a.priority - b.priority || a.startDate.localeCompare(b.startDate));
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);

  return roots;
}

/** 校验表单日期：结束不得早于开始 */
export function validateDateRange(start: string, end: string): string | null {
  if (!start) return '请选择起始日期';
  if (!end) return '请选择结束日期';
  if (end < start) return '结束日期不能早于起始日期';
  return null;
}

/** 截断文本用于列表预览 */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
