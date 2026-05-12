import { useState, useEffect, useCallback } from 'react';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';
import { useReminders } from '../hooks/useReminders';
import NotificationToast from '../components/NotificationToast';

export default function ReminderPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Reminder | null>(null);

  const handleTrigger = useCallback((r: Reminder) => {
    setToast(r);
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, is_triggered: true } : x));
  }, []);

  const { scheduleOne } = useReminders(handleTrigger);

  useEffect(() => { reminderApi.getAll().then(setReminders); }, []);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const r = await reminderApi.create(input);
      setReminders(prev => [r, ...prev]);
      scheduleOne(r);
      setInput('');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    await reminderApi.remove(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const pending = reminders.filter(r => !r.is_triggered);
  const triggered = reminders.filter(r => r.is_triggered);

  return (
    <div className="space-y-6">
      {toast && <NotificationToast message={`⏰ ${toast.message}`} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold text-gray-800">定时提醒</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="例：30分钟后提醒我提交日志"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button onClick={handleCreate} disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? '解析中…' : '添加'}
        </button>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">待触发</h2>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
                <span className="text-xl">⏰</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{r.message}</p>
                  <p className="text-xs text-gray-400">{new Date(r.trigger_at).toLocaleString('zh-CN')}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {triggered.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">已触发</h2>
          <div className="space-y-2">
            {triggered.map(r => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 border flex items-center gap-3 opacity-60">
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{r.message}</p>
                  <p className="text-xs text-gray-400">{new Date(r.trigger_at).toLocaleString('zh-CN')}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
