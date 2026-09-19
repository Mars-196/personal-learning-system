/* ============================================================
   Service 切换入口 —— 后期接后端只改这一个文件
   ============================================================

   当前：使用 Supabase 云端存储实现

   回退本地 IndexedDB 时：把下面几行换成 indexeddb 即可。
   ============================================================ */

import {
  supabaseTaskService,
  supabaseStageService,
  supabaseReflectionService,
  supabaseTemplateService,
  supabaseBackupService,
  supabaseNotificationService,
} from './storage/supabase';

// import {
//   indexedDBTaskService,
//   indexedDBStageService,
//   indexedDBReflectionService,
//   indexedDBTemplateService,
//   indexedDBBackupService,
//   indexedDBNotificationService,
// } from './storage/indexeddb';

export const taskService = supabaseTaskService;
export const stageService = supabaseStageService;
export const reflectionService = supabaseReflectionService;
export const templateService = supabaseTemplateService;
export const backupService = supabaseBackupService;
export const notificationService = supabaseNotificationService;

// 回退本地版：
// export const taskService = indexedDBTaskService;
// export const stageService = indexedDBStageService;
// export const reflectionService = indexedDBReflectionService;
// export const templateService = indexedDBTemplateService;
// export const backupService = indexedDBBackupService;
// export const notificationService = indexedDBNotificationService;
