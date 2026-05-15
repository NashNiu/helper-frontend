import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellAlertIcon, ClockIcon, ClipboardDocumentCheckIcon, BanknotesIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { classifyApi } from '../api/classify';
import type { AssistantType } from '../api/classify';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';
import { financeApi } from '../api/finance';
import type { FinanceRecord } from '../api/finance';
import { todoApi } from '../api/todo';
import type { Todo } from '../api/todo';
import { timerApi } from '../api/timer';
import type { Timer } from '../api/timer';
import { useRemindersContext } from '../contexts/useRemindersContext';
import { requestNotificationPermission } from '../utils/notify';
import { getErrorMessage } from '../api/http';
import { useResource, invalidate } from '../hooks/useResource';
import { CACHE_KEYS } from '../api/cacheKeys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const TYPE_META: Record<AssistantType, { label: string; Icon: React.ElementType; iconColor: string; color: string; route: string; gradient: string; border: string }> = {
  reminder: { label: '提醒',  Icon: BellAlertIcon,                iconColor: 'text-orange-400',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',   route: '/reminders', gradient: 'bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/30 dark:to-gray-900',   border: 'border border-orange-100 dark:border-orange-900/40' },
  timer:    { label: '计时器', Icon: ClockIcon,                    iconColor: 'text-purple-400',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',   route: '/timer',     gradient: 'bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900',   border: 'border border-purple-100 dark:border-purple-900/40' },
  todo:     { label: '待办',  Icon: ClipboardDocumentCheckIcon,   iconColor: 'text-blue-400',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',           route: '/todo',      gradient: 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900',     border: 'border border-blue-100 dark:border-blue-900/40' },
  finance:  { label: '收支',  Icon: BanknotesIcon,                iconColor: 'text-emerald-400', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', route: '/finance',   gradient: 'bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900', border: 'border border-emerald-100 dark:border-emerald-900/40' },
};

interface QuickAction {
  label: string;
  template: string;
  caret?: number;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: '10 分钟后提醒', template: '10 分钟后提醒我' },
  { label: '30 分钟后提醒', template: '30 分钟后提醒我' },
  { label: '番茄钟 25 分钟', template: '开始 25 分钟番茄钟' },
  { label: '记一笔', template: '花了  元', caret: 3 },
  { label: '待办', template: '待办：' },
];

interface FeedItem {
  id: string;
  type: AssistantType;
  title: string;
  subtitle: string;
  timestamp: number;
}

function buildFeed(
  reminders: Reminder[],
  todos: Todo[],
  finance: FinanceRecord[],
  timers: Timer[],
): FeedItem[] {
  const items: FeedItem[] = [];

  reminders.forEach(r => items.push({
    id: `r-${r.id}`,
    type: 'reminder',
    title: r.message,
    subtitle: `提醒时间：${new Date(r.trigger_at).toLocaleString('zh-CN')}`,
    timestamp: new Date(r.created_at).getTime(),
  }));

  todos.forEach(t => items.push({
    id: `t-${t.id}`,
    type: 'todo',
    title: t.content,
    subtitle: t.is_done ? '已完成' : '待完成',
    timestamp: new Date(t.created_at).getTime(),
  }));

  finance.forEach(f => items.push({
    id: `f-${f.id}`,
    type: 'finance',
    title: `${f.amount > 0 ? '+' : ''}¥${Math.abs(f.amount).toFixed(2)} · ${f.category}`,
    subtitle: f.note || f.raw_input,
    timestamp: new Date(f.created_at).getTime(),
  }));

  timers.filter(t => !t.is_preset).forEach(t => items.push({
    id: `m-${t.id}`,
    type: 'timer',
    title: t.name,
    subtitle: `${Math.round(t.duration_seconds / 60)} 分钟计时器`,
    timestamp: new Date(t.created_at).getTime(),
  }));

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
}

export default function HomePage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; text: string }>({ kind: 'idle', text: '' });
  const { scheduleOne } = useRemindersContext();

  const [financeFromDay] = useState(
    () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  const remindersRes = useResource(CACHE_KEYS.reminders, () => reminderApi.getAll());
  const todosRes = useResource(CACHE_KEYS.todos, () => todoApi.getAll());
  const financeRes = useResource(
    CACHE_KEYS.finance(financeFromDay),
    () => {
      const to = new Date().toISOString();
      const from = new Date(`${financeFromDay}T00:00:00`).toISOString();
      return financeApi.getAll(from, to);
    },
  );
  const timersRes = useResource(CACHE_KEYS.timers, () => timerApi.getAll());

  const feed = useMemo(
    () => buildFeed(
      remindersRes.data ?? [],
      todosRes.data ?? [],
      financeRes.data ?? [],
      timersRes.data ?? [],
    ),
    [remindersRes.data, todosRes.data, financeRes.data, timersRes.data],
  );

  const refreshAll = useCallback(() => {
    invalidate(CACHE_KEYS.reminders);
    invalidate(CACHE_KEYS.todos);
    invalidate(CACHE_KEYS.finance(financeFromDay));
    invalidate(CACHE_KEYS.timers);
  }, [financeFromDay]);

  const applyQuick = useCallback((q: QuickAction) => {
    setInput(q.template);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const pos = q.caret ?? q.template.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || submitting) return;
    requestNotificationPermission().catch(() => {});
    setSubmitting(true);
    setStatus({ kind: 'idle', text: '正在识别…' });
    try {
      const { type } = await classifyApi.classify(text);
      if (type === 'reminder') {
        const r = await reminderApi.create(text);
        scheduleOne(r);
        invalidate(CACHE_KEYS.reminders);
      } else if (type === 'finance') {
        await financeApi.create(text);
        invalidate(CACHE_KEYS.finance(financeFromDay));
      } else if (type === 'todo') {
        await todoApi.create(text, []);
        invalidate(CACHE_KEYS.todos);
      } else if (type === 'timer') {
        await timerApi.createFromText(text);
        invalidate(CACHE_KEYS.timers);
      }
      setInput('');
      setStatus({ kind: 'ok', text: `已添加到「${TYPE_META[type].label}」` });
    } catch (err) {
      setStatus({ kind: 'err', text: getErrorMessage(err, '处理失败，请重试或换个说法') });
    } finally {
      setSubmitting(false);
    }
  }, [input, submitting, scheduleOne, financeFromDay]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-violet-400 dark:from-indigo-400 dark:to-violet-300 bg-clip-text text-transparent">嗨，今天想记点什么？</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">一句话搞定提醒、计时、待办和记账</p>
      </div>

      <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900 border-indigo-100 dark:border-indigo-900/40 shadow-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：10 分钟后提醒我喝水 / 午饭花了 25 元 / 买牛奶 / 25 分钟番茄钟"
            rows={2}
            className="resize-none rounded-xl bg-white/80 focus:bg-white dark:bg-gray-800/80 dark:focus:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-300 transition"
          />

          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(q => (
              <Button
                key={q.label}
                onClick={() => applyQuick(q)}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs px-3 py-1.5 h-auto bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 dark:bg-gray-800 dark:hover:bg-indigo-900/40 dark:text-gray-300 dark:hover:text-indigo-300 border-0"
              >
                + {q.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs ${status.kind === 'err' ? 'text-red-500' : status.kind === 'ok' ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`}>
              {status.text || '回车发送，Shift+回车换行'}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
            >
              {submitting ? '处理中…' : '发送'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">最近记录</h2>
          <Button onClick={refreshAll} variant="ghost" size="sm" className="text-xs text-indigo-500 h-auto py-1 px-2">刷新</Button>
        </div>
        {feed.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">还没有记录，从上面输入开始吧～</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
            {feed.map(item => {
              const meta = TYPE_META[item.type];
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(meta.route)}
                  className={`w-full text-left rounded-xl p-3 shadow-sm hover:shadow-md transition flex items-start gap-3 ${meta.gradient} ${meta.border}`}
                >
                  <meta.Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${meta.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.subtitle}</p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">
                        {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
