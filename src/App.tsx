import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useTheme } from './hooks/useTheme';
import HomePage from './pages/HomePage';
import ReminderPage from './pages/ReminderPage';
import TimerPage from './pages/TimerPage';
import TodoPage from './pages/TodoPage';
import FinancePage from './pages/FinancePage';
import RemindersProvider from './contexts/RemindersProvider';
import ActiveTimerProvider from './contexts/ActiveTimerProvider';
import NotificationBanner from './components/NotificationBanner';
import TimerWidget from './components/TimerWidget';

const navItems = [
  { to: '/', label: '首页' },
  { to: '/reminders', label: '提醒' },
  { to: '/timer', label: '计时器' },
  { to: '/todo', label: '待办' },
  { to: '/finance', label: '收支' },
];

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <RemindersProvider>
        <ActiveTimerProvider>
          <div className="h-screen flex flex-col bg-background text-foreground">
            <nav className="flex-shrink-0 bg-background border-b">
              <div className="max-w-3xl mx-auto h-12 flex items-center">
                <NavLink
                  to="/"
                  className="flex-shrink-0 font-semibold text-sm text-foreground tracking-tight px-4 whitespace-nowrap"
                >
                  助手
                </NavLink>
                <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-center gap-1 px-1">
                    {navItems.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                          `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
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
                <div className="flex-shrink-0 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label="切换主题"
                  >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </nav>
            <main className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full max-w-3xl mx-auto px-4 py-6 flex flex-col">
                <NotificationBanner />
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/reminders" element={<ReminderPage />} />
                    <Route path="/timer" element={<TimerPage />} />
                    <Route path="/todo" element={<TodoPage />} />
                    <Route path="/finance" element={<FinancePage />} />
                  </Routes>
                </div>
              </div>
            </main>
            <TimerWidget />
          </div>
        </ActiveTimerProvider>
      </RemindersProvider>
    </BrowserRouter>
  );
}
