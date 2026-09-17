/* ============================================================
   反思表单弹窗：新建 / 编辑
   字段：日期、标题、正文、关联任务
   ============================================================ */

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../store/uiStore';
import { useReflectionStore } from '../store/reflectionStore';
import { useTaskStore } from '../store/taskStore';
import type { ReflectionInput } from '../types';
import { today, truncate } from '../utils';

export function ReflectionFormModal() {
  const modal = useUIStore((s) => s.modal);
  const editingId = useUIStore((s) => s.editingId);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const currentDate = useUIStore((s) => s.currentDate);

  const reflections = useReflectionStore((s) => s.reflections);
  const createReflection = useReflectionStore((s) => s.createReflection);
  const updateReflection = useReflectionStore((s) => s.updateReflection);

  // 关联任务候选：拉取全部任务
  const allTasks = useTaskStore((s) => s.allTasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);

  const [date, setDate] = useState(today());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [relatedTaskIds, setRelatedTaskIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const open = modal === 'reflection-form';
  const isEdit = open && !!editingId;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setPickerOpen(false);
    loadAllTasks();

    if (editingId) {
      const r = reflections.find((x) => x.id === editingId);
      if (r) {
        setDate(r.date);
        setTitle(r.title);
        setContent(r.content);
        setRelatedTaskIds(r.relatedTaskIds ?? []);
        return;
      }
    }
    setDate(currentDate || today());
    setTitle('');
    setContent('');
    setRelatedTaskIds([]);
  }, [open, editingId, reflections, currentDate, loadAllTasks]);

  const clearError = (key: string) => {
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const toggleTask = (id: string) => {
    setRelatedTaskIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    clearError('content');
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!date) next.date = '请选择日期';
    if (!content.trim()) next.content = '请写下你的反思内容';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload: ReflectionInput = {
        date,
        title: title.trim() || '每日反思',
        content: content.trim(),
        relatedTaskIds,
      };

      if (isEdit && editingId) {
        await updateReflection(editingId, payload);
        pushToast('反思已更新');
      } else {
        await createReflection(payload);
        pushToast('反思已保存');
      }
      closeModal();
    } catch {
      pushToast('保存失败，请重试', 'error');
    } finally {
      setBusy(false);
    }
  };

  const selectedTasks = allTasks.filter((t) => relatedTaskIds.includes(t.id));

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑反思' : '写反思'}
      onClose={busy ? () => undefined : closeModal}
      footer={
        <>
          <button className="btn btn--ghost" onClick={closeModal} disabled={busy} type="button">
            取消
          </button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={busy} type="button">
            {busy ? '保存中…' : '保存反思'}
          </button>
        </>
      }
    >
      {/* 日期 */}
      <div className="field">
        <label className="field__label" htmlFor="rf-date">
          反思日期<span className="field__required">*</span>
        </label>
        <input
          id="rf-date"
          type="date"
          className="input"
          value={date}
          onChange={(e) => { setDate(e.target.value); clearError('date'); }}
        />
        {errors.date && <div className="field__error">{errors.date}</div>}
      </div>

      {/* 标题 */}
      <div className="field">
        <label className="field__label" htmlFor="rf-title">标题</label>
        <input
          id="rf-title"
          className="input"
          placeholder="例如：今日复盘（可留空）"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 正文 */}
      <div className="field">
        <label className="field__label" htmlFor="rf-content">
          反思内容<span className="field__required">*</span>
        </label>
        <textarea
          id="rf-content"
          className="textarea"
          style={{ minHeight: 140 }}
          placeholder="今天做得好的地方？哪里可以改进？有什么新的认识？"
          value={content}
          onChange={(e) => { setContent(e.target.value); clearError('content'); }}
          autoFocus={!isEdit}
        />
        {errors.content && <div className="field__error">{errors.content}</div>}
      </div>

      {/* 关联任务 */}
      <div className="field">
        <span className="field__label">关联任务（可选）</span>

        {selectedTasks.length > 0 && (
          <div>
            {selectedTasks.map((t) => (
              <span key={t.id} className="link-task-chip">
                {truncate(t.title || '无标题', 20)}
                <span
                  className="link-task-chip__x"
                  onClick={() => toggleTask(t.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') toggleTask(t.id); }}
                  aria-label={`移除关联任务 ${t.title}`}
                >
                  ✕
                </span>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {pickerOpen ? '收起任务列表' : '选择要关联的任务'}
        </button>

        {pickerOpen && (
          <div className="task-picker mt-sm">
            {allTasks.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--c-text-muted)' }}>
                暂无任务可关联
              </div>
            ) : (
              allTasks.map((t) => {
                const checked = relatedTaskIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="task-picker__item"
                    onClick={() => toggleTask(t.id)}
                    role="option"
                    aria-selected={checked}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') toggleTask(t.id); }}
                  >
                    <input type="checkbox" checked={checked} readOnly style={{ pointerEvents: 'none' }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {truncate(t.title || '无标题', 30)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--c-text-muted)', flexShrink: 0 }}>
                      {t.status === 'done' ? '已完成' : '进行中'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
        <div className="field__hint">关联任务后，反思与任务形成对应关系，便于复盘</div>
      </div>
    </Modal>
  );
}
