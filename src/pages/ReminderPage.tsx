import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useConfirm } from '../hooks/useConfirm';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';
import { useRemindersContext } from '../contexts/useRemindersContext';
import { requestNotificationPermission } from '../utils/notify';
import { getErrorMessage } from '../api/http';
import { BellAlertIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ReminderPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { scheduleOne } = useRemindersContext();
  const { confirm, dialog } = useConfirm();

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
    if (!await confirm('确认删除这条提醒？')) return;
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
      <h1 className="text-2xl font-semibold text-foreground">定时提醒</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
              placeholder="例：30分钟后提醒我提交日志"
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={loading} variant="default">
              {loading ? '解析中…' : '添加'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">待触发</h2>
          <div className="space-y-2">
            {pending.map(r => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <BellAlertIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.message}</p>
                      <p className="text-xs text-muted-foreground">{dayjs(r.trigger_at).format('YYYY/MM/DD HH:mm')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id)}
                      aria-label="删除提醒"
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {triggered.length > 0 && (
        <div className="opacity-60">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">已触发</h2>
          <div className="space-y-2">
            {triggered.map(r => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{r.message}</p>
                      <p className="text-xs text-muted-foreground">{dayjs(r.trigger_at).format('YYYY/MM/DD HH:mm')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id)}
                      aria-label="删除提醒"
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
