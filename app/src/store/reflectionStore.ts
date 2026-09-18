/* ============================================================
   笔记 Store（Zustand）—— 支持日期 + 分类双维度筛选
   ============================================================ */

import { create } from 'zustand';
import { reflectionService } from '../services';
import type { Reflection, ReflectionInput } from '../types';

interface ReflectionState {
  reflections: Reflection[];
  loading: boolean;
  /** 日期过滤，空字符串表示全部 */
  dateFilter: string;
  /** 分类过滤，空字符串表示全部 */
  categoryFilter: string;
  load: () => Promise<void>;
  setDateFilter: (date: string) => Promise<void>;
  setCategoryFilter: (category: string) => Promise<void>;
  createReflection: (input: ReflectionInput) => Promise<Reflection>;
  updateReflection: (id: string, patch: Partial<ReflectionInput>) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
}

export const useReflectionStore = create<ReflectionState>((set, get) => ({
  reflections: [],
  loading: false,
  dateFilter: '',
  categoryFilter: '',

  async load() {
    set({ loading: true });
    try {
      const { dateFilter, categoryFilter } = get();

      // 特殊处理「未分类」：全量拉取后前端筛 category 为空的
      if (categoryFilter === '__uncategorized__') {
        let reflections = await reflectionService.getAll();
        reflections = reflections.filter((r) => !r.category);
        if (dateFilter) {
          reflections = reflections.filter((r) => r.date === dateFilter);
        }
        set({ reflections });
      } else if (categoryFilter) {
        // 有分类过滤：用 category 维度查询（可叠加日期过滤在前端）
        let reflections = await reflectionService.getByCategory(categoryFilter);
        if (dateFilter) {
          reflections = reflections.filter((r) => r.date === dateFilter);
        }
        set({ reflections });
      } else if (dateFilter) {
        set({ reflections: await reflectionService.getByDate(dateFilter) });
      } else {
        set({ reflections: await reflectionService.getAll() });
      }
    } finally {
      set({ loading: false });
    }
  },

  async setDateFilter(date) {
    set({ dateFilter: date });
    await get().load();
  },

  async setCategoryFilter(category) {
    set({ categoryFilter: category });
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
