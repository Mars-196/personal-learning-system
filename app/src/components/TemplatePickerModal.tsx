/* ============================================================
   模板选择弹窗：新建笔记时先选模板
   选模板 → 直接创建笔记（content 预填模板内容）
   不使用模板 → 直接创建空白笔记
   ============================================================ */

import { useEffect } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../store/uiStore';
import { useTemplateStore } from '../store/templateStore';
import { useReflectionStore } from '../store/reflectionStore';
import { today } from '../utils';

export function TemplatePickerModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const pushToast = useUIStore((s) => s.pushToast);

  const templates = useTemplateStore((s) => s.templates);
  const load = useTemplateStore((s) => s.load);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const createReflection = useReflectionStore((s) => s.createReflection);

  const open = modal === 'template-picker';

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // 选模板 → 直接创建笔记（模板内容预填）→ 关闭弹窗 → ReflectionsPage 选中它
  const handlePick = async (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    closeModal();
    // 创建带模板内容的笔记
    const note = await createReflection({
      title: '',
      content: tpl.content,
      category: tpl.category ?? '',
      date: today(),
      relatedTaskIds: [],
    });
    // 通知 ReflectionsPage 选中这条笔记
    sessionStorage.setItem('pending-note-id', note.id);
  };

  // 不使用模板 → 直接创建空白笔记
  const handleSkip = async () => {
    closeModal();
    sessionStorage.removeItem('pending-template');
    const note = await createReflection({
      title: '',
      content: '',
      category: '',
      date: today(),
      relatedTaskIds: [],
    });
    sessionStorage.setItem('pending-note-id', note.id);
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteTemplate(id);
    pushToast(`模板「${name}」已删除`);
  };

  // 从已有模板动态派生分类列表
  const categories = Array.from(new Set(templates.map((t) => t.category).filter((c) => c)));

  return (
    <Modal
      open={open}
      title="选择笔记模板"
      onClose={closeModal}
      footer={
        <button className="btn btn--ghost" onClick={handleSkip} type="button">
          不使用模板，直接写
        </button>
      }
      size="wide"
    >
      {templates.length === 0 ? (
        <div className="empty-hint">
          <div className="empty-hint__icon">📋</div>
          <div className="empty-hint__title">还没有模板</div>
          <div className="empty-hint__desc">
            先写一条笔记，在表单里点「存为模板」就能把当前骨架保存下来。
          </div>
        </div>
      ) : (
        <div className="template-grid">
          {categories.map((cat) => (
            <div key={cat} className="template-group">
              <div className="template-group__label">{cat}</div>
              <div className="template-group__items">
                {templates
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <div key={t.id} className="template-card">
                      <div className="template-card__head">
                        <button
                          type="button"
                          className="template-card__pick"
                          onClick={() => handlePick(t.id)}
                          aria-label={`使用模板「${t.name}」`}
                        >
                          {t.name}
                        </button>
                        <button
                          type="button"
                          className="template-card__del"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id, t.name);
                          }}
                          aria-label={`删除模板「${t.name}」`}
                          title="删除"
                        >
                          ✕
                        </button>
                      </div>
                      <button
                        type="button"
                        className="template-card__preview-btn"
                        onClick={() => handlePick(t.id)}
                        aria-label={`使用模板「${t.name}」`}
                      >
                        {t.content.slice(0, 80)}…
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* 未分类模板 */}
          {templates.filter((t) => !t.category).length > 0 && (
            <div className="template-group">
              <div className="template-group__label">未分类</div>
              <div className="template-group__items">
                {templates
                  .filter((t) => !t.category)
                  .map((t) => (
                    <div key={t.id} className="template-card">
                      <div className="template-card__head">
                        <button
                          type="button"
                          className="template-card__pick"
                          onClick={() => handlePick(t.id)}
                          aria-label={`使用模板「${t.name}」`}
                        >
                          {t.name}
                        </button>
                        <button
                          type="button"
                          className="template-card__del"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id, t.name);
                          }}
                          aria-label={`删除模板「${t.name}」`}
                          title="删除"
                        >
                          ✕
                        </button>
                      </div>
                      <button
                        type="button"
                        className="template-card__preview-btn"
                        onClick={() => handlePick(t.id)}
                        aria-label={`使用模板「${t.name}」`}
                      >
                        {t.content.slice(0, 80)}…
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
