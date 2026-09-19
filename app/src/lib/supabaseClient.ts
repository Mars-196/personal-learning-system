/* ============================================================
   Supabase 客户端（单点初始化）
   所有 service 和 auth 都从这里 import，保证同一个实例
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * 始终创建 client。未配置 URL/key 时调用方法会抛运行时错误——
 * 这是安全的，因为 service 层会 catch 并转成友好提示。
 */
export const supabase = createClient(
  (url ?? '') as string,
  (publishableKey ?? '') as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

/** 当前登录用户 id，未登录返回 null（异步，发网络请求） */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** 从本地存储读 user id（Supabase 会把 session 缓存到 localStorage） */
export function currentUserIdSync(): string | null {
  try {
    const projectId = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.match(/https:\/\/([^.]+)/)?.[1] ?? 'default';
    const storageKey = `sb-${projectId}-auth-token`;
    const raw = localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** 配置是否就绪（用于启动时判断是否去 IndexedDB 降级） */
export function isSupabaseConfigured(): boolean {
  return !!url && !!publishableKey && !url.includes('your-project-id');
}
