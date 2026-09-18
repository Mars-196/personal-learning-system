/* ============================================================
   Service 接口定义
   上层组件与 store 只依赖这些接口，不关心底层是 IndexedDB 还是 HTTP。
   接入后端时：实现 api.ts 版本 → 在 services/index.ts 切换一行导出。
   ============================================================ */

import type {
  Task,
  TaskInput,
  Stage,
  StageInput,
  Reflection,
  ReflectionInput,
  BackupData,
  NotificationReminder,
  NotificationReminderInput,
} from '../types';

/** 任务查询过滤条件 */
export interface TaskQuery {
  /** 按日期过滤（任务起止区间覆盖该日期） */
  date?: string;
  /** 按分类过滤 */
  category?: Task['category'];
  /** 按状态过滤 */
  status?: Task['status'];
  /** 按所属阶段过滤 */
  stageId?: string;
  /** 关键词搜索（标题 + 描述） */
  keyword?: string;
}

/** 任务服务 */
export interface TaskService {
  getAll(query?: TaskQuery): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, patch: Partial<TaskInput>): Promise<Task | undefined>;
  toggleDone(id: string): Promise<Task | undefined>;
  remove(id: string): Promise<void>;
  /** 批量清除所有任务 */
  clear(): Promise<void>;
}

/** 阶段服务 */
export interface StageService {
  getAll(): Promise<Stage[]>;
  getById(id: string): Promise<Stage | undefined>;
  create(input: StageInput): Promise<Stage>;
  update(id: string, patch: Partial<StageInput>): Promise<Stage | undefined>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** 笔记服务（后续功能预留） */
export interface ReflectionService {
  getAll(): Promise<Reflection[]>;
  getByDate(date: string): Promise<Reflection[]>;
  create(input: ReflectionInput): Promise<Reflection>;
  update(id: string, patch: Partial<ReflectionInput>): Promise<Reflection | undefined>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** 备份服务 */
export interface BackupService {
  exportAll(): Promise<BackupData>;
  /**
   * 导入备份数据
   * @param mode 'merge' 追加合并（跳过重复 id） | 'replace' 清空后整体导入
   */
  importAll(data: BackupData, mode: 'merge' | 'replace'): Promise<{ tasks: number; stages: number; reflections: number }>;
}

/** 通知提醒服务 */
export interface NotificationService {
  getAll(): Promise<NotificationReminder[]>;
  getById(id: string): Promise<NotificationReminder | undefined>;
  create(input: NotificationReminderInput): Promise<NotificationReminder>;
  update(id: string, patch: Partial<NotificationReminderInput>): Promise<NotificationReminder | undefined>;
  remove(id: string): Promise<void>;
  /** 获取待发送的提醒 */
  getPending(): Promise<NotificationReminder[]>;
  /** 标记为已发送 */
  markAsSent(id: string): Promise<void>;
  clear(): Promise<void>;
}
