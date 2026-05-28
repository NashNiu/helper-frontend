import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/useAuth';
import { useWindowControlsOverlay } from '../hooks/useWindowControlsOverlay';
import NotificationBanner from './NotificationBanner';
import TimerWidget from './TimerWidget';
import RemindersProvider from '../contexts/RemindersProvider';
import ActiveTimerProvider from '../contexts/ActiveTimerProvider';

const navItems = [
  { to: '/app', label: '首页' },
  { to: '/app/reminders', label: '提醒' },
  { to: '/app/timer', label: '计时器' },
  { to: '/app/todo', label: '待办' },
  { to: '/app/finance', label: '收支' },
];

/**
 * 登录后用户能看到的主壳：导航、用户菜单、主题切换。
 * 子路由通过 <Outlet /> 注入，ProtectedRoute 已经在外层挡住未登录用户。
 */
export default function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { controlsWidth } = useWindowControlsOverlay();

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <RemindersProvider>
      <ActiveTimerProvider>
        <div className="h-screen flex flex-col bg-background text-foreground">
          <nav className="flex-shrink-0 bg-background border-b wco-drag">
            <div className="max-w-3xl mx-auto h-12 flex items-center">
              <NavLink
                to="/app"
                className="flex-shrink-0 font-semibold text-sm text-foreground tracking-tight px-4 whitespace-nowrap wco-no-drag"
              >
                助手
              </NavLink>
              <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden wco-no-drag">
                <div className="flex items-center gap-1 px-1">
                  {navItems.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/app'}
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors wco-no-drag ${
                          isActive
                            ? 'text-foreground bg-muted'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <div
                className="flex-shrink-0 flex items-center gap-1 px-2 wco-no-drag"
                style={controlsWidth > 0 ? { paddingRight: controlsWidth } : undefined}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="切换主题"
                  className="wco-no-drag"
                >
                  {theme === 'dark' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </Button>
                <div className="relative wco-no-drag" ref={menuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="rounded-full px-2.5 h-8 wco-no-drag"
                  >
                    <span className="text-xs">{user?.username ?? '未登录'}</span>
                  </Button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-popover shadow-md py-1 z-50 wco-no-drag">
                      <div className="px-3 py-1.5">
                        <div className="text-sm font-medium truncate">{user?.username}</div>
                        <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted wco-no-drag"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                      >
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>
          <main className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full max-w-3xl mx-auto px-4 py-6 flex flex-col">
              <NotificationBanner />
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Outlet />
              </div>
            </div>
          </main>
          <TimerWidget />
        </div>
      </ActiveTimerProvider>
    </RemindersProvider>
  );
}
