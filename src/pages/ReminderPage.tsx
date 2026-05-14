import { useState, useEffect } from 'react';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';
import { useRemindersContext } from '../contexts/useRemindersContext';
import { requestNotificationPermission } from '../utils/notify';
import { getErrorMessage } from '../api/http';

export default function ReminderPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { scheduleOne } = useRemindersContext();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await reminderApi.getAll();
        if (!cancelled) setReminders(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '加载提醒失败，请刷新重试'));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    requestNotificationPermission().catch(() => {});
    try {
      const r = await reminderApi.create(input);
      setReminders(prev => [r, ...prev]);
      scheduleOne(r);
      setInput('');
    } catch (err) {
      setError(getErrorMessage(err, '创建失败，请检查输入重试'));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除这条提醒？')) return;
    try {
      await reminderApi.remove(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除失败，请重试'));
    }
  };

  const pending = reminders.filter(r => !r.is_triggered);
  const triggered = reminders.filter(r => r.is_triggered);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">定时提醒</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-xl p-4 shadow-sm border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
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
                <button onClick={() => handleDelete(r.id)} aria-label="删除提醒"
                  className="text-xs text-red-400 hover:text-red-600">删除</button>
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
                <button onClick={() => handleDelete(r.id)} aria-label="删除提醒"
                  className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
