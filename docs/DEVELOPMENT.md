# 开发指南

## 文档概述

本文档提供个人成长系统的详细开发指南，包括环境搭建、开发规范、调试技巧等内容，帮助开发者快速上手项目开发。

## 目录

- [环境搭建](#环境搭建)
- [开发命令](#开发命令)
- [项目结构详解](#项目结构详解)
- [代码规范](#代码规范)
- [组件开发指南](#组件开发指南)
- [状态管理规范](#状态管理规范)
- [调试技巧](#调试技巧)
- [测试指南](#测试指南)
- [常见开发场景](#常见开发场景)

## 环境搭建

### 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**: Windows, macOS, Linux
- **浏览器**: Chrome, Firefox, Safari, Edge (最新版本)

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd 个人成长系统
```

#### 2. 进入应用目录

```bash
cd app
```

#### 3. 安装依赖

```bash
npm install
```

如果安装速度较慢，可以使用国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

#### 4. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# API 基础地址（预留）
VITE_API_BASE_URL=http://localhost:3000/api

# 应用标题
VITE_APP_TITLE=个人成长系统
```

#### 5. 启动开发服务器

```bash
npm run dev
```

开发服务器将启动在 `http://localhost:5173`

#### 6. 验证安装

打开浏览器访问 `http://localhost:5173`，确认应用正常运行。

### IDE 配置

#### VS Code 推荐插件

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **TypeScript Importer**: 自动导入 TypeScript 类型
- **Auto Rename Tag**: 自动重命名 HTML 标签
- **Bracket Pair Colorizer**: 括号配对高亮
- **GitLens**: Git 增强工具

#### VS Code 设置

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 开发命令

### 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 代码检查并自动修复
npm run lint -- --fix
```

### 开发服务器选项

```bash
# 指定端口
npm run dev -- --port 3000

# 指定主机
npm run dev -- --host

# 打开浏览器
npm run dev -- --open
```

### 构建选项

```bash
# 构建并分析包大小
npm run build -- --mode analyze

# 构建特定环境
npm run build -- --mode production
```

## 项目结构详解

### 完整目录结构

```
app/
├── public/                      # 静态资源
│   ├── favicon.ico             # 网站图标
│   └── icon-192.png            # PWA 图标
├── src/
│   ├── assets/                 # 资源文件
│   │   ├── hero.png           # 首页图片
│   │   ├── react.svg          # React 图标
│   │   └── vite.svg           # Vite 图标
│   ├── components/             # UI 组件
│   │   ├── Badges.tsx         # 徽章组件
│   │   ├── ConfirmDialog.tsx  # 确认对话框
│   │   ├── DateNav.tsx        # 日期导航
│   │   ├── EmptyState.tsx     # 空状态
│   │   ├── Modal.tsx          # 通用弹窗
│   │   ├── ReflectionFormModal.tsx  # 反思表单
│   │   ├── StageFormModal.tsx # 阶段表单
│   │   ├── StatsBar.tsx       # 统计栏
│   │   ├── TaskFormModal.tsx  # 任务表单
│   │   ├── TaskItem.tsx       # 任务项
│   │   └── ToastContainer.tsx # 提示容器
│   ├── db/                    # 数据库配置
│   │   └── database.ts        # Dexie 数据库
│   ├── hooks/                 # 自定义 Hooks
│   │   └── (预留)
│   ├── pages/                 # 页面组件
│   │   ├── ReflectionsPage.tsx # 反思页面
│   │   ├── SettingsPage.tsx    # 设置页面
│   │   ├── StagesPage.tsx      # 阶段页面
│   │   └── TasksPage.tsx       # 任务页面
│   ├── services/              # 数据服务层
│   │   ├── interfaces.ts      # 服务接口定义
│   │   ├── index.ts           # 服务导出
│   │   └── storage/           # 存储实现
│   │       ├── api.ts         # API 实现（预留）
│   │       └── indexeddb.ts   # IndexedDB 实现
│   ├── store/                 # 状态管理
│   │   ├── notificationStore.ts # 通知状态
│   │   ├── reflectionStore.ts   # 反思状态
│   │   ├── stageStore.ts        # 阶段状态
│   │   ├── taskStore.ts         # 任务状态
│   │   └── uiStore.ts           # UI 状态
│   ├── types/                 # 类型定义
│   │   └── index.ts           # 全局类型
│   ├── utils/                 # 工具函数
│   │   ├── __tests__/         # 测试文件
│   │   ├── index.ts           # 通用工具
│   │   ├── notificationHelper.ts # 通知工具
│   │   └── serviceValidator.ts   # 服务验证
│   ├── App.css                # 应用样式
│   ├── App.tsx                # 应用根组件
│   ├── index.css              # 全局样式
│   ├── main.tsx               # 应用入口
│   └── vite-env.d.ts          # Vite 类型声明
├── .env.example               # 环境变量示例
├── .gitignore                 # Git 忽略文件
├── .oxlintrc.json             # Oxlint 配置
├── index.html                 # HTML 模板
├── package.json               # 项目配置
├── tsconfig.app.json          # TypeScript 应用配置
├── tsconfig.json              # TypeScript 基础配置
├── tsconfig.node.json         # TypeScript Node 配置
└── vite.config.ts             # Vite 配置
```

### 核心文件说明

#### 配置文件

- **package.json**: 项目依赖和脚本配置
- **vite.config.ts**: Vite 构建配置
- **tsconfig.json**: TypeScript 编译配置
- **.oxlintrc.json**: 代码检查配置
- **.env**: 环境变量（不提交到 Git）

#### 入口文件

- **index.html**: HTML 模板，应用挂载点
- **src/main.tsx**: React 应用入口
- **src/App.tsx**: 应用根组件

#### 核心模块

- **src/types/index.ts**: 全局类型定义
- **src/services/**: 数据服务层
- **src/store/**: 状态管理
- **src/pages/**: 页面组件
- **src/components/**: 可复用组件

## 代码规范

### 命名规范

#### 文件命名
- **组件文件**: PascalCase，如 `TaskItem.tsx`
- **工具文件**: camelCase，如 `index.ts`
- **类型文件**: camelCase，如 `index.ts`
- **样式文件**: camelCase，如 `App.css`

#### 变量命名
- **变量/函数**: camelCase，如 `userName`, `getUserData`
- **常量**: UPPER_SNAKE_CASE，如 `API_BASE_URL`
- **类/接口/类型**: PascalCase，如 `UserService`, `UserData`
- **私有成员**: 下划线前缀，如 `_privateMethod`

#### 组件命名
- **组件**: PascalCase，如 `TaskItem`, `StatsBar`
- **Props 接口**: 组件名 + Props，如 `TaskItemProps`

### 代码格式

#### 缩进和空格
- 使用 2 个空格缩进
- 不使用 Tab
- 运算符前后加空格
- 逗号后加空格

#### 行长度
- 单行长度不超过 100 字符
- 长表达式合理换行
- 链式调用每行一个方法

#### 注释规范
```typescript
// 单行注释：简短说明

/**
 * 多行注释：详细说明
 * @param paramName - 参数说明
 * @returns 返回值说明
 */
```

### TypeScript 规范

#### 类型定义
```typescript
// ✅ 推荐：使用 interface 定义对象类型
interface User {
  id: string;
  name: string;
  age: number;
}

// ✅ 推荐：使用 type 定义联合类型
type Status = 'pending' | 'active' | 'completed';

// ❌ 避免：使用 any
const data: any = fetchData();

// ✅ 推荐：使用具体类型或 unknown
const data: unknown = fetchData();
```

#### 函数类型
```typescript
// ✅ 推荐：明确参数和返回值类型
function getUser(id: string): Promise<User> {
  return userService.getById(id);
}

// ✅ 推荐：使用箭头函数
const getUser = (id: string): Promise<User> => {
  return userService.getById(id);
};
```

#### 泛型使用
```typescript
// ✅ 推荐：合理使用泛型
function create<T>(input: T): T {
  return input;
}

// ✅ 推荐：泛型约束
function process<T extends { id: string }>(item: T): T {
  return item;
}
```

### React 规范

#### 组件定义
```typescript
// ✅ 推荐：函数组件 + Hooks
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

export function TaskItem({ task, onToggle }: TaskItemProps) {
  // 组件逻辑
  return <div>{task.title}</div>;
}

// ❌ 避免：类组件（除非必要）
class TaskItem extends React.Component {
  // ...
}
```

#### Hooks 使用
```typescript
// ✅ 推荐：遵循 Hooks 规则
function MyComponent() {
  const [count, setCount] = useState(0);
  const data = useData();
  
  useEffect(() => {
    // 副作用
  }, [count]);
  
  return <div>{count}</div>;
}

// ❌ 避免：在条件语句中使用 Hooks
function MyComponent() {
  if (condition) {
    const [count, setCount] = useState(0); // 错误
  }
}
```

#### Props 传递
```typescript
// ✅ 推荐：解构 Props
function TaskItem({ task, onToggle }: TaskItemProps) {
  return <div onClick={() => onToggle(task.id)}>{task.title}</div>;
}

// ✅ 推荐：使用 Props 接口
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}
```

### 样式规范

#### CSS 类名
```css
/* ✅ 推荐：BEM 命名规范 */
.task-item {}
.task-item__title {}
.task-item--done {}

/* ✅ 推荐：使用 CSS 变量 */
--c-primary: #3b82f6;
--c-text: #1f2937;
```

#### 样式组织
```css
/* 组件样式 */
.component-name {
  /* 布局 */
  display: flex;
  
  /* 盒模型 */
  padding: 16px;
  margin: 8px;
  
  /* 字体 */
  font-size: 14px;
  
  /* 颜色 */
  color: var(--c-text);
  
  /* 其他 */
  border-radius: 8px;
}
```

### 错误处理

#### 异步错误
```typescript
// ✅ 推荐：try-catch 处理异步错误
async function loadData() {
  try {
    const data = await service.getAll();
    return data;
  } catch (error) {
    console.error('加载数据失败:', error);
    throw error;
  }
}
```

#### 错误边界
```typescript
// ✅ 推荐：使用错误边界
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div>出错了</div>;
    }
    return this.props.children;
  }
}
```

## 组件开发指南

### 组件开发流程

#### 1. 创建组件文件
```bash
# 在 components 目录下创建新组件
touch src/components/NewComponent.tsx
```

#### 2. 定义组件接口
```typescript
interface NewComponentProps {
  title: string;
  data: DataType[];
  onAction: (id: string) => void;
  disabled?: boolean;
}
```

#### 3. 实现组件逻辑
```typescript
export function NewComponent({ 
  title, 
  data, 
  onAction, 
  disabled = false 
}: NewComponentProps) {
  // 组件状态
  const [loading, setLoading] = useState(false);
  
  // 组件逻辑
  const handleAction = async (id: string) => {
    if (disabled || loading) return;
    
    setLoading(true);
    try {
      await onAction(id);
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染
  return (
    <div className="new-component">
      <h2>{title}</h2>
      {data.map(item => (
        <div key={item.id}>
          {item.name}
          <button 
            onClick={() => handleAction(item.id)}
            disabled={disabled || loading}
          >
            {loading ? '处理中...' : '操作'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### 4. 添加样式
```css
.new-component {
  padding: 16px;
  border-radius: 8px;
  background: var(--c-bg);
}

.new-component h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
}
```

### 组件最佳实践

#### 组件拆分
```typescript
// ✅ 推荐：合理拆分组件
function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}

// ❌ 避免：组件过于复杂
function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <div className="task-item">
          <input type="checkbox" />
          <span>{task.title}</span>
          <button>编辑</button>
          <button>删除</button>
          {/* 更多复杂逻辑 */}
        </div>
      ))}
    </div>
  );
}
```

#### Props 设计
```typescript
// ✅ 推荐：Props 接口清晰
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}

// ✅ 推荐：提供合理的默认值
function TaskItem({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete, 
  showDate = true 
}: TaskItemProps) {
  // ...
}
```

#### 性能优化
```typescript
// ✅ 推荐：使用 React.memo 优化
export const TaskItem = React.memo(function TaskItem({ task, onToggle }: TaskItemProps) {
  return <div>{task.title}</div>;
});

// ✅ 推荐：使用 useMemo 优化计算
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => a.priority - b.priority);
}, [tasks]);

// ✅ 推荐：使用 useCallback 稳定函数引用
const handleToggle = useCallback((id: string) => {
  onToggle(id);
}, [onToggle]);
```

## 状态管理规范

### Store 设计模式

#### 标准 Store 结构
```typescript
interface TaskState {
  // 状态
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  // 同步操作
  setTasks: (tasks: Task[]) => void;
  setError: (error: string | null) => void;
  
  // 异步操作
  loadTasks: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}
```

#### Store 实现
```typescript
export const useTaskStore = create<TaskState>((set, get) => ({
  // 初始状态
  tasks: [],
  loading: false,
  error: null,
  
  // 同步操作
  setTasks: (tasks) => set({ tasks }),
  setError: (error) => set({ error }),
  
  // 异步操作
  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.getAll();
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: '加载失败', loading: false });
      throw error;
    }
  },
  
  createTask: async (input) => {
    const task = await taskService.create(input);
    set({ tasks: [...get().tasks, task] });
    return task;
  },
}));
```

### 状态选择器

#### 基础选择器
```typescript
// ✅ 推荐：使用选择器获取特定状态
const tasks = useTaskStore((state) => state.tasks);
const loading = useTaskStore((state) => state.loading);
```

#### 计算选择器
```typescript
// ✅ 推荐：使用计算选择器
const pendingTasks = useTaskStore((state) => 
  state.tasks.filter(task => task.status === 'pending')
);

const taskStats = useTaskStore((state) => ({
  total: state.tasks.length,
  done: state.tasks.filter(t => t.status === 'done').length,
  rate: state.tasks.length > 0 
    ? (state.tasks.filter(t => t.status === 'done').length / state.tasks.length) * 100 
    : 0,
}));
```

### 状态更新规范

#### 直接更新
```typescript
// ✅ 推荐：使用 set 直接更新
const updateTasks = useTaskStore((state) => state.setTasks);
updateTasks(newTasks);
```

#### 函数式更新
```typescript
// ✅ 推荐：使用函数式更新
const addTask = useTaskStore((state) => state.addTask);
addTask((tasks) => [...tasks, newTask]);
```

#### 批量更新
```typescript
// ✅ 推荐：批量更新
set({
  tasks: newTasks,
  loading: false,
  error: null,
});
```

## 调试技巧

### React DevTools

#### 安装和使用
1. 安装 React DevTools 浏览器扩展
2. 打开浏览器开发者工具
3. 切换到 React 标签页
4. 查看组件树和状态

#### 主要功能
- **组件树**: 查看组件层次结构
- **Props 和 State**: 查看组件的 props 和 state
- **性能分析**: 分析组件渲染性能
- **时间旅行**: 查看状态变化历史

### Redux DevTools (Zustand)

#### Zustand DevTools 集成
```typescript
import { devtools } from 'zustand/middleware';

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // store 实现
    }),
    { name: 'TaskStore' }
  )
);
```

#### 使用 DevTools
1. 安装 Redux DevTools 扩展
2. 在 store 中集成 devtools 中间件
3. 打开 DevTools 查看状态变化
4. 支持时间旅行调试

### 浏览器调试

#### Console 调试
```typescript
// ✅ 推荐：使用 console.log 调试
console.log('Tasks:', tasks);
console.log('Loading:', loading);
console.error('Error:', error);

// ✅ 推荐：使用 console.group 组织日志
console.group('Task Operation');
console.log('Input:', input);
console.log('Result:', result);
console.groupEnd();
```

#### 断点调试
1. 在源代码中设置断点
2. 打开浏览器开发者工具
3. 切换到 Sources 标签页
4. 在断点处暂停执行
5. 查看变量值和调用栈

#### 网络请求调试
1. 打开开发者工具
2. 切换到 Network 标签页
3. 查看网络请求
4. 分析请求和响应

### 性能调试

#### React Profiler
```typescript
// 使用 React Profiler 分析性能
<Profiler id="TaskList" onRender={onRenderCallback}>
  <TaskList tasks={tasks} />
</Profiler>
```

#### 性能分析
```typescript
// 使用 performance API
const start = performance.now();
await operation();
const end = performance.now();
console.log(`Operation took ${end - start}ms`);
```

## 测试指南

### 单元测试

#### 组件测试
```typescript
// 使用 React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

describe('TaskItem', () => {
  it('should render task title', () => {
    const task = { id: '1', title: 'Test Task', status: 'pending' };
    render(<TaskItem task={task} onToggle={jest.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
  
  it('should call onToggle when clicked', () => {
    const onToggle = jest.fn();
    const task = { id: '1', title: 'Test Task', status: 'pending' };
    render(<TaskItem task={task} onToggle={onToggle} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('1');
  });
});
```

#### 工具函数测试
```typescript
import { formatDateCN, countdown } from './utils';

describe('Date Utils', () => {
  it('should format date correctly', () => {
    expect(formatDateCN('2024-01-15')).toBe('1月15日');
  });
  
  it('should calculate countdown correctly', () => {
    expect(countdown('2024-12-31', '2024-01-01')).toBe(365);
  });
});
```

### 集成测试

#### Service 测试
```typescript
import { taskService } from './services';

describe('TaskService', () => {
  beforeEach(async () => {
    await taskService.clear();
  });
  
  it('should create and retrieve task', async () => {
    const input = { title: 'Test Task', status: 'pending' };
    const task = await taskService.create(input);
    
    expect(task.title).toBe('Test Task');
    
    const retrieved = await taskService.getById(task.id);
    expect(retrieved).toEqual(task);
  });
});
```

## 常见开发场景

### 添加新功能

#### 1. 添加新的数据类型
```typescript
// 1. 在 types/index.ts 中定义类型
export interface NewFeature {
  id: string;
  name: string;
  config: ConfigType;
}

// 2. 在 services/interfaces.ts 中定义接口
export interface NewFeatureService {
  getAll(): Promise<NewFeature[]>;
  create(input: NewFeatureInput): Promise<NewFeature>;
  // ...
}

// 3. 在 services/storage/indexeddb.ts 中实现
export const indexedDBNewFeatureService: NewFeatureService = {
  // 实现细节
};

// 4. 创建 Store
export const useNewFeatureStore = create<NewFeatureState>((set) => ({
  // store 实现
}));

// 5. 创建页面组件
export function NewFeaturePage() {
  // 页面实现
}
```

#### 2. 添加新的 UI 组件
```typescript
// 1. 创建组件文件
// src/components/NewComponent.tsx

// 2. 定义 Props 接口
interface NewComponentProps {
  // props 定义
}

// 3. 实现组件
export function NewComponent(props: NewComponentProps) {
  // 组件实现
}

// 4. 添加样式
// src/components/NewComponent.css

// 5. 在页面中使用
import { NewComponent } from '../components/NewComponent';
```

### 修改现有功能

#### 修改数据结构
```typescript
// 1. 更新类型定义
export interface Task {
  id: string;
  title: string;
  newField: string; // 新增字段
}

// 2. 更新数据库版本
this.version(3).stores({
  tasks: 'id, newField, ...其他索引',
});

// 3. 添加数据迁移逻辑
this.version(3).upgrade(tx => {
  return tx.table('tasks').toCollection().modify(task => {
    task.newField = 'default value';
  });
});
```

#### 修改 UI 组件
```typescript
// 1. 更新 Props 接口
interface TaskItemProps {
  task: Task;
  newProp: string; // 新增 props
}

// 2. 更新组件实现
export function TaskItem({ task, newProp }: TaskItemProps) {
  // 使用新的 props
}

// 3. 更新调用处
<TaskItem task={task} newProp="value" />
```

### 性能优化

#### 列表虚拟化
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 代码分割
```typescript
// 路由级别代码分割
import { lazy, Suspense } from 'react';

const TasksPage = lazy(() => import('./pages/TasksPage'));
const StagesPage = lazy(() => import('./pages/StagesPage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/stages" element={<StagesPage />} />
      </Routes>
    </Suspense>
  );
}
```

---

**文档版本**: v1.0  
**最后更新**: 2026-09-16  
**维护者**: 开发团队
