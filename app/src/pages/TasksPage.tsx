/* ============================================================
   任务栏页面
   - 顶部统计（已完成 / 未完成 / 总数 / 完成率）
   - 日期切换：查看不同日期的任务
   - 阶段切换：查看不同阶段的任务
   - 分类与状态筛选
   - 添加 / 编辑 / 完成 / 删除任务
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useStageStore } from '../store/stageStore';
import { useUIStore } from '../store/uiStore';
import { StatsBar } from '../components/StatsBar';
import { DateNav } from '../components/DateNav';
import { TaskItem } from '../components/TaskItem';
import { EmptyState } from '../components/EmptyState';
import { CATEGORY_LABEL, type Task, type TaskCategory } from '../types';
import { countdown } from '../utils';

type StatusFilter = 'all' | 'pending' | 'done';
type CategoryFilter = 'all' | TaskCategory;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '未完成' },
  { value: 'done', label: '已完成' },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '全部分类' },
  { value: 'work', label: CATEGORY_LABEL.work },
  { value: 'study', label: CATEGORY_LABEL.study },
  { value: 'life', label: CATEGORY_LABEL.life },
];

/** 判断任务是否逾期：截止日期已过且未完成 */
const isOverdue = (t: Task) => countdown(t.endDate) < 0 && t.status !== 'done';

