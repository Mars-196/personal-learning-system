/* ============================================================
   Auth Store（Zustand）
   用 supabase.auth.onAuthStateChange 订阅登录态变化。
   组件层只看 user / loading 两个状态，不直接碰 supabase.auth。
   ============================================================ */

import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  /** 当前登录用户 id（等同于 auth.uid()），未登录为 null */
  userId: string | null;
  /** 初始化中：应用启动时正在读本地 session */
  loading: boolean;
  /** 登录/注册/登出过程中（按钮禁用用） */
  busy: boolean;
  /** 最后一次错误信息 */
  error: string | null;

  /** 应用启动时调用一次，建立订阅 */
  init: () => () => void;

  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  loading: true,
  busy: false,
  error: null,

  init: () => {
    // 订阅 onAuthStateChange 会立即触发一次（带上当前 session 或 null）
    // 所以不需要手动读 getSession —— 回调会把 userId 和 loading 都设好
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ userId: session?.user?.id ?? null, loading: false });
    });

    return () => {
      data.subscription?.unsubscribe?.();
    };
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ busy: false });
    if (error) {
      set({ error: friendlyAuthError(error.message) });
      return false;
    }
    return true;
  },

  signUp: async (email, password) => {
    set({ busy: true, error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ busy: false });
    if (error) {
      set({ error: friendlyAuthError(error.message) });
      return false;
    }
    return true;
  },

  signOut: async () => {
    set({ busy: true });
    await supabase.auth.signOut();
    set({ busy: false, userId: null });
  },

  clearError: () => set({ error: null }),
}));

/** 把 Supabase 原始错误翻成小白能看懂的中文 */
function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return '邮箱或密码不对，再试一次？';
  if (m.includes('email not confirmed')) return '邮箱还没验证，请先查收邮件';
  if (m.includes('password')) return '密码太短了，至少 6 位哦';
  if (m.includes('already registered') || m.includes('already exists')) return '这个邮箱已经注册过，直接登录就行';
  if (m.includes('invalid email')) return '邮箱格式看起来不对';
  if (m.includes('rate limit')) return '操作太频繁啦，等会儿再试';
  if (m.includes('network') || m.includes('fetch')) return '网络有点问题，检查下连接';
  return msg || '登录失败，再试一次吧';
}
