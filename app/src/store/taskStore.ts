/* ============================================================
   任务 Store（Zustand）
   组件通过本 store 读写任务，store 内部只调用 service 接口，
   不直接依赖 IndexedDB —— 后期换后端无需改动本文件。
   ============================================================ */

import { create } from 'zustand';
import { taskService } from '../services';
import { useNotificationStore } from './notificationStore';
import { sendBrowserNotification } from '../utils';
import type { Task, TaskInput, TaskCategory, TaskStatus } from '../types';
import type { TaskQuery } from '../services/interfaces';
/**
 * 測試git2.0
 */
/**
 * test1.0
 */
interface TaskState {
  /** 当前筛选条件下的任务（任务栏列表用） */
  tasks: Task[];
  /** 全量任务（关联选择、统计用，不受筛选影响） */
  allTasks: Task[];
  loading: boolean;
  /** 当前筛选条件 */
  filter: TaskQuery;
  /** 加载任务列表 */
  load: () => Promise<void>;
  /** 加载全量任务 */
  loadAllTasks: () => Promise<void>;
  /** 更新筛选条件并重新加载 */
  setFilter: (patch: Partial<TaskQuery>) => Promise<void>;
  /** 新建任务 */
  createTask: (input: TaskInput) => Promise<Task>;
  /** 更新任务 */
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>;
  /** 切换完成状态 */
  toggleTask: (id: string) => Promise<void>;
  /** 删除任务 */
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  allTasks: [],
  loading: false,
  filter: {},

  async load() {
    set({ loading: true });
    try {
      const tasks = await taskService.getAll(get().filter);
      set({ tasks });
    } finally {
      set({ loading: false });
    }
  },

  async loadAllTasks() {
    const allTasks = await taskService.getAll();
    set({ allTasks });
  },

  async setFilter(patch) {
    set({ filter: { ...get().filter, ...patch } });
    await get().load();
  },

  async createTask(input) {
    const task = await taskService.create(input);

    // 如果设置了提醒时间，创建通知提醒
    if (input.reminderTime) {
      const createReminder = useNotificationStore.getState().createReminder;
      try {
        await createReminder({
          taskId: task.id,
          reminderTime: input.reminderTime,
          type: 'task_reminder',
        });
      } catch (error) {
        console.error('创建提醒失败:', error);
      }
    }

    // 变更后同时刷新「筛选列表」与「全量列表」，
    // 避免 TasksPage（依赖 allTasks）出现状态滞后。
    await Promise.all([get().load(), get().loadAllTasks()]);
    return task;
  },

  async updateTask(id, patch) {
    await taskService.update(id, patch);
    await Promise.all([get().load(), get().loadAllTasks()]);
  },

  async toggleTask(id) {
    const task = await taskService.toggleDone(id);

    // 如果任务被标记为完成，发送完成通知
    if (task && task.status === 'done') {
      sendBrowserNotification('任务完成', {
        body: `🎉 恭喜！任务「${task.title}」已完成`,
        icon: '/icon-192.png',
      });
    }

    await Promise.all([get().load(), get().loadAllTasks()]);
  },

  async deleteTask(id) {
    await taskService.remove(id);
    await Promise.all([get().load(), get().loadAllTasks()]);
  },
}));

/** 供表单使用的初始筛选快捷类型导出 */
export type { TaskCategory, TaskStatus, TaskQuery };