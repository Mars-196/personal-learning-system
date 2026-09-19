/* ============================================================
   应用主框架：登录守卫 + 导航 + 页面切换 + 全局弹窗
   ============================================================ */

import { useState, useEffect } from 'react';
import { TasksPage } from './pages/TasksPage';
import { StagesPage } from './pages/StagesPage';
import { ReflectionsPage } from './pages/ReflectionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { TaskFormModal } from './components/TaskFormModal';
import { StageFormModal } from './components/StageFormModal';
import { TemplatePickerModal } from './components/TemplatePickerModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/ToastContainer';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';

type Tab = 'tasks' | 'stages' | 'reflections' | 'settings';

const TABS: { key: Tab; label: string; shortcut: string }[] = [
  { key: 'tasks', label: '任务栏', shortcut: '1' },
  { key: 'stages', label: '阶段', shortcut: '2' },
  { key: 'reflections', label: '笔记', shortcut: '3' },
  { key: 'settings', label: '设置', shortcut: '4' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('tasks');
  const openModal = useUIStore((s) => s.openModal);

  // 登录态
  const userId = useAuthStore((s) => s.userId);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);

  // 应用启动时建立 auth 订阅
  useEffect(() => {
    const unsub = useAuthStore.getState().init();
    return () => unsub?.();
  }, []);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // 输入框、文本域、下拉框、contentEditable 编辑器内不触发快捷键
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (isEditable) return;
      if (e.key === '1') setTab('tasks');
      if (e.key === '2') setTab('stages');
      if (e.key === '3') setTab('reflections');
      if (e.key === '4') setTab('settings');
      if ((e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openModal('task-form');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  // 正在初始化 —— 不渲染任何内容，避免闪烁
  if (loading) {
    return (
      <div className="boot-screen" aria-label="加载中">
        <div className="boot-screen__spinner" />
      </div>
    );
  }

  // 未登录 —— 只显示登录页
  if (!userId) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      {/* 顶部导航 */}
      <header className="top-nav">
        <div className="top-nav__inner">
          <div className="top-nav__brand">
            <span className="top-nav__brand-mark" aria-hidden="true">✓</span>
            <span>个人成长系统</span>
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

          <button
            type="button"
            className="top-nav__signout"
            onClick={() => signOut()}
            title="退出登录"
          >
            退出
          </button>
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
      <TemplatePickerModal />
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
