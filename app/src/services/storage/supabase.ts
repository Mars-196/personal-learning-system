/* ============================================================
   Service 的 Supabase 实现
   直接调用 @supabase/supabase-js，避开 PostgREST REST 模板。
   所有写操作自动注入 user_id；RLS 在数据库层二次确认。

   本地内存缓存层：stale-while-revalidate 策略
   - getAll / getById 先返回缓存，后台静默刷新
   - 写操作后自动 invalidate 对应表缓存
   - 过滤查询（getByDate / getByCategory）从 getAll 缓存前端 filter
   ============================================================ */

import { supabase, currentUserIdSync } from '../../lib/supabaseClient';
import type {
  Task, TaskInput, Stage, StageInput, Reflection, ReflectionInput,
  NoteTemplate, NoteTemplateInput, BackupData,
  NotificationReminder, NotificationReminderInput,
} from '../../types';
import type {
  TaskService, StageService, ReflectionService, TemplateService, BackupService, TaskQuery, NotificationService,
} from '../interfaces';

/** 沿用 IndexedDB 的 id 生成规则，保证备份互导兼容 */
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ============================================================
   本地内存缓存（stale-while-revalidate）
   ============================================================ */

/** TTL：缓存 30 秒内视为新鲜，超过则先返回旧值再后台刷新 */
const CACHE_TTL = 30_000;

interface CacheEntry<T> {
  data: T;
  ts: number;
  fetching?: Promise<T>; // 正在刷新中，后续请求复用同一个 Promise
}

/** 简单内存缓存：按 key 存值 + 过期时间 + invalidate */
class TableCache<T> {
  private map = new Map<string, CacheEntry<T>>();

  /** 先返回缓存（若有），同时后台 fetch 最新数据刷新缓存 */
  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.map.get(key);

    // 缓存新鲜：直接返回
    if (entry && now - entry.ts < CACHE_TTL) {
      // 过期前 5 秒内触发后台刷新（不阻塞当前返回）
      if (now - entry.ts > CACHE_TTL - 5000 && !entry.fetching) {
        entry.fetching = fetcher().then((data) => {
          this.map.set(key, { data, ts: Date.now() });
          return data;
        }).catch(() => null as unknown as T);
      }
      return entry.data;
    }

    // 正在刷新：等待那个 Promise
    if (entry?.fetching) return entry.fetching;

    // 没有缓存或已过期：发起请求
    const fetchPromise = fetcher().then((data) => {
      this.map.set(key, { data, ts: Date.now() });
      return data;
    });
    // 先存一个占位，避免并发请求
    this.map.set(key, { data: entry?.data ?? (null as unknown as T), ts: 0, fetching: fetchPromise });
    try {
      return await fetchPromise;
    } catch (e) {
      // 请求失败：如果有旧缓存则降级返回旧值
      if (entry) {
        this.map.set(key, { data: entry.data, ts: Date.now() });
        return entry.data;
      }
      throw e;
    }
  }

  /** 强制刷新（写操作后调用） */
  invalidate(key?: string) {
    if (key === undefined) {
      this.map.clear();
    } else {
      this.map.delete(key);
    }
  }
}

// 5 张表各一个缓存实例
const cacheTasks = new TableCache<Task[]>();
const cacheStages = new TableCache<Stage[]>();
const cacheReflections = new TableCache<Reflection[]>();
const cacheTemplates = new TableCache<NoteTemplate[]>();
const cacheNotifications = new TableCache<NotificationReminder[]>();

/* ============================================================
   数据转换工具
   ============================================================ */

function rowToReflection(row: Record<string, unknown>): Reflection {
  const raw = row as Partial<Reflection> & { relatedTaskIds: unknown };
  let ids: string[] = [];
  if (Array.isArray(raw.relatedTaskIds)) {
    ids = raw.relatedTaskIds as string[];
  } else if (typeof raw.relatedTaskIds === 'string') {
    try { ids = JSON.parse(raw.relatedTaskIds); } catch { ids = []; }
  }
  return {
    id: raw.id!,
    date: raw.date ?? '',
    title: raw.title ?? '',
    content: raw.content ?? '',
    category: raw.category ?? '',
    relatedTaskIds: ids,
    createdAt: raw.createdAt ?? 0,
    updatedAt: raw.updatedAt ?? 0,
  };
}

function reflectionPayload(r: ReflectionInput) {
  const { relatedTaskIds, ...rest } = r;
  return { ...rest, relatedTaskIds: relatedTaskIds ?? [] };
}

