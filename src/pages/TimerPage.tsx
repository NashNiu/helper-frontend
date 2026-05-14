import { useState, useEffect, useCallback, useMemo } from "react";
import { timerApi } from "../api/timer";
import type { Timer } from "../api/timer";
import { useActiveTimer } from "../contexts/useActiveTimer";
import { requestNotificationPermission } from "../utils/notify";
import { formatRemaining } from "../contexts/ActiveTimerContext";

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
      <div className={`text-7xl font-mono font-bold ${status === "done" ? "text-emerald-600" : "text-indigo-600"}`}>
        {formatted}
      </div>
      {status === "done" && <p className="text-emerald-600 text-sm">计时已结束</p>}
      <div className="flex gap-3">
        {status !== "running" && (
          <button onClick={handleStart} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            {status === "idle" ? "开始" : status === "paused" ? "继续" : "重新开始"}
          </button>
        )}
        {status === "running" && (
          <button onClick={pause} className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">暂停</button>
        )}
        <button onClick={() => isThis && reset()} disabled={!isThis}
          className="px-6 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40">
          重置
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">切换到其他页面时计时仍会继续，到点会有系统通知。</p>
      <button onClick={handleBack} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-4">← 返回选择</button>
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
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">🍅 番茄工作法</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{workMin} 分钟工作 · {breakMin} 分钟休息</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">选择循环次数</p>
        <div className="flex items-center gap-5">
          <button onClick={() => setCycles((c) => Math.max(1, c - 1))}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xl font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
            −
          </button>
          <span className="text-4xl font-bold text-indigo-600 w-12 text-center">{cycles}</span>
          <button onClick={() => setCycles((c) => Math.min(8, c + 1))}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xl font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
            +
          </button>
        </div>
        <div className="text-center mt-1 space-y-0.5">
          <p className="text-sm text-gray-500 dark:text-gray-400">共 {totalMin} 分钟</p>
          <p className="text-sm font-medium text-indigo-600">预计 {endTimeStr} 结束</p>
        </div>
      </div>
      <button onClick={handleStart} className="px-10 py-3 bg-indigo-600 text-white text-base rounded-xl hover:bg-indigo-700 font-medium">开始</button>
      <button onClick={onBack} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">← 返回</button>
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

  const phaseColor = isWork ? "text-indigo-600" : "text-emerald-600";
  const phaseLabel = isWork ? "🍅 工作中" : "☕ 休息中";

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {Array.from({ length: pomodoro.totalCycles }, (_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${
              i < pomodoro.currentCycle - 1 ? "w-4 bg-indigo-400"
              : i === pomodoro.currentCycle - 1 ? "w-6 bg-indigo-600"
              : "w-4 bg-gray-200 dark:bg-gray-700"
            }`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">第 {pomodoro.currentCycle} 轮 / 共 {pomodoro.totalCycles} 轮</p>
        <p className={`text-base font-semibold mt-1 ${phaseColor}`}>{phaseLabel}</p>
      </div>
      <div className={`text-7xl font-mono font-bold ${isAllDone ? "text-emerald-600" : isTransitioning ? "text-gray-400 dark:text-gray-500" : phaseColor}`}>
        {active.formatted}
      </div>
      {isAllDone && <p className="text-emerald-600 font-medium">🎉 全部完成，辛苦了！</p>}
      {isTransitioning && <p className="text-gray-400 dark:text-gray-500 text-sm">正在切换阶段…</p>}
      {!isAllDone && !isTransitioning && (
        <div className="flex gap-3">
          {isRunning && <button onClick={pause} className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">暂停</button>}
          {isPaused && <button onClick={resume} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">继续</button>}
          <button onClick={reset} className="px-6 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">重置本阶段</button>
        </div>
      )}
      {isAllDone && (
        <button onClick={() => { clear(); onBack(); }} className="px-8 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">完成</button>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">切换到其他页面时计时继续，到点自动开始下一阶段。</p>
      <button onClick={onBack} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">← 返回选择</button>
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
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">计时器</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {timers.map((t) => {
          const isPomodoro = t.type === "pomodoro";
          const isActiveTimer = active && !active.pomodoro && active.timer.id === t.id;
          const isPomodoroActive = isPomodoro && !!active?.pomodoro;
          return (
            <div key={t.id} className={`bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-purple-100 dark:border-purple-900/40 hover:shadow-md transition ${isActiveTimer || isPomodoroActive ? "ring-2 ring-indigo-300" : ""}`}>
              <button onClick={() => setSelected(t)} className="w-full text-left">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{t.name}</p>
                {isPomodoro
                  ? <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">番茄工作法</p>
                  : <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{Math.floor(t.duration_seconds / 60)} 分钟</p>}
                {isActiveTimer && (
                  <p className="text-xs text-indigo-600 mt-1">
                    {active.status === "running" ? `运行中 ${active.formatted}` : active.status === "paused" ? `已暂停 ${active.formatted}` : "已完成"}
                  </p>
                )}
                {isPomodoroActive && (
                  <p className="text-xs text-indigo-600 mt-1">
                    {active!.pomodoro!.phase === "work" ? "🍅" : "☕"} 第 {active!.pomodoro!.currentCycle}/{active!.pomodoro!.totalCycles} 轮
                    {active!.status === "running" ? ` · ${active!.formatted}` : " · 已暂停"}
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

      <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-purple-100 dark:border-purple-900/40">
        <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-3">自定义计时器</h3>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称"
            className="rounded-lg px-3 py-2 text-sm flex-1 bg-white/80 focus:bg-white dark:bg-gray-800/80 dark:focus:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
          <input value={newMinutes} onChange={(e) => setNewMinutes(e.target.value)} placeholder="分钟数" type="number" min="1"
            className="rounded-lg px-3 py-2 text-sm w-24 bg-white/80 focus:bg-white dark:bg-gray-800/80 dark:focus:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
          <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">添加</button>
        </div>
      </div>
    </div>
  );
}
