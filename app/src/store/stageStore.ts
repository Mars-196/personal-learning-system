/* ============================================================
   阶段 Store（Zustand）
   ============================================================ */

import { create } from 'zustand';
import { stageService, taskService } from '../services';
import { useNotificationStore } from './notificationStore';
import type { Stage, StageInput, StageNode, Task } from '../types';
import { buildStageTree } from '../utils';

interface StageState {
  stages: Stage[];
  /** 全部任务（用于阶段树统计） */
  tasks: Task[];
  /** 组装好的阶段树 */
  tree: StageNode[];
  loading: boolean;
  load: () => Promise<void>;
  createStage: (input: StageInput) => Promise<Stage>;
  updateStage: (id: string, patch: Partial<StageInput>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
}

export const useStageStore = create<StageState>((set, get) => ({
  stages: [],
  tasks: [],
  tree: [],
  loading: false,

  async load() {
    set({ loading: true });
    try {
      // 并行拉取阶段与全部任务
      const [stages, tasks] = await Promise.all([
        stageService.getAll(),
        taskService.getAll(),
      ]);
      set({ stages, tasks, tree: buildStageTree(stages, tasks) });
    } finally {
      set({ loading: false });
    }
  },

  async createStage(input) {
    const stage = await stageService.create(input);

    // 为阶段创建到期提醒（提前1天提醒）
    const createReminder = useNotificationStore.getState().createReminder;
    try {
      const reminderTime = new Date(stage.endDate);
      reminderTime.setDate(reminderTime.getDate() - 1); // 提前1天

      await createReminder({
        taskId: stage.id, // 使用阶段id作为taskId
        reminderTime: reminderTime.toISOString(),
        type: 'stage_due',
      });
    } catch (error) {
      console.error('创建阶段到期提醒失败:', error);
    }

    await get().load();
    return stage;
  },

  async updateStage(id, patch) {
    await stageService.update(id, patch);

    // 如果更新了结束日期，后续可在这里同步更新通知提醒时间

    await get().load();
  },

  async deleteStage(id) {
    await stageService.remove(id);
    await get().load();
  },
}));
