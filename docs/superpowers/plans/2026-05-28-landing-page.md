# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public marketing landing page at `/`, move app routes to `/app/*`, and add login/register modals reachable from the landing page nav.

**Architecture:** LandingPage at `/` manages two modal components (LoginModal, RegisterModal). All existing app routes gain an `/app` prefix. ProtectedRoute redirects unauthenticated users to `/` with state that auto-opens the login modal. AppShell NavLinks are updated to match the new paths.

**Tech Stack:** React 19, React Router DOM 7, Tailwind CSS 4, Radix UI Dialog (via existing `@/components/ui/dialog`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/App.tsx` | Add `/` → LandingPage route; move app routes under `/app` |
| Modify | `src/components/ProtectedRoute.tsx` | Redirect to `/` with `openLogin: true` state |
| Modify | `src/components/AppShell.tsx` | Update all NavLink paths to `/app/*` |
| Create | `src/components/LoginModal.tsx` | Login form inside Dialog |
| Create | `src/components/RegisterModal.tsx` | Registration form inside Dialog |
| Create | `src/pages/LandingPage.tsx` | Landing page with all sections + modal state |

---

## Task 1: Routing Restructure

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1.1: Update `src/App.tsx`**

Replace the entire file content:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReminderPage from './pages/ReminderPage';
import TimerPage from './pages/TimerPage';
import TodoPage from './pages/TodoPage';
import FinancePage from './pages/FinancePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import AuthProvider from './contexts/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公开页面 */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* 登录后才能用的主体 */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="reminders" element={<ReminderPage />} />
            <Route path="timer" element={<TimerPage />} />
            <Route path="todo" element={<TodoPage />} />
            <Route path="finance" element={<FinancePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 1.2: Update `src/components/ProtectedRoute.tsx`**

Change the unauthenticated redirect (currently `<Navigate to="/login" ...>`):

```tsx
// Find this block (around line 17–18):
if (status === "unauthenticated") {
  return <Navigate to="/login" replace state={{ from: location }} />;
}

// Replace with:
if (status === "unauthenticated") {
  return <Navigate to="/" replace state={{ openLogin: true, from: location }} />;
}
```

- [ ] **Step 1.3: Update `src/components/AppShell.tsx` — navItems and logo**

Find the `navItems` array (currently near the top of the component file) and update all paths:

```tsx
// Replace:
const navItems = [
  { to: '/', label: '首页' },
  { to: '/reminders', label: '提醒' },
  { to: '/timer', label: '计时器' },
  { to: '/todo', label: '待办' },
  { to: '/finance', label: '收支' },
];

// With:
const navItems = [
  { to: '/app', label: '首页' },
  { to: '/app/reminders', label: '提醒' },
  { to: '/app/timer', label: '计时器' },
  { to: '/app/todo', label: '待办' },
  { to: '/app/finance', label: '收支' },
];
```

Also update the logo NavLink `to` prop and the `end` check in the map:

```tsx
// Logo NavLink — change to="/app":
<NavLink
  to="/app"
  className="flex-shrink-0 font-semibold text-sm ..."
>
  助手
</NavLink>

// In the navItems.map, the end prop condition:
// Change:  end={to === '/'}
// To:      end={to === '/app'}
```

- [ ] **Step 1.4: Create a temporary placeholder for LandingPage so the build doesn't break**

Create `src/pages/LandingPage.tsx` with minimal content:

```tsx
export default function LandingPage() {
  return <div className="min-h-screen flex items-center justify-center"><p>Landing Page</p></div>;
}
```

- [ ] **Step 1.5: Run dev server and verify routing works**

```bash
cd frontend && npm run dev
```

Check:
- `http://localhost:5173/` → shows "Landing Page" placeholder
- `http://localhost:5173/app` → redirects to `/` (not logged in) or shows app (logged in)
- `http://localhost:5173/unknown` → redirects to `/`
- Logged-in app nav links go to `/app/reminders`, `/app/timer`, etc.

- [ ] **Step 1.6: Commit**

```bash
git add src/App.tsx src/components/ProtectedRoute.tsx src/components/AppShell.tsx src/pages/LandingPage.tsx
git commit -m "feat: restructure routing — app routes under /app, add landing page stub"
```

---

## Task 2: LoginModal Component

**Files:**
- Create: `src/components/LoginModal.tsx`

- [ ] **Step 2.1: Create `src/components/LoginModal.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ open, onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const id = identifier.trim();
      if (!id || !password) {
        setError('请输入用户名/邮箱和密码');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await login(id, password);
        onClose();
        navigate('/app');
      } catch (err) {
        setError(getErrorMessage(err, '登录失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [identifier, password, submitting, login, navigate, onClose],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>登录助手</DialogTitle>
          <DialogDescription>输入账号继续记录你的每一天</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">用户名或邮箱</label>
            <Input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => { onClose(); onSwitchToRegister(); }}
          >
            没有账号？注册
          </button>
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => { onClose(); navigate('/forgot-password'); }}
          >
            忘记密码
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2.2: Commit**

```bash
git add src/components/LoginModal.tsx
git commit -m "feat: add LoginModal component"
```

---

## Task 3: RegisterModal Component

**Files:**
- Create: `src/components/RegisterModal.tsx`

- [ ] **Step 3.1: Create `src/components/RegisterModal.tsx`**

```tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ open, onClose, onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [codeSending, setCodeSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeMsg, setCodeMsg] = useState('');
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current !== null) {
            clearInterval(cooldownTimer.current);
            cooldownTimer.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (cooldownTimer.current !== null) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    };
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    if (codeSending || cooldown > 0) return;
    const em = email.trim();
    if (!EMAIL_RE.test(em)) {
      setError('请先输入有效邮箱');
      return;
    }
    setError('');
    setCodeMsg('');
    setCodeSending(true);
    try {
      await authApi.sendVerificationCode(em);
      setCodeMsg('验证码已发送，请查收（也检查垃圾箱）。5 分钟内有效。');
      setCooldown(60);
    } catch (err) {
      setError(getErrorMessage(err, '发送失败'));
    } finally {
      setCodeSending(false);
    }
  }, [email, codeSending, cooldown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const u = username.trim();
      const em = email.trim();
      const c = code.trim();
      if (!u || !em || !password || !c) {
        setError('请填写所有字段');
        return;
      }
      if (!/^\d{6}$/.test(c)) {
        setError('验证码须为 6 位数字');
        return;
      }
      if (password.length < 6) {
        setError('密码至少 6 位');
        return;
      }
      if (password !== confirm) {
        setError('两次密码不一致');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await register({ username: u, email: em, password, code: c });
        onClose();
        navigate('/app');
      } catch (err) {
        setError(getErrorMessage(err, '注册失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [username, email, code, password, confirm, submitting, register, navigate, onClose],
  );

  const sendBtnLabel = codeSending
    ? '发送中…'
    : cooldown > 0
      ? `${cooldown}s`
      : '发送验证码';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建账号</DialogTitle>
          <DialogDescription>注册后开始追踪你的每一天</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">用户名</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">邮箱</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleSendCode}
                disabled={codeSending || cooldown > 0 || submitting}
                className="whitespace-nowrap shrink-0"
              >
                {sendBtnLabel}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">验证码（6 位）</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              autoComplete="one-time-code"
              disabled={submitting}
            />
            {codeMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{codeMsg}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">确认密码</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '注册中…' : '注册'}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          已有账号？
          <button
            type="button"
            className="ml-1 hover:text-foreground underline transition-colors"
            onClick={() => { onClose(); onSwitchToLogin(); }}
          >
            去登录
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/RegisterModal.tsx
git commit -m "feat: add RegisterModal component"
```

---

## Task 4: LandingPage Component

**Files:**
- Modify: `src/pages/LandingPage.tsx` (replace the stub from Task 1)

- [ ] **Step 4.1: Replace `src/pages/LandingPage.tsx` with the full implementation**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Button } from '@/components/ui/button';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

interface LocationState {
  openLogin?: boolean;
}

export default function LandingPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Redirect already-authenticated users straight to the app
  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  // Auto-open login modal when ProtectedRoute redirected here
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.openLogin) {
      setLoginOpen(true);
    }
  }, [location.state]);

  // Show nothing while auth status is resolving to avoid flash
  if (status === 'initializing') return null;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-base">助手</span>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              功能
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              关于
            </a>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <Button variant="outline" size="sm" onClick={() => setLoginOpen(true)}>
              登录
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              注册
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            ✦ AI 驱动的个人效率工具
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            一句话，管好你的每一天
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            输入自然语言，AI 自动识别并分类到提醒、计时、待办或记账 — 无需手动填表。
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              className="px-6 py-2.5"
              onClick={() => setRegisterOpen(true)}
            >
              免费开始使用
            </Button>
            <Button
              variant="outline"
              className="px-6 py-2.5"
              onClick={() =>
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              了解功能 ↓
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">四大核心功能</h2>
            <p className="text-muted-foreground text-sm">每项功能都支持自然语言输入，AI 帮你解析</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                emoji: '📅',
                title: '智能提醒',
                desc: '"30 分钟后提醒我喝水" — 自动解析时间，到点推送通知',
              },
              {
                emoji: '⏱️',
                title: '番茄计时',
                desc: '内置番茄钟与自定义计时，底部悬浮控件随时可见',
              },
              {
                emoji: '✅',
                title: '待办清单',
                desc: '快速记录任务，支持图片附件，完成一键勾选',
              },
              {
                emoji: '💰',
                title: '收支记录',
                desc: 'AI 自动分类，图表统计收支，层级分类随意管理',
              },
            ].map((f) => (
              <div key={f.title} className="border border-border rounded-xl p-5">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <div className="font-semibold mb-1">{f.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Highlight ── */}
      <section id="about" className="py-16 px-4 bg-muted/40">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <div className="flex-1">
            <span className="inline-block bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              ✦ AI 核心能力
            </span>
            <h3 className="text-xl font-bold mb-3 leading-snug">
              一句话，同时搞定多件事
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              "午饭花了 15 元，下午 3 点提醒我开会，再帮我加个番茄钟"
              <br />
              — AI 识别出记账 + 提醒 + 计时，一次全部处理。
            </p>
            <Button onClick={() => setRegisterOpen(true)}>立即体验</Button>
          </div>
          <div className="flex-shrink-0 w-full sm:w-52 bg-background border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">输入示例</div>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm leading-relaxed mb-3">
              "午饭花了 15 元，30 分钟后提醒我喝水"
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded px-2 py-1 text-xs">
                ✓ 记账：餐饮 ¥15
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded px-2 py-1 text-xs">
                ✓ 提醒：喝水 30min
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2025 助手 · 一句话管好你的每一天
      </footer>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4.2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before proceeding.

- [ ] **Step 4.3: Smoke test in browser**

```bash
npm run dev
```

Verify:
1. `http://localhost:5173/` → landing page with navbar, hero, features, AI section, footer
2. Click "登录" top-right → login modal opens
3. Click "没有账号？注册" in login modal → login closes, register opens
4. Click "已有账号？去登录" in register modal → register closes, login opens
5. Click "免费开始使用" in hero → register modal opens
6. Click "了解功能 ↓" → page scrolls to features section
7. Visit `http://localhost:5173/app` while logged out → redirects to `/` and login modal auto-opens
8. Log in via modal → redirects to `/app` and app works normally
9. Visit `http://localhost:5173/` while already logged in → immediately redirects to `/app`
10. Dark mode: toggle theme and verify landing page colors look correct

- [ ] **Step 4.4: Commit**

```bash
git add src/pages/LandingPage.tsx
git commit -m "feat: implement landing page with login/register modals"
```

- [ ] **Step 4.5: Push**

```bash
git push
```
