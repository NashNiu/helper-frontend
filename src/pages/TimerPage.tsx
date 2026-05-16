import { useState, useEffect, useCallback, useMemo } from "react";
import { timerApi } from "../api/timer";
import type { Timer } from "../api/timer";
import { useActiveTimer } from "../contexts/useActiveTimer";
import { requestNotificationPermission } from "../utils/notify";
import { formatRemaining } from "../contexts/ActiveTimerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── 普通计时器显示 ────────────────────────────────────────────────────────────
function TimerDisplay({ timer, onBack }: { timer: Timer; onBack: () => void }) {
  const { active, start, pause, resume, reset, clear } = useActiveTimer();
  const isThis = active && active.timer.id === timer.id;
  const status = isThis ? active.status : "idle";
  const formatted = isThis
    ? active.formatted
    : formatRemaining(timer.duration_seconds);

  const handleStart = useCallback(() => {
    requestNotificationPermission().catch(() => {});
    if (status === "paused") resume();
    else start(timer);
  }, [status, start, resume, timer]);

  const handleBack = useCallback(() => {
    if (isThis && status === "done") clear();
    onBack();
  }, [isThis, status, clear, onBack]);

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{timer.name}</h2>
      <div className={`text-7xl font-mono font-bold ${status === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
        {formatted}
      </div>
      {status === "done" && <p className="text-emerald-600 dark:text-emerald-400 text-sm">计时已结束</p>}
      <div className="flex gap-3">
        {status !== "running" && (
          <Button onClick={handleStart} size="lg">
            {status === "idle" ? "开始" : status === "paused" ? "继续" : "重新开始"}
          </Button>
        )}
        {status === "running" && (
          <Button onClick={pause} size="lg" variant="outline">
            暂停
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          onClick={() => isThis && reset()}
          disabled={!isThis}
        >
          重置
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">切换到其他页面时计时仍会继续，到点会有系统通知。</p>
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
    const end = new Date(mountMs + totalMin * 60 * 1000);
    return end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }, [mountMs, totalMin]);

  const handleStart = () => {
    requestNotificationPermission().catch(() => {});
    startPomodoro(workTimer, breakTimer, cycles);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">番茄工作法</h2>
        <p className="text-sm text-muted-foreground mt-1">{workMin} 分钟工作 · {breakMin} 分钟休息</p>
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
      <Button onClick={handleStart} size="lg" className="px-10">开始</Button>
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← 返回</Button>
    </div>
  );
}

// ── 番茄钟进行中显示 ──────────────────────────────────────────────────────────
function PomodoroDisplay({ onBack }: { onBack: () => void }) {
  const { active, pause, resume, reset, clear } = useActiveTimer();
  if (!active?.pomodoro) return null;

  const { pomodoro } = active;
  const isWork = pomodoro.phase === "work";
  const isRunning = active.status === "running";
  const isPaused = active.status === "paused";
  const isAllDone =
    active.status === "done" &&
    isWork &&
    pomodoro.currentCycle >= pomodoro.totalCycles;
  const isTransitioning = active.status === "done" && !isAllDone;

  const phaseColor = isWork ? "text-foreground" : "text-emerald-600 dark:text-emerald-400";
  const phaseLabel = isWork ? "工作中" : "休息中";

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {Array.from({ length: pomodoro.totalCycles }, (_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${
              i < pomodoro.currentCycle - 1 ? "w-4 bg-foreground/40"
              : i === pomodoro.currentCycle - 1 ? "w-6 bg-foreground"
              : "w-4 bg-border"
            }`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">第 {pomodoro.currentCycle} 轮 / 共 {pomodoro.totalCycles} 轮</p>
        <p className={`text-base font-semibold mt-1 ${phaseColor}`}>{phaseLabel}</p>
      </div>
      <div className={`text-7xl font-mono font-bold ${isAllDone ? "text-emerald-600 dark:text-emerald-400" : isTransitioning ? "text-muted-foreground" : phaseColor}`}>
        {active.formatted}
      </div>
      {isAllDone && <p className="text-emerald-600 dark:text-emerald-400 font-medium">全部完成，辛苦了！</p>}
      {isTransitioning && <p className="text-muted-foreground text-sm">正在切换阶段…</p>}
      {!isAllDone && !isTransitioning && (
        <div className="flex gap-3">
          {isRunning && (
            <Button onClick={pause} size="lg" variant="outline">
              暂停
            </Button>
          )}
          {isPaused && (
            <Button onClick={resume} size="lg">继续</Button>
          )}
          <Button variant="outline" size="lg" onClick={reset}>重置本阶段</Button>
        </div>
      )}
      {isAllDone && (
        <Button
          size="lg"
          className="px-8"
          onClick={() => { clear(); onBack(); }}
        >
          完成
        </Button>
      )}
      <p className="text-xs text-muted-foreground">切换到其他页面时计时继续，到点自动开始下一阶段。</p>
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
  const [newName, setNewName] = useState("");
  const [newMinutes, setNewMinutes] = useState("");
  const [error, setError] = useState("");
  const { active } = useActiveTimer();

  useEffect(() => {
    timerApi
      .getAll()
      .then(setTimers)
      .catch(() => setError("加载计时器失败，请刷新重试"));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newMinutes) return;
    const mins = Number(newMinutes);
    if (isNaN(mins) || mins <= 0) {
      setError("请输入有效的分钟数");
      return;
    }
    const t = await timerApi.create(newName.trim(), Math.round(mins * 60));
    setTimers((prev) => [...prev, t]);
    setNewName("");
    setNewMinutes("");
    setError("");
  };

  const handleDelete = async (id: number) => {
    try {
      await timerApi.remove(id);
      setTimers((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("删除计时器失败，请重试");
    }
  };

  const pomodoroTimer = timers.find((t) => t.type === "pomodoro");
  const breakTimer = timers.find((t) => t.type === "short_break");

  if (selected?.type === "pomodoro" && pomodoroTimer && breakTimer) {
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {timers.map((t) => {
          const isPomodoro = t.type === "pomodoro";
          const isActiveTimer = active && !active.pomodoro && active.timer.id === t.id;
          const isPomodoroActive = isPomodoro && !!active?.pomodoro;
          return (
            <Card
              key={t.id}
              className={`hover:bg-muted transition-colors ${isActiveTimer || isPomodoroActive ? "ring-2 ring-foreground/20" : ""}`}
            >
              <CardContent className="p-4">
                <button onClick={() => setSelected(t)} className="w-full text-left cursor-pointer">
                  <p className="font-medium text-foreground">{t.name}</p>
                  {isPomodoro
                    ? <p className="text-sm text-muted-foreground mt-1">番茄工作法</p>
                    : <p className="text-sm text-muted-foreground mt-1">{Math.floor(t.duration_seconds / 60)} 分钟</p>}
                  {isActiveTimer && (
                    <p className="text-xs text-foreground/70 mt-1">
                      {active.status === "running" ? `运行中 ${active.formatted}` : active.status === "paused" ? `已暂停 ${active.formatted}` : "已完成"}
                    </p>
                  )}
                  {isPomodoroActive && (
                    <p className="text-xs text-foreground/70 mt-1">
                      {active!.pomodoro!.phase === "work" ? "工作中" : "休息中"} · 第 {active!.pomodoro!.currentCycle}/{active!.pomodoro!.totalCycles} 轮
                      {active!.status === "running" ? ` · ${active!.formatted}` : " · 已暂停"}
                    </p>
                  )}
                </button>
                {!t.is_preset && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDelete(t.id)}
                    className="mt-2 text-destructive hover:text-destructive px-0"
                  >
                    删除
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200">自定义计时器</CardTitle>
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
            <Button onClick={handleCreate}>添加</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
