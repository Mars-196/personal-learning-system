/* ============================================================
   通知提醒 Store（Zustand）
   ============================================================ */

import { create } from 'zustand';
import { notificationService } from '../services';
import type { NotificationReminder, NotificationReminderInput } from '../types';

interface NotificationState {
  notifications: NotificationReminder[];
  loading: boolean;
  permission: NotificationPermission;
  load: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
  createReminder: (input: NotificationReminderInput) => Promise<NotificationReminder>;
  updateReminder: (id: string, patch: Partial<NotificationReminderInput>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  checkPendingNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  permission: 'default',

  async load() {
    set({ loading: true });
    try {
      const notifications = await notificationService.getAll();
      const permission = Notification.permission;
      set({ notifications, permission });
    } finally {
      set({ loading: false });
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('浏览器不支持通知功能');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    set({ permission });
    return permission;
  },

  async createReminder(input) {
    const reminder = await notificationService.create(input);
    await get().load();
    return reminder;
  },

  async updateReminder(id, patch) {
    await notificationService.update(id, patch);
    await get().load();
  },

  async deleteReminder(id) {
    await notificationService.remove(id);
    await get().load();
  },

  async checkPendingNotifications() {
    const pending = await notificationService.getPending();
    const { permission } = get();

    if (permission !== 'granted') {
      console.log('通知权限未授予，跳过发送通知');
      return;
    }

    for (const reminder of pending) {
      try {
        let title = '任务提醒';
        let body = '您有一个任务需要处理';

        // 根据通知类型定制内容
        if (reminder.type === 'task_reminder') {
          title = '任务提醒';
          body = '您设置的任务提醒时间到了';
        } else if (reminder.type === 'stage_due') {
          title = '阶段到期提醒';
          body = '您的任务阶段即将到期';
        } else if (reminder.type === 'daily_summary') {
          title = '每日总结';
          body = '查看今日任务完成情况';
        }

        new Notification(title, {
          body,
          icon: '/icon-192.png',
          tag: reminder.id,
        });

        await notificationService.markAsSent(reminder.id);
      } catch (error) {
        console.error('发送通知失败:', error);
      }
    }

    // 重新加载列表以更新状态
    await get().load();
  },
}));