/* ============================================================
   应用主框架：导航 + 页面切换 + 全局弹窗
   使用轻量 tab 切换；页面增多后可替换为 react-router-dom
   ============================================================ */

import { useState, useEffect } from 'react';
import { TasksPage } from './pages/TasksPage';
import { StagesPage } from './pages/StagesPage';
import { ReflectionsPage } from './pages/ReflectionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TaskFormModal } from './components/TaskFormModal';
import { StageFormModal } from './components/StageFormModal';
import { ReflectionFormModal } from './components/ReflectionFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/ToastContainer';
import { useUIStore } from './store/uiStore';

type Tab = 'tasks' | 'stages' | 'reflections' | 'settings';

const TABS: { key: Tab; label: string; shortcut: string }[] = [
  { key: 'tasks', label: '任务栏', shortcut: '1' },
  { key: 'stages', label: '阶段', shortcut: '2' },
  { key: 'reflections', label: '反思', shortcut: '3' },
  { key: 'settings', label: '设置', shortcut: '4' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('tasks');
  const openModal = useUIStore((s) => s.openModal);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框、文本域或选择框中，不触发快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // 数字键切换页面
      if (e.key === '1') setTab('tasks');
      if (e.key === '2') setTab('stages');
      if (e.key === '3') setTab('reflections');
      if (e.key === '4') setTab('settings');

      // N键新建任务
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal('task-form');
      }

      // ESC键关闭当前弹窗（如果有）
      if (e.key === 'Escape') {
        // 这个逻辑已经在 Modal 组件中处理
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  return (
    <div className="app-shell">
      {/* 顶部导航 */}
      <header className="top-nav">
        <div className="top-nav__inner">
          <div className="top-nav__brand">
            <span className="top-nav__brand-mark" aria-hidden="true">✓</span>
            <span>个人反思系统</span>
          </div>

          <nav className="top-nav__links" aria-label="主导航">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`top-nav__link${tab === t.key ? ' is-active' : ''}`}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                title={`快捷键: ${t.shortcut}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 页面内容 */}
      <main className="main-content">
        <div key={tab} className="page-transition">
          {tab === 'tasks' && <TasksPage />}
          {tab === 'stages' && <StagesPage />}
          {tab === 'reflections' && <ReflectionsPage />}
          {tab === 'settings' && <SettingsPage />}
        </div>
      </main>

      {/* 全局弹窗与提示 */}
      <TaskFormModal />
      <StageFormModal />
      <ReflectionFormModal />
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
