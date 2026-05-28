import { useActiveTimer } from '../contexts/useActiveTimer';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Timer, Coffee, Flame } from 'lucide-react';

export default function TimerWidget() {
  const { active, pause, resume, reset, clear, advancePomodoro } = useActiveTimer();
  if (!active) return null;

  const isRunning = active.status === 'running';
  const isPaused = active.status === 'paused';
  const isDone = active.status === 'done';
  const { pomodoro } = active;

  const titleText = pomodoro
    ? `第 ${pomodoro.currentCycle}/${pomodoro.totalCycles} 轮 · ${pomodoro.phase === 'work' ? '工作' : '休息'}`
    : active.timer.name;
  const timeText = isDone
    ? pomodoro && pomodoro.currentCycle >= pomodoro.totalCycles
      ? '全部完成'
      : '阶段完成'
    : active.formatted;
  const timeColor = isDone
    ? 'text-emerald-600 dark:text-emerald-400'
    : pomodoro?.phase === 'break'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-indigo-600 dark:text-indigo-400';

  const IconEl = isDone ? (
    <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2} />
  ) : pomodoro ? (
    pomodoro.phase === 'work' ? (
      <Flame className="w-7 h-7 text-rose-500" strokeWidth={2} />
    ) : (
      <Coffee className="w-7 h-7 text-emerald-500" strokeWidth={2} />
    )
  ) : (
    <Timer className="w-7 h-7 text-indigo-500" strokeWidth={2} />
  );

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-card border rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 min-w-[230px]">
      <div className="flex-shrink-0">{IconEl}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{titleText}</p>
        <p className={`text-lg font-mono font-bold ${timeColor}`}>{timeText}</p>
      </div>
      <div className="flex flex-col gap-1">
        {isRunning && (
          <Button
            size="xs"
            onClick={pause}
            className="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
          >
            暂停
          </Button>
        )}
        {isPaused && (
          <Button size="xs" onClick={resume}>
            继续
          </Button>
        )}
        {(isRunning || isPaused) && (
          <Button size="xs" variant="outline" onClick={reset}>
            重置
          </Button>
        )}
        {isDone && pomodoro && pomodoro.currentCycle < pomodoro.totalCycles && (
          <Button
            size="xs"
            onClick={advancePomodoro}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"
          >
            继续
          </Button>
        )}
        {isDone && (
          <Button size="xs" variant="outline" onClick={clear}>
            关闭
          </Button>
        )}
      </div>
    </div>
  );
}
