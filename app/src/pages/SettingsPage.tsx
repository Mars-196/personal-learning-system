/* ============================================================
   设置页面：数据备份与安全说明
   - 导出全部数据为 JSON 文件（防丢失）
   - 导入 JSON 备份（合并 / 覆盖两种模式）
   - 显示当前数据量与存储方式说明
   - 通知权限管理
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { backupService } from '../services';
import { useTaskStore } from '../store/taskStore';
import { useStageStore } from '../store/stageStore';
import { useReflectionStore } from '../store/reflectionStore';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '../store/uiStore';
import { startNotificationChecker, stopNotificationChecker, startDailySummary, stopDailySummary, sendBrowserNotification } from '../utils';
import type { BackupData } from '../types';

export function SettingsPage() {
  const pushToast = useUIStore((s) => s.pushToast);
  const askConfirm = useUIStore((s) => s.askConfirm);

  const allTasks = useTaskStore((s) => s.allTasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const stages = useStageStore((s) => s.stages);
  const loadStages = useStageStore((s) => s.load);
  const reflections = useReflectionStore((s) => s.reflections);
  const loadReflections = useReflectionStore((s) => s.load);

  const permission = useNotificationStore((s) => s.permission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const loadNotifications = useNotificationStore((s) => s.load);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingData, setPendingData] = useState<BackupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false);

  const refreshAll = async () => {
    await Promise.all([loadAllTasks(), loadStages(), loadReflections(), loadNotifications()]);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setNotificationEnabled(permission === 'granted');
  }, [permission]);

  const handleNotificationPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      pushToast('通知权限已授予');
      startNotificationChecker();
    } else if (result === 'denied') {
      pushToast('通知权限被拒绝，请在浏览器设置中手动开启', 'error');
    } else {
      pushToast('通知权限请求已取消');
    }
  };

  const handleTestNotification = () => {
    sendBrowserNotification('测试通知 · 个人成长系统', {
      body: '看到这条，说明权限没问题。',
      icon: '/icon-192.png',
    });
    pushToast('已发送测试通知');
  };

  const toggleNotificationChecker = () => {
    if (notificationEnabled) {
      stopNotificationChecker();
      pushToast('通知检查器已停止');
    } else {
      startNotificationChecker();
      pushToast('通知检查器已启动');
    }
    setNotificationEnabled(!notificationEnabled);
  };

  const toggleDailySummary = () => {
    if (dailySummaryEnabled) {
      stopDailySummary();
      pushToast('每日总结通知已停止');
    } else {
      startDailySummary(20); // 20:00 发送
      pushToast('每日总结通知已启动，将在20:00发送');
    }
    setDailySummaryEnabled(!dailySummaryEnabled);
  };

  /* ---------------- 导出 ---------------- */
  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await backupService.exportAll();
      const jsonText = JSON.stringify(data, null, 2);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const fileName = `笔记系统备份_${stamp}.json`;

      // 优先使用 File System Access API（可选择保存位置）
      // Chrome 86+ / Edge 86+ / Opera 72+ 支持
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'JSON 备份文件',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonText);
          await writable.close();
          pushToast(`已导出 ${data.tasks.length} 条任务、${data.stages.length} 个阶段`);
          return;
        } catch (err: unknown) {
          // 用户取消选择（AbortError）—— 不报错，静默返回
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          // 其他异常降级到传统下载方式
          console.warn('showSaveFilePicker 失败，降级为浏览器下载：', err);
        }
      }

      // 降级方案：传统 <a download>（存到默认下载目录）
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      pushToast(`已导出 ${data.tasks.length} 条任务、${data.stages.length} 个阶段（存至默认下载目录）`);
    } catch {
      pushToast('导出失败，请重试', 'error');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- 导入 ---------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // 基本结构校验
      if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.stages)) {
        pushToast('文件不是有效的备份文件', 'error');
        return;
      }

      setPendingData(data);
      pushToast('文件已读取，请选择导入方式', 'info');
    } catch {
      pushToast('文件解析失败，请确认是有效的 JSON 备份', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doImport = (mode: 'merge' | 'replace') => {
    if (!pendingData) return;
    const run = async () => {
      setBusy(true);
      try {
        const result = await backupService.importAll(pendingData, mode);
        await refreshAll();
        pushToast(
          `导入完成：任务 ${result.tasks} 条，阶段 ${result.stages} 个，笔记 ${result.reflections} 条`,
        );
      } catch {
        pushToast('导入失败，请重试', 'error');
      } finally {
        setBusy(false);
        setPendingData(null);
      }
    };

    if (mode === 'replace') {
      askConfirm({
        title: '覆盖导入',
        message: '覆盖导入会先清空当前全部数据，再写入备份文件中的内容。此操作不可恢复，建议先导出当前数据留存。确定继续吗？',
        confirmText: '清空并导入',
        onConfirm: run,
      });
    } else {
      run();
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">设置</h1>
          <p className="page-subtitle">数据备份与存储说明</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* 数据概况 */}
        <div className="card card--pad">
          <div className="card-title">📊 当前数据</div>
          <ul className="info-list">
            <li><strong>任务</strong><span>{allTasks.length} 条</span></li>
            <li><strong>阶段</strong><span>{stages.length} 个</span></li>
            <li><strong>笔记</strong><span>{reflections.length} 条</span></li>
            <li><strong>存储位置</strong><span>浏览器 IndexedDB（本地）</span></li>
          </ul>
        </div>

        {/* 通知设置 */}
        <div className="card card--pad">
          <div className="card-title">🔔 通知设置</div>

          {/* 一键通知权限横幅 —— 三态可视化 */}
          <div className={`notif-banner notif-banner--${permission}`}>
            <div className="notif-banner__icon" aria-hidden="true">
              {permission === 'granted' ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l4 4 10-10" />
                </svg>
              ) : permission === 'denied' ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l9 16H3z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <circle cx="12" cy="17" r="0.8" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.5 21a1.5 1.5 0 01-3 0" />
                </svg>
              )}
            </div>

            <div className="notif-banner__body">
              {permission === 'granted' ? (
                <>
                  <div className="notif-banner__title">通知已开启</div>
                  <p className="notif-banner__desc">任务完成、提醒到点都会弹出来。</p>
                </>
              ) : permission === 'denied' ? (
                <>
                  <div className="notif-banner__title">权限被拒了</div>
                  <p className="notif-banner__desc">点地址栏左边小锁，把通知改成"允许"。</p>
                </>
              ) : (
                <>
                  <div className="notif-banner__title">开启桌面提醒</div>
                  <p className="notif-banner__desc">任务到点、阶段快到期，浏览器会喊你。</p>
                </>
              )}
            </div>

            <div className="notif-banner__action">
              {permission === 'granted' ? (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={handleTestNotification}
                  disabled={busy}
                  type="button"
                >
                  试发一条
                </button>
              ) : permission === 'denied' ? (
                <span className="notif-banner__hint">需手动开启</span>
              ) : (
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleNotificationPermission}
                  disabled={busy}
                  type="button"
                >
                  一键开启
                </button>
              )}
            </div>
          </div>

          {permission === 'granted' && (
            <>
              <div className="setting-row">
                <div>
                  <div className="setting-row__label">通知检查器</div>
                  <div className="setting-row__desc">
                    自动检查待发送的通知提醒
                  </div>
                </div>
                <button
                  className={`btn btn--sm ${notificationEnabled ? 'btn--danger-soft' : 'btn--primary'}`}
                  onClick={toggleNotificationChecker}
                  disabled={busy}
                  type="button"
                >
                  {notificationEnabled ? '停止检查' : '启动检查'}
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-row__label">每日总结通知</div>
                  <div className="setting-row__desc">
                    每天晚上20:00发送任务完成情况总结
                  </div>
                </div>
                <button
                  className={`btn btn--sm ${dailySummaryEnabled ? 'btn--danger-soft' : 'btn--primary'}`}
                  onClick={toggleDailySummary}
                  disabled={busy}
                  type="button"
                >
                  {dailySummaryEnabled ? '停止总结' : '启动总结'}
                </button>
              </div>
            </>
          )}

          <div className="setting-row">
            <div>
              <div className="setting-row__label">通知说明</div>
              <div className="setting-row__desc">
                需要浏览器支持，部分浏览器可能需要手动开启通知权限
              </div>
            </div>
          </div>
        </div>

        {/* 备份与恢复 */}
        <div className="card card--pad">
          <div className="card-title">💾 备份与恢复</div>

          <div className="setting-row">
            <div>
              <div className="setting-row__label">导出备份</div>
              <div className="setting-row__desc">
                把全部数据导出为 JSON 文件，可选择保存位置
              </div>
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleExport}
              disabled={busy}
              type="button"
            >
              {busy ? '处理中…' : '导出'}
            </button>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-row__label">导入备份</div>
              <div className="setting-row__desc">
                从 JSON 备份文件恢复数据，可选择合并或覆盖
              </div>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              type="button"
            >
              选择文件
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {pendingData && (
            <div
              className="card card--pad mt-md"
              style={{ background: 'var(--c-primary-lighter)' }}
            >
              <div className="card-title" style={{ fontSize: 14 }}>已读取备份文件</div>
              <ul className="info-list">
                <li><strong>导出时间</strong><span>{pendingData.exportedAt ?? '未知'}</span></li>
                <li><strong>任务</strong><span>{pendingData.tasks.length} 条</span></li>
                <li><strong>阶段</strong><span>{pendingData.stages.length} 个</span></li>
                <li><strong>笔记</strong><span>{(pendingData.reflections ?? []).length} 条</span></li>
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => doImport('merge')}
                  disabled={busy}
                  type="button"
                >
                  合并导入（保留现有）
                </button>
                <button
                  className="btn btn--danger-soft btn--sm"
                  onClick={() => doImport('replace')}
                  disabled={busy}
                  type="button"
                >
                  覆盖导入（清空现有）
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setPendingData(null)}
                  disabled={busy}
                  type="button"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 存储说明 */}
        <div className="card card--pad">
          <div className="card-title">🔒 数据存储说明</div>
          <ul className="info-list">
            <li><strong>存储方式</strong><span>数据保存在当前浏览器的 IndexedDB 中</span></li>
            <li><strong>访问隔离</strong><span>IndexedDB 按域名隔离，其他网站无法读取</span></li>
            <li><strong>数据风险</strong><span>清除浏览器数据会导致本地数据丢失，请定期导出备份</span></li>
            <li><strong>输入安全</strong><span>所有输入内容经 React 自动转义，不会被当作代码执行</span></li>
          </ul>
        </div>

        {/* 后端接入说明 */}
        <div className="card card--pad">
          <div className="card-title">🔌 后期接入后端</div>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            项目已预留 service 抽象层，接入后端时业务代码无需改动：
          </p>
          <ol className="info-list" style={{ listStyle: 'decimal', paddingLeft: 18 }}>
            <li>在 <code>src/services/storage/api.ts</code> 中补全后端接口地址</li>
            <li>在 <code>.env</code> 中配置 <code>VITE_API_BASE_URL</code></li>
            <li>把 <code>src/services/index.ts</code> 的实现从 <code>indexedDB*</code> 换成 <code>api*</code></li>
            <li>页面与 store 层代码无需任何修改</li>
          </ol>
        </div>
      </div>
    </>
  );
}
