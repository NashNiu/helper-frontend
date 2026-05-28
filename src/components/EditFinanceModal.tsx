import { useState } from 'react';
import dayjs from 'dayjs';
import { financeApi } from '../api/finance';
import type { FinanceRecord } from '../api/finance';
import type { CategoryTree } from '../api/category';
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
  record: FinanceRecord | null;
  categories: CategoryTree[];
  onClose: () => void;
  onSaved: (r: FinanceRecord) => void;
}

function toLocalInput(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DDTHH:mm');
}

export default function EditFinanceModal({ record, categories, onClose, onSaved }: Props) {
  const initialPrimaryId = record?.category_rel?.parent?.id ?? record?.category_rel?.id ?? 0;
  const initialSubId = record?.category_rel?.parent ? record.category_rel.id : 0;

  const [sign, setSign] = useState<'income' | 'expense'>(
    (record?.amount ?? 0) >= 0 ? 'income' : 'expense'
  );
  const [absAmount, setAbsAmount] = useState(record ? Math.abs(record.amount).toString() : '');
  const [primaryId, setPrimaryId] = useState<number>(initialPrimaryId);
  const [subId, setSubId] = useState<number>(initialSubId); // 0 = 无子分类
  const [happenedAt, setHappenedAt] = useState(record ? toLocalInput(record.happened_at) : '');
  const [note, setNote] = useState(record?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!record) return null;

  const primary = categories.find((c) => c.id === primaryId);
  const subOptions = primary?.children ?? [];

  const handleSave = async () => {
    const abs = Number(absAmount);
    if (!Number.isFinite(abs) || abs <= 0) {
      setError('金额需为大于 0 的数字');
      return;
    }
    if (!primaryId) {
      setError('请选择一级分类');
      return;
    }
    if (!happenedAt) {
      setError('请填写时间');
      return;
    }
    const finalAmount = sign === 'expense' ? -abs : abs;
    const categoryId = subId || primaryId;

    setSaving(true);
    setError('');
    try {
      const updated = await financeApi.update(record.id, {
        amount: finalAmount,
        note: note.trim() || null,
        happened_at: new Date(happenedAt).toISOString(),
        category_id: categoryId,
      });
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err, '保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!record}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑收支记录</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sign === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSign('expense')}
            >
              支出
            </Button>
            <Button
              type="button"
              variant={sign === 'income' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSign('income')}
            >
              收入
            </Button>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={absAmount}
              onChange={(e) => setAbsAmount(e.target.value)}
              placeholder="金额"
              className="flex-1"
            />
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">一级分类</span>
            <select
              className="mt-1 w-full border border-input bg-background rounded px-2 py-1.5 text-sm"
              value={primaryId}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPrimaryId(v);
                setSubId(0);
              }}
            >
              <option value={0}>请选择</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {subOptions.length > 0 && (
            <label className="block text-sm">
              <span className="text-muted-foreground">子分类</span>
              <select
                className="mt-1 w-full border border-input bg-background rounded px-2 py-1.5 text-sm"
                value={subId}
                onChange={(e) => setSubId(Number(e.target.value))}
              >
                <option value={0}>无子分类</option>
                {subOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="text-muted-foreground">时间</span>
            <div className="mt-1">
              <DateTimePicker value={happenedAt} onChange={setHappenedAt} />
            </div>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">备注</span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              placeholder="可空"
            />
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
