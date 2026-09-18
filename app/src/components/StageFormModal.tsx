/* ============================================================
   阶段表单弹窗：新建 / 编辑
   字段：名称、描述、重要程度、起止日期、父阶段
   ============================================================ */

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../store/uiStore';
import { useStageStore } from '../store/stageStore';
import { PRIORITY_ROMAN, type Priority, type StageInput } from '../types';
import { today, validateDateRange } from '../utils';

const PRIORITIES: Priority[] = [1, 2, 3, 4];

interface FormState {
  name: string;
  description: string;
  priority: Priority;
  startDate: string;
  endDate: string;
  parentId: string;
  reflection: string;
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  priority: 3,
  startDate: today(),
  endDate: today(),
  parentId: '',
  reflection: '',
});

export function StageFormModal() {
  const modal = useUIStore((s) => s.modal);
  const editingId = useUIStore((s) => s.editingId);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const stages = useStageStore((s) => s.stages);
  const createStage = useStageStore((s) => s.createStage);
  const updateStage = useStageStore((s) => s.updateStage);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = modal === 'stage-form';
  const isEdit = open && !!editingId;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editingId) {
      const s = stages.find((x) => x.id === editingId);
      if (s) {
        setForm({
          name: s.name,
          description: s.description,
          priority: s.priority,
          startDate: s.startDate,
          endDate: s.endDate,
          parentId: s.parentId ?? '',
          reflection: s.reflection ?? '',
        });
        return;
      }
    }
    setForm(emptyForm());
  }, [open, editingId, stages]);

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
    if (!form.name.trim()) next.name = '请输入阶段名称';
    else if (form.name.trim().length > 50) next.name = '名称不超过 50 字';

    const dateErr = validateDateRange(form.startDate, form.endDate);
    if (dateErr) next.date = dateErr;

    // 防止把自己设为父阶段，或形成循环
    if (isEdit && editingId) {
      if (form.parentId === editingId) next.parentId = '不能将自己设为父阶段';
      else if (form.parentId && isDescendant(editingId, form.parentId)) {
        next.parentId = '不能选择自己的子阶段作为父阶段';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** 判断 candidateId 是否为 nodeId 的后代 */
  const isDescendant = (nodeId: string, candidateId: string): boolean => {
    const node = stages.find((s) => s.id === candidateId);
    if (!node || !node.parentId) return false;
    if (node.parentId === nodeId) return true;
    return isDescendant(nodeId, node.parentId);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload: StageInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        priority: form.priority,
        startDate: form.startDate,
        endDate: form.endDate,
        parentId: form.parentId || null,
        reflection: form.reflection.trim() || undefined,
      };

      if (isEdit && editingId) {
        await updateStage(editingId, payload);
        pushToast('阶段已更新');
      } else {
        await createStage(payload);
        pushToast('阶段已创建');
      }
      closeModal();
    } catch {
      pushToast('保存失败，请重试', 'error');
    } finally {
      setBusy(false);
    }
  };

  // 父阶段候选：排除自己
  const parentOptions = stages.filter((s) => s.id !== editingId);

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑阶段' : '添加任务阶段'}
      onClose={busy ? () => undefined : closeModal}
      footer={
        <>
          <button className="btn btn--ghost" onClick={closeModal} disabled={busy} type="button">
            取消
          </button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={busy} type="button">
            {busy ? '保存中…' : isEdit ? '保存修改' : '创建阶段'}
          </button>
        </>
      }
    >
      {/* 名称 */}
      <div className="field">
        <label className="field__label" htmlFor="sf-name">
          阶段名称<span className="field__required">*</span>
        </label>
        <input
          id="sf-name"
          className="input"
          placeholder="例如：2026 上半年产品上线"
          value={form.name}
          maxLength={50}
          onChange={(e) => set('name', e.target.value)}
          autoFocus
        />
        {errors.name && <div className="field__error">{errors.name}</div>}
      </div>

      {/* 描述 */}
      <div className="field">
        <label className="field__label" htmlFor="sf-desc">阶段描述</label>
        <textarea
          id="sf-desc"
          className="textarea"
          placeholder="这个阶段的目标、范围或关键节点…"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
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
          <label className="field__label" htmlFor="sf-start">起始日期</label>
          <input
            id="sf-start"
            type="date"
            className="input"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="sf-end">结束日期</label>
          <input
            id="sf-end"
            type="date"
            className="input"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>
      </div>
      {errors.date && <div className="field__error" style={{ marginTop: -10 }}>{errors.date}</div>}

      {/* 父阶段 */}
      <div className="field">
        <label className="field__label" htmlFor="sf-parent">父阶段</label>
        <select
          id="sf-parent"
          className="select"
          value={form.parentId}
          onChange={(e) => set('parentId', e.target.value)}
        >
          <option value="">无（作为顶级阶段）</option>
          {parentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.parentId && <div className="field__error">{errors.parentId}</div>}
        <div className="field__hint">一个大阶段可包含多个子阶段</div>
      </div>

      {/* 反思笔记 */}
      <div className="field">
        <label className="field__label" htmlFor="sf-reflection">
          阶段反思笔记
          <span className="field__hint" style={{ marginLeft: 6, display: 'inline' }}>（选填）</span>
        </label>
        <textarea
          id="sf-reflection"
          className="textarea"
          placeholder="阶段结束后可以记下复盘、收获、反思…"
          value={form.reflection}
          onChange={(e) => set('reflection', e.target.value)}
          style={{ minHeight: 100 }}
        />
      </div>
    </Modal>
  );
}
