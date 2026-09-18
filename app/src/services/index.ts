/* ============================================================
   Service 切换入口 —— 后期接后端只改这一个文件
   ============================================================

   当前：使用 IndexedDB 本地存储实现

   接入后端时，把下面几行改为：
     import { apiTaskService } from './storage/api';
     ...
   即可，其余业务代码无需任何改动。
   ============================================================ */

import {
  indexedDBTaskService,
  indexedDBStageService,
  indexedDBReflectionService,
  indexedDBTemplateService,
  indexedDBBackupService,
  indexedDBNotificationService,
} from './storage/indexeddb';

// import { apiTaskService, apiStageService, apiReflectionService, apiTemplateService, apiBackupService, apiNotificationService } from './storage/api';

export const taskService = indexedDBTaskService;
export const stageService = indexedDBStageService;
export const reflectionService = indexedDBReflectionService;
export const templateService = indexedDBTemplateService;
export const backupService = indexedDBBackupService;
export const notificationService = indexedDBNotificationService;

// export const taskService = apiTaskService;
// export const stageService = apiStageService;
// export const reflectionService = apiReflectionService;
// export const templateService = apiTemplateService;
// export const backupService = apiBackupService;
// export const notificationService = apiNotificationService;
