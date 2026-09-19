/* ============================================================
   Service 的 Supabase 实现
   直接调用 @supabase/supabase-js，避开 PostgREST REST 模板。
   所有写操作自动注入 user_id；RLS 在数据库层二次确认。
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

/** 统一把 Supabase 返回的行转成 TS 类型，并处理 relatedTaskIds jsonb ↔ array */
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

/** Reflection → 插入 payload（relatedTaskIds 转成数组让 PostgREST 正确处理 jsonb） */
function reflectionPayload(r: ReflectionInput) {
  const { relatedTaskIds, ...rest } = r;
  return { ...rest, relatedTaskIds: relatedTaskIds ?? [] };
}

/** PostgREST 通用错误提取 */
function check<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) {
    const e = result.error as { message?: string; code?: string };
    throw new Error(`Supabase: ${e.message ?? '未知错误'}${e.code ? ` (${e.code})` : ''}`);
  }
  if (result.data === null) throw new Error('Supabase: 数据为空');
  return result.data;
}

/* ------------------------------------------------------------ */
/* Task                                                          */
/* ------------------------------------------------------------ */

function coversDate(task: Task, date: string): boolean {
  return task.startDate <= date && task.endDate >= date;
}

export const supabaseTaskService: TaskService = {
  async getAll(query: TaskQuery = {}) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('priority', { ascending: true })
      .order('updatedAt', { ascending: false });
    if (error) throw new Error(`Supabase tasks: ${error.message}`);
    let tasks = (data ?? []) as Task[];

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
    const { data } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
    return data as Task | null ?? undefined;
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
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<Task[]>(
      await supabase.from('tasks').update(payload).eq('id', id).select(),
    );
    return data[0];
  },

  async toggleDone(id) {
    const existing = await this.getById(id);
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
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(`Supabase tasks delete: ${error.message}`);
  },

  async clear() {
    const { error } = await supabase.from('tasks').delete().neq('id', '');
    if (error) throw new Error(`Supabase tasks clear: ${error.message}`);
  },
};

/* ------------------------------------------------------------ */
/* Stage                                                         */
/* ------------------------------------------------------------ */

export const supabaseStageService: StageService = {
  async getAll() {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .order('priority', { ascending: true })
      .order('startDate', { ascending: true });
    if (error) throw new Error(`Supabase stages: ${error.message}`);
    return (data ?? []) as Stage[];
  },

  async getById(id) {
    const { data } = await supabase.from('stages').select('*').eq('id', id).maybeSingle();
    return data as Stage | null ?? undefined;
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
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<Stage[]>(
      await supabase.from('stages').update(payload).eq('id', id).select(),
    );
    return data[0];
  },

  async remove(id) {
    // 级联删除子阶段（递归查找）
    const all = await this.getAll();
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
    // 逐个删除（避免 RLS 批量条件下误匹配）
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
  },

  async clear() {
    const { error } = await supabase.from('stages').delete().neq('id', '');
    if (error) throw new Error(`Supabase stages clear: ${error.message}`);
  },
};

/* ------------------------------------------------------------ */
/* Reflection                                                    */
/* ------------------------------------------------------------ */

export const supabaseReflectionService: ReflectionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw new Error(`Supabase reflections: ${error.message}`);
    return (data ?? []).map(rowToReflection);
  },

  async getByDate(date) {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('date', date)
      .order('updatedAt', { ascending: false });
    if (error) throw new Error(`Supabase reflections by date: ${error.message}`);
    return (data ?? []).map(rowToReflection);
  },

  async getByCategory(category) {
    // category === '' 代表未分类
    if (category === '') {
      const { data, error } = await supabase
        .from('reflections')
        .select('*');
      if (error) throw new Error(`Supabase reflections by category: ${error.message}`);
      return (data ?? [])
        .map(rowToReflection)
        .filter((r) => !r.category);
    }
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('category', category);
    if (error) throw new Error(`Supabase reflections by category: ${error.message}`);
    return (data ?? []).map(rowToReflection);
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
    return rowToReflection(data[0]);
  },

  async remove(id) {
    const { error } = await supabase.from('reflections').delete().eq('id', id);
    if (error) throw new Error(`Supabase reflections delete: ${error.message}`);
  },

  async clear() {
    const { error } = await supabase.from('reflections').delete().neq('id', '');
    if (error) throw new Error(`Supabase reflections clear: ${error.message}`);
  },
};

