import { useActiveTimer } from '../contexts/useActiveTimer';

export default function TimerWidget() {
  const { active, pause, resume, reset, clear } = useActiveTimer();
  if (!active) return null;

  const isRunning = active.status === 'running';
  const isPaused = active.status === 'paused';
  const isDone = active.status === 'done';
  const { pomodoro } = active;

  const icon = isDone
    ? '✅'
    : pomodoro
    ? pomodoro.phase === 'work' ? '🍅' : '☕'
    : '⏱️';

  const titleText = pomodoro
    ? `第 ${pomodoro.currentCycle}/${pomodoro.totalCycles} 轮 · ${pomodoro.phase === 'work' ? '工作' : '休息'}`
    : active.timer.name;

  const timeText = isDone
    ? (pomodoro && pomodoro.currentCycle >= pomodoro.totalCycles ? '全部完成' : '阶段完成')
    : active.formatted;

  const timeColor = isDone
    ? 'text-emerald-600 dark:text-emerald-400'
    : pomodoro?.phase === 'break'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-indigo-600 dark:text-indigo-400';

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[230px]">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{titleText}</p>
        <p className={`text-lg font-mono font-bold ${timeColor}`}>{timeText}</p>
      </div>
      <div className="flex flex-col gap-1">
        {isRunning && (
          <button onClick={pause} className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600">
            暂停
          </button>
        )}
        {isPaused && (
          <button onClick={resume} className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
            继续
          </button>
        )}
        {(isRunning || isPaused) && (
          <button onClick={reset} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
            重置
          </button>
        )}
        {isDone && (
          <button onClick={clear} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
