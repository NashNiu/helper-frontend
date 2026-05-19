import { useState } from "react";
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
} from "recharts";
import type { FinanceRecord } from "../api/finance";

const PIE_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

interface Props {
  records: FinanceRecord[];
}

function getPrimaryName(r: FinanceRecord): string {
  return r.category_rel?.parent?.name ?? r.category_rel?.name ?? r.category;
}

function getSubName(r: FinanceRecord): string {
  if (!r.category_rel) return "未分类";
  return r.category_rel.parent ? r.category_rel.name : "(主分类直接)";
}

export default function FinanceCharts({ records }: Props) {
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  if (records.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">暂无数据</p>;

  const byDay = records.reduce<
    Record<string, { income: number; expense: number }>
  >((acc, r) => {
    const d = new Date(r.happened_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = { income: 0, expense: 0 };
    if (r.amount > 0) acc[key].income += r.amount;
    else acc[key].expense += Math.abs(r.amount);
    return acc;
  }, {});

  const barData = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([isoDay, v]) => ({
      day: `${isoDay.slice(5, 7)}/${isoDay.slice(8, 10)}`,
      ...v,
    }));

  const expenses = records.filter((r) => r.amount < 0);

  const topLevelAgg = expenses.reduce<Record<string, number>>((acc, r) => {
    const key = getPrimaryName(r);
    acc[key] = (acc[key] ?? 0) + Math.abs(r.amount);
    return acc;
  }, {});

  // activeDrill is only valid if the category still exists in current data
  const activeDrill =
    drillCategory && topLevelAgg[drillCategory] ? drillCategory : null;

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

  const totalIncome = records
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + Math.abs(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">总收入</p>
          <p className="text-2xl font-bold text-green-600">
            ¥{totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">总支出</p>
          <p className="text-2xl font-bold text-red-500">
            ¥{totalExpense.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border [&_*:focus]:outline-none [&_*]:focus:outline-none">
        <h3 className="text-sm font-medium text-gray-600 mb-3">每日收支</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="income"
              name="收入"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expense"
              name="支出"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border [&_*:focus]:outline-none [&_*]:focus:outline-none">
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
            <button
              className={
                activeDrill ? "underline text-indigo-600" : "font-medium"
              }
              onClick={() => setDrillCategory(null)}
            >
              支出分布
            </button>
            {activeDrill && (
              <>
                <span className="text-gray-400">›</span>
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
                        if (entry.name) setDrillCategory(entry.name);
                      }
                }
                style={{ cursor: activeDrill ? "default" : "pointer" }}
                label={(entry: { name?: string; percent?: number }) =>
                  `${entry.name ?? ""} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
                }
              />
              {/* <Tooltip
                formatter={(value: unknown) =>
                  `¥${(value as number).toFixed(2)}`
                }
              /> */}
            </PieChart>
          </ResponsiveContainer>

          {!activeDrill && (
            <p className="text-xs text-gray-400 text-center mt-1">
              点击扇形查看子分类明细
            </p>
          )}
        </div>
      )}
    </div>
  );
}

