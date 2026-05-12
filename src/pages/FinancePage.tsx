import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '../api/finance';
import type { FinanceRecord } from '../api/finance';
import FinanceCharts from '../components/FinanceCharts';

type Range = 'today' | 'week' | 'month';

function getRangeDates(range: Range): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  if (range === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { from, to };
  }
  if (range === 'week') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { from, to };
}

export default function FinancePage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>('week');
  const [showChart, setShowChart] = useState(false);
  const [error, setError] = useState('');

  const loadRecords = useCallback(async (r: Range) => {
    setError('');
    try {
      const { from, to } = getRangeDates(r);
      const data = await financeApi.getAll(from, to);
      setRecords(data);
    } catch {
      setError('加载记录失败，请重试');
    }
  }, []);

  useEffect(() => { loadRecords(range); }, [range, loadRecords]);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    try {
      await financeApi.create(input);
      await loadRecords(range);  // reload so range filter is applied
      setInput('');
    } catch {
      setError('记录创建失败，请重试');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    setError('');
    try {
      await financeApi.remove(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch {
      setError('删除失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">收支记录</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-xl p-4 shadow-sm border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
          placeholder="例：午饭吃了快餐，花了15"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button onClick={handleCreate} disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? '解析中…' : '记录'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1 text-sm rounded-lg transition ${range === r ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              {r === 'today' ? '今天' : r === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowChart(v => !v)}
          className="text-sm text-indigo-600 hover:underline">
          {showChart ? '隐藏图表' : '查看图表'}
        </button>
      </div>

      {showChart && <FinanceCharts records={records} />}

      <div className="space-y-2">
        {records.map(r => (
          <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
            <span className="text-lg">{r.amount > 0 ? '💰' : '💸'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-base font-semibold ${r.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {r.amount > 0 ? '+' : ''}¥{Math.abs(r.amount).toFixed(2)}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{r.category}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{r.note || r.raw_input} · {new Date(r.happened_at).toLocaleString('zh-CN')}</p>
            </div>
            <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-gray-400 text-center py-8">暂无记录</p>}
      </div>
    </div>
  );
}
