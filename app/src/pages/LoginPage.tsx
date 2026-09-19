/* ============================================================
   登录页
   一个组件两种模式：登录 / 注册，点链接切换。
   ============================================================ */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

/** inline SVG 眼睛图标（Phosphor 风格，与 Iconify 一致） */
const EyeIcon = ({ closed }: { closed?: boolean }) => closed ? (
  <svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M53.92 34.72a8 8 0 1 0-11.84 10.56l32.18 35.4a125.17 125.17 0 0 0-37.38 26.8C18.39 124.77 8 142 8 160s10.39 35.23 28.88 52.52C54.86 228.27 86.25 240 128 240s73.14-11.73 91.12-27.48c12-10.4 21.51-22.28 26.88-35.18a8 8 0 1 0-14.9-6.26c-4.77 11.36-12.68 21-23.63 28.77a119.44 119.44 0 0 1-175.14 0C24.6 185.77 19.64 170.34 19.64 160a46.67 46.67 0 0 1 4.65-14.55C35.48 128.52 58 103.7 94.77 91.26L146.08 147a36 36 0 0 1-54.59-34.24A8 8 0 0 0 79.9 116.2a52 52 0 1 0 77.57 42.63l29.24 32.16a132.09 132.09 0 0 0 31.55-26.91C219.39 124.77 232 107.54 232 92a159.76 159.76 0 0 0-36.54-45.22A8 8 0 0 0 185 57.72a144 144 0 0 1 29.86 27.87C221.82 92.24 220 102.84 216.68 112A126.26 126.26 0 0 0 185 146.55l-32.91-36.2a36 36 0 0 0-48.8-48.8L62.73 31.36z"/>
  </svg>
) : (
  <svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M128 40c-42.77 0-76.59 25.12-91.56 63.18l-.07.19C17.51 118 27.05 133.78 41.6 147.28A131.44 131.44 0 0 0 128 200a131.44 131.44 0 0 0 86.4-52.72c14.55-13.5 24.09-29.28 25.23-43.91l-.07-.19C204.59 65.12 170.77 40 128 40zm0 144a115.08 115.08 0 0 1-78.15-29.2C36.36 142.85 27.91 128 27.91 128S45.44 100.17 69.86 85.82A115.07 115.07 0 0 1 128 72a115.07 115.07 0 0 1 58.14 13.82C210.56 100.17 228.09 128 228.09 128s-8.45 14.85-21.94 26.8A115.08 115.08 0 0 1 128 184zm0-112a48 48 0 1 0 48 48 48.05 48.05 0 0 0-48-48zm0 80a32 32 0 1 1 32-32 32 32 0 0 1-32 32z"/>
  </svg>
);

type Mode = 'signin' | 'signup';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdHint, setPwdHint] = useState<string>('');

  const { busy, error, signIn, signUp, clearError } = useAuthStore();

  const validatePwd = (pwd: string): string => {
    if (!pwd) return '';
    if (pwd.length < 6) return '密码至少 6 位';
    return '';
  };

  const onPwdChange = (v: string) => {
    setPassword(v);
    setPwdHint(validatePwd(v));
    clearError();
  };

  const canSubmit = email.includes('@') && password.length >= 6 && !pwdHint;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    // 注册成功如果没自动登录（需邮箱验证），留在当前页
    if (ok && mode === 'signup') {
      // 跳到登录模式方便用户直接登录
      setMode('signin');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    clearError();
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo__mark" aria-hidden="true">✓</span>
          <h1 className="login-logo__text">个人成长系统</h1>
        </div>

        <h2 className="login-title">
          {mode === 'signin' ? '欢迎回来' : '开始记录'}
        </h2>
        <p className="login-sub">
          {mode === 'signin' ? '登录你的账号，继续上次的进度' : '注册一个账号，跨设备同步你的数据'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span className="login-field__label">邮箱</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              disabled={busy}
              required
            />
          </label>

          <label className={`login-field${pwdHint ? ' is-error' : ''}`}>
            <span className="login-field__label">密码</span>
            <div className="login-field__input-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => onPwdChange(e.target.value)}
                disabled={busy}
                required
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? '隐藏密码' : '显示密码'}
              >
                <EyeIcon closed={showPwd} />
              </button>
            </div>
            {pwdHint && <span className="login-field__hint">{pwdHint}</span>}
          </label>

          {error && (
            <div className="login-error" role="alert">{error}</div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={!canSubmit || busy}
          >
            {busy ? '处理中…' : mode === 'signin' ? '登录' : '注册'}
          </button>
        </form>

        <div className="login-switch">
          <button
            type="button"
            className="login-switch__btn"
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>

        <p className="login-tip">
          数据加密存储在 Supabase 云端，只有你能访问。
        </p>
      </div>
    </div>
  );
}
