import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { financeApi } from '../api/finance';
import type { ParsedFinanceDraft, FinanceRecord } from '../api/finance';
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
import ImageLightbox from './ImageLightbox';

interface Row {
  sign: 'income' | 'expense';
  absAmount: string;
  primaryId: number;
  subId: number; // 0 = 无子分类
  happenedAt: string; // YYYY-MM-DDTHH:mm
  note: string;
}

interface Props {
  file: File | null;
  drafts: ParsedFinanceDraft[];
  categories: CategoryTree[];
  onClose: () => void;
  onSaved: (records: FinanceRecord[]) => void;
}

function toLocalInput(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DDTHH:mm');
}

// 由 suggested_category_id 回填主/子分类下拉
function splitCategory(
  categories: CategoryTree[],
  id: number
): { primaryId: number; subId: number } {
  for (const c of categories) {
    if (c.id === id) return { primaryId: c.id, subId: 0 };
    const sub = c.children.find((s) => s.id === id);
    if (sub) return { primaryId: c.id, subId: sub.id };
  }
  return { primaryId: 0, subId: 0 };
}

export default function FinanceImagePreviewModal({
  file,
  drafts,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    drafts.map((d) => {
      const { primaryId, subId } = splitCategory(categories, d.suggested_category_id);
      return {
        sign: d.amount >= 0 ? 'income' : 'expense',
        absAmount: Math.abs(d.amount).toString(),
        primaryId,
        subId,
        happenedAt: toLocalInput(d.happened_at),
        note: d.note ?? '',
      };
    })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  if (!file) return null;

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (rows.length === 0) {
      setError('没有要保存的记录');
      return;
    }
    const payload = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const abs = Number(r.absAmount);
      if (!Number.isFinite(abs) || abs <= 0) {
        setError(`第 ${i + 1} 条:金额需为大于 0 的数字`);
        return;
      }
      if (!r.primaryId) {
        setError(`第 ${i + 1} 条:请选择一级分类`);
        return;
      }
      if (!r.happenedAt) {
        setError(`第 ${i + 1} 条:请填写时间`);
        return;
      }
      payload.push({
        category_id: r.subId || r.primaryId,
        amount: r.sign === 'expense' ? -abs : abs,
        note: r.note.trim() || null,
        happened_at: new Date(r.happenedAt).toISOString(),
      });
    }
    setSaving(true);
    setError('');
    try {
      const result = await financeApi.createFromImage(file, payload);
      onSaved(result.records);
    } catch (err) {
      setError(getErrorMessage(err, '保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!file}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>确认账单识别结果</DialogTitle>
        </DialogHeader>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block"
          aria-label="查看账单原图"
        >
          <img
            src={imageUrl}
            alt="账单"
            className="h-24 rounded border object-cover hover:opacity-90"
          />
        </button>

        <div className="space-y-4 py-2">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">已全部删除，无可保存的记录。</p>
          )}
          {rows.map((r, i) => {
            const primary = categories.find((c) => c.id === r.primaryId);
            const subOptions = primary?.children ?? [];
            return (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">第 {i + 1} 笔</span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-xs text-destructive hover:underline"
                  >
                    删除
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={r.sign === 'expense' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRow(i, { sign: 'expense' })}
                  >
                    支出
                  </Button>
                  <Button
                    type="button"
                    variant={r.sign === 'income' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRow(i, { sign: 'income' })}
                  >
                    收入
                  </Button>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.absAmount}
                    onChange={(e) => updateRow(i, { absAmount: e.target.value })}
                    placeholder="金额"
                    className="flex-1"
                  />
                </div>
                <select
                  className="w-full border border-input bg-background rounded px-2 py-1.5 text-sm"
                  value={r.primaryId}
                  onChange={(e) => updateRow(i, { primaryId: Number(e.target.value), subId: 0 })}
                >
                  <option value={0}>请选择一级分类</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {subOptions.length > 0 && (
                  <select
                    className="w-full border border-input bg-background rounded px-2 py-1.5 text-sm"
                    value={r.subId}
                    onChange={(e) => updateRow(i, { subId: Number(e.target.value) })}
                  >
                    <option value={0}>无子分类</option>
                    {subOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <DateTimePicker
                  value={r.happenedAt}
                  onChange={(v) => updateRow(i, { happenedAt: v })}
                />
                <Input
                  value={r.note}
                  onChange={(e) => updateRow(i, { note: e.target.value })}
                  placeholder="备注（可空）"
                />
              </div>
            );
          })}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || rows.length === 0}>
            {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
            确认保存
          </Button>
        </DialogFooter>
      </DialogContent>

      <ImageLightbox
        sources={[imageUrl]}
        index={lightboxOpen ? 0 : null}
        onClose={() => setLightboxOpen(false)}
        onNavigate={() => {}}
      />
    </Dialog>
  );
}
