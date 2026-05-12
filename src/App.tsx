import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ReminderPage from './pages/ReminderPage';
import TimerPage from './pages/TimerPage';
import TodoPage from './pages/TodoPage';
import FinancePage from './pages/FinancePage';

const navItems = [
  { to: '/', label: '提醒' },
  { to: '/timer', label: '计时器' },
  { to: '/todo', label: '待办' },
  { to: '/finance', label: '收支' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 flex gap-6 h-14 items-center">
            <span className="font-bold text-lg text-indigo-600">助手</span>
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<ReminderPage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/finance" element={<FinancePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
