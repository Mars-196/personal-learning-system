/* ============================================================
   Service 的 HTTP API 实现模板（后期接入后端时启用）
   ============================================================
   使用步骤：
   1. 在 .env 中配置 VITE_API_BASE_URL=https://your-api.com
   2. 补全下面各方法的请求路径与参数
   3. 到 services/index.ts 把导出的实现从 indexeddb 换成 api
   4. 如需登录态，在 fetchWithAuth 中处理 token 注入与 401 跳转

   API 端点规范：
   - GET /api/tasks - 获取任务列表（支持查询参数）
   - GET /api/tasks/:id - 获取单个任务
   - POST /api/tasks - 创建任务
   - PATCH /api/tasks/:id - 更新任务
   - POST /api/tasks/:id/toggle - 切换任务完成状态
   - DELETE /api/tasks/:id - 删除任务
   - DELETE /api/tasks - 清空所有任务

   - GET /api/stages - 获取阶段列表
   - GET /api/stages/:id - 获取单个阶段
   - POST /api/stages - 创建阶段
   - PATCH /api/stages/:id - 更新阶段
   - DELETE /api/stages/:id - 删除阶段
   - DELETE /api/stages - 清空所有阶段

   - GET /api/reflections - 获取笔记列表
   - GET /api/reflections?date=YYYY-MM-DD - 按日期获取笔记
   - POST /api/reflections - 创建笔记
   - PATCH /api/reflections/:id - 更新笔记
   - DELETE /api/reflections/:id - 删除笔记
   - DELETE /api/reflections - 清空所有笔记

   - GET /api/backup/export - 导出备份数据
   - POST /api/backup/import - 导入备份数据

   - GET /api/notifications - 获取通知列表
   - GET /api/notifications/pending - 获取待发送通知
   - POST /api/notifications - 创建通知
   - PATCH /api/notifications/:id - 更新通知
   - POST /api/notifications/:id/mark-sent - 标记为已发送
   - DELETE /api/notifications/:id - 删除通知
   - DELETE /api/notifications - 清空所有通知
   ============================================================ */

import type {
  Task, TaskInput, Stage, StageInput, Reflection, ReflectionInput, BackupData,
  NotificationReminder, NotificationReminderInput,
} from '../../types';
import type {
  TaskService, StageService, ReflectionService, BackupService, TaskQuery, NotificationService,
} from '../interfaces';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

/** 统一请求封装：注入 token、处理错误 */
async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // token 失效：清除本地登录态并跳转登录页
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('未登录或登录已过期');
  }
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`请求失败：${res.status} ${res.statusText} - ${errorText}`);
  }
  return res.json() as Promise<T>;
}

/** 把 TaskQuery 拼成 URL 查询串 */
function toQueryString(query: TaskQuery = {}): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------------------------------------ */
/* Task                                                          */
/* ------------------------------------------------------------ */

export const apiTaskService: TaskService = {
  async getAll(query = {}): Promise<Task[]> {
    return fetchWithAuth<Task[]>(`/tasks${toQueryString(query)}`);
  },

  async getById(id): Promise<Task | undefined> {
    return fetchWithAuth<Task>(`/tasks/${id}`);
  },

  async create(input: TaskInput): Promise<Task> {
    return fetchWithAuth<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id, patch: Partial<TaskInput>): Promise<Task | undefined> {
    return fetchWithAuth<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async toggleDone(id): Promise<Task | undefined> {
    return fetchWithAuth<Task>(`/tasks/${id}/toggle`, { method: 'POST' });
  },

  async remove(id): Promise<void> {
    await fetchWithAuth<void>(`/tasks/${id}`, { method: 'DELETE' });
  },

  async clear(): Promise<void> {
    await fetchWithAuth<void>('/tasks', { method: 'DELETE' });
  },
};

/* ------------------------------------------------------------ */
/* Stage                                                         */
/* ------------------------------------------------------------ */

export const apiStageService: StageService = {
  async getAll(): Promise<Stage[]> {
    return fetchWithAuth<Stage[]>('/stages');
  },

  async getById(id): Promise<Stage | undefined> {
    return fetchWithAuth<Stage>(`/stages/${id}`);
  },

  async create(input: StageInput): Promise<Stage> {
    return fetchWithAuth<Stage>('/stages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id, patch: Partial<StageInput>): Promise<Stage | undefined> {
    return fetchWithAuth<Stage>(`/stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async remove(id): Promise<void> {
    await fetchWithAuth<void>(`/stages/${id}`, { method: 'DELETE' });
  },

  async clear(): Promise<void> {
    await fetchWithAuth<void>('/stages', { method: 'DELETE' });
  },
};

/* ------------------------------------------------------------ */
/* Reflection                                                    */
/* ------------------------------------------------------------ */

export const apiReflectionService: ReflectionService = {
  async getAll(): Promise<Reflection[]> {
    return fetchWithAuth<Reflection[]>('/reflections');
  },

  async getByDate(date): Promise<Reflection[]> {
    return fetchWithAuth<Reflection[]>(`/reflections?date=${date}`);
  },

  async create(input: ReflectionInput): Promise<Reflection> {
    return fetchWithAuth<Reflection>('/reflections', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id, patch: Partial<ReflectionInput>): Promise<Reflection | undefined> {
    return fetchWithAuth<Reflection>(`/reflections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async remove(id): Promise<void> {
    await fetchWithAuth<void>(`/reflections/${id}`, { method: 'DELETE' });
  },

  async clear(): Promise<void> {
    await fetchWithAuth<void>('/reflections', { method: 'DELETE' });
  },
};

/* ------------------------------------------------------------ */
/* Backup                                                        */
/* ------------------------------------------------------------ */

export const apiBackupService: BackupService = {
  async exportAll(): Promise<BackupData> {
    return fetchWithAuth<BackupData>('/backup/export');
  },

  async importAll(data, mode) {
    return fetchWithAuth<{ tasks: number; stages: number; reflections: number }>(
      '/backup/import',
      {
        method: 'POST',
        body: JSON.stringify({ mode, data }),
      },
    );
  },
};

/* ------------------------------------------------------------ */
/* Notification                                                 */
/* ------------------------------------------------------------ */

export const apiNotificationService: NotificationService = {
  async getAll(): Promise<NotificationReminder[]> {
    return fetchWithAuth<NotificationReminder[]>('/notifications');
  },

  async getById(id): Promise<NotificationReminder | undefined> {
    return fetchWithAuth<NotificationReminder>(`/notifications/${id}`);
  },

  async create(input: NotificationReminderInput): Promise<NotificationReminder> {
    return fetchWithAuth<NotificationReminder>('/notifications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id, patch: Partial<NotificationReminderInput>): Promise<NotificationReminder | undefined> {
    return fetchWithAuth<NotificationReminder>(`/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async remove(id): Promise<void> {
    await fetchWithAuth<void>(`/notifications/${id}`, { method: 'DELETE' });
  },

  async getPending(): Promise<NotificationReminder[]> {
    return fetchWithAuth<NotificationReminder[]>('/notifications/pending');
  },

  async markAsSent(id): Promise<void> {
    await fetchWithAuth<void>(`/notifications/${id}/mark-sent`, { method: 'POST' });
  },

  async clear(): Promise<void> {
    await fetchWithAuth<void>('/notifications', { method: 'DELETE' });
  },
};
