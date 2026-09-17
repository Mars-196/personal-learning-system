/* ============================================================
   任务阶段页面
   - 大阶段包含 n 个子阶段（树形展示）
   - 显示重要程度、起止日期、倒计时、任务进度
   - 添加 / 编辑 / 删除阶段
   - 点击阶段查看该阶段下的任务
   ============================================================ */

import { useEffect, useState } from 'react';
import { useStageStore } from '../store/stageStore';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { EmptyState } from '../components/EmptyState';
import { PriorityBadge } from '../components/Badges';
import type { StageNode } from '../types';
import { countdownText, formatDateCN } from '../utils';

export function StagesPage() {
  const openModal = useUIStore((s) => s.openModal);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const pushToast = useUIStore((s) => s.pushToast);

  const tree = useStageStore((s) => s.tree);
  const load = useStageStore((s) => s.load);
  const deleteStage = useStageStore((s) => s.deleteStage);

  const allTasks = useTaskStore((s) => s.allTasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);

  /** 展开查看任务的阶段 id */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** 只显示未过期的阶段 */
  const [hideExpired, setHideExpired] = useState(false);

  useEffect(() => {
    load();
    loadAllTasks();
  }, [load, loadAllTasks]);

  const filterTree = (nodes: StageNode[]): StageNode[] =>
    nodes
      .map((n) => ({ ...n, children: filterTree(n.children) }))
      .filter((n) => !hideExpired || n.countdown >= 0 || n.children.length > 0);

  const visibleTree = hideExpired ? filterTree(tree) : tree;

  const handleDelete = (node: StageNode) => {
    const childCount = node.children.length;
    askConfirm({
      title: '删除阶段',
      message: childCount > 0
        ? `「${node.name}」下还有 ${childCount} 个子阶段，将一并删除。阶段内的任务不会被删除，会变为未分配阶段。确定继续吗？`
        : `确定要删除阶段「${node.name}」吗？阶段内的任务不会被删除，会变为未分配阶段。`,
      confirmText: '删除',
      onConfirm: async () => {
        await deleteStage(node.id);
        await loadAllTasks();
        pushToast('阶段已删除');
      },
    });
  };

  /** 渲染单个阶段卡片 */
  const renderStage = (node: StageNode, isChild = false) => {
    const rate = node.taskTotal > 0 ? Math.round((node.taskDone / node.taskTotal) * 100) : 0;
    const expanded = expandedId === node.id;
    const stageTasks = allTasks
      .filter((t) => t.stageId === node.id)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return a.priority - b.priority;
      });

    return (
      <div key={node.id} className={`stage-card${isChild ? ' stage-card--child' : ''}`}>
        <div className="stage-card__head">
          <div className="stage-card__main">
            <div className="stage-card__title">
              <span>{node.name}</span>
              <PriorityBadge priority={node.priority} />
              {node.countdown < 0 && (
                <span className="badge badge--overdue">已结束</span>
              )}
            </div>

            {node.description && (
              <div className="stage-card__desc">{node.description}</div>
            )}

            <div className="stage-card__meta">
              <span className="badge badge--date">
                {formatDateCN(node.startDate)} → {formatDateCN(node.endDate)}
              </span>
              <span
                className={`badge ${
                  node.countdown < 0 ? 'badge--overdue'
                    : node.countdown <= 3 ? 'badge--due-today'
                    : 'badge--priority'
                }`}
              >
                {countdownText(node.endDate)}
              </span>
              <span className="badge badge--stage">
                任务 {node.taskDone}/{node.taskTotal}
              </span>
              {node.children.length > 0 && (
                <span className="badge badge--priority">
                  {node.children.length} 个子阶段
                </span>
              )}
            </div>
          </div>

          <div className="stage-card__actions">
            <button
              className="icon-btn"
              onClick={() => setExpandedId(expanded ? null : node.id)}
              aria-label={expanded ? '收起任务列表' : '查看阶段内任务'}
              aria-expanded={expanded}
              title={expanded ? '收起任务' : '查看任务'}
              type="button"
            >
              {expanded ? '▾' : '▸'}
            </button>
            <button
              className="icon-btn"
              onClick={() => openModal('stage-form', node.id)}
              aria-label={`编辑阶段「${node.name}」`}
              title="编辑"
              type="button"
            >
              ✎
            </button>
            <button
              className="icon-btn icon-btn--danger"
              onClick={() => handleDelete(node)}
              aria-label={`删除阶段「${node.name}」`}
              title="删除"
              type="button"
            >
              🗑
            </button>
          </div>
        </div>

        {/* 任务进度条 */}
        {node.taskTotal > 0 && (
          <div className="stage-card__progress" role="presentation">
            <div className="stage-card__progress-fill" style={{ width: `${rate}%` }} />
          </div>
        )}

        {/* 展开的任务列表 */}
        {expanded && (
          <div className="stage-card__children">
            <div className="stage-children-title">
              阶段内任务（{stageTasks.length}）
            </div>
            {stageTasks.length === 0 ? (
              <p className="text-sm text-muted">
                该阶段下还没有任务，可在「任务栏」添加任务时选择此阶段
              </p>
            ) : (
              stageTasks.map((t) => (
                <div
                  key={t.id}
                  className="task-picker__item"
                  style={{ cursor: 'default', borderRadius: 'var(--r-sm)' }}
                >
                  <span style={{ flexShrink: 0 }} aria-hidden="true">
                    {t.status === 'done' ? '✅' : '⬜'}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      color: t.status === 'done' ? 'var(--c-text-muted)' : undefined,
                    }}
                  >
                    {t.title || '无标题'}
                  </span>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))
            )}
          </div>
        )}

        {/* 子阶段 */}
        {node.children.length > 0 && (
          <div className="stage-card__children">
            <div className="stage-children-title">
              子阶段（{node.children.length}）
            </div>
            {node.children.map((child) => renderStage(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">任务阶段</h1>
          <p className="page-subtitle">
            用阶段组织长期目标，一个大阶段可包含多个子阶段
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => openModal('stage-form')}
          type="button"
        >
          + 添加阶段
        </button>
      </div>

      {/* 视图控制 */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-chip${!hideExpired ? ' is-active' : ''}`}
          onClick={() => setHideExpired(false)}
        >
          全部阶段
        </button>
        <button
          type="button"
          className={`filter-chip${hideExpired ? ' is-active' : ''}`}
          onClick={() => setHideExpired(true)}
        >
          进行中
        </button>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
          共 {tree.length} 个大阶段
        </span>
      </div>

      {visibleTree.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎯"
            title={tree.length === 0 ? '还没有任务阶段' : '没有进行中的阶段'}
            text={
              tree.length === 0
                ? '创建一个阶段，把长期目标拆解成可跟踪的时间段'
                : '所有阶段都已结束，试试查看「全部阶段」'
            }
            action={
              tree.length === 0 ? (
                <button
                  className="btn btn--primary"
                  onClick={() => openModal('stage-form')}
                  type="button"
                >
                  + 添加阶段
                </button>
              ) : (
                <button
                  className="btn btn--ghost"
                  onClick={() => setHideExpired(false)}
                  type="button"
                >
                  查看全部阶段
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="stage-list">
          {visibleTree.map((node) => renderStage(node))}
        </div>
      )}

    </>
  );
}
