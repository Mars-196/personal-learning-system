# 数据模型文档

## 文档概述

本文档详细说明个人成长系统的数据模型，包括 TypeScript 类型定义、IndexedDB 数据库结构、数据关系图和数据迁移策略。

## 目录

- [类型系统](#类型系统)
- [数据库结构](#数据库结构)
- [数据关系](#数据关系)
- [数据验证](#数据验证)
- [数据迁移](#数据迁移)
- [备份恢复](#备份恢复)

## 类型系统

### 核心类型定义

### Task（任务）

```typescript
export interface Task {
  id: string;                    // 唯一标识符
  title: string;                 // 任务标题
  description: string;          // 任务描述
  category: TaskCategory;        // 任务分类
  priority: Priority;            // 重要程度
  status: TaskStatus;            // 完成状态
  startDate: string;             // 起始日期 YYYY-MM-DD
  endDate: string;               // 结束日期 YYYY-MM-DD
  stageId: string;               // 所属阶段 id
  reminderTime: string;          // 提醒时间 ISO 字符串
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
  completedAt: number;           // 完成时间戳
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| id | string | 是 | 唯一标识符，格式：`task_<timestamp>_<random>` | `task_1a2b3c4d5e6f_abc123` |
| title | string | 是 | 任务标题，最大长度 200 | "完成项目文档" |
| description | string | 否 | 任务描述，最大长度 1000 | "完成需求分析和设计文档" |
| category | TaskCategory | 是 | 任务分类：work/study/life | "work" |
| priority | Priority | 是 | 重要程度：1-4，数字越小越重要 | 1 |
| status | TaskStatus | 是 | 完成状态：pending/done | "pending" |
| startDate | string | 是 | 起始日期，格式 YYYY-MM-DD | "2024-01-15" |
| endDate | string | 是 | 结束日期，格式 YYYY-MM-DD | "2024-01-20" |
| stageId | string | 否 | 所属阶段 id，空字符串表示未分配 | "stage_1a2b3c" |
| reminderTime | string | 否 | 提醒时间，ISO 8601 格式 | "2024-01-15T09:00:00Z" |
| createdAt | number | 是 | 创建时间戳（毫秒） | 1705276800000 |
| updatedAt | number | 是 | 更新时间戳（毫秒） | 1705276800000 |
| completedAt | number | 是 | 完成时间戳，未完成为 0 | 1705276800000 |

### Stage（阶段）

```typescript
export interface Stage {
  id: string;                    // 唯一标识符
  name: string;                 // 阶段名称
  description: string;          // 阶段描述
  priority: Priority;            // 重要程度
  startDate: string;             // 起始日期 YYYY-MM-DD
  endDate: string;               // 结束日期 YYYY-MM-DD
  parentId: string | null;       // 父阶段 id，null 表示顶级阶段
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| id | string | 是 | 唯一标识符 | `stage_1a2b3c4d5e6f_abc123` |
| name | string | 是 | 阶段名称，最大长度 100 | "第一阶段" |
| description | string | 否 | 阶段描述，最大长度 500 | "项目初期准备阶段" |
| priority | Priority | 是 | 重要程度：1-4 | 1 |
| startDate | string | 是 | 起始日期 YYYY-MM-DD | "2024-01-01" |
| endDate | string | 是 | 结束日期 YYYY-MM-DD | "2024-03-31" |
| parentId | string \| null | 否 | 父阶段 id，null 表示顶级阶段 | null |
| createdAt | number | 是 | 创建时间戳 | 1704067200000 |
| updatedAt | number | 是 | 更新时间戳 | 1704067200000 |

### Reflection（反思）

```typescript
export interface Reflection {
  id: string;                    // 唯一标识符
  date: string;                  // 关联日期 YYYY-MM-DD
  title: string;                 // 反思标题
  content: string;               // 反思正文
  relatedTaskIds: string[];      // 关联的任务 id 列表
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| id | string | 是 | 唯一标识符 | `refl_1a2b3c4d5e6f_abc123` |
| date | string | 是 | 关联日期 YYYY-MM-DD | "2024-01-15" |
| title | string | 是 | 反思标题，最大长度 200 | "今日工作总结" |
| content | string | 是 | 反思正文，最大长度 5000 | "今天完成了..." |
| relatedTaskIds | string[] | 否 | 关联的任务 id 列表 | ["task_1a2b3c", "task_4d5e6f"] |
| createdAt | number | 是 | 创建时间戳 | 1705276800000 |
| updatedAt | number | 是 | 更新时间戳 | 1705276800000 |

### NotificationReminder（通知提醒）

```typescript
export interface NotificationReminder {
  id: string;                    // 唯一标识符
  taskId: string;                // 关联任务 id
  reminderTime: string;          // 提醒时间 ISO 字符串
  type: NotificationType;         // 提醒类型
  sent: boolean;                 // 是否已发送
  createdAt: number;             // 创建时间戳
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| id | string | 是 | 唯一标识符 | `notif_1a2b3c4d5e6f_abc123` |
| taskId | string | 是 | 关联任务 id | "task_1a2b3c" |
| reminderTime | string | 是 | 提醒时间 ISO 字符串 | "2024-01-15T09:00:00Z" |
| type | NotificationType | 是 | 提醒类型 | "task_reminder" |
| sent | boolean | 是 | 是否已发送 | false |
| createdAt | number | 是 | 创建时间戳 | 1705276800000 |

### 辅助类型

#### TaskCategory（任务分类）

```typescript
export type TaskCategory = 'work' | 'study' | 'life';

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: '工作',
  study: '学习',
  life: '生活',
};

export const CATEGORY_COLOR: Record<TaskCategory, string> = {
  work: 'var(--c-work)',
  study: 'var(--c-study)',
  life: 'var(--c-life)',
};
```

#### TaskStatus（任务状态）

```typescript
export type TaskStatus = 'pending' | 'done';
```

#### Priority（重要程度）

```typescript
export type Priority = 1 | 2 | 3 | 4;

export const PRIORITY_ROMAN: Record<Priority, string> = {
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
  4: 'Ⅳ',
};
```

#### NotificationType（通知类型）

```typescript
export type NotificationType = 
  | 'task_due'        // 任务到期
  | 'task_reminder'   // 任务提醒
  | 'stage_due'       // 阶段到期
  | 'daily_summary';  // 每日总结
```

### 输入类型

#### TaskInput（任务输入）

```typescript
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
```

用于创建和更新任务时的输入数据，不包含系统自动生成的字段。

#### StageInput（阶段输入）

```typescript
export type StageInput = Omit<Stage, 'id' | 'createdAt' | 'updatedAt'>;
```

用于创建和更新阶段时的输入数据。

#### ReflectionInput（反思输入）

```typescript
export type ReflectionInput = Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>;
```

用于创建和更新反思时的输入数据。

### 复合类型

#### TaskStats（任务统计）

```typescript
export interface TaskStats {
  total: number;        // 总任务数
  done: number;         // 已完成任务数
  pending: number;      // 未完成任务数
  rate: number;         // 完成率 0-100
}
```

#### StageNode（阶段树节点）

```typescript
export interface StageNode extends Stage {
  children: StageNode[];    // 子阶段列表
  countdown: number;        // 剩余天数
  taskTotal: number;        // 阶段内任务总数
  taskDone: number;         // 阶段内已完成任务数
}
```

#### TaskQuery（任务查询条件）

```typescript
export interface TaskQuery {
  date?: string;           // 按日期过滤
  category?: TaskCategory; // 按分类过滤
  status?: TaskStatus;     // 按状态过滤
  stageId?: string;        // 按阶段过滤
  keyword?: string;        // 关键词搜索
}
```

#### BackupData（备份数据）

```typescript
export interface BackupData {
  version: number;                      // 备份版本
  exportedAt: string;                    // 导出时间
  app: 'personal-reflection-system';     // 应用标识
  tasks: Task[];                         // 任务列表
  stages: Stage[];                       // 阶段列表
  reflections: Reflection[];            // 反思列表
}
```

## 数据库结构

### IndexedDB 数据库配置

```typescript
class AppDB extends Dexie {
  tasks!: Table<Task, string>;
  stages!: Table<Stage, string>;
  reflections!: Table<Reflection, string>;
  notifications!: Table<NotificationReminder, string>;

  constructor() {
    super('PersonalReflectionDB');

    // 版本 1：初始结构
    this.version(1).stores({
      tasks: 'id, category, status, stageId, startDate, endDate, updatedAt',
      stages: 'id, parentId, endDate, updatedAt',
      reflections: 'id, date, updatedAt',
    });

    // 版本 2：添加通知功能和提醒时间
    this.version(2).stores({
      tasks: 'id, category, status, stageId, startDate, endDate, reminderTime, updatedAt',
      stages: 'id, parentId, endDate, updatedAt',
      reflections: 'id, date, updatedAt',
      notifications: 'id, taskId, reminderTime, type, sent, createdAt',
    });
  }
}
```

### 表结构详解

#### tasks 表

**索引字段**：
- `id`: 主键
- `category`: 分类索引
- `status`: 状态索引
- `stageId`: 阶段索引
- `startDate`: 起始日期索引
- `endDate`: 结束日期索引
- `reminderTime`: 提醒时间索引
- `updatedAt`: 更新时间索引

**查询优化**：
```typescript
// 按分类查询
await db.tasks.where('category').equals('work').toArray();

// 按状态查询
await db.tasks.where('status').equals('pending').toArray();

// 按阶段查询
await db.tasks.where('stageId').equals('stage_123').toArray();

// 按日期范围查询
await db.tasks
  .where('startDate').belowOrEqual('2024-01-15')
  .and(task => task.endDate >= '2024-01-15')
  .toArray();
```

#### stages 表

**索引字段**：
- `id`: 主键
- `parentId`: 父阶段索引
- `endDate`: 结束日期索引
- `updatedAt`: 更新时间索引

**查询优化**：
```typescript
// 查询顶级阶段
await db.stages.where('parentId').equals(null).toArray();

// 查询子阶段
await db.stages.where('parentId').equals('stage_123').toArray();

// 按结束日期排序
await db.stages.orderBy('endDate').toArray();
```

#### reflections 表

**索引字段**：
- `id`: 主键
- `date`: 日期索引
- `updatedAt`: 更新时间索引

**查询优化**：
```typescript
// 按日期查询
await db.reflections.where('date').equals('2024-01-15').toArray();

// 按日期范围查询
await db.reflections
  .where('date')
  .between('2024-01-01', '2024-01-31')
  .toArray();
```

#### notifications 表

**索引字段**：
- `id`: 主键
- `taskId`: 任务索引
- `reminderTime`: 提醒时间索引
- `type`: 类型索引
- `sent`: 发送状态索引
- `createdAt`: 创建时间索引

**查询优化**：
```typescript
// 查询待发送的通知
await db.notifications
  .where('sent')
  .equals(false)
  .and(item => item.reminderTime <= new Date().toISOString())
  .toArray();

// 按任务查询
await db.notifications.where('taskId').equals('task_123').toArray();
```

## 数据关系

### 实体关系图

```
┌─────────────┐         ┌─────────────┐
│    Stage    │         │    Task     │
├─────────────┤         ├─────────────┤
│ id (PK)     │◄────────│ stageId (FK)│
│ name        │         │ id (PK)     │
│ parentId    │         │ title       │
│ startDate   │         │ category    │
│ endDate     │         │ status      │
│ priority    │         │ priority    │
└─────────────┘         │ startDate   │
        │               │ endDate     │
        │               └─────────────┘
        │                       │
        │                       │
        │               ┌───────┴───────┐
        │               │               │
        │       ┌───────▼───────┐ ┌─────▼─────┐
        │       │ Notification  │ │ Reflection│
        │       ├───────────────┤ ├──────────┤
        │       │ taskId (FK)   │ │ relatedTaskIds │
        │       │ reminderTime  │ │ (Array)  │
        │       │ type          │ │ date     │
        │       │ sent          │ │ content  │
        │       └───────────────┘ └──────────┘
        │
        └───────┐
                │
        ┌───────▼───────┐
        │  Stage        │
        │  (Self)       │
        ├───────────────┤
        │ parentId (FK) │
        └───────────────┘
```

### 关系说明

#### Stage - Task（一对多）
- 一个阶段可以包含多个任务
- 一个任务只能属于一个阶段（stageId 为空表示未分配）
- 删除阶段时，关联的任务不会被删除，但 stageId 会被清空

#### Stage - Stage（自关联，一对多）
- 一个阶段可以包含多个子阶段
- 一个子阶段只能属于一个父阶段
- parentId 为 null 表示顶级阶段
- 删除父阶段时，子阶段会被级联删除

#### Task - Notification（一对多）
- 一个任务可以有多个通知提醒
- 一个通知提醒只能关联一个任务
- 删除任务时，关联的通知应该被清理

#### Task - Reflection（多对多）
- 一个反思可以关联多个任务
- 一个任务可以被多个反思关联
- 通过 relatedTaskIds 数组实现多对多关系

### 数据完整性

#### 外键约束
虽然 IndexedDB 不支持真正的外键约束，但在应用层面需要维护数据完整性：

```typescript
// 删除阶段前的检查
async function deleteStage(id: string) {
  // 检查是否有任务关联
  const tasks = await db.tasks.where('stageId').equals(id).toArray();
  if (tasks.length > 0) {
    // 清空任务的 stageId
    await db.tasks.bulkPut(
      tasks.map(t => ({ ...t, stageId: '', updatedAt: Date.now() }))
    );
  }
  
  // 删除阶段
  await db.stages.delete(id);
}
```

#### 级联删除
```typescript
// 级联删除子阶段
async function deleteStageWithChildren(id: string) {
  const all = await db.stages.toArray();
  const toDelete = new Set<string>([id]);
  
  // 递归查找所有子阶段
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
  
  // 批量删除
  await db.stages.bulkDelete([...toDelete]);
}
```

## 数据验证

### 输入验证

#### Task 验证
```typescript
export function validateTaskInput(input: TaskInput): string[] {
  const errors: string[] = [];
  
  if (!input.title || input.title.trim().length === 0) {
    errors.push('任务标题不能为空');
  }
  
  if (input.title && input.title.length > 200) {
    errors.push('任务标题不能超过200个字符');
  }
  
  if (input.description && input.description.length > 1000) {
    errors.push('任务描述不能超过1000个字符');
  }
  
  if (!input.startDate) {
    errors.push('请选择起始日期');
  }
  
  if (!input.endDate) {
    errors.push('请选择结束日期');
  }
  
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.push('结束日期不能早于起始日期');
  }
  
  return errors;
}
```

#### Stage 验证
```typescript
export function validateStageInput(input: StageInput): string[] {
  const errors: string[] = [];
  
  if (!input.name || input.name.trim().length === 0) {
    errors.push('阶段名称不能为空');
  }
  
  if (input.name && input.name.length > 100) {
    errors.push('阶段名称不能超过100个字符');
  }
  
  if (input.description && input.description.length > 500) {
    errors.push('阶段描述不能超过500个字符');
  }
  
  if (!input.startDate) {
    errors.push('请选择起始日期');
  }
  
  if (!input.endDate) {
    errors.push('请选择结束日期');
  }
  
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.push('结束日期不能早于起始日期');
  }
  
  return errors;
}
```

### 数据完整性检查

#### 日期范围验证
```typescript
export function validateDateRange(start: string, end: string): string | null {
  if (!start) return '请选择起始日期';
  if (!end) return '请选择结束日期';
  if (end < start) return '结束日期不能早于起始日期';
  return null;
}
```

#### 阶段循环检查
```typescript
export function detectStageCycle(stageId: string, newParentId: string | null): boolean {
  if (newParentId === null) return false;
  if (newParentId === stageId) return true;
  
  // 检查是否会形成循环
  // 需要递归检查父级链
  // ...
  return false;
}
```

## 数据迁移

### 版本管理

#### 数据库版本升级
```typescript
this.version(1).stores({
  tasks: 'id, category, status, stageId, startDate, endDate, updatedAt',
  stages: 'id, parentId, endDate, updatedAt',
  reflections: 'id, date, updatedAt',
});

this.version(2).stores({
  tasks: 'id, category, status, stageId, startDate, endDate, reminderTime, updatedAt',
  stages: 'id, parentId, endDate, updatedAt',
  reflections: 'id, date, updatedAt',
  notifications: 'id, taskId, reminderTime, type, sent, createdAt',
}).upgrade(tx => {
  // 数据迁移逻辑
  return tx.table('tasks').toCollection().modify(task => {
    // 为现有任务添加默认提醒时间
    if (!task.reminderTime) {
      task.reminderTime = '';
    }
  });
});
```

### 数据备份

#### 导出数据
```typescript
export async function exportBackup(): Promise<BackupData> {
  const [tasks, stages, reflections] = await Promise.all([
    db.tasks.toArray(),
    db.stages.toArray(),
    db.reflections.toArray(),
  ]);
  
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    app: 'personal-reflection-system',
    tasks,
    stages,
    reflections,
  };
}
```

### 数据恢复

#### 导入数据（合并模式）
```typescript
export async function importBackupMerge(data: BackupData) {
  const result = { tasks: 0, stages: 0, reflections: 0 };
  
  // 合并任务：跳过已存在的 id
  for (const task of data.tasks) {
    if (!(await db.tasks.get(task.id))) {
      await db.tasks.add(task);
      result.tasks++;
    }
  }
  
  // 合并阶段
  for (const stage of data.stages) {
    if (!(await db.stages.get(stage.id))) {
      await db.stages.add(stage);
      result.stages++;
    }
  }
  
  // 合并反思
  for (const reflection of data.reflections) {
    if (!(await db.reflections.get(reflection.id))) {
      await db.reflections.add(reflection);
      result.reflections++;
    }
  }
  
  return result;
}
```

#### 导入数据（覆盖模式）
```typescript
export async function importBackupReplace(data: BackupData) {
  // 清空现有数据
  await Promise.all([
    db.tasks.clear(),
    db.stages.clear(),
    db.reflections.clear(),
    db.notifications.clear(),
  ]);
  
  // 导入新数据
  await Promise.all([
    db.tasks.bulkAdd(data.tasks),
    db.stages.bulkAdd(data.stages),
    db.reflections.bulkAdd(data.reflections),
  ]);
  
  return {
    tasks: data.tasks.length,
    stages: data.stages.length,
    reflections: data.reflections.length,
  };
}
```

## 备份恢复

### 自动备份策略

#### 定期备份
```typescript
export async function autoBackup() {
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  
  // 保存到本地存储或下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auto_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 数据同步

#### 冲突解决策略
```typescript
export async function resolveConflict(localData: Task, remoteData: Task): Task {
  // 使用最新更新时间的数据
  if (localData.updatedAt > remoteData.updatedAt) {
    return localData;
  } else {
    return remoteData;
  }
}
```

### 数据清理

#### 过期数据清理
```typescript
export async function cleanupOldData(days: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // 清理过期的通知
  await db.notifications
    .where('reminderTime')
    .below(cutoffDate.toISOString())
    .delete();
  
  // 清理已完成的旧任务（可选）
  // await db.tasks
  //   .where('status')
  //   .equals('done')
  //   .and(task => task.completedAt < cutoffDate.getTime())
  //   .delete();
}
```

---

**文档版本**: v1.0  
**最后更新**: 2026-09-16  
**维护者**: 开发团队
