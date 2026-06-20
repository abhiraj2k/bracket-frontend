import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, transactionsApi } from '@et/api';
import { formatCurrency, formatMonthYear, currentMonthYear } from '@et/utils';
import { keys } from '../../lib/queryClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];

export default function Reports() {
  const { month: cm, year: cy } = currentMonthYear();
  const [month, setMonth] = useState(cm);
  const [year, setYear] = useState(cy);

  const { data: breakdown = [], isLoading } = useQuery({
    queryKey: keys.breakdown({ month, year }),
    queryFn: () => reportsApi.breakdown({ month, year }),
  });

  const { data: txPage } = useQuery({
    queryKey: keys.transactions({ month, year, page: 0, size: 500 }),
    queryFn: () => transactionsApi.list({ month, year, page: 0, size: 500 }),
  });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const income = (txPage?.content ?? []).filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const expense = (txPage?.content ?? []).filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const net = income - expense;

  const chartData = breakdown.map((b, i) => ({
    name: b.categoryName,
    value: parseFloat(b.total),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold mb-5">Reports</h1>

      {/* Month picker */}
      <div className="flex items-center justify-between card mb-5">
        <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white">‹</button>
        <span className="text-white font-semibold">{formatMonthYear(month, year)}</span>
        <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white">›</button>
      </div>

      {isLoading && (
        <div className="h-64 flex items-center justify-center text-gray-500">Loading…</div>
      )}

      {!isLoading && breakdown.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">📊</p>
          <p>No data for {formatMonthYear(month, year)}.</p>
        </div>
      )}

      {breakdown.length > 0 && (
        <>
          {/* Donut chart */}
          <div className="card mb-5">
            <p className="text-white font-semibold mb-4">Spending Breakdown</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#26262E', border: '1px solid #2E2E38', borderRadius: 12 }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-400 text-xs truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By category */}
          <div className="card mb-5">
            <p className="text-white font-semibold mb-4">By Category</p>
            <div className="space-y-3">
              {breakdown.map((b, i) => (
                <div key={b.categoryId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{b.categoryName}</span>
                    <span className="text-white font-medium">{formatCurrency(b.total)}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${b.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5 text-right">{b.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      <div className="card space-y-3">
        <p className="text-white font-semibold">Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Income</span>
          <span className="text-income font-medium">+{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Expenses</span>
          <span className="text-expense font-medium">-{formatCurrency(expense)}</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
          <span className="text-white">Net</span>
          <span className={net >= 0 ? 'text-income' : 'text-expense'}>{formatCurrency(net)}</span>
        </div>
      </div>
    </div>
  );
}
