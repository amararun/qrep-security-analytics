import { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
import { Info } from 'lucide-react'
import { BlockItem, MetricsData } from './Block1AReturns'
import { SymbolCell } from '@/components/ui/SymbolCell'

// Chart colors for up to 6 items + benchmark
const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const BENCHMARK_COLOR = '#64748b'

// Common chart props
const BAR_CHART_MARGIN_SMALL = { top: 30, right: 20, left: 10, bottom: 5 }
const XAXIS_PROPS = { tick: { fontSize: 14, fill: '#000' }, axisLine: false }

// Performance Ratios metrics
const BLOCK_1B_METRICS = {
  title: 'Performance Ratios',
  metrics: ['Sharpe', 'Sortino', 'Calmar', 'Omega', 'Payoff Ratio', 'Profit Factor'],
}

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Payoff Ratio': 'Payoff',
  'Profit Factor': 'Profit F.',
}

interface Block1BRatiosProps {
  items: BlockItem[]
  title?: string
  onInfoClick?: () => void
}

// Helper functions
const getShortName = (metric: string): string => {
  return METRIC_SHORT_NAMES[metric] || metric
}

const getRawMetricValue = (data: MetricsData, key: string): number => {
  const metrics = data.all_metrics || data.metrics || {}
  const value = metrics[key]
  if (value === null || value === undefined || value === '-' || value === 'N/A') return 0
  if (typeof value === 'number') return value
  const parsed = parseFloat(String(value).replace('%', ''))
  return isNaN(parsed) ? 0 : parsed
}

const formatMetricValue = (data: MetricsData, metricKey: string): string => {
  const metrics = data.all_metrics || data.metrics || {}
  const value = metrics[metricKey]

  if (value === null || value === undefined) return '-'
  if (value === '-' || value === 'N/A') return String(value)

  if (typeof value === 'number') {
    return value.toFixed(2)
  }

  return String(value)
}

export function Block1BRatios({ items, title, onInfoClick }: Block1BRatiosProps) {
  const [chartTab, setChartTab] = useState<1 | 2 | 3>(1)

  // Filter successful items
  const successfulItems = useMemo(() => {
    return items.filter(item => item.data.success !== false)
  }, [items])

  // Get non-benchmark items for chart colors
  const nonBenchmarkItems = useMemo(() => {
    return successfulItems.filter(item => !item.isBenchmark)
  }, [successfulItems])

  // Get benchmark item
  const benchmarkItem = useMemo(() => {
    return successfulItems.find(item => item.isBenchmark)
  }, [successfulItems])

  // Sharpe/Sortino bar chart data
  const ratiosBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const ratios = ['Sharpe', 'Sortino']
    ratios.forEach(ratio => {
      const point: Record<string, string | number> = { metric: ratio }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, ratio)
      })
      data.push(point)
    })
    return data
  }, [successfulItems])

  // Calmar/Omega bar chart data
  const calmarOmegaBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const ratios = ['Calmar', 'Omega']
    ratios.forEach(ratio => {
      const point: Record<string, string | number> = { metric: ratio }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, ratio)
      })
      data.push(point)
    })
    return data
  }, [successfulItems])

  // Payoff/Profit Factor bar chart data
  const payoffProfitBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const ratios = [
      { metric: 'Payoff', key: 'Payoff Ratio' },
      { metric: 'Profit F.', key: 'Profit Factor' },
    ]
    ratios.forEach(({ metric, key }) => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, key)
      })
      data.push(point)
    })
    return data
  }, [successfulItems])

  // Get color for an item
  const getItemColor = (item: BlockItem): string => {
    if (item.isBenchmark) return BENCHMARK_COLOR
    if (item.color) return item.color
    const nonBenchmarkIndex = nonBenchmarkItems.findIndex(i => i.name === item.name)
    return CHART_COLORS[nonBenchmarkIndex % CHART_COLORS.length]
  }

  // Render bar chart with reference lines
  const renderBarChart = (data: Record<string, string | number>[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={BAR_CHART_MARGIN_SMALL}>
        <XAxis dataKey="metric" {...XAXIS_PROPS} />
        <YAxis hide />
        <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
        <ReferenceLine y={1} stroke="#059669" strokeDasharray="3 3" label={{ value: 'Good', fontSize: 10, fill: '#059669' }} />
        {benchmarkItem && (
          <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR} />
        )}
        {nonBenchmarkItems.map((item) => (
          <Bar key={item.name} dataKey={item.name} fill={getItemColor(item)} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Block Header */}
      <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{title || BLOCK_1B_METRICS.title}</h2>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="flex items-center gap-1.5 text-white hover:text-teal-200 transition-colors"
            title="View metrics documentation"
          >
            <Info className="w-5 h-5" />
            <span className="text-sm font-medium">Info</span>
          </button>
        )}
      </div>

      {/* Block Content - Two Columns (Chart Left, Table Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Tabbed Ratio Charts */}
        <div className="border-r border-slate-200 p-3">
          {/* Chart tabs */}
          <div className="flex items-center gap-4 mb-2">
            {[
              { key: 1, label: 'Sharpe/Sortino' },
              { key: 2, label: 'Calmar/Omega' },
              { key: 3, label: 'Payoff/Profit' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key as typeof chartTab)}
                className={`pb-1 text-base font-medium transition-colors ${
                  chartTab === tab.key ? 'text-black border-b-2 border-black' : 'text-slate-500 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fixed height chart container */}
          <div className="h-[260px]">
            {/* Tab 1: Sharpe/Sortino */}
            {chartTab === 1 && ratiosBarData.length > 0 && renderBarChart(ratiosBarData)}

            {/* Tab 2: Calmar/Omega */}
            {chartTab === 2 && calmarOmegaBarData.length > 0 && renderBarChart(calmarOmegaBarData)}

            {/* Tab 3: Payoff/Profit */}
            {chartTab === 3 && payoffProfitBarData.length > 0 && renderBarChart(payoffProfitBarData)}
          </div>
        </div>

        {/* Right: Ratios Table */}
        <div className="overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_1B_METRICS.metrics.map(metric => (
                  <th key={metric} className="text-right py-2 px-2 font-semibold text-black whitespace-nowrap">
                    {getShortName(metric)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {successfulItems.map((item) => (
                <tr
                  key={item.name}
                  className={`border-b border-slate-200 ${item.isBenchmark ? 'bg-slate-100' : ''}`}
                >
                  <SymbolCell name={item.name} description={item.description} isBenchmark={item.isBenchmark} />
                  {BLOCK_1B_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows for consistent height */}
              {Array.from({ length: Math.max(0, 7 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-300">-</td>
                  {BLOCK_1B_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 text-slate-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
