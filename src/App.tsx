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
              <div className="max-w-3xl mx-auto px-4 flex gap-6 h-14 items-center">
                <NavLink to="/" className="font-semibold text-base text-foreground tracking-tight">助手</NavLink>
                {navItems.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="切换主题"
                  className="ml-auto"
                >
                  {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </Button>
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