/* ------------------------------------------------------------ */
/* NoteTemplate                                                  */
/* ------------------------------------------------------------ */

export const supabaseTemplateService: TemplateService = {
  async getAll() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('updatedAt', { ascending: false });
    if (error) throw new Error(`Supabase templates: ${error.message}`);
    return (data ?? []) as NoteTemplate[];
  },

  async getByCategory(category) {
    if (category === '') {
      const { data, error } = await supabase.from('templates').select('*');
      if (error) throw new Error(`Supabase templates by category: ${error.message}`);
      return (data ?? []).filter((t: NoteTemplate) => !t.category);
    }
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('category', category);
    if (error) throw new Error(`Supabase templates by category: ${error.message}`);
    return (data ?? []) as NoteTemplate[];
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
    return data[0];
  },

  async update(id, patch) {
    const now = Date.now();
    const payload = { ...patch, updatedAt: now };
    const data = check<NoteTemplate[]>(
      await supabase.from('templates').update(payload).eq('id', id).select(),
    );
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) throw new Error(`Supabase templates delete: ${error.message}`);
  },

  async clear() {
    const { error } = await supabase.from('templates').delete().neq('id', '');
    if (error) throw new Error(`Supabase templates clear: ${error.message}`);
  },
};

/* ------------------------------------------------------------ */
/* Backup                                                        */
/* ------------------------------------------------------------ */

export const supabaseBackupService: BackupService = {
  async exportAll(): Promise<BackupData> {
    const [tasks, stages, reflections, templates] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('stages').select('*'),
      supabase.from('reflections').select('*'),
      supabase.from('templates').select('*'),
    ]);
    // 剥掉 user_id 再导出（导入时会自动补）
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
      // 清空 → 批量插入（upsert 按 id 冲突）
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
      return {
        tasks: data.tasks?.length ?? 0,
        stages: data.stages?.length ?? 0,
        reflections: data.reflections?.length ?? 0,
      };
    }

    // merge：逐条 upsert（冲突跳过）
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
    return { tasks: taskCount, stages: stageCount, reflections: reflCount };
  },
};

/* ------------------------------------------------------------ */
/* Notification                                                 */
/* ------------------------------------------------------------ */

export const supabaseNotificationService: NotificationService = {
  async getAll() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('reminderTime', { ascending: true });
    if (error) throw new Error(`Supabase notifications: ${error.message}`);
    return (data ?? []) as NotificationReminder[];
  },

  async getById(id) {
    const { data } = await supabase.from('notifications').select('*').eq('id', id).maybeSingle();
    return data as NotificationReminder | null ?? undefined;
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
    return data[0];
  },

  async update(id, patch) {
    const data = check<NotificationReminder[]>(
      await supabase.from('notifications').update(patch).eq('id', id).select(),
    );
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw new Error(`Supabase notifications delete: ${error.message}`);
  },

  async getPending() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('sent', false)
      .lte('reminderTime', now);
    if (error) throw new Error(`Supabase notifications pending: ${error.message}`);
    return (data ?? []) as NotificationReminder[];
  },

  async markAsSent(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ sent: true })
      .eq('id', id);
    if (error) throw new Error(`Supabase notifications mark-sent: ${error.message}`);
  },

  async clear() {
    const { error } = await supabase.from('notifications').delete().neq('id', '');
    if (error) throw new Error(`Supabase notifications clear: ${error.message}`);
  },
};