function check<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) {
    const e = result.error as { message?: string; code?: string };
    throw new Error(`Supabase: ${e.message ?? '未知错误'}${e.code ? ` (${e.code})` : ''}`);
  }
  if (result.data === null) throw new Error('Supabase: 数据为空');
  return result.data;
}

/* ============================================================
   Task
   ============================================================ */

function coversDate(task: Task, date: string): boolean {
  return task.startDate <= date && task.endDate >= date;
}

const fetchAllTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('priority', { ascending: true })
    .order('updatedAt', { ascending: false });
  if (error) throw new Error(`Supabase tasks: ${error.message}`);
  return (data ?? []) as Task[];
};

export const supabaseTaskService: TaskService = {
  async getAll(query: TaskQuery = {}) {
    let tasks = await cacheTasks.getOrFetch('all', fetchAllTasks);

    if (query.date)    tasks = tasks.filter((t) => coversDate(t, query.date!));
    if (query.category) tasks = tasks.filter((t) => t.category === query.category);
    if (query.status)   tasks = tasks.filter((t) => t.status === query.status);
    if (query.stageId !== undefined) tasks = tasks.filter((t) => t.stageId === query.stageId);
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw),
      );
    }
    return tasks;
  },

  async getById(id) {
    const all = await cacheTasks.getOrFetch('all', fetchAllTasks);
    return all.find((t) => t.id === id);
  },

  async create(input: TaskInput) {
    const now = Date.now();
    const row = {
      ...input,
      id: uid('task'),
      createdAt: now,
      updatedAt: now,
      completedAt: 0,
      user_id: currentUserIdSync(),
    };
    const data = check<Task[]>(await supabase.from('tasks').insert(row).select());
    cacheTasks.invalidate();
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<Task[]>(
      await supabase.from('tasks').update(payload).eq('id', id).select(),
    );
    cacheTasks.invalidate();
    return data[0];
  },

  async toggleDone(id) {
    const all = await cacheTasks.getOrFetch('all', fetchAllTasks);
    const existing = all.find((t) => t.id === id);
    if (!existing) return undefined;
    const now = Date.now();
    const patch = {
      status: existing.status === 'done' ? 'pending' : 'done',
      completedAt: existing.status === 'done' ? 0 : now,
      updatedAt: now,
    };
    const data = check<Task[]>(
      await supabase.from('tasks').update(patch).eq('id', id).select(),
    );
    cacheTasks.invalidate();
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(`Supabase tasks delete: ${error.message}`);
    cacheTasks.invalidate();
  },

  async clear() {
    const { error } = await supabase.from('tasks').delete().neq('id', '');
    if (error) throw new Error(`Supabase tasks clear: ${error.message}`);
    cacheTasks.invalidate();
  },
};

/* ============================================================
   Stage
   ============================================================ */

const fetchAllStages = async (): Promise<Stage[]> => {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .order('priority', { ascending: true })
    .order('startDate', { ascending: true });
  if (error) throw new Error(`Supabase stages: ${error.message}`);
  return (data ?? []) as Stage[];
};

export const supabaseStageService: StageService = {
  async getAll() {
    return cacheStages.getOrFetch('all', fetchAllStages);
  },

  async getById(id) {
    const all = await cacheStages.getOrFetch('all', fetchAllStages);
    return all.find((s) => s.id === id);
  },

  async create(input: StageInput) {
    const now = Date.now();
    const row = {
      ...input,
      id: uid('stage'),
      createdAt: now,
      updatedAt: now,
      user_id: currentUserIdSync(),
    };
    const data = check<Stage[]>(await supabase.from('stages').insert(row).select());
    cacheStages.invalidate();
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<Stage[]>(
      await supabase.from('stages').update(payload).eq('id', id).select(),
    );
    cacheStages.invalidate();
    return data[0];
  },

  async remove(id) {
    // 级联删除子阶段
    const all = await cacheStages.getOrFetch('all', fetchAllStages);
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
    for (const sid of toDelete) {
      await supabase.from('stages').delete().eq('id', sid);
    }
    // 被删阶段下的任务 → stageId 改为空
    const { data: affected } = await supabase
      .from('tasks')
      .select('id')
      .in('stageId', [...toDelete]);
    if (affected && affected.length > 0) {
      await supabase
        .from('tasks')
        .update({ stageId: '', updatedAt: Date.now() })
        .in('id', affected.map((a: { id: string }) => a.id));
    }
    cacheStages.invalidate();
    cacheTasks.invalidate(); // 任务也被修改了
  },

  async clear() {
    const { error } = await supabase.from('stages').delete().neq('id', '');
    if (error) throw new Error(`Supabase stages clear: ${error.message}`);
    cacheStages.invalidate();
  },
};

