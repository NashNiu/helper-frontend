import { useState, useEffect, useCallback } from 'react';
import { timerApi } from '../api/timer';
import type { Timer } from '../api/timer';
import { useActiveTimer } from '../contexts/useActiveTimer';
import { requestNotificationPermission } from '../utils/notify';
import { formatRemaining } from '../contexts/ActiveTimerContext';

function TimerDisplay({ timer, onBack }: { timer: Timer; onBack: () => void }) {
  const { active, start, pause, resume, reset, clear } = useActiveTimer();

  // 仅当全局正在运行的就是当前选中的计时器时，用全局状态；否则显示初始状态
  const isThis = active && active.timer.id === timer.id;
  const status = isThis ? active.status : 'idle';
  const formatted = isThis ? active.formatted : formatRemaining(timer.duration_seconds);

  const handleStart = useCallback(() => {
    requestNotificationPermission().catch(() => {});
    if (status === 'paused') resume();
    else start(timer);
  }, [status, start, resume, timer]);

  const handleReset = useCallback(() => {
    if (isThis) reset();
  }, [isThis, reset]);

  const handleBack = useCallback(() => {
    // 离开页面计时不停；仅当已完成时顺便清理浮窗
    if (isThis && status === 'done') clear();
    onBack();
  }, [isThis, status, clear, onBack]);

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <h2 className="text-xl font-semibold text-gray-700">{timer.name}</h2>
      <div className={`text-7xl font-mono font-bold ${status === 'done' ? 'text-emerald-600' : 'text-indigo-600'}`}>
        {formatted}
      </div>
      {status === 'done' && <p className="text-emerald-600 text-sm">计时已结束</p>}
      <div className="flex gap-3">
        {status !== 'running' && (
          <button onClick={handleStart} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            {status === 'idle' ? '开始' : status === 'paused' ? '继续' : '重新开始'}
          </button>
        )}
        {status === 'running' && (
          <button onClick={pause} className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
            暂停
          </button>
        )}
        <button onClick={handleReset} disabled={!isThis}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-40">
          重置
        </button>
      </div>
      <p className="text-xs text-gray-400">切换到其他页面时计时仍会继续，到点会有系统通知。</p>
      <button onClick={handleBack} className="text-sm text-gray-400 hover:text-gray-600 mt-4">← 返回选择</button>
    </div>
  );
}

export default function TimerPage() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [selected, setSelected] = useState<Timer | null>(null);
  const [newName, setNewName] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const [error, setError] = useState('');
  const { active } = useActiveTimer();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await timerApi.getAll();
        setTimers(data);
      } catch {
        setError('加载计时器失败，请刷新重试');
      }
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newMinutes) return;
    const mins = Number(newMinutes);
    if (isNaN(mins) || mins <= 0) { setError('请输入有效的分钟数'); return; }
    const t = await timerApi.create(newName.trim(), Math.round(mins * 60));
    setTimers(prev => [...prev, t]);
    setNewName(''); setNewMinutes(''); setError('');
  };

  const handleDelete = async (id: number) => {
    try {
      await timerApi.remove(id);
      setTimers(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('删除计时器失败，请重试');
    }
  };

  if (selected) return <TimerDisplay timer={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">计时器</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {timers.map(t => {
          const isActive = active && active.timer.id === t.id;
          return (
            <div key={t.id} className={`bg-white rounded-xl p-4 shadow-sm border hover:border-indigo-300 transition ${isActive ? 'ring-2 ring-indigo-300' : ''}`}>
              <button onClick={() => setSelected(t)} className="w-full text-left">
                <p className="font-semibold text-gray-800">{t.name}</p>
                <p className="text-sm text-gray-500 mt-1">{Math.floor(t.duration_seconds / 60)} 分钟</p>
                {isActive && (
                  <p className="text-xs text-indigo-600 mt-1">
                    {active.status === 'running' ? `运行中 ${active.formatted}` :
                     active.status === 'paused' ? `已暂停 ${active.formatted}` : '已完成'}
                  </p>
                )}
              </button>
              {!t.is_preset && (
                <button onClick={() => handleDelete(t.id)} className="mt-2 text-xs text-red-400 hover:text-red-600">删除</button>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <h3 className="font-medium text-gray-700 mb-3">自定义计时器</h3>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="名称"
            className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <input value={newMinutes} onChange={e => setNewMinutes(e.target.value)} placeholder="分钟数" type="number" min="1"
            className="border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">添加</button>
        </div>
      </div>
    </div>
  );
}
