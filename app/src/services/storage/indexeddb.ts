/* ============================================================
   Service 的 IndexedDB 实现
   当前阶段使用；接入后端后由 api.ts 替换，本文件保留即可。
   ============================================================ */

import { db } from '../../db/database';
import type {
  Task, TaskInput, Stage, StageInput, Reflection, ReflectionInput, BackupData,
  NotificationReminder, NotificationReminderInput,
} from '../../types';
import type {
  TaskService, StageService, ReflectionService, BackupService, TaskQuery, NotificationService,
} from '../interfaces';

/** 生成唯一 id */
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------ */
/* Task                                                          */
/* ------------------------------------------------------------ */

/** 判断任务是否覆盖指定日期 */
function coversDate(task: Task, date: string): boolean {
  return task.startDate <= date && task.endDate >= date;
}

export const indexedDBTaskService: TaskService = {
  async getAll(query: TaskQuery = {}) {
    let tasks = await db.tasks.toArray();

    if (query.date) tasks = tasks.filter((t) => coversDate(t, query.date!));
    if (query.category) tasks = tasks.filter((t) => t.category === query.category);
    if (query.status) tasks = tasks.filter((t) => t.status === query.status);
    if (query.stageId !== undefined) tasks = tasks.filter((t) => t.stageId === query.stageId);
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw),
      );
    }

    // 重要程度升序（Ⅰ 最前），再按更新时间降序
    return tasks.sort((a, b) => a.priority - b.priority || b.updatedAt - a.updatedAt);
  },

  async getById(id) {
    return db.tasks.get(id);
  },

  async create(input: TaskInput) {
    const now = Date.now();
    const task: Task = { ...input, id: uid('task'), createdAt: now, updatedAt: now, completedAt: 0 };
    await db.tasks.add(task);
    return task;
  },

  async update(id, patch: Partial<TaskInput>) {
    const existing = await db.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...patch, id, updatedAt: Date.now() };
    await db.tasks.put(updated);
    return updated;
  },

  async toggleDone(id) {
    const existing = await db.tasks.get(id);
    if (!existing) return undefined;
    const now = Date.now();
    const updated: Task = {
      ...existing,
      status: existing.status === 'done' ? 'pending' : 'done',
      completedAt: existing.status === 'done' ? 0 : now,
      updatedAt: now,
    };
    await db.tasks.put(updated);
    return updated;
  },

  async remove(id) {
    await db.tasks.delete(id);
  },

  async clear() {
    await db.tasks.clear();
  },
};

/* ------------------------------------------------------------ */
/* Stage                                                         */
/* ------------------------------------------------------------ */

export const indexedDBStageService: StageService = {
  async getAll() {
    const stages = await db.stages.toArray();
    return stages.sort((a, b) => a.priority - b.priority || a.startDate.localeCompare(b.startDate));
  },

  async getById(id) {
    return db.stages.get(id);
  },

  async create(input: StageInput) {
    const now = Date.now();
    const stage: Stage = { ...input, id: uid('stage'), createdAt: now, updatedAt: now };
    await db.stages.add(stage);
    return stage;
  },

  async update(id, patch: Partial<StageInput>) {
    const existing = await db.stages.get(id);
    if (!existing) return undefined;
    const updated: Stage = { ...existing, ...patch, id, updatedAt: Date.now() };
    await db.stages.put(updated);
    return updated;
  },

  async remove(id) {
    // 级联删除子阶段
    const all = await db.stages.toArray();
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const s of all) {
        if (s.parentId && toDelete.has(s.parentId) && !toDelete.has(s.id)) {
          toDelete.add(s.id);
          changed = true;
        }
      }
    }
    await db.stages.bulkDelete([...toDelete]);
    // 该阶段下的任务改为未分配
    const affected = await db.tasks.where('stageId').anyOf([...toDelete]).toArray();
    if (affected.length) {
      await db.tasks.bulkPut(
        affected.map((t) => ({ ...t, stageId: '', updatedAt: Date.now() })),
      );
    }
  },

  async clear() {
    await db.stages.clear();
  },
};

