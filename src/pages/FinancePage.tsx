import { useState, useEffect, useCallback, useRef } from "react";
import { useConfirm } from "../hooks/useConfirm";
import { financeApi } from "../api/finance";
import type { FinanceRecord } from "../api/finance";
import FinanceCharts from "../components/FinanceCharts";
import CategoryModal from "../components/CategoryModal";
import { getErrorMessage } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/DateRangePicker";

type Range = "today" | "week" | "month" | "year" | "custom";

function getRangeDates(range: Exclude<Range, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = now.toISOString();
  if (range === "today") {
    const from = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    return { from, to };
  }
  if (range === "week") {
    const from = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    return { from, to };
  }
  if (range === "year") {
    const from = new Date(now.getFullYear(), 0, 1).toISOString();
    return { from, to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { from, to };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("week");
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const [showChart, setShowChart] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [error, setError] = useState("");
  const [newCatToast, setNewCatToast] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLoad = useCallback(async (from: string, to: string) => {
    setError("");
    try {
      const data = await financeApi.getAll(from, to);
      setRecords(data);
    } catch (err) {
      setError(getErrorMessage(err, "加载记录失败，请重试"));
    }
  }, []);

  const loadCurrentRange = useCallback(
    (r: Range, dateFrom: string, dateTo: string) => {
      if (r === "custom") {
        if (!dateFrom || !dateTo) return Promise.resolve();
        return doLoad(
          new Date(dateFrom).toISOString(),
          new Date(dateTo + "T23:59:59").toISOString(),
        );
      }
      const { from, to } = getRangeDates(r);
      return doLoad(from, to);
    },
    [doLoad],
  );

  useEffect(() => {
    if (range === "custom") return;
    let cancelled = false;
    const { from, to } = getRangeDates(range);
    financeApi
      .getAll(from, to)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "加载记录失败，请重试"));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await financeApi.create(input);
      if (result.new_categories.length > 0) {
        const names = result.new_categories
          .map((c) => `「${c.name}」`)
          .join("");
        setNewCatToast(`AI 识别到新分类${names}，已自动创建`);
        toastTimerRef.current = setTimeout(() => setNewCatToast(null), 4000);
      }
      await loadCurrentRange(range, customFrom, customTo);
      setInput("");
    } catch (err) {
      setError(getErrorMessage(err, "记录创建失败，请重试"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm("确认删除这条记录？"))) return;
    setError("");
    try {
      await financeApi.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, "删除失败，请重试"));
    }
  };

  const RANGE_LABELS: Record<Exclude<Range, "custom">, string> = {
    today: "今天",
    week: "本周",
    month: "本月",
    year: "本年",
  };

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">收支记录</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {newCatToast && (
          <p className="text-amber-600 text-sm bg-amber-50 rounded px-3 py-2">
            {newCatToast}
          </p>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !loading && handleCreate()
                }
                placeholder="例：午饭吃了快餐，花了15"
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "解析中…" : "记录"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(
                ["today", "week", "month", "year"] as Exclude<Range, "custom">[]
              ).map((r) => (
                <Button
                  key={r}
                  variant={range === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRange(r)}
                >
                  {RANGE_LABELS[r]}
                </Button>
              ))}
              <Button
                variant={range === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setRange("custom")}
              >
                自定义
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryModal(true)}
              >
                管理分类
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart((v) => !v)}
              >
                {showChart ? "隐藏图表" : "查看图表"}
              </Button>
            </div>
          </div>

          {range === "custom" && (
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onFromChange={setCustomFrom}
              onToChange={setCustomTo}
              onQuery={() => loadCurrentRange("custom", customFrom, customTo)}
            />
          )}
        </div>

        {showChart && <FinanceCharts records={records} />}

        <div className="space-y-2">
          {records.map((r) => {
            const primary = getPrimaryName(r);
            const sub = getSubName(r);
            return (
              <Card
                key={r.id}
                className={
                  r.amount > 0
                    ? "border-l-[3px] border-l-emerald-500"
                    : "border-l-[3px] border-l-red-400"
                }
              >
                <CardContent className="p-4 flex items-center gap-3 py-1">
                  <div className="flex-1 min-w-0 gap-1 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-base font-semibold ${
                          r.amount > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {r.amount > 0 ? "+" : ""}¥{Math.abs(r.amount).toFixed(2)}
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
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.happened_at).toLocaleString("zh-CN")}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDelete(r.id)}
                      aria-label="删除记录"
                      className="text-destructive hover:text-destructive"
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {records.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无记录
            </p>
          )}
        </div>
      </div>

      <CategoryModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
      {dialog}
    </>
  );
}

