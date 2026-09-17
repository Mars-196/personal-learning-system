/* ============================================================
   反思 Store（Zustand）—— 对应 RPD「后续可做：每日反思总结」
   ============================================================ */

import { create } from 'zustand';
import { reflectionService } from '../services';
import type { Reflection, ReflectionInput } from '../types';

interface ReflectionState {
  reflections: Reflection[];
  loading: boolean;
  /** 日期过滤，空字符串表示全部 */
  dateFilter: string;
  load: () => Promise<void>;
  setDateFilter: (date: string) => Promise<void>;
  createReflection: (input: ReflectionInput) => Promise<Reflection>;
  updateReflection: (id: string, patch: Partial<ReflectionInput>) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
}

export const useReflectionStore = create<ReflectionState>((set, get) => ({
  reflections: [],
  loading: false,
  dateFilter: '',

  async load() {
    set({ loading: true });
    try {
      const { dateFilter } = get();
      const reflections = dateFilter
        ? await reflectionService.getByDate(dateFilter)
        : await reflectionService.getAll();
      set({ reflections });
    } finally {
      set({ loading: false });
    }
  },

  async setDateFilter(date) {
    set({ dateFilter: date });
    await get().load();
  },

  async createReflection(input) {
    const item = await reflectionService.create(input);
    await get().load();
    return item;
  },

  async updateReflection(id, patch) {
    await reflectionService.update(id, patch);
    await get().load();
  },

  async deleteReflection(id) {
    await reflectionService.remove(id);
    await get().load();
  },
}));
