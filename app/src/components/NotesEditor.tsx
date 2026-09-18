/* ============================================================
   笔记富文本编辑器（contenteditable）
   - 无弹窗表单，实时编辑 + 自动保存
   - 工具栏：粗体/斜体/下划线/标题/列表/链接/清除格式
   - content 字段存 HTML 字符串
   ============================================================ */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReflectionStore } from '../store/reflectionStore';
import { useTemplateStore } from '../store/templateStore';
import { useUIStore } from '../store/uiStore';

interface Props {
  /** 当前笔记 id，空字符串表示新建笔记（未保存到 DB） */
  noteId: string;
}

/** 检测字符串是否包含 HTML 标签 */
function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

/** 把旧数据的纯文本包一层 <p> 标签 */
function normalizeContent(raw: string): string {
  if (!raw) return '';
  if (looksLikeHtml(raw)) return raw;
  // 纯文本 → 转 HTML（换行变 <br>）
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
}

/** HTML 转纯文本（用于标题自动提取、列表预览等） */
function htmlToPlain(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent?.trim() ?? '';
}

export function NotesEditor({ noteId }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusRef = useRef<'idle' | 'saving' | 'saved'>('idle');

  const pushToast = useUIStore((s) => s.pushToast);

  const reflections = useReflectionStore((s) => s.reflections);
  const createReflection = useReflectionStore((s) => s.createReflection);
  const updateReflection = useReflectionStore((s) => s.updateReflection);

  const createTemplate = useTemplateStore((s) => s.createTemplate);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // 当前选中的笔记
  const currentNote = reflections.find((r) => r.id === noteId);

  // 模板预填数据
  const [pendingTpl, setPendingTpl] = useState<{ content: string; category: string } | null>(null);

  // 切换笔记时初始化编辑器内容
  useEffect(() => {
    // 先检查 sessionStorage 有没有模板预填
    const raw = sessionStorage.getItem('pending-template');
    if (raw) {
      try {
        setPendingTpl(JSON.parse(raw));
      } catch { /* ignore */ }
      sessionStorage.removeItem('pending-template');
    }
  }, [noteId]); // noteId 变化时检查一次

  useEffect(() => {
    if (!editorRef.current) return;

    if (currentNote) {
      // 编辑已有笔记
      setTitle(currentNote.title);
      setCategory(currentNote.category ?? '');
      setDate(currentNote.date);
      const normalized = normalizeContent(currentNote.content);
      if (editorRef.current.innerHTML !== normalized) {
        editorRef.current.innerHTML = normalized;
      }
    } else if (pendingTpl) {
      // 新建 + 模板预填
      setTitle('');
      setCategory(pendingTpl.category ?? '');
      setDate(new Date().toISOString().slice(0, 10));
      const normalized = normalizeContent(pendingTpl.content);
      editorRef.current.innerHTML = normalized;
      setPendingTpl(null);
    } else {
      // 空白新建
      setTitle('');
      setCategory('');
      setDate(new Date().toISOString().slice(0, 10));
      editorRef.current.innerHTML = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, currentNote?.id, pendingTpl]);

  // ========== 自动保存（防抖 800ms） ==========
  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveIndicator('saving');
    debounceRef.current = setTimeout(async () => {
      const contentHtml = editorRef.current?.innerHTML ?? '';
      const plainText = htmlToPlain(contentHtml);
      const finalTitle = title.trim() || plainText.slice(0, 30) || '无标题';

      const payload = {
        title: finalTitle,
        category: category.trim(),
        date,
        content: contentHtml,
      };

      try {
        if (currentNote) {
          await updateReflection(currentNote.id, payload);
        } else {
          await createReflection({
            ...payload,
            relatedTaskIds: [],
          });
        }
        saveStatusRef.current = 'saved';
        setSaveIndicator('saved');
        setTimeout(() => {
          if (saveStatusRef.current === 'saved') setSaveIndicator('idle');
        }, 1200);
      } catch (err) {
        console.error('保存笔记失败:', err);
        pushToast('保存失败，请检查网络', 'error');
        setSaveIndicator('idle');
      }
    }, 800);
  }, [currentNote, title, category, date, updateReflection, createReflection, pushToast]);

  // 标题/分类/日期变化也触发保存
  useEffect(() => {
    if (noteId || title || category || date) scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, category, date]);

  // ========== 工具栏命令 ==========
  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    scheduleSave();
  };

  const setHeading = (level: number) => {
    // H1-H3 用 formatBlock
    exec('formatBlock', `h${level}`);
  };

  const insertLink = () => {
    const url = prompt('输入链接地址：', 'https://');
    if (url && url !== 'https://') exec('createLink', url);
  };

  const insertImage = () => {
    const url = prompt('输入图片链接：');
    if (url) exec('insertImage', url);
  };

  // ========== 存为模板 ==========
  const handleSaveAsTemplate = async () => {
    const contentHtml = editorRef.current?.innerHTML ?? '';
    const plain = htmlToPlain(contentHtml);
    if (!plain) {
      pushToast('没有内容，存不了模板', 'error');
      return;
    }
    const name = templateName.trim() || title.trim() || plain.slice(0, 20) || '未命名模板';
    await createTemplate({
      name,
      category: category.trim(),
      content: contentHtml,
    });
    pushToast(`模板「${name}」已保存`);
    setSaveTemplateOpen(false);
    setTemplateName('');
  };

  return (
    <div className="notes-editor">
      {/* 顶部元信息栏 */}
      <div className="notes-editor__meta">
        <input
          className="notes-editor__title"
          placeholder="笔记标题（自动从正文提取）"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="notes-editor__meta-row">
          <input
            type="date"
            className="notes-editor__date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="notes-editor__category"
            list="ne-category-options"
            placeholder="分类（可选，回车保存）"
            value={category}
            maxLength={30}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="ne-category-options" />
          <div className={`notes-editor__save-ind notes-editor__save-ind--${saveIndicator}`}>
            {saveIndicator === 'saving' ? '保存中…' : saveIndicator === 'saved' ? '✓ 已保存' : ''}
          </div>
        </div>
      </div>

      {/* 存为模板展开 */}
      {saveTemplateOpen && (
        <div className="notes-editor__tpl-row">
          <input
            className="input"
            placeholder="模板名字，如「每日复盘」"
            value={templateName}
            maxLength={40}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn--primary btn--sm" onClick={handleSaveAsTemplate} type="button">
            保存模板
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setSaveTemplateOpen(false)} type="button">
            取消
          </button>
        </div>
      )}

      {/* 富文本工具栏 */}
      <div className="notes-toolbar">
        <select
          className="notes-toolbar__select"
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') exec('formatBlock', 'p');
            else if (val === 'h1' || val === 'h2' || val === 'h3') setHeading(parseInt(val[1], 10));
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>样式</option>
          <option value="h1">标题 1</option>
          <option value="h2">标题 2</option>
          <option value="h3">标题 3</option>
          <option value="p">正文</option>
        </select>

        <span className="notes-toolbar__sep" />

        <button type="button" className="notes-toolbar__btn" onClick={() => exec('bold')} title="加粗 (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('italic')} title="斜体 (Ctrl+I)">
          <em>I</em>
        </button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('underline')} title="下划线 (Ctrl+U)">
          <u>U</u>
        </button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('strikeThrough')} title="删除线">
          <s>S</s>
        </button>

        <span className="notes-toolbar__sep" />

        <button type="button" className="notes-toolbar__btn" onClick={() => exec('insertUnorderedList')} title="无序列表">
          • ≡
        </button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('insertOrderedList')} title="有序列表">
          1. ≡
        </button>

        <span className="notes-toolbar__sep" />

        <button type="button" className="notes-toolbar__btn" onClick={() => exec('justifyLeft')} title="左对齐">⯇</button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('justifyCenter')} title="居中">≡</button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('justifyRight')} title="右对齐">⯈</button>

        <span className="notes-toolbar__sep" />

        <button type="button" className="notes-toolbar__btn" onClick={insertLink} title="插入链接">🔗</button>
        <button type="button" className="notes-toolbar__btn" onClick={insertImage} title="插入图片">🖼</button>
        <button type="button" className="notes-toolbar__btn" onClick={() => exec('removeFormat')} title="清除格式">✕</button>

        <span className="notes-toolbar__sep" />

        <button
          type="button"
          className={`notes-toolbar__btn${saveTemplateOpen ? ' is-active' : ''}`}
          onClick={() => setSaveTemplateOpen((v) => !v)}
          title="把当前内容骨架存为模板"
        >
          📋 存为模板
        </button>
      </div>

      {/* 编辑区 */}
      <div
        ref={editorRef}
        className="notes-editor__content"
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onBlur={scheduleSave}
        data-placeholder="在这里写下你的想法…"
      />
    </div>
  );
}
