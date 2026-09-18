/* ============================================================
   任务表单弹窗：新建 / 编辑
   字段：标题、描述、分类、重要程度、起始结束日期、所属阶段
   ============================================================ */

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../store/uiStore';
import { useTaskStore } from '../store/taskStore';
import { useStageStore } from '../store/stageStore';
import {
  PRIORITY_ROMAN, CATEGORY_LABEL,
  type TaskCategory, type Priority, type TaskInput,
} from '../types';
import { today, validateDateRange } from '../utils';

const CATEGORIES: TaskCategory[] = ['work', 'study', 'life'];
const PRIORITIES: Priority[] = [1, 2, 3, 4];

/** 表单内部状态 */
interface FormState {
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  startDate: string;
  endDate: string;
  stageId: string;
  reminderTime: string;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  category: 'work',
  priority: 3,
  startDate: today(),
  endDate: today(),
  stageId: '',
  reminderTime: '',
});

export function TaskFormModal() {
  const modal = useUIStore((s) => s.modal);
  const editingId = useUIStore((s) => s.editingId);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const currentDate = useUIStore((s) => s.currentDate);

  const tasks = useTaskStore((s) => s.allTasks);
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const stages = useStageStore((s) => s.stages);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = modal === 'task-form';
  const isEdit = open && !!editingId;

  // 打开时初始化表单
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editingId) {
      const t = tasks.find((x) => x.id === editingId);
      if (t) {
        setForm({
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          startDate: t.startDate,
          endDate: t.endDate,
          stageId: t.stageId,
          reminderTime: t.reminderTime || '',
        });
        return;
      }
    }
    setForm({ ...emptyForm(), startDate: currentDate, endDate: currentDate });
  }, [open, editingId, tasks, currentDate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = '请输入任务标题';
    else if (form.title.trim().length > 100) next.title = '标题不超过 100 字';

    const dateErr = validateDateRange(form.startDate, form.endDate);
    if (dateErr) next.date = dateErr;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload: TaskInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        status: 'pending',
        startDate: form.startDate,
        endDate: form.endDate,
        stageId: form.stageId,
        reminderTime: form.reminderTime,
      };

      if (isEdit && editingId) {
        // 编辑时保留原有完成状态
        const original = tasks.find((x) => x.id === editingId);
        await updateTask(editingId, {
          ...payload,
          status: original?.status ?? 'pending',
        });
        pushToast('任务已更新');
      } else {
        await createTask(payload);
        pushToast('任务已添加');
      }
      closeModal();
    } catch {
      pushToast('保存失败，请重试', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑任务' : '添加任务'}
      onClose={busy ? () => undefined : closeModal}
      footer={
        <>
          <button className="btn btn--ghost" onClick={closeModal} disabled={busy} type="button">
            取消
          </button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={busy} type="button">
            {busy ? '保存中…' : isEdit ? '保存修改' : '添加任务'}
          </button>
        </>
      }
    >
      {/* 标题 */}
      <div className="field">
        <label className="field__label" htmlFor="tf-title">
          任务标题<span className="field__required">*</span>
        </label>
        <input
          id="tf-title"
          className="input"
          placeholder="例如：完成季度报告初稿"
          value={form.title}
          maxLength={100}
          onChange={(e) => set('title', e.target.value)}
          autoFocus
        />
        {errors.title && <div className="field__error">{errors.title}</div>}
      </div>

      {/* 描述 */}
      <div className="field">
        <label className="field__label" htmlFor="tf-desc">任务描述</label>
        <textarea
          id="tf-desc"
          className="textarea"
          placeholder="补充任务的具体内容、要求或备注…"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      {/* 分类 */}
      <div className="field">
        <span className="field__label">任务分类</span>
        <div className="priority-group">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`priority-opt${form.category === c ? ' is-active' : ''}`}
              onClick={() => set('category', c)}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {/* 重要程度 */}
      <div className="field">
        <span className="field__label">重要程度</span>
        <div className="priority-group">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              className={`priority-opt${form.priority === p ? ' is-active' : ''}`}
              onClick={() => set('priority', p)}
            >
              {PRIORITY_ROMAN[p]}
            </button>
          ))}
        </div>
        <div className="field__hint">Ⅰ 最重要，Ⅳ 最不重要</div>
      </div>

      {/* 起止日期 */}
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="tf-start">起始日期</label>
          <input
            id="tf-start"
            type="date"
            className="input"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="tf-end">结束日期</label>
          <input
            id="tf-end"
            type="date"
            className="input"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>
      </div>
      {errors.date && <div className="field__error" style={{ marginTop: -10 }}>{errors.date}</div>}

      {/* 所属阶段 */}
      <div className="field">
        <label className="field__label" htmlFor="tf-stage">所属阶段</label>
        <select
          id="tf-stage"
          className="select"
          value={form.stageId}
          onChange={(e) => set('stageId', e.target.value)}
        >
          <option value="">不分配阶段</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {stages.length === 0 && (
          <div className="field__hint">还没有任务阶段，可先到「阶段」页面创建</div>
        )}
      </div>

      {/* 提醒时间 */}
      <div className="field">
        <label className="field__label" htmlFor="tf-reminder">提醒时间</label>
        <input
          id="tf-reminder"
          type="datetime-local"
          className="input"
          value={form.reminderTime}
          onChange={(e) => set('reminderTime', e.target.value)}
        />
        <div className="field__hint">留空则不设置提醒（需要在设置中开启通知权限）</div>
      </div>
    </Modal>
  );
}
