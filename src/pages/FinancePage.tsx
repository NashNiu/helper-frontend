import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { useConfirm } from '../hooks/useConfirm';
import { financeApi } from '../api/finance';
import type { FinanceRecord } from '../api/finance';
import FinanceCharts from '../components/FinanceCharts';
import CategoryModal from '../components/CategoryModal';
import { categoryApi } from '../api/category';
import type { CategoryTree } from '../api/category';
import EditFinanceModal from '../components/EditFinanceModal';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Spinner } from '@/components/ui/spinner';
import { PhotoIcon } from '@heroicons/react/24/outline';
import FinanceImagePreviewModal from '../components/FinanceImagePreviewModal';
import ImageLightbox from '../components/ImageLightbox';
import type { ParsedFinanceDraft } from '../api/finance';

type Range = 'today' | 'week' | 'month' | 'year' | 'custom';

function getRangeDates(range: Exclude<Range, 'custom'>, offset = 0): { from: number; to: number } {
  const now = dayjs();
  const todayEnd = now.endOf('day').valueOf();

  if (range === 'today') {
    return { from: now.startOf('day').valueOf(), to: todayEnd };
  }
  if (range === 'week') {
    const dow = now.day(); // 0=Sun, 1=Mon … 6=Sat
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const monday = now
      .subtract(daysToMon, 'day')
      .add(offset * 7, 'day')
      .startOf('day');
    const sunday = monday.add(6, 'day').endOf('day');
    return {
      from: monday.valueOf(),
      to: offset >= 0 ? todayEnd : sunday.valueOf(),
    };
  }
  if (range === 'year') {
    const y = now.add(offset, 'year');
    return {
      from: y.startOf('year').valueOf(),
      to: offset >= 0 ? todayEnd : y.endOf('year').valueOf(),
    };
  }
  // month
  const m = now.add(offset, 'month');
  return {
    from: m.startOf('month').valueOf(),
    to: offset >= 0 ? todayEnd : m.endOf('month').valueOf(),
  };
}

function getPeriodLabel(range: 'week' | 'month' | 'year', offset: number): string {
  const now = dayjs();
  if (range === 'week') {
    const dow = now.day();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const monday = now.subtract(daysToMon, 'day').add(offset * 7, 'day');
    const sunday = monday.add(6, 'day');
    return `${monday.format('M/D')} ~ ${sunday.format('M/D')}`;
  }
  if (range === 'year') {
    return `${now.add(offset, 'year').year()}年`;
  }
  const d = now.add(offset, 'month');
  return `${d.year()}年${d.month() + 1}月`;
}

function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

function getPrimaryName(r: FinanceRecord): string {
  return r.category_rel?.parent?.name ?? r.category_rel?.name ?? r.category;
}

function getSubName(r: FinanceRecord): string | null {
  if (!r.category_rel) return null;
  return r.category_rel.parent ? r.category_rel.name : null;
}

