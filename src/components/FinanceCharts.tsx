import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
} from 'recharts';
import type { FinanceRecord } from '../api/finance';

const PIE_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
];

interface Props {
  records: FinanceRecord[];
  onDayClick?: (isoDay: string) => void;
  onCategorySelect?: (category: string | null) => void;
}

function getPrimaryName(r: FinanceRecord): string {
  return r.category_rel?.parent?.name ?? r.category_rel?.name ?? r.category;
}

function getSubName(r: FinanceRecord): string {
  if (!r.category_rel) return '未分类';
  return r.category_rel.parent ? r.category_rel.name : '(主分类直接)';
}

export default function FinanceCharts({ records, onDayClick, onCategorySelect }: Props) {
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const tickColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    color: isDark ? '#f9fafb' : '#111827',
  };

  if (records.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>;

  const byDay = records.reduce<Record<string, { income: number; expense: number }>>((acc, r) => {
    const key = dayjs(r.happened_at).format('YYYY-MM-DD');
    if (!acc[key]) acc[key] = { income: 0, expense: 0 };
    if (r.amount > 0) acc[key].income += r.amount;
    else acc[key].expense += Math.abs(r.amount);
    return acc;
  }, {});

  const barData = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([isoDay, v]) => ({
      day: `${isoDay.slice(5, 7)}/${isoDay.slice(8, 10)}`,
      isoDay,
      ...v,
    }));

  const expenses = records.filter((r) => r.amount < 0);

  const topLevelAgg = expenses.reduce<Record<string, number>>((acc, r) => {
    const key = getPrimaryName(r);
    acc[key] = (acc[key] ?? 0) + Math.abs(r.amount);
    return acc;
  }, {});

  const activeDrill = drillCategory && topLevelAgg[drillCategory] ? drillCategory : null;

  const pieAggregation = activeDrill
    ? expenses
        .filter((r) => getPrimaryName(r) === activeDrill)
        .reduce<Record<string, number>>((acc, r) => {
          const key = getSubName(r);
          acc[key] = (acc[key] ?? 0) + Math.abs(r.amount);
          return acc;
        }, {})
    : topLevelAgg;

  const pieData = Object.entries(pieAggregation).map(([name, value], i) => ({
    name,
    value,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const totalIncome = records.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + Math.abs(r.amount), 0);

  // 分类→颜色映射,沿用饼图的 PIE_COLORS 顺序(topLevelAgg 插入序),让排行与饼图同色。
  const categoryColor: Record<string, string> = {};
  Object.keys(topLevelAgg).forEach((name, i) => {
    categoryColor[name] = PIE_COLORS[i % PIE_COLORS.length];
  });

  // 支出按主分类排行(金额降序),每行带该分类的明细(时间倒序),用于行内展开。
  const rankRows = Object.entries(topLevelAgg)
    .map(([name, total]) => {
      const items = expenses
        .filter((r) => getPrimaryName(r) === name)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      return {
        name,
        total,
        count: items.length,
        percent: totalExpense > 0 ? total / totalExpense : 0,
        color: categoryColor[name],
        items,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-950/40 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">总收入</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ¥{totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">总支出</p>
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">
            ¥{totalExpense.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border [&_*:focus]:outline-none [&_*]:focus:outline-none">
        <h3 className="text-sm font-medium text-card-foreground mb-3">每日收支</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: tickColor }} />
            <YAxis tick={{ fontSize: 12, fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipStyle.color }} />
            <Legend formatter={(value) => <span style={{ color: tickColor }}>{value}</span>} />
            <Bar
              dataKey="income"
              name="收入"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              style={onDayClick ? { cursor: 'pointer' } : undefined}
              onClick={
                onDayClick
                  ? (entry: unknown) => onDayClick((entry as { isoDay: string }).isoDay)
                  : undefined
              }
            />
            <Bar
              dataKey="expense"
              name="支出"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              style={onDayClick ? { cursor: 'pointer' } : undefined}
              onClick={
                onDayClick
                  ? (entry: unknown) => onDayClick((entry as { isoDay: string }).isoDay)
                  : undefined
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-sm border [&_*:focus]:outline-none [&_*]:focus:outline-none">
          <div className="flex items-center gap-1 text-sm text-card-foreground mb-3">
            <button
              className={
                activeDrill ? 'underline text-indigo-500 dark:text-indigo-400' : 'font-medium'
              }
              onClick={() => {
                setDrillCategory(null);
                onCategorySelect?.(null);
              }}
            >
              支出分布
            </button>
            {activeDrill && (
              <>
                <span className="text-muted-foreground">›</span>
                <span className="font-medium">{activeDrill}</span>
              </>
            )}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                stroke="none"
                onClick={
                  activeDrill
                    ? undefined
                    : (entry: { name?: string }) => {
                        if (entry.name) {
                          setDrillCategory(entry.name);
                          onCategorySelect?.(entry.name);
                        }
                      }
                }
                style={{ cursor: activeDrill ? 'default' : 'pointer' }}
                label={(props: {
                  name?: string;
                  percent?: number;
                  x?: number;
                  y?: number;
                  textAnchor?: 'end' | 'inherit' | 'middle' | 'start';
                }) => (
                  <text
                    x={props.x}
                    y={props.y}
                    fill={tickColor}
                    textAnchor={props.textAnchor ?? 'middle'}
                    dominantBaseline="central"
                    fontSize={12}
                  >
                    {`${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                  </text>
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {!activeDrill && (
            <p className="text-xs text-muted-foreground text-center mt-1">点击扇形查看子分类明细</p>
          )}
        </div>
      )}

      {rankRows.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <h3 className="text-sm font-medium text-card-foreground mb-3">支出分类排行</h3>
          <div className="space-y-1">
            {rankRows.map((row) => {
              const expanded = expandedCategory === row.name;
              return (
                <div key={row.name}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedCategory((cur) => (cur === row.name ? null : row.name))
                    }
                    className="w-full text-left flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    >
                      {row.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-card-foreground truncate">{row.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {(row.percent * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.percent * 100).toFixed(1)}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-red-500 dark:text-red-400">
                        ¥{row.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.count}笔</div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="pl-12 pr-1 pb-2 space-y-1">
                      {row.items.map((r) => {
                        const sub = getSubName(r);
                        const showSub = sub && sub !== '(主分类直接)' && sub !== '未分类';
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0"
                          >
                            <span className="font-medium text-red-500 dark:text-red-400 flex-shrink-0">
                              ¥{Math.abs(r.amount).toFixed(2)}
                            </span>
                            {showSub && (
                              <span className="text-muted-foreground flex-shrink-0">{sub}</span>
                            )}
                            <span className="text-muted-foreground truncate flex-1">
                              {r.note || r.raw_input}
                            </span>
                            <span className="text-muted-foreground flex-shrink-0">
                              {dayjs(r.happened_at).format('MM-DD HH:mm')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
