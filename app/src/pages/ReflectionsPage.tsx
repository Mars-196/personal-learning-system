/* ============================================================
   反思页面（RPD「后续可做：每日反思总结」）
   - 按日期浏览反思
   - 新建 / 编辑 / 删除反思
   - 显示关联任务
   ============================================================ */

import { useEffect, useMemo } from 'react';
import { useReflectionStore } from '../store/reflectionStore';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { EmptyState } from '../components/EmptyState';
import { formatDateCN, weekdayCN, truncate } from '../utils';

export function ReflectionsPage() {
  const openModal = useUIStore((s) => s.openModal);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const pushToast = useUIStore((s) => s.pushToast);

  const reflections = useReflectionStore((s) => s.reflections);
  const load = useReflectionStore((s) => s.load);
  const dateFilter = useReflectionStore((s) => s.dateFilter);
  const setDateFilter = useReflectionStore((s) => s.setDateFilter);
  const deleteReflection = useReflectionStore((s) => s.deleteReflection);

  const allTasks = useTaskStore((s) => s.allTasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);

  useEffect(() => {
    load();
    loadAllTasks();
  }, [load, loadAllTasks]);

  /** 任务 id → 标题 */
  const taskTitles = useMemo(() => {
    const map: Record<string, string> = {};
    allTasks.forEach((t) => { map[t.id] = t.title || '无标题'; });
    return map;
  }, [allTasks]);

  const handleDelete = (id: string, title: string) => {
    askConfirm({
      title: '删除反思',
      message: `确定要删除反思「${title}」吗？删除后无法恢复。`,
      confirmText: '删除',
      onConfirm: async () => {
        await deleteReflection(id);
        pushToast('反思已删除');
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">每日反思</h1>
          <p className="page-subtitle">记录每天的复盘与心得，与任务关联回顾</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => openModal('reflection-form')}
          type="button"
        >
          + 写反思
        </button>
      </div>

      {/* 日期筛选 */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-chip${!dateFilter ? ' is-active' : ''}`}
          onClick={() => setDateFilter('')}
        >
          全部反思
        </button>
        <input
          type="date"
          className="input"
          style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="按日期筛选反思"
        />
        {dateFilter && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setDateFilter('')}
            type="button"
          >
            清除日期
          </button>
        )}
      </div>

      {reflections.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📝"
            title={dateFilter ? '这一天还没有反思' : '还没有写过反思'}
            text={
              dateFilter
                ? '换个日期看看，或为这一天补写一条反思'
                : '完成任务后写下复盘：做得好的地方、可以改进的地方'
            }
            action={
              <button
                className="btn btn--primary"
                onClick={() => openModal('reflection-form')}
                type="button"
              >
                + 写反思
              </button>
            }
          />
        </div>
      ) : (
        <div className="reflection-list">
          {reflections.map((r) => (
            <div key={r.id} className="reflection-card">
              <div className="reflection-card__head">
                <span className="reflection-card__title">{r.title}</span>
                <span className="reflection-card__date">
                  {formatDateCN(r.date)} {weekdayCN(r.date)}
                </span>
              </div>

              <div className="reflection-card__content">{r.content}</div>

              {r.relatedTaskIds.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {r.relatedTaskIds.map((tid) => (
                    <span key={tid} className="link-task-chip">
                      🔗 {truncate(taskTitles[tid] ?? '（任务已删除）', 20)}
                    </span>
                  ))}
                </div>
              )}

              <div className="reflection-card__foot">
                <button
                  className="icon-btn"
                  onClick={() => openModal('reflection-form', r.id)}
                  aria-label={`编辑反思「${r.title}」`}
                  title="编辑"
                  type="button"
                >
                  ✎
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => handleDelete(r.id, r.title)}
                  aria-label={`删除反思「${r.title}」`}
                  title="删除"
                  type="button"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
