/* ============================================================
   笔记页面 — WebTab 风格双栏布局
   左侧：笔记列表 + 分类筛选 + 新建/模板入口
   右侧：NotesEditor 富文本编辑器（实时编辑 + 自动保存）
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import { useReflectionStore } from '../store/reflectionStore';
import { useUIStore } from '../store/uiStore';
import { NotesEditor } from '../components/NotesEditor';
import { formatDateCN, weekdayCN } from '../utils';

/** HTML → 纯文本预览 */
function htmlPreview(html: string, max: number): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent?.trim() ?? '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function ReflectionsPage() {
  const openModal = useUIStore((s) => s.openModal);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const pushToast = useUIStore((s) => s.pushToast);

  const reflections = useReflectionStore((s) => s.reflections);
  const load = useReflectionStore((s) => s.load);
  const deleteReflection = useReflectionStore((s) => s.deleteReflection);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    load();
    // 检查是否有待选中的笔记（从模板创建后设置）
    const pendingId = sessionStorage.getItem('pending-note-id');
    if (pendingId) {
      sessionStorage.removeItem('pending-note-id');
      setSelectedId(pendingId);
    }
  }, [load]);

  /** 从现有笔记动态派生分类列表 */
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    reflections.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats);
  }, [reflections]);

  /** 左侧列表：排序 + 搜索 + 分类筛选 */
  const visibleList = useMemo(() => {
    let list = [...reflections].sort((a, b) => b.updatedAt - a.updatedAt);

    if (categoryFilter === '__uncategorized__') {
      list = list.filter((r) => !r.category);
    } else if (categoryFilter) {
      list = list.filter((r) => r.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const hay = (r.title + ' ' + htmlPreview(r.content, 500) + ' ' + r.category).toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [reflections, categoryFilter, search]);

  const handleNewNote = () => {
    // 弹模板选择器，选模板后自动创建笔记
    openModal('template-picker');
    setSelectedId(null);
  };

  const handleDelete = async (id: string, title: string) => {
    askConfirm({
      title: '删除笔记',
      message: `确定要删除「${title}」吗？无法恢复。`,
      confirmText: '删除',
      onConfirm: async () => {
        await deleteReflection(id);
        pushToast('已删除');
        if (selectedId === id) setSelectedId(null);
      },
    });
  };

  return (
    <div className="notes-app">
      {/* ============ 左侧列表 ============ */}
      <aside className="notes-sidebar">
        <div className="notes-sidebar__head">
          <h2 className="notes-sidebar__title">笔记</h2>
          <div className="notes-sidebar__btns">
            <button
              className="notes-sidebar__btn"
              onClick={handleNewNote}
              title="创建笔记"
              type="button"
            >
              +
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="notes-sidebar__search">
          <span className="notes-sidebar__search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索笔记…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 分类筛选 */}
        <div className="notes-sidebar__cats">
          <button
            type="button"
            className={`notes-sidebar__cat${categoryFilter === '' ? ' is-active' : ''}`}
            onClick={() => setCategoryFilter('')}
          >
            全部 ({reflections.length})
          </button>
          {allCategories.map((c) => (
            <button
              key={c}
              type="button"
              className={`notes-sidebar__cat${categoryFilter === c ? ' is-active' : ''}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            className={`notes-sidebar__cat${categoryFilter === '__uncategorized__' ? ' is-active' : ''}`}
            onClick={() => setCategoryFilter('__uncategorized__')}
          >
            未分类
          </button>
        </div>

        {/* 笔记列表 */}
        <div className="notes-sidebar__list">
          {visibleList.length === 0 ? (
            <div className="notes-sidebar__empty">
              还没有笔记<br />
              点 + 开始写
            </div>
          ) : (
            visibleList.map((r) => (
              <div
                key={r.id}
                className={`notes-sidebar__item${selectedId === r.id ? ' is-active' : ''}`}
                onClick={() => setSelectedId(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(r.id); }}
              >
                <div className="notes-sidebar__item-title">
                  {r.title || '无标题'}
                  {r.category && (
                    <span className="notes-sidebar__item-cat">{r.category}</span>
                  )}
                </div>
                <div className="notes-sidebar__item-preview">
                  {htmlPreview(r.content, 60) || '（空）'}
                </div>
                <div className="notes-sidebar__item-date">
                  {formatDateCN(r.date)} {weekdayCN(r.date)}
                </div>
                <button
                  className="notes-sidebar__item-del"
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.title); }}
                  title="删除"
                  type="button"
                  aria-label={`删除笔记 ${r.title}`}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ============ 右侧编辑器 ============ */}
      <main className="notes-main">
        {selectedId ? (
          <NotesEditor noteId={selectedId} />
        ) : (
          <div className="notes-empty">
            <div className="notes-empty__icon">📝</div>
            <div className="notes-empty__title">开始写点什么</div>
            <div className="notes-empty__desc">
              点左侧 <strong>+</strong> 创建笔记
            </div>
            <div className="notes-empty__btns">
              <button className="btn btn--primary" onClick={handleNewNote} type="button">
                创建笔记
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