/* ============================================================
   Reflection
   ============================================================ */

const fetchAllReflections = async (): Promise<Reflection[]> => {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw new Error(`Supabase reflections: ${error.message}`);
  return (data ?? []).map(rowToReflection);
};

export const supabaseReflectionService: ReflectionService = {
  async getAll() {
    return cacheReflections.getOrFetch('all', fetchAllReflections);
  },

  async getByDate(date) {
    const all = await cacheReflections.getOrFetch('all', fetchAllReflections);
    return all.filter((r) => r.date === date);
  },

  async getByCategory(category) {
    const all = await cacheReflections.getOrFetch('all', fetchAllReflections);
    if (category === '') return all.filter((r) => !r.category);
    return all.filter((r) => r.category === category);
  },

  async create(input: ReflectionInput) {
    const now = Date.now();
    const row = {
      ...reflectionPayload(input),
      id: uid('refl'),
      createdAt: now,
      updatedAt: now,
      user_id: currentUserIdSync(),
    };
    const data = check<Record<string, unknown>[]>(
      await supabase.from('reflections').insert(row).select(),
    );
    cacheReflections.invalidate();
    return rowToReflection(data[0]);
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...reflectionPayload(patch as ReflectionInput), updatedAt: now };
    const { relatedTaskIds, ...rest } = payload;
    const updateObj: Record<string, unknown> = { ...rest };
    if (relatedTaskIds !== undefined) updateObj.relatedTaskIds = relatedTaskIds;
    const data = check<Record<string, unknown>[]>(
      await supabase.from('reflections').update(updateObj).eq('id', id).select(),
    );
    cacheReflections.invalidate();
    return rowToReflection(data[0]);
  },

  async remove(id) {
    const { error } = await supabase.from('reflections').delete().eq('id', id);
    if (error) throw new Error(`Supabase reflections delete: ${error.message}`);
    cacheReflections.invalidate();
  },

  async clear() {
    const { error } = await supabase.from('reflections').delete().neq('id', '');
    if (error) throw new Error(`Supabase reflections clear: ${error.message}`);
    cacheReflections.invalidate();
  },
};

/* ============================================================
   NoteTemplate
   ============================================================ */

const fetchAllTemplates = async (): Promise<NoteTemplate[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('updatedAt', { ascending: false });
  if (error) throw new Error(`Supabase templates: ${error.message}`);
  return (data ?? []) as NoteTemplate[];
};

export const supabaseTemplateService: TemplateService = {
  async getAll() {
    return cacheTemplates.getOrFetch('all', fetchAllTemplates);
  },

  async getByCategory(category) {
    const all = await cacheTemplates.getOrFetch('all', fetchAllTemplates);
    if (category === '') return all.filter((t) => !t.category);
    return all.filter((t) => t.category === category);
  },

  async create(input: NoteTemplateInput) {
    const now = Date.now();
    const row = {
      ...input,
      id: uid('tpl'),
      createdAt: now,
      updatedAt: now,
      user_id: currentUserIdSync(),
    };
    const data = check<NoteTemplate[]>(
      await supabase.from('templates').insert(row).select(),
    );
    cacheTemplates.invalidate();
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<NoteTemplate[]>(
      await supabase.from('templates').update(payload).eq('id', id).select(),
    );
    cacheTemplates.invalidate();
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) throw new Error(`Supabase templates delete: ${error.message}`);
    cacheTemplates.invalidate();
  },

  async clear() {
    const { error } = await supabase.from('templates').delete().neq('id', '');
    if (error) throw new Error(`Supabase templates clear: ${error.message}`);
    cacheTemplates.invalidate();
  },
};

/* ============================================================
   Backup
   ============================================================ */