export default function FinancePage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [range, setRange] = useState<Range>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const [showChart, setShowChart] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newCatToast, setNewCatToast] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDrafts, setPreviewDrafts] = useState<ParsedFinanceDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listLightbox, setListLightbox] = useState<string | null>(null);

  const doLoad = useCallback(async (from: number, to: number) => {
    setError('');
    setListLoading(true);
    try {
      const data = await financeApi.getAll(from, to);
      setRecords(data);
    } catch (err) {
      setError(getErrorMessage(err, '加载记录失败，请重试'));
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadCurrentRange = useCallback(
    (r: Range, dateFrom: string, dateTo: string, weekOff = 0, monthOff = 0, yearOff = 0) => {
      if (r === 'custom') {
        if (!dateFrom || !dateTo) return Promise.resolve();
        return doLoad(
          dayjs(dateFrom).startOf('day').valueOf(),
          dayjs(dateTo).endOf('day').valueOf()
        );
      }
      const offset = r === 'week' ? weekOff : r === 'month' ? monthOff : r === 'year' ? yearOff : 0;
      const { from, to } = getRangeDates(r, offset);
      return doLoad(from, to);
    },
    [doLoad]
  );

  const rangeKey = range === 'custom' ? '' : `${range}-${weekOffset}-${monthOffset}-${yearOffset}`;
  const [prevRangeKey, setPrevRangeKey] = useState(rangeKey);
  if (rangeKey !== prevRangeKey) {
    setPrevRangeKey(rangeKey);
    if (rangeKey !== '') setListLoading(true);
  }

  useEffect(() => {
    if (range === 'custom') return;
    const offset =
      range === 'week'
        ? weekOffset
        : range === 'month'
          ? monthOffset
          : range === 'year'
            ? yearOffset
            : 0;
    let cancelled = false;
    const { from, to } = getRangeDates(range, offset);
    financeApi
      .getAll(from, to)
      .then((data) => {
        if (!cancelled) {
          setRecords(data);
          setListLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, '加载记录失败，请重试'));
          setListLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range, weekOffset, monthOffset, yearOffset]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    categoryApi
      .getAll()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        /* 静默；编辑弹窗自身会提示 */
      });
    return () => {
      cancelled = true;
    };
  }, [showCategoryModal]);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await financeApi.create(input);
      if (result.new_categories.length > 0) {
        const names = result.new_categories.map((c) => `「${c.name}」`).join('');
        setNewCatToast(`AI 识别到新分类${names}，已自动创建`);
        toastTimerRef.current = setTimeout(() => setNewCatToast(null), 4000);
      }
      await loadCurrentRange(range, customFrom, customTo, weekOffset, monthOffset, yearOffset);
      setInput('');
    } catch (err) {
      setError(getErrorMessage(err, '记录创建失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (file: File) => {
    setError('');
    setParsing(true);
    try {
      const res = await financeApi.parseImage(file);
      if (!res.relevant || res.records.length === 0) {
        setNewCatToast(res.message ?? '这张图片不像账单，已忽略');
        toastTimerRef.current = setTimeout(() => setNewCatToast(null), 4000);
        return;
      }
      setPreviewFile(file);
      setPreviewDrafts(res.records);
    } catch (err) {
      setError(getErrorMessage(err, '识别失败，请重试'));
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageSaved = async () => {
    setPreviewFile(null);
    setPreviewDrafts([]);
    await loadCurrentRange(range, customFrom, customTo, weekOffset, monthOffset, yearOffset);
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('确认删除这条记录？'))) return;
    setError('');
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await financeApi.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除失败，请重试'));
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleSaved = (updated: FinanceRecord) => {
    setRecords((prev) =>
      prev
        .map((r) => (r.id === updated.id ? updated : r))
        .sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime())
    );
    setEditing(null);
  };

  const RANGE_LABELS: Record<Exclude<Range, 'custom'>, string> = {
    today: '今天',
    week: '本周',
    month: '本月',
    year: '本年',
  };

  return (
    <>
      <div className="h-full flex flex-col gap-6">
        {/* fixed: title + input + filters */}
        <div className="flex-shrink-0 space-y-6">
          <h1 className="text-2xl font-semibold text-foreground">收支记录</h1>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {newCatToast && (
            <p className="text-amber-600 text-sm bg-amber-50 rounded px-3 py-2">{newCatToast}</p>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
                  placeholder="例：午饭吃了快餐，花了15"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  aria-label="上传账单图片"
                >
                  {parsing ? <Spinner className="h-4 w-4" /> : <PhotoIcon className="w-4 h-4" />}
                </Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? <Spinner className="h-4 w-4 mr-1" /> : null}
                  {loading ? '解析中…' : '记录'}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePickImage(f);
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(['today', 'week', 'month', 'year'] as Exclude<Range, 'custom'>[]).map((r) => (
                  <Button
                    key={r}
                    variant={range === r ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRange(r);
                      setWeekOffset(0);
                      setMonthOffset(0);
                      setYearOffset(0);
                    }}
                  >
                    {RANGE_LABELS[r]}
                  </Button>
                ))}
                <Button
                  variant={range === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRange('custom')}
                >
                  自定义
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(true)}>
                  管理分类
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowChart((v) => !v)}>
                  {showChart ? '隐藏图表' : '查看图表'}
                </Button>
              </div>
            </div>

            {(range === 'week' || range === 'month' || range === 'year') && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    if (range === 'week') setWeekOffset((o) => o - 1);
                    else if (range === 'month') setMonthOffset((o) => o - 1);
                    else setYearOffset((o) => o - 1);
                  }}
                >
                  ←
                </Button>
                <span className="text-xs text-muted-foreground min-w-[90px] text-center select-none">
                  {getPeriodLabel(
                    range,
                    range === 'week' ? weekOffset : range === 'month' ? monthOffset : yearOffset
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={
                    (range === 'week'
                      ? weekOffset
                      : range === 'month'
                        ? monthOffset
                        : yearOffset) >= 0
                  }
                  onClick={() => {
                    if (range === 'week') setWeekOffset((o) => o + 1);
                    else if (range === 'month') setMonthOffset((o) => o + 1);
                    else setYearOffset((o) => o + 1);
                  }}
                >
                  →
                </Button>
              </div>
            )}

            {range === 'custom' && (
              <DateRangePicker
                from={customFrom}
                to={customTo}
                onFromChange={setCustomFrom}
                onToChange={setCustomTo}
                onQuery={() => loadCurrentRange('custom', customFrom, customTo)}
              />
            )}
          </div>
        </div>

        {/* scrollable: chart + list */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
          {showChart && (
            <FinanceCharts
              records={records}
              onCategorySelect={setFilterCategory}
              onDayClick={(isoDay) => {
                setRange('custom');
                setCustomFrom(isoDay);
                setCustomTo(isoDay);
                doLoad(
                  dayjs(isoDay).startOf('day').valueOf(),
                  dayjs(isoDay).endOf('day').valueOf()
                );
              }}
            />
          )}

          {listLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {filterCategory && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <span>筛选：{filterCategory}</span>
                  <button
                    className="ml-auto text-indigo-400 hover:text-indigo-600"
                    onClick={() => setFilterCategory(null)}
                  >
                    ✕
                  </button>
                </div>
              )}
              {(filterCategory
                ? records.filter((r) => getPrimaryName(r) === filterCategory)
                : records
              ).map((r) => {
                const primary = getPrimaryName(r);
                const sub = getSubName(r);
                return (
                  <Card
                    key={r.id}
                    className={
                      r.amount > 0
                        ? 'border-l-[3px] border-l-emerald-500'
                        : 'border-l-[3px] border-l-red-400'
                    }
                  >
                    <CardContent className="p-4 flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0 gap-1 flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-base font-semibold ${
                              r.amount > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            }`}
                          >
                            {r.amount > 0 ? '+' : ''}¥{Math.abs(r.amount).toFixed(2)}
                          </span>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {primary}
                          </Badge>
                          {sub && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {sub}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {r.note || r.raw_input}
                        </p>
                      </div>
                      {r.image_path && (
                        <button
                          type="button"
                          onClick={() => setListLightbox(r.image_path)}
                          className="flex-shrink-0"
                          aria-label="查看账单图片"
                        >
                          <img
                            src={r.image_path}
                            alt="账单"
                            className="w-10 h-10 object-cover rounded border hover:opacity-90"
                          />
                        </button>
                      )}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {dayjs(r.happened_at).format('YYYY/MM/DD HH:mm')}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setEditing(r)}
                            disabled={deletingIds.has(r.id)}
                            aria-label="编辑记录"
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingIds.has(r.id)}
                            aria-label="删除记录"
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingIds.has(r.id) ? <Spinner className="h-4 w-4" /> : '删除'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {(filterCategory
                ? records.filter((r) => getPrimaryName(r) === filterCategory)
                : records
              ).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">暂无记录</p>
              )}
            </div>
          )}
        </div>
      </div>

      <CategoryModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
      <EditFinanceModal
        key={editing?.id ?? 'none'}
        record={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
      <FinanceImagePreviewModal
        file={previewFile}
        drafts={previewDrafts}
        categories={categories}
        onClose={() => {
          setPreviewFile(null);
          setPreviewDrafts([]);
        }}
        onSaved={handleImageSaved}
      />
      <ImageLightbox
        sources={listLightbox ? [listLightbox] : []}
        index={listLightbox ? 0 : null}
        onClose={() => setListLightbox(null)}
        onNavigate={() => {}}
      />
      {dialog}
    </>
  );
}
