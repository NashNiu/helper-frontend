import { useState, useEffect, useCallback } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { financeApi } from '../api/finance';
import type { FinanceRecord } from '../api/finance';
import FinanceCharts from '../components/FinanceCharts';
import { getErrorMessage } from '../api/http';

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
    } catch (err) {
      setError(getErrorMessage(err, '加载记录失败，请重试'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { from, to } = getRangeDates(range);
        const data = await financeApi.getAll(from, to);
        if (!cancelled) setRecords(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '加载记录失败，请重试'));
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    try {
      await financeApi.create(input);
      await loadRecords(range);
      setInput('');
    } catch (err) {
      setError(getErrorMessage(err, '记录创建失败，请重试'));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除这条记录？')) return;
    setError('');
    try {
      await financeApi.remove(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除失败，请重试'));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">收支记录</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/40 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
          placeholder="例：午饭吃了快餐，花了15"
          className="flex-1 rounded-lg px-3 py-2 text-sm bg-white/80 focus:bg-white dark:bg-gray-800/80 dark:focus:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition" />
        <button onClick={handleCreate} disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? '解析中…' : '记录'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1 text-sm rounded-lg transition ${range === r ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              {r === 'today' ? '今天' : r === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowChart(v => !v)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          {showChart ? '隐藏图表' : '查看图表'}
        </button>
      </div>

      {showChart && <FinanceCharts records={records} />}

      <div className="space-y-2">
        {records.map(r => (
          <div key={r.id} className={`rounded-xl p-4 shadow-sm border flex items-center gap-3 ${
            r.amount > 0
              ? 'bg-gradient-to-r from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 border-green-100 dark:border-green-900/40'
              : 'bg-gradient-to-r from-red-50 to-white dark:from-red-950/30 dark:to-gray-900 border-red-100 dark:border-red-900/40'
          }`}>
            {r.amount > 0
              ? <ArrowTrendingUpIcon className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
              : <ArrowTrendingDownIcon className="w-5 h-5 text-red-400 dark:text-red-400 flex-shrink-0" />}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-base font-semibold ${r.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {r.amount > 0 ? '+' : ''}¥{Math.abs(r.amount).toFixed(2)}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full text-gray-500">{r.category}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.note || r.raw_input} · {new Date(r.happened_at).toLocaleString('zh-CN')}</p>
            </div>
            <button onClick={() => handleDelete(r.id)} aria-label="删除记录"
              className="text-xs text-red-400 hover:text-red-600">删除</button>
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">暂无记录</p>}
      </div>
    </div>
  );
}
