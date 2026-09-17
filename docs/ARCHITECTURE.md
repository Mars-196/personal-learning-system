# 架构设计文档

## 文档概述

本文档详细说明个人成长系统的整体架构设计、技术选型、模块划分和数据流向，帮助开发者深入理解系统设计理念和实现方式。

## 目录

- [设计理念](#设计理念)
- [技术选型](#技术选型)
- [系统架构](#系统架构)
- [模块划分](#模块划分)
- [数据流向](#数据流向)
- [设计模式](#设计模式)
- [安全设计](#安全设计)
- [性能优化](#性能优化)

## 设计理念

### 1. 分层架构
系统采用经典的三层架构设计，确保各层职责清晰、耦合度低：

```
┌─────────────────────────────────────┐
│        表现层 (Presentation)        │
│   Pages + Components + UI Store     │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         业务逻辑层 (Business)        │
│     Zustand Stores + Services        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         数据访问层 (Data Access)     │
│    IndexedDB Service (Dexie)         │
└─────────────────────────────────────┘
```

### 2. 服务抽象
数据访问通过统一的 Service 接口抽象，便于后期切换存储实现：

```typescript
// 统一的 Service 接口
interface TaskService {
  getAll(query?: TaskQuery): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, patch: Partial<TaskInput>): Promise<Task | undefined>;
  toggleDone(id: string): Promise<Task | undefined>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

// 当前实现：IndexedDB
export const taskService = indexedDBTaskService;

// 未来实现：后端 API
// export const taskService = apiTaskService;
```

### 3. 类型驱动开发
采用 TypeScript 强类型系统，确保类型安全：

- 前后端共用类型定义
- 编译时类型检查
- 减少运行时错误
- 提升代码可维护性

### 4. 响应式设计
- 移动优先的设计理念
- 组件化开发
- 状态驱动的 UI 更新
- 流畅的用户体验

## 技术选型

### 前端框架

#### React 19.2.8
**选择理由**：
- 生态系统成熟，社区活跃
- 组件化开发模式
- 虚拟 DOM 性能优秀
- Hooks 机制简化状态管理
- React 19 新特性优化性能

**应用场景**：
- 页面组件构建
- 状态管理
- 用户交互处理

#### TypeScript 6.0.2
**选择理由**：
- 类型安全，减少运行时错误
- 更好的 IDE 支持
- 代码自文档化
- 重构更安全
- 与 React 完美集成

**应用场景**：
- 类型定义
- 接口定义
- 泛型编程
- 装饰器应用

### 构建工具

#### Vite 8.3.0
**选择理由**：
- 极快的开发服务器启动
- 即时热模块替换 (HMR)
- 原生 ESM 支持
- 优化的生产构建
- 丰富的插件生态

**应用场景**：
- 开发服务器
- 生产构建
- 资源优化
- 代码分割

### 状态管理

#### Zustand 5.0.15
**选择理由**：
- 轻量级（体积小）
- API 简洁直观
- 无需 Provider 包裹
- 支持 TypeScript
- 性能优秀

**应用场景**：
- 全局状态管理
- UI 状态管理
- 业务逻辑状态
- 数据缓存

### 数据存储

#### IndexedDB + Dexie 4.4.6
**选择理由**：
- 浏览器原生支持，无需额外依赖
- 存储容量大（通常几百 MB）
- 支持异步操作，不阻塞 UI
- Dexie 提供友好的 API
- 支持索引查询，性能优秀

**应用场景**：
- 本地数据持久化
- 离线数据访问
- 大数据量存储
- 复杂查询

### 工具库

#### dayjs 1.11.23
**选择理由**：
- 轻量级（2KB）
- API 与 Moment.js 兼容
- 支持插件扩展
- 国际化支持
- 性能优秀

**应用场景**：
- 日期格式化
- 日期计算
- 时区处理
- 相对时间显示

#### React Router DOM 7.18.3
**选择理由**：
- React 官方推荐
- 声明式路由
- 支持动态路由
- 路由守卫
- 代码分割支持

**应用场景**：
- 页面路由管理
- 导航控制
- 权限控制
- 深度链接

### 开发工具

#### oxlint 1.81.0
**选择理由**：
- 极快的检查速度
- 与 ESLint 兼容
- 内置常用规则
- 支持 TypeScript
- 易于配置

**应用场景**：
- 代码质量检查
- 代码规范检查
- 错误提前发现
- 代码风格统一

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Application Layer                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │   Pages     │  │ Components  │  │   UI Store    │  │  │
│  │  │  (Views)    │  │  (Reusable) │  │  (Modal/Nav)  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Business Layer                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │Task Store   │  │Stage Store  │  │ Reflection    │  │  │
│  │  │(Zustand)    │  │(Zustand)    │  │ Store         │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Service Layer                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │Task Service │  │Stage Service│  │ Backup        │  │  │
│  │  │(Interface)  │  │(Interface)  │  │ Service       │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Data Access Layer                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │IndexedDB    │  │IndexedDB    │  │ IndexedDB     │  │  │
│  │  │Implementation│  │Implementation│  │ Implementation│  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Storage Layer                          │  │
│  │              IndexedDB (Browser)                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向

#### 读取数据流程
```
用户操作 → 组件事件 → Store Action → Service Call → IndexedDB Query → 数据返回 → Store Update → UI 重新渲染
```

#### 写入数据流程
```
用户输入 → 表单验证 → Store Action → Service Call → IndexedDB Write → 数据持久化 → Store Update → UI 反馈
```

### 组件层次结构

```
App (根组件)
├── Header (导航栏)
├── Main (主内容区)
│   ├── TasksPage (任务页面)
│   │   ├── StatsBar (统计栏)
│   │   ├── DateNav (日期导航)
│   │   ├── FilterBar (筛选栏)
│   │   └── TaskList (任务列表)
│   │       └── TaskItem (任务项)
│   ├── StagesPage (阶段页面)
│   │   ├── StageList (阶段列表)
│   │   └── StageCard (阶段卡片)
│   ├── ReflectionsPage (反思页面)
│   └── SettingsPage (设置页面)
└── Global Modals (全局弹窗)
    ├── TaskFormModal (任务表单)
    ├── StageFormModal (阶段表单)
    ├── ReflectionFormModal (反思表单)
    ├── ConfirmDialog (确认对话框)
    └── ToastContainer (提示容器)
```

## 模块划分

### 1. 表现层 (Presentation Layer)

#### Pages 模块
**职责**：页面级组件，负责页面布局和业务逻辑编排

**主要组件**：
- `TasksPage.tsx` - 任务管理页面
- `StagesPage.tsx` - 阶段管理页面
- `ReflectionsPage.tsx` - 反思记录页面
- `SettingsPage.tsx` - 设置页面

**设计原则**：
- 保持组件精简，避免过于复杂
- 通过 Store 获取数据，避免直接调用 Service
- 处理用户交互，调用 Store 的 Action
- 负责页面级别的状态管理

#### Components 模块
**职责**：可复用的 UI 组件

**主要组件**：
- `TaskItem.tsx` - 任务列表项
- `StatsBar.tsx` - 统计信息栏
- `DateNav.tsx` - 日期导航
- `Badges.tsx` - 各种徽章组件
- `Modal.tsx` - 通用弹窗
- `ConfirmDialog.tsx` - 确认对话框
- `ToastContainer.tsx` - 提示消息容器
- `EmptyState.tsx` - 空状态提示

**设计原则**：
- 高内聚低耦合
- Props 接口清晰
- 支持样式定制
- 无副作用渲染

### 2. 业务逻辑层 (Business Layer)

#### Store 模块
**职责**：状态管理和业务逻辑

**主要 Store**：
- `taskStore.ts` - 任务状态管理
- `stageStore.ts` - 阶段状态管理
- `reflectionStore.ts` - 反思状态管理
- `notificationStore.ts` - 通知状态管理
- `uiStore.ts` - UI 状态管理

**设计模式**：
```typescript
// Zustand Store 标准模式
export const useTaskStore = create<TaskState>((set, get) => ({
  // 状态
  tasks: [],
  loading: false,
  
  // 异步 Action
  async load() {
    set({ loading: true });
    try {
      const tasks = await taskService.getAll();
      set({ tasks });
    } finally {
      set({ loading: false });
    }
  },
  
  // 同步 Action
  updateFilter(filter) {
    set({ filter });
  },
}));
```

**设计原则**：
- Store 只管理状态，不包含 UI 逻辑
- 异步操作处理 loading 状态
- 通过 Service 访问数据
- 支持状态选择器优化性能

### 3. 数据访问层 (Data Access Layer)

#### Service 模块
**职责**：数据访问接口定义和实现

**接口定义** (`services/interfaces.ts`)：
```typescript
export interface TaskService {
  getAll(query?: TaskQuery): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, patch: Partial<TaskInput>): Promise<Task | undefined>;
  toggleDone(id: string): Promise<Task | undefined>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

**实现方式**：
- `services/storage/indexeddb.ts` - IndexedDB 实现
- `services/storage/api.ts` - 后端 API 实现（预留）

**设计原则**：
- 接口与实现分离
- 实现可替换
- 统一的错误处理
- 支持事务操作

#### Database 模块
**职责**：数据库配置和版本管理

**主要文件**：
- `db/database.ts` - Dexie 数据库配置

**数据库结构**：
```typescript
class AppDB extends Dexie {
  tasks!: Table<Task, string>;
  stages!: Table<Stage, string>;
  reflections!: Table<Reflection, string>;
  notifications!: Table<NotificationReminder, string>;

  constructor() {
    super('PersonalReflectionDB');
    this.version(2).stores({
      tasks: 'id, category, status, stageId, startDate, endDate, reminderTime, updatedAt',
      stages: 'id, parentId, endDate, updatedAt',
      reflections: 'id, date, updatedAt',
      notifications: 'id, taskId, reminderTime, type, sent, createdAt',
    });
  }
}
```

**设计原则**：
- 版本化管理
- 索引优化查询
- 支持数据迁移
- 错误恢复机制

### 4. 工具层 (Utility Layer)

#### Types 模块
**职责**：TypeScript 类型定义

**主要类型**：
- `Task` - 任务实体
- `Stage` - 阶段实体
- `Reflection` - 反思实体
- `TaskQuery` - 查询条件
- `BackupData` - 备份数据结构

**设计原则**：
- 类型定义集中管理
- 前后端共用
- 支持泛型
- 导出常量映射

#### Utils 模块
**职责**：通用工具函数

**主要函数**：
- 日期处理函数
- 数据计算函数
- 格式化函数
- 验证函数
- 通知相关函数

**设计原则**：
- 纯函数优先
- 参数类型明确
- 错误处理完善
- 单元测试覆盖

#### Hooks 模块
**职责**：自定义 React Hooks

**主要 Hooks**：
- 数据获取 Hooks
- 表单处理 Hooks
- 生命周期 Hooks

**设计原则**：
- 符合 Hooks 规则
- 可复用性强
- 错误边界处理
- 性能优化

## 设计模式

### 1. 单例模式
**应用场景**：数据库实例、全局状态

```typescript
// 数据库单例
export const db = new AppDB();

// Store 单例（Zustand 自动实现）
export const useTaskStore = create<TaskState>(...);
```

### 2. 工厂模式
**应用场景**：对象创建、ID 生成

```typescript
// ID 生成工厂
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
```

### 3. 策略模式
**应用场景**：存储实现切换

```typescript
// 存储策略切换
export const taskService = indexedDBTaskService; // 当前策略
// export const taskService = apiTaskService;     // 未来策略
```

### 4. 观察者模式
**应用场景**：状态订阅、UI 更新

```typescript
// Zustand 观察者模式
const tasks = useTaskStore((state) => state.tasks);
```

### 5. 适配器模式
**应用场景**：数据格式转换、接口适配

```typescript
// 数据适配
const task: Task = { ...input, id: uid('task'), createdAt: now, updatedAt: now };
```

## 安全设计

### 1. 数据安全
- **存储隔离**：IndexedDB 按域名隔离，其他网站无法访问
- **输入转义**：React 自动转义用户输入，防止 XSS 攻击
- **类型验证**：TypeScript 编译时类型检查
- **数据备份**：支持定期导出备份，防止数据丢失

### 2. 通信安全
- **HTTPS**：生产环境强制使用 HTTPS
- **CORS**：配置跨域资源共享策略
- **API 鉴权**：预留后端鉴权机制

### 3. 代码安全
- **依赖审计**：定期检查依赖包安全性
- **代码审查**：严格的代码审查流程
- **安全扫描**：使用安全扫描工具检测漏洞

## 性能优化

### 1. 渲染优化
- **虚拟列表**：大数据量时使用虚拟滚动
- **懒加载**：路由级别的代码分割
- **记忆化**：使用 `useMemo` 和 `useCallback` 优化
- **防抖节流**：用户输入防抖处理

### 2. 数据优化
- **索引查询**：IndexedDB 索引优化查询性能
- **批量操作**：减少数据库访问次数
- **缓存策略**：Store 层数据缓存
- **分页加载**：大数据量分页处理

### 3. 构建优化
- **代码分割**：Vite 自动代码分割
- **Tree Shaking**：移除未使用代码
- **资源压缩**：Gzip/Brotli 压缩
- **CDN 加速**：静态资源 CDN 分发

### 4. 网络优化
- **懒加载图片**：图片懒加载
- **预加载关键资源**：关键资源预加载
- **Service Worker**：离线缓存支持
- **HTTP/2**：利用 HTTP/2 多路复用

## 扩展性设计

### 1. 插件化架构
- **组件插件**：支持自定义组件扩展
- **Service 插件**：支持自定义 Service 实现
- **主题插件**：支持主题定制

### 2. 多端适配
- **响应式设计**：自适应不同设备
- **PWA 支持**：渐进式 Web 应用
- **原生封装**：支持 Electron/Tauri 封装

### 3. 国际化
- **i18n 支持**：预留国际化接口
- **多语言**：支持多语言切换
- **时区处理**：支持不同时区

### 4. 后端接入
- **API 抽象**：统一的 Service 接口
- **配置切换**：环境变量控制存储实现
- **数据迁移**：支持数据平滑迁移

## 监控与维护

### 1. 错误监控
- **错误边界**：React 错误边界捕获渲染错误
- **异常上报**：预留错误上报接口
- **日志记录**：关键操作日志记录

### 2. 性能监控
- **性能指标**：关键性能指标监控
- **用户体验**：用户体验指标收集
- **资源加载**：资源加载性能分析

### 3. 用户行为分析
- **事件追踪**：用户行为事件追踪
- **使用统计**：功能使用情况统计
- **A/B 测试**：支持 A/B 测试框架

---

**文档版本**: v1.0  
**最后更新**: 2026-09-16  
**维护者**: 开发团队