export function TasksPage() {
  const currentDate = useUIStore((s) => s.currentDate);
  const openModal = useUIStore((s) => s.openModal);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const pushToast = useUIStore((s) => s.pushToast);

  // 拉取全量任务，在前端按日期/阶段/分类/状态组合筛选，
  // 这样切换筛选条件时无需反复访问存储层。
  const allTasks = useTaskStore((s) => s.allTasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const stages = useStageStore((s) => s.stages);
  const loadStages = useStageStore((s) => s.load);

  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);

  useEffect(() => {
    loadAllTasks();
    loadStages();
  }, [loadAllTasks, loadStages]);

  /** 阶段 id → 名称 */
  const stageNames = useMemo(() => {
    const map: Record<string, string> = {};
    stages.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [stages]);

  /** 当日任务（起止区间覆盖当前日期） */
  const dayTasks = useMemo(
    () => allTasks.filter((t) => t.startDate <= currentDate && t.endDate >= currentDate),
    [allTasks, currentDate],
  );

  /** 逾期任务：截止日期已过且未完成（绕过日期过滤） */
  const overdueTasks = useMemo(
    () => allTasks.filter(isOverdue),
    [allTasks],
  );

  /** 逾期任务数量（徽标展示用） */
  const overdueCount = overdueTasks.length;

  /** 应用阶段 / 状态 / 分类 / 关键词筛选 */
  const visibleTasks = useMemo(() => {
    // 查看逾期：直接从 allTasks 筛出逾期项，绕过日期过滤
    let list: Task[] = showOverdue ? overdueTasks : dayTasks;

    if (stageFilter !== 'all') {
      list = stageFilter === 'none'
        ? list.filter((t) => !t.stageId)
        : list.filter((t) => t.stageId === stageFilter);
    }
    // 逾期视图已隐含「未完成 + 日期已过」，状态筛选在此场景下跳过
    if (!showOverdue && statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);

    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (t) => t.title.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw),
      );
    }

    // 逾期任务按逾期天数排序（越久越前）；否则未完成在前、重要程度、更新时间
    if (showOverdue) {
      return [...list].sort((a, b) => countdown(a.endDate) - countdown(b.endDate) || b.updatedAt - a.updatedAt);
    }
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return a.priority - b.priority || b.updatedAt - a.updatedAt;
    });
  }, [dayTasks, overdueTasks, showOverdue, stageFilter, statusFilter, categoryFilter, keyword]);

  const handleToggle = async (id: string) => {
    const target = allTasks.find((t) => t.id === id);
    await toggleTask(id);
    if (target?.status === 'pending') pushToast('已完成，记得写条笔记 📝');
  };

  const handleDelete = (task: Task) => {
    askConfirm({
      title: '删除任务',
      message: `确定要删除「${task.title || '无标题'}」吗？删除后无法恢复。`,
      confirmText: '删除',
      onConfirm: async () => {
        await deleteTask(task.id);
        pushToast('任务已删除');
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">任务栏</h1>
          <p className="page-subtitle">管理每日待办，完成后记得回顾笔记</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => openModal('task-form')}
          type="button"
        >
          + 添加任务
        </button>
      </div>

      {/* 日期导航 —— 仅非逾期视图显示 */}
      {!showOverdue && (
        <div className="card card--pad mb-md">
          <DateNav />
        </div>
      )}

      {/* 统计：overdue 模式显示逾期统计，否则基于当日任务 */}
      <StatsBar tasks={showOverdue ? overdueTasks : dayTasks} />

      {/* 筛选栏 */}
      <div className="filter-bar">
        {/* 逾期任务 —— 特殊筛选，带数量徽标 */}
        <button
          type="button"
          className={`filter-chip filter-chip--overdue${showOverdue ? ' is-active' : ''}`}
          onClick={() => setShowOverdue((v) => !v)}
          aria-label="查看逾期任务"
        >
          逾期任务
          {overdueCount > 0 && (
            <span className="filter-chip__badge">{overdueCount}</span>
          )}
        </button>

        <span style={{ width: 1, height: 20, background: 'var(--c-border)' }} aria-hidden="true" />

        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`filter-chip${statusFilter === o.value && !showOverdue ? ' is-active' : ''}`}
            onClick={() => { setShowOverdue(false); setStatusFilter(o.value); }}
          >
            {o.label}
          </button>
        ))}

        <span style={{ width: 1, height: 20, background: 'var(--c-border)' }} aria-hidden="true" />

        {CATEGORY_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`filter-chip${categoryFilter === o.value ? ' is-active' : ''}`}
            onClick={() => setCategoryFilter(o.value)}
          >
            {o.value !== 'all' && (
              <span
                className="filter-chip__dot"
                style={{ background: `var(--c-${o.value})` }}
                aria-hidden="true"
              />
            )}
            {o.label}
          </button>
        ))}
      </div>

      {/* 阶段筛选 + 搜索 */}
      <div className="filter-bar">
        <select
          className="select"
          style={{ width: 'auto', minWidth: 150, padding: '6px 32px 6px 12px', fontSize: 13 }}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          aria-label="按阶段筛选"
        >
          <option value="all">全部阶段</option>
          <option value="none">未分配阶段</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input
          className="input"
          style={{ width: 'auto', flex: 1, minWidth: 160, padding: '6px 12px', fontSize: 13 }}
          type="search"
          placeholder="搜索标题或描述…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="搜索任务"
        />

        {(stageFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all' || keyword || showOverdue) && (
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              setStageFilter('all');
              setStatusFilter('all');
              setCategoryFilter('all');
              setKeyword('');
              setShowOverdue(false);
            }}
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 任务列表 */}
      {visibleTasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={showOverdue ? '🎉' : dayTasks.length === 0 ? '🗓️' : '🔍'}
            title={showOverdue ? '没有逾期任务' : dayTasks.length === 0 ? '这一天还没有任务' : '没有符合条件的任务'}
            text={
              showOverdue
                ? '好样的！全部任务都在期限内'
                : dayTasks.length === 0
                  ? '添加一条任务，开始记录今天要做的事'
                  : '试试调整筛选条件，或清除筛选查看全部任务'
            }
            action={
              showOverdue ? (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setShowOverdue(false)}
                >
                  返回今日
                </button>
              ) : dayTasks.length === 0 ? (
                <button
                  className="btn btn--primary"
                  onClick={() => openModal('task-form')}
                  type="button"
                >
                  + 添加任务
                </button>
              ) : (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    setStageFilter('all');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setKeyword('');
                    setShowOverdue(false);
                  }}
                >
                  清除筛选
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="task-list">
          {visibleTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              stageNames={stageNames}
              onToggle={handleToggle}
              onEdit={(id) => openModal('task-form', id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
