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
  Cell,
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
];

interface Props {
  records: FinanceRecord[];
}

export default function FinanceCharts({ records }: Props) {
  if (records.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">暂无数据</p>;

  // 按日期聚合收支
  const byDay = records.reduce<
    Record<string, { income: number; expense: number }>
  >((acc, r) => {
    const day = new Date(r.happened_at).toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    });
    if (!acc[day]) acc[day] = { income: 0, expense: 0 };
    if (r.amount > 0) acc[day].income += r.amount;
    else acc[day].expense += Math.abs(r.amount);
    return acc;
  }, {});

  const barData = Object.entries(byDay).map(([day, v]) => ({ day, ...v }));

  // 按分类聚合支出
  const byCategory = records
    .filter((r) => r.amount < 0)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + Math.abs(r.amount);
      return acc;
    }, {});

  const pieData = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value,
  }));
  const totalIncome = records
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = records
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + Math.abs(r.amount), 0);

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

      <div className="bg-white rounded-xl p-4 shadow-sm border">
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
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="text-sm font-medium text-gray-600 mb-3">支出分类</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry: { name?: string; percent?: number }) =>
                  `${entry.name ?? ''} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) =>
                  `¥${(value as number).toFixed(2)}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
