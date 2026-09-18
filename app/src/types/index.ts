/* ============================================================
   个人成长系统 —— 全局数据模型
   前后端共用类型定义，接入 API 后可直接作为请求/响应类型
   ============================================================ */

/** 任务分类 */
export type TaskCategory = 'work' | 'study' | 'life';

/** 任务状态 */
export type TaskStatus = 'pending' | 'done';

/** 重要程度：1 = Ⅰ（最重要），4 = Ⅳ（最不重要） */
export type Priority = 1 | 2 | 3 | 4;

/** 罗马数字显示映射 */
export const PRIORITY_ROMAN: Record<Priority, string> = {
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
  4: 'Ⅳ',
};

/** 优先级中文标签（贴近设计图：高/中/低） */
export const PRIORITY_LABEL: Record<Priority, string> = {
  1: '高',
  2: '中',
  3: '低',
  4: '低',
};

/** 分类中文名映射 */
export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: '工作',
  study: '学习',
  life: '生活',
};

/** 分类颜色映射（CSS 变量名） */
export const CATEGORY_COLOR: Record<TaskCategory, string> = {
  work: 'var(--c-work)',
  study: 'var(--c-study)',
  life: 'var(--c-life)',
};

/** ---------- 待办任务 ---------- */
export interface Task {
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 任务分类：工作 / 学习 / 生活 */
  category: TaskCategory;
  /** 重要程度 Ⅰ-Ⅳ */
  priority: Priority;
  /** 完成状态 */
  status: TaskStatus;
  /** 起始日期 YYYY-MM-DD */
  startDate: string;
  /** 结束日期 YYYY-MM-DD */
  endDate: string;
  /** 所属任务阶段 id，空字符串表示未分配 */
  stageId: string;
  /** 提醒时间 ISO 字符串，空字符串表示无提醒 */
  reminderTime: string;
  createdAt: number;
  updatedAt: number;
  /** 完成时间戳，未完成为 0 */
  completedAt: number;
}

/** 新建/编辑任务时的输入结构 */
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

/** ---------- 任务阶段 ---------- */
export interface Stage {
  id: string;
  /** 阶段名称 */
  name: string;
  /** 阶段描述 */
  description: string;
  /** 重要程度 Ⅰ-Ⅳ */
  priority: Priority;
  /** 起始日期 YYYY-MM-DD */
  startDate: string;
  /** 结束日期 YYYY-MM-DD */
  endDate: string;
  /** 父阶段 id，null 表示顶级阶段 */
  parentId: string | null;
  /** 阶段笔记（可选，阶段性复盘/总结） */
  reflection?: string;
  createdAt: number;
  updatedAt: number;
}

export type StageInput = Omit<Stage, 'id' | 'createdAt' | 'updatedAt'>;

/** 阶段树节点（含子阶段与统计信息） */
export interface StageNode extends Stage {
  children: StageNode[];
  /** 剩余天数，已过期为负数 */
  countdown: number;
  /** 阶段内任务总数 */
  taskTotal: number;
  /** 阶段内已完成任务数 */
  taskDone: number;
}

/** ---------- 笔记（后续功能预留） ---------- */
export interface Reflection {
  id: string;
  /** 关联日期 YYYY-MM-DD */
  date: string;
  /** 笔记标题 */
  title: string;
  /** 笔记正文 */
  content: string;
  /** 关联的任务 id 列表 */
  relatedTaskIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type ReflectionInput = Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>;

/** ---------- 统计信息 ---------- */
export interface TaskStats {
  total: number;
  done: number;
  pending: number;
  /** 完成率 0-100，保留一位小数 */
  rate: number;
}

/** ---------- 数据备份（导入/导出） ---------- */
export interface BackupData {
  version: number;
  exportedAt: string;
  app: 'personal-reflection-system';
  tasks: Task[];
  stages: Stage[];
  reflections: Reflection[];
}

/** ---------- 通知提醒 ---------- */
export interface NotificationReminder {
  id: string;
  /** 关联任务 id */
  taskId: string;
  /** 提醒时间 ISO 字符串 */
  reminderTime: string;
  /** 提醒类型 */
  type: 'task_due' | 'task_reminder' | 'stage_due' | 'daily_summary';
  /** 是否已发送 */
  sent: boolean;
  /** 创建时间 */
  createdAt: number;
}

export type NotificationReminderInput = Omit<NotificationReminder, 'id' | 'sent' | 'createdAt'>;
