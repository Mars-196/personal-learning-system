/* ============================================================
   通知助手工具
   ============================================================ */

import { useNotificationStore } from '../store/notificationStore';
import { useTaskStore } from '../store/taskStore';
import { calcStats } from './index';

let checkInterval: number | null = null;
let dailySummaryInterval: number | null = null;

/**
 * 启动通知检查定时器
 * @param intervalMinutes 检查间隔（分钟），默认每分钟检查一次
 */
export function startNotificationChecker(intervalMinutes: number = 1) {
  if (checkInterval) {
    console.log('通知检查器已在运行');
    return;
  }

  console.log('启动通知检查器，检查间隔:', intervalMinutes, '分钟');

  const intervalMs = intervalMinutes * 60 * 1000;
  checkInterval = window.setInterval(async () => {
    try {
      await useNotificationStore.getState().checkPendingNotifications();
    } catch (error) {
      console.error('通知检查失败:', error);
    }
  }, intervalMs);

  // 立即执行一次检查
  useNotificationStore.getState().checkPendingNotifications();
}

/**
 * 启动每日总结通知
 * @param hour 发送时间（小时），默认20:00
 */
export function startDailySummary(hour: number = 20) {
  if (dailySummaryInterval) {
    console.log('每日总结通知已在运行');
    return;
  }

  console.log('启动每日总结通知，发送时间:', hour, ':00');

  const checkAndSend = async () => {
    const now = new Date();
    const targetHour = hour;

    // 检查是否到了发送时间
    if (now.getHours() === targetHour && now.getMinutes() === 0) {
      try {
        const allTasks = useTaskStore.getState().allTasks;
        const stats = calcStats(allTasks);

        const createReminder = useNotificationStore.getState().createReminder;
        await createReminder({
          taskId: 'daily-summary',
          reminderTime: now.toISOString(),
          type: 'daily_summary',
        });

        sendBrowserNotification('每日总结', {
          body: `今日任务完成情况：完成 ${stats.done}/${stats.total}，完成率 ${stats.rate}%`,
          icon: '/icon-192.png',
        });
      } catch (error) {
        console.error('发送每日总结失败:', error);
      }
    }
  };

  // 每分钟检查一次
  dailySummaryInterval = window.setInterval(checkAndSend, 60 * 1000);
}

/**
 * 停止通知检查定时器
 */
export function stopNotificationChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('通知检查器已停止');
  }
}

/**
 * 停止每日总结通知
 */
export function stopDailySummary() {
  if (dailySummaryInterval) {
    clearInterval(dailySummaryInterval);
    dailySummaryInterval = null;
    console.log('每日总结通知已停止');
  }
}

/**
 * 发送浏览器通知
 * 兼容 PWA 环境：移动端禁用 new Notification()，需用 ServiceWorkerRegistration.showNotification()
 */
export async function sendBrowserNotification(title: string, options: NotificationOptions = {}) {
  try {
    // PWA / 移动端：优先用 Service Worker 显示通知
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options,
        });
        return;
      }
    }

    // 桌面端回退：用 Notification 构造函数
    if (!('Notification' in window)) {
      console.warn('浏览器不支持通知功能');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            ...options,
          });
        }
      });
    }
  } catch (e) {
    // 通知失败不影响主流程
    console.warn('发送通知失败:', e);
  }
}