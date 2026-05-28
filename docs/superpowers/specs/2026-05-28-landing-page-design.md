# Landing Page Design Spec

**Date:** 2026-05-28  
**Status:** Approved

---

## Overview

Add a public marketing landing page at `/` with login and register modals accessible from the top-right nav. All existing app routes move under `/app/*`. Unauthenticated users visiting any `/app/*` route are redirected to `/`.

---

## Routing Changes

| Before | After |
|--------|-------|
| `/` → ProtectedRoute → AppShell → HomePage | `/` → LandingPage (public) |
| `/reminders` → ReminderPage | `/app` → ProtectedRoute → AppShell → HomePage |
| `/timer` → TimerPage | `/app/reminders` → ReminderPage |
| `/todo` → TodoPage | `/app/timer` → TimerPage |
| `/finance` → FinancePage | `/app/todo` → TodoPage |
| `/login` → LoginPage | `/app/finance` → FinancePage |
| `/register` → RegisterPage | `/login`, `/register`, `/forgot-password`, `/reset-password` kept as-is |

**ProtectedRoute** redirect target changes from `/login` to `/` (landing page opens login modal via location state `{ openLogin: true }`).

**After successful login** (from modal), navigate to `/app`.

---

## New Files

### `src/pages/LandingPage.tsx`

Main landing page component. Manages modal open state (`loginOpen`, `registerOpen`). Reads `location.state.openLogin` on mount and auto-opens the login modal if present.

**Sections (top to bottom):**

1. **Navbar** — sticky, `bg-background border-b`
   - Left: logo "助手" (plain text, font-semibold)
   - Right: "功能" and "关于" anchor links (scroll to `#features` and `#about`) + divider + "登录" (outline button) + "注册" (default button)

2. **Hero** — gradient background (`from-slate-50 to-orange-50`), centered
   - Badge pill: "✦ AI 驱动的个人效率工具"
   - `h1`: "一句话，管好你的每一天"
   - Subtitle: AI parsing description
   - CTAs: "免费开始使用" (opens register modal) + "了解功能 ↓" (scrolls to `#features`)

3. **Features** (`id="features"`) — `bg-background`
   - Section heading: "四大核心功能"
   - 2×2 grid of feature cards: 智能提醒 📅 / 番茄计时 ⏱️ / 待办清单 ✅ / 收支记录 💰
   - Each card: emoji, title, one-sentence description

4. **AI Highlight** (`id="about"`) — `bg-muted/40`
   - Left: badge, h3, description paragraph, "立即体验" CTA (opens register modal)
   - Right: input example bubble showing AI parsing result (记账 + 提醒 tags)

5. **Footer** — `border-t`, one-line copyright

### `src/components/LoginModal.tsx`

Dialog wrapping the login form. Props: `open: boolean`, `onClose: () => void`, `onSwitchToRegister: () => void`.

Form fields: identifier (用户名或邮箱), password. On success: `navigate('/app')`. Links: "没有账号？注册" (calls `onSwitchToRegister`), "忘记密码" (navigates to `/forgot-password`). Reuses `useAuth().login` and `getErrorMessage`.

### `src/components/RegisterModal.tsx`

Dialog wrapping the registration form. Props: `open: boolean`, `onClose: () => void`, `onSwitchToLogin: () => void`.

Form fields: 用户名, 邮箱 + 发送验证码 button (60s cooldown), 验证码 (6 digits), 密码, 确认密码. On success: `navigate('/app')`. Link: "已有账号？去登录" (calls `onSwitchToLogin`). Reuses `useAuth().register`, `authApi.sendVerificationCode`, and `getErrorMessage`. Logic ported directly from existing `RegisterPage.tsx`.

---

## Modified Files

### `src/App.tsx`

- Add `<Route path="/" element={<LandingPage />} />` outside the auth guard
- Wrap all app routes under `<Route path="/app" element={<ProtectedRoute>...}>`:
  - `index` → `<HomePage />`
  - `reminders`, `timer`, `todo`, `finance` stay the same (just under `/app/`)
- Keep `/login`, `/register`, `/forgot-password`, `/reset-password` as standalone routes unchanged
- Keep `<Route path="*" element={<Navigate to="/" replace />} />` catch-all pointing to `/` (landing page)

### `src/components/ProtectedRoute.tsx`

- Change redirect from `<Navigate to="/login" ...>` to `<Navigate to="/" state={{ openLogin: true, from: location }} replace />`

### `src/components/AppShell.tsx`

- Update all internal `NavLink` `to` props to include `/app` prefix:
  - `'/'` → `'/app'` (keep `end` prop so it only matches exactly `/app`)
  - `'reminders'` → `'/app/reminders'`
  - `'timer'` → `'/app/timer'`
  - `'todo'` → `'/app/todo'`
  - `'finance'` → `'/app/finance'`
- Also update the `navItems` array `to` values and the logo `NavLink` href accordingly

---

## Behavior Details

- **Switching between modals:** Clicking "没有账号？注册" in LoginModal closes it and opens RegisterModal (and vice versa). State managed in LandingPage.
- **Auto-open login modal:** When ProtectedRoute redirects to `/`, landing page reads `location.state?.openLogin` and opens LoginModal immediately.
- **Authenticated users visiting `/`:** LandingPage reads `AuthContext.status`. While `initializing`, show nothing (or a minimal blank screen — the ProtectedRoute spinner is not used here). Once `authenticated`, `useEffect` fires a `navigate('/app', { replace: true })`. If `unauthenticated`, render the page normally.
- **"忘记密码":** Navigates to existing `/forgot-password` page (no changes to that flow).
- **Dark mode:** Landing page respects the existing theme system (`bg-background`, `text-foreground`, Tailwind dark: classes).
- **PWA:** No changes needed — service worker and manifest are unaffected.

---

## Out of Scope

- Pricing section
- User testimonials / FAQ section
- Screenshot / app preview image
- Internationalization
- SEO meta tags