/* ------------------------------------------------------------ */
/* Reflection（后续功能预留，接口已就绪）                          */
/* ------------------------------------------------------------ */

export const indexedDBReflectionService: ReflectionService = {
  async getAll() {
    const list = await db.reflections.toArray();
    return list.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getByDate(date) {
    return db.reflections.where('date').equals(date).toArray();
  },

  async create(input: ReflectionInput) {
    const now = Date.now();
    const item: Reflection = { ...input, id: uid('refl'), createdAt: now, updatedAt: now };
    await db.reflections.add(item);
    return item;
  },

  async update(id, patch: Partial<ReflectionInput>) {
    const existing = await db.reflections.get(id);
    if (!existing) return undefined;
    const updated: Reflection = { ...existing, ...patch, id, updatedAt: Date.now() };
    await db.reflections.put(updated);
    return updated;
  },

  async remove(id) {
    await db.reflections.delete(id);
  },

  async clear() {
    await db.reflections.clear();
  },
};

/* ------------------------------------------------------------ */
/* Backup                                                        */
/* ------------------------------------------------------------ */

export const indexedDBBackupService: BackupService = {
  async exportAll(): Promise<BackupData> {
    const [tasks, stages, reflections] = await Promise.all([
      db.tasks.toArray(),
      db.stages.toArray(),
      db.reflections.toArray(),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'personal-reflection-system',
      tasks, stages, reflections,
    };
  },

  async importAll(data, mode) {
    if (mode === 'replace') {
      await Promise.all([db.tasks.clear(), db.stages.clear(), db.reflections.clear()]);
      await Promise.all([
        db.tasks.bulkAdd(data.tasks ?? []),
        db.stages.bulkAdd(data.stages ?? []),
        db.reflections.bulkAdd(data.reflections ?? []),
      ]);
      return {
        tasks: data.tasks?.length ?? 0,
        stages: data.stages?.length ?? 0,
        reflections: data.reflections?.length ?? 0,
      };
    }

    // merge：跳过已存在的 id
    const result = { tasks: 0, stages: 0, reflections: 0 };

    for (const t of data.tasks ?? []) {
      if (!(await db.tasks.get(t.id))) { await db.tasks.add(t); result.tasks++; }
    }
    for (const s of data.stages ?? []) {
      if (!(await db.stages.get(s.id))) { await db.stages.add(s); result.stages++; }
    }
    for (const r of data.reflections ?? []) {
      if (!(await db.reflections.get(r.id))) { await db.reflections.add(r); result.reflections++; }
    }

    return result;
  },
};

/* ------------------------------------------------------------ */
/* Notification（通知提醒）                                      */
/* ------------------------------------------------------------ */

export const indexedDBNotificationService: NotificationService = {
  async getAll() {
    const list = await db.notifications.toArray();
    return list.sort((a, b) => a.reminderTime.localeCompare(b.reminderTime));
  },

  async getById(id) {
    return db.notifications.get(id);
  },

  async create(input: NotificationReminderInput) {
    const now = Date.now();
    const item: NotificationReminder = { ...input, id: uid('notif'), sent: false, createdAt: now };
    await db.notifications.add(item);
    return item;
  },

  async update(id, patch: Partial<NotificationReminderInput>) {
    const existing = await db.notifications.get(id);
    if (!existing) return undefined;
    const updated: NotificationReminder = { ...existing, ...patch, id };
    await db.notifications.put(updated);
    return updated;
  },

  async remove(id) {
    await db.notifications.delete(id);
  },

  async getPending() {
    const now = new Date().toISOString();
    return db.notifications
      .filter((item) => !item.sent && item.reminderTime <= now)
      .toArray();
  },

  async markAsSent(id) {
    const existing = await db.notifications.get(id);
    if (!existing) return;
    await db.notifications.put({ ...existing, sent: true });
  },

  async clear() {
    await db.notifications.clear();
  },
};
