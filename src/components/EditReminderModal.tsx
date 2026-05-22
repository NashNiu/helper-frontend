import { useState } from 'react';
import dayjs from 'dayjs';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';
import { getErrorMessage } from '../api/http';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { DateTimePicker } from './DateTimePicker';

interface Props {
  reminder: Reminder | null;
  onClose: () => void;
  onSaved: (r: Reminder) => void;
}

function toLocalInput(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DDTHH:mm');
}

export default function EditReminderModal({ reminder, onClose, onSaved }: Props) {
  const [message, setMessage] = useState(reminder?.message ?? '');
  const [triggerAt, setTriggerAt] = useState(
    reminder ? toLocalInput(reminder.trigger_at) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!reminder) return null;

  const handleSave = async () => {
    if (!message.trim() || !triggerAt) return;
    setSaving(true);
    setError('');
    try {
      const updated = await reminderApi.update(reminder.id, {
        message: message.trim(),
        trigger_at: new Date(triggerAt).toISOString(),
      });
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err, '保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!reminder} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑提醒</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">提醒内容</span>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">提醒时间</span>
            <div className="mt-1">
              <DateTimePicker value={triggerAt} onChange={setTriggerAt} />
            </div>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !message.trim() || !triggerAt}
          >
            {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
