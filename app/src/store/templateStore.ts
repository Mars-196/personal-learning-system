/* ============================================================
   笔记模板 Store（Zustand）
   ============================================================ */

import { create } from 'zustand';
import { templateService } from '../services';
import type { NoteTemplate, NoteTemplateInput } from '../types';

interface TemplateState {
  templates: NoteTemplate[];
  loading: boolean;
  load: () => Promise<void>;
  createTemplate: (input: NoteTemplateInput) => Promise<NoteTemplate>;
  updateTemplate: (id: string, patch: Partial<NoteTemplateInput>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loading: false,

  async load() {
    set({ loading: true });
    try {
      const templates = await templateService.getAll();
      set({ templates });
    } finally {
      set({ loading: false });
    }
  },

  async createTemplate(input) {
    const item = await templateService.create(input);
    await get().load();
    return item;
  },

  async updateTemplate(id, patch) {
    await templateService.update(id, patch);
    await get().load();
  },

  async deleteTemplate(id) {
    await templateService.remove(id);
    await get().load();
  },
}));
