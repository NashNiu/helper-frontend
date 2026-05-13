import { useActiveTimer } from '../contexts/useActiveTimer';

export default function TimerWidget() {
  const { active, pause, resume, reset, clear } = useActiveTimer();
  if (!active) return null;

  const isRunning = active.status === 'running';
  const isPaused = active.status === 'paused';
  const isDone = active.status === 'done';

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white shadow-xl border rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
      <div className="text-2xl">{isDone ? '✅' : '⏱️'}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 truncate">{active.timer.name}</p>
        <p className={`text-lg font-mono font-bold ${isDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
          {isDone ? '已完成' : active.formatted}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {isRunning && (
          <button
            onClick={pause}
            className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            暂停
          </button>
        )}
        {isPaused && (
          <button
            onClick={resume}
            className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            继续
          </button>
        )}
        {(isRunning || isPaused) && (
          <button
            onClick={reset}
            className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            重置
          </button>
        )}
        {isDone && (
          <button
            onClick={clear}
            className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
