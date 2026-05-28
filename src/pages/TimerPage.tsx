import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { timerApi } from '../api/timer';
import type { Timer } from '../api/timer';
import { useActiveTimer } from '../contexts/useActiveTimer';
import { requestNotificationPermission } from '../utils/notify';
import { formatRemaining } from '../contexts/ActiveTimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

// ── 普通计时器显示 ────────────────────────────────────────────────────────────
function TimerDisplay({ timer, onBack }: { timer: Timer; onBack: () => void }) {
  const { active, start, pause, resume, reset, clear } = useActiveTimer();
  const isThis = active && active.timer.id === timer.id;
  const status = isThis ? active.status : 'idle';
  const formatted = isThis ? active.formatted : formatRemaining(timer.duration_seconds);

  const handleStart = useCallback(() => {
    requestNotificationPermission().catch(() => {});
    if (status === 'paused') resume();
    else start(timer);
  }, [status, start, resume, timer]);

  const handleBack = useCallback(() => {
    if (isThis && status === 'done') clear();
    onBack();
  }, [isThis, status, clear, onBack]);

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{timer.name}</h2>
      <div
        className={`text-7xl font-mono font-bold ${status === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
      >
        {formatted}
      </div>
      {status === 'done' && (
        <p className="text-emerald-600 dark:text-emerald-400 text-sm">计时已结束</p>
      )}
      <div className="flex gap-3">
        {status !== 'running' && (
          <Button onClick={handleStart} size="lg">
            {status === 'idle' ? '开始' : status === 'paused' ? '继续' : '重新开始'}
          </Button>
        )}
        {status === 'running' && (
          <Button onClick={pause} size="lg" variant="outline">
            暂停
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={() => isThis && reset()} disabled={!isThis}>
          重置
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        切换到其他页面时计时仍会继续，到点会有系统通知。
      </p>
      <Button variant="ghost" size="sm" onClick={handleBack} className="mt-4 text-muted-foreground">
        ← 返回选择
      </Button>
    </div>
  );
}

// ── 番茄钟设置：选循环次数 ───────────────────────────────────────────────────
function PomodoroSetup({
  workTimer,
  breakTimer,
  onBack,
}: {
  workTimer: Timer;
  breakTimer: Timer;
  onBack: () => void;
}) {
  const { startPomodoro } = useActiveTimer();
  const [cycles, setCycles] = useState(4);
  const [mountMs] = useState(() => Date.now());

  const workMin = Math.round(workTimer.duration_seconds / 60);
  const breakMin = Math.round(breakTimer.duration_seconds / 60);
  const totalMin = cycles * workMin + (cycles - 1) * breakMin;
  const endTimeStr = useMemo(() => {
    return dayjs(mountMs + totalMin * 60 * 1000).format('HH:mm');
  }, [mountMs, totalMin]);

  const handleStart = () => {
    requestNotificationPermission().catch(() => {});
    startPomodoro(workTimer, breakTimer, cycles);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">番茄工作法</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {workMin} 分钟工作 · {breakMin} 分钟休息
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-foreground">选择循环次数</p>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setCycles((c) => Math.max(1, c - 1))}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 text-xl font-bold text-foreground flex items-center justify-center transition-colors"
          >
            −
          </button>
          <span className="text-4xl font-bold text-foreground w-12 text-center">{cycles}</span>
          <button
            onClick={() => setCycles((c) => Math.min(8, c + 1))}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 text-xl font-bold text-foreground flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>
        <div className="text-center mt-1 space-y-0.5">
          <p className="text-sm text-muted-foreground">共 {totalMin} 分钟</p>
          <p className="text-sm font-medium text-foreground">预计 {endTimeStr} 结束</p>
        </div>
      </div>
      <Button onClick={handleStart} size="lg" className="px-10">
        开始
      </Button>
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        ← 返回
      </Button>
    </div>
  );
}

// ── 番茄钟进行中显示 ──────────────────────────────────────────────────────────
function PomodoroDisplay({ onBack }: { onBack: () => void }) {
  const { active, pause, resume, reset, clear, advancePomodoro } = useActiveTimer();
  if (!active?.pomodoro) return null;

  const { pomodoro } = active;
  const isWork = pomodoro.phase === 'work';
  const isRunning = active.status === 'running';
  const isPaused = active.status === 'paused';
  const isAllDone =
    active.status === 'done' && isWork && pomodoro.currentCycle >= pomodoro.totalCycles;
  const isWaitingConfirm = active.status === 'done' && !isAllDone;

  const phaseColor = isWork ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400';
  const phaseLabel = isWork
    ? isWaitingConfirm
      ? '工作结束'
      : '工作中'
    : isWaitingConfirm
      ? '休息结束'
      : '休息中';

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {Array.from({ length: pomodoro.totalCycles }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < pomodoro.currentCycle - 1
                  ? 'w-4 bg-foreground/40'
                  : i === pomodoro.currentCycle - 1
                    ? 'w-6 bg-foreground'
                    : 'w-4 bg-border'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          第 {pomodoro.currentCycle} 轮 / 共 {pomodoro.totalCycles} 轮
        </p>
        <p className={`text-base font-semibold mt-1 ${phaseColor}`}>{phaseLabel}</p>
      </div>

      <div
        className={`text-7xl font-mono font-bold ${isAllDone ? 'text-emerald-600 dark:text-emerald-400' : phaseColor}`}
      >
        {active.formatted}
      </div>

      {isAllDone && (
        <>
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">全部完成，辛苦了！</p>
          <Button
            size="lg"
            className="px-8"
            onClick={() => {
              clear();
              onBack();
            }}
          >
            完成
          </Button>
        </>
      )}

      {isWaitingConfirm && (
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" className="px-8" onClick={advancePomodoro}>
            {isWork
              ? `开始休息（${Math.round(pomodoro.breakTimer.duration_seconds / 60)} 分钟）`
              : `开始第 ${pomodoro.currentCycle + 1} 轮工作`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clear();
              onBack();
            }}
            className="text-muted-foreground"
          >
            结束番茄钟
          </Button>
        </div>
      )}

      {!isAllDone && !isWaitingConfirm && (
        <div className="flex gap-3">
          {isRunning && (
            <Button onClick={pause} size="lg" variant="outline">
              暂停
            </Button>
          )}
          {isPaused && (
            <Button onClick={resume} size="lg">
              继续
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={reset}>
            重置本阶段
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">切换到其他页面时计时继续，到点后等待确认。</p>
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        ← 返回选择
      </Button>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function TimerPage() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [selected, setSelected] = useState<Timer | null>(null);
  const [newName, setNewName] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const { active } = useActiveTimer();

  useEffect(() => {
    timerApi
      .getAll()
      .then((data) => {
        setTimers(data);
        setFetchLoading(false);
      })
      .catch(() => {
        setError('加载计时器失败，请刷新重试');
        setFetchLoading(false);
      });
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newMinutes) return;
    const mins = Number(newMinutes);
    if (isNaN(mins) || mins <= 0) {
      setError('请输入有效的分钟数');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const t = await timerApi.create(newName.trim(), Math.round(mins * 60));
      setTimers((prev) => [...prev, t]);
      setNewName('');
      setNewMinutes('');
    } catch {
      setError('创建计时器失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await timerApi.remove(id);
      setTimers((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('删除计时器失败，请重试');
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const pomodoroTimer = timers.find((t) => t.type === 'pomodoro');
  const breakTimer = timers.find((t) => t.type === 'short_break');

  if (selected?.type === 'pomodoro' && pomodoroTimer && breakTimer) {
    if (active?.pomodoro) {
      return <PomodoroDisplay onBack={() => setSelected(null)} />;
    }
    return (
      <PomodoroSetup
        workTimer={pomodoroTimer}
        breakTimer={breakTimer}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (selected) {
    return <TimerDisplay timer={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">计时器</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {fetchLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {timers.map((t) => {
            const isPomodoro = t.type === 'pomodoro';
            const isActiveTimer = active && !active.pomodoro && active.timer.id === t.id;
            const isPomodoroActive = isPomodoro && !!active?.pomodoro;
            const deleting = deletingIds.has(t.id);
            return (
              <Card
                key={t.id}
                className={`transition-colors ${isActiveTimer || isPomodoroActive ? 'border-foreground/20 bg-muted/50' : 'hover:bg-muted'}`}
              >
                <CardContent className="p-4">
                  <button
                    onClick={() => setSelected(t)}
                    className="w-full text-left cursor-pointer"
                  >
                    <p className="font-medium text-foreground">{t.name}</p>
                    {isPomodoro ? (
                      <p className="text-sm text-muted-foreground mt-1">番茄工作法</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Math.floor(t.duration_seconds / 60)} 分钟
                      </p>
                    )}
                    {isActiveTimer && (
                      <p className="text-xs text-foreground/70 mt-1">
                        {active.status === 'running'
                          ? `运行中 ${active.formatted}`
                          : active.status === 'paused'
                            ? `已暂停 ${active.formatted}`
                            : '已完成'}
                      </p>
                    )}
                    {isPomodoroActive && (
                      <p className="text-xs text-foreground/70 mt-1">
                        {active!.pomodoro!.phase === 'work' ? '工作中' : '休息中'} · 第{' '}
                        {active!.pomodoro!.currentCycle}/{active!.pomodoro!.totalCycles} 轮
                        {active!.status === 'running' ? ` · ${active!.formatted}` : ' · 已暂停'}
                      </p>
                    )}
                  </button>
                  {!t.is_preset && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting}
                      className="mt-2 text-destructive hover:text-destructive px-0"
                    >
                      {deleting ? <Spinner className="h-3 w-3" /> : '删除'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200">
            自定义计时器
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="名称"
              className="flex-1"
            />
            <Input
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
              placeholder="分钟数"
              type="number"
              min="1"
              className="w-24"
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner className="h-4 w-4 mr-1" /> : null}
              {creating ? '添加中…' : '添加'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