export const supabaseBackupService: BackupService = {
  async exportAll(): Promise<BackupData> {
    // 导出需要最新数据，跳过缓存直接 fetch
    const [tasks, stages, reflections, templates] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('stages').select('*'),
      supabase.from('reflections').select('*'),
      supabase.from('templates').select('*'),
    ]);
    const stripUser = <T>(rows: Record<string, unknown>[] | null | undefined): T[] =>
      (rows ?? []).map(({ user_id, ...rest }) => rest as unknown as T);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'personal-reflection-system',
      tasks: stripUser<Task>(tasks.data as Record<string, unknown>[] | null),
      stages: stripUser<Stage>(stages.data as Record<string, unknown>[] | null),
      reflections: (reflections.data ?? []).map((r) => rowToReflection(r as Record<string, unknown>)),
      templates: stripUser<NoteTemplate>(templates.data as Record<string, unknown>[] | null),
    };
  },

  async importAll(data, mode) {
    const userId = currentUserIdSync();
    const stamp = Date.now();

    if (mode === 'replace') {
      await Promise.all([
        supabase.from('tasks').delete().neq('id', ''),
        supabase.from('stages').delete().neq('id', ''),
        supabase.from('reflections').delete().neq('id', ''),
        supabase.from('templates').delete().neq('id', ''),
      ]);
      if (data.tasks?.length) {
        await supabase.from('tasks').insert(
          data.tasks.map((t) => ({ ...t, user_id: userId, updatedAt: t.updatedAt ?? stamp })),
        );
      }
      if (data.stages?.length) {
        await supabase.from('stages').insert(
          data.stages.map((s) => ({ ...s, user_id: userId, updatedAt: s.updatedAt ?? stamp })),
        );
      }
      if (data.reflections?.length) {
        await supabase.from('reflections').insert(
          data.reflections.map((r) => ({
            ...reflectionPayload(r),
            user_id: userId,
            updatedAt: r.updatedAt ?? stamp,
          })),
        );
      }
      const tpls = (data as BackupData & { templates?: NoteTemplate[] }).templates ?? [];
      if (tpls.length) {
        await supabase.from('templates').insert(
          tpls.map((t) => ({ ...t, user_id: userId, updatedAt: t.updatedAt ?? stamp })),
        );
      }
    } else {
      let taskCount = 0, stageCount = 0, reflCount = 0;
      for (const t of data.tasks ?? []) {
        const { error } = await supabase
          .from('tasks')
          .upsert({ ...t, user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) taskCount++;
      }
      for (const s of data.stages ?? []) {
        const { error } = await supabase
          .from('stages')
          .upsert({ ...s, user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) stageCount++;
      }
      for (const r of data.reflections ?? []) {
        const { error } = await supabase
          .from('reflections')
          .upsert({ ...reflectionPayload(r), user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) reflCount++;
      }
      const tpls = (data as BackupData & { templates?: NoteTemplate[] }).templates ?? [];
      for (const tpl of tpls) {
        await supabase
          .from('templates')
          .upsert({ ...tpl, user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });
      }
    }

    // 导入后清空所有缓存
    cacheTasks.invalidate();
    cacheStages.invalidate();
    cacheReflections.invalidate();
    cacheTemplates.invalidate();

    return {
      tasks: data.tasks?.length ?? 0,
      stages: data.stages?.length ?? 0,
      reflections: data.reflections?.length ?? 0,
    };
  },
};

/* ============================================================
   Notification
   ============================================================ */

const fetchAllNotifications = async (): Promise<NotificationReminder[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('reminderTime', { ascending: true });
  if (error) throw new Error(`Supabase notifications: ${error.message}`);
  return (data ?? []) as NotificationReminder[];
};

export const supabaseNotificationService: NotificationService = {
  async getAll() {
    return cacheNotifications.getOrFetch('all', fetchAllNotifications);
  },

  async getById(id) {
    const all = await cacheNotifications.getOrFetch('all', fetchAllNotifications);
    return all.find((n) => n.id === id);
  },

  async create(input: NotificationReminderInput) {
    const now = Date.now();
    const row = {
      ...input,
      id: uid('notif'),
      sent: false,
      createdAt: now,
      user_id: currentUserIdSync(),
    };
    const data = check<NotificationReminder[]>(
      await supabase.from('notifications').insert(row).select(),
    );
    cacheNotifications.invalidate();
    return data[0];
  },

  async update(id, patch) {
    const data = check<NotificationReminder[]>(
      await supabase.from('notifications').update(patch).eq('id', id).select(),
    );
    cacheNotifications.invalidate();
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw new Error(`Supabase notifications delete: ${error.message}`);
    cacheNotifications.invalidate();
  },

  async getPending() {
    const all = await cacheNotifications.getOrFetch('all', fetchAllNotifications);
    const now = new Date().toISOString();
    return all.filter((n) => !n.sent && n.reminderTime <= now);
  },

  async markAsSent(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ sent: true })
      .eq('id', id);
    if (error) throw new Error(`Supabase notifications mark-sent: ${error.message}`);
    cacheNotifications.invalidate();
  },

  async clear() {
    const { error } = await supabase.from('notifications').delete().neq('id', '');
    if (error) throw new Error(`Supabase notifications clear: ${error.message}`);
    cacheNotifications.invalidate();
  },
};
