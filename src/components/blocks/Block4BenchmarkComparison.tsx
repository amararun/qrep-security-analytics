import { useMemo } from 'react'
import {
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
import { BlockItem, MetricsData } from './Block1AReturns'
import { SymbolCell } from '@/components/ui/SymbolCell'

// Chart colors for up to 6 items + benchmark
const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const BENCHMARK_COLOR = '#64748b'

// Common chart props
const BAR_CHART_MARGIN_SMALL = { top: 30, right: 20, left: 10, bottom: 5 }
const XAXIS_PROPS = { tick: { fontSize: 14, fill: '#000' }, axisLine: false }

// Benchmark Comparison metrics
const BLOCK_4_METRICS = {
  title: 'Benchmark Comparison',
  metrics: ['Alpha', 'Beta', 'R²', 'Information Ratio', 'Treynor Ratio'],
}

// Metrics that should be displayed as percentages
const PERCENTAGE_METRICS = ['Alpha']

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Information Ratio': 'Info R.',
  'Treynor Ratio': 'Treynor',
}

interface Block4BenchmarkComparisonProps {
  items: BlockItem[]
  title?: string
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

  const isPercentage = PERCENTAGE_METRICS.includes(metricKey)

  if (typeof value === 'number') {
    if (isPercentage) {
      return `${(value * 100).toFixed(0)}%`
    }
    return value.toFixed(2)
  }

  return String(value)
}

export function Block4BenchmarkComparison({ items, title }: Block4BenchmarkComparisonProps) {
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

  // Alpha/Beta bar chart data
  const alphaBetaBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = ['Alpha', 'Beta']

    metrics.forEach(metric => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        // Alpha is displayed as percentage, Beta as raw value
        point[item.name] = metric === 'Alpha'
          ? getRawMetricValue(item.data, metric) * 100
          : getRawMetricValue(item.data, metric)
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

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Block Header */}
      <div className="bg-slate-700 px-4 py-2">
        <h2 className="text-lg font-bold text-white">{title || BLOCK_4_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns (Chart Left, Table Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Alpha & Beta Charts (stacked) */}
        <div className="border-r border-slate-200 p-3">
          <h3 className="text-base font-semibold text-black mb-1">Alpha (annualized %)</h3>
          <div className="h-[130px]">
            {alphaBetaBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alphaBetaBarData.filter(d => d.metric === 'Alpha')} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="metric" {...XAXIS_PROPS} />
                  <YAxis hide />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  {benchmarkItem && (
                    <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR} />
                  )}
                  {nonBenchmarkItems.map((item) => (
                    <Bar key={item.name} dataKey={item.name} fill={getItemColor(item)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <h3 className="text-base font-semibold text-black mb-1 mt-2">Beta (market sensitivity)</h3>
          <div className="h-[130px]">
            {alphaBetaBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alphaBetaBarData.filter(d => d.metric === 'Beta')} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="metric" {...XAXIS_PROPS} />
                  <YAxis hide />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  <ReferenceLine y={1} stroke="#059669" strokeDasharray="3 3" label={{ value: 'β=1', fontSize: 9, fill: '#059669' }} />
                  {benchmarkItem && (
                    <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR} />
                  )}
                  {nonBenchmarkItems.map((item) => (
                    <Bar key={item.name} dataKey={item.name} fill={getItemColor(item)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Benchmark Metrics Table */}
        <div className="overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_4_METRICS.metrics.map(metric => (
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
                  {BLOCK_4_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows */}
              {Array.from({ length: Math.max(0, 6 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-300">-</td>
                  {BLOCK_4_METRICS.metrics.map(metric => (
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
