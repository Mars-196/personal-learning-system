/* ============================================================
   Dexie（IndexedDB）本地数据库
   仅在 services/storage/indexeddb.ts 中被引用。
   接入后端后，把 service 实现换成 api.ts，本文件不再被调用。
   ============================================================ */

import Dexie, { type Table } from 'dexie';
import type { Task, Stage, Reflection, NotificationReminder } from '../types';

class AppDB extends Dexie {
  tasks!: Table<Task, string>;
  stages!: Table<Stage, string>;
  reflections!: Table<Reflection, string>;
  notifications!: Table<NotificationReminder, string>;

  constructor() {
    super('PersonalReflectionDB');

    this.version(1).stores({
      tasks: 'id, category, status, stageId, startDate, endDate, updatedAt',
      stages: 'id, parentId, endDate, updatedAt',
      reflections: 'id, date, updatedAt',
    });

    this.version(2).stores({
      tasks: 'id, category, status, stageId, startDate, endDate, reminderTime, updatedAt',
      stages: 'id, parentId, endDate, updatedAt',
      reflections: 'id, date, updatedAt',
      notifications: 'id, taskId, reminderTime, type, sent, createdAt',
    });
  }
}

export const db = new AppDB();
