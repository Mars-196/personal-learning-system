/* ============================================================
   UI Store（Zustand）
   管理全局界面状态：当前查看日期、弹窗、消息提示
   ============================================================ */

import { create } from 'zustand';
import { today } from '../utils';

/** 弹窗类型 */
export type ModalType = 'task-form' | 'stage-form' | 'reflection-form' | 'confirm' | null;

/** 消息提示 */
export interface Toast {
  id: string;
  text: string;
  kind: 'success' | 'error' | 'info';
}

/** 确认弹窗配置 */
export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
}

interface UIState {
  /** 当前查看的日期 YYYY-MM-DD */
  currentDate: string;
  setCurrentDate: (date: string) => void;

  /** 当前打开的弹窗 */
  modal: ModalType;
  /** 编辑中的任务/阶段 id（新建时为 null） */
  editingId: string | null;
  openModal: (type: ModalType, editingId?: string | null) => void;
  closeModal: () => void;

  /** 确认弹窗配置 */
  confirm: ConfirmConfig | null;
  askConfirm: (config: ConfirmConfig) => void;
  resolveConfirm: () => void;

  /** 消息提示列表 */
  toasts: Toast[];
  pushToast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;

  /** 移动端侧边栏 */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  currentDate: today(),
  setCurrentDate: (date) => set({ currentDate: date }),

  modal: null,
  editingId: null,
  openModal: (type, editingId = null) => set({ modal: type, editingId }),
  closeModal: () => set({ modal: null, editingId: null }),

  confirm: null,
  askConfirm: (config) => set({ confirm: config }),
  resolveConfirm: () => set({ confirm: null }),

  toasts: [],
  pushToast: (text, kind = 'success') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set({ toasts: [...get().toasts, { id, text, kind }] });
    setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  sidebarOpen: false,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));
