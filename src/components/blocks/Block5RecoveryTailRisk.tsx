import React, { useMemo } from 'react'
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

// Recovery & Tail Risk metrics
const BLOCK_5_METRICS = {
  title: 'Recovery & Tail Risk',
  metrics: ['Recovery Factor', 'Ulcer Index', 'Serenity Index', 'Tail Ratio', 'Common Sense Ratio', 'Outlier Win Ratio', 'Outlier Loss Ratio'],
}

// Block 5B: Advanced Risk Metrics
const BLOCK_5B_METRICS = {
  subtitle: 'Advanced Risk',
  metrics: ['Ulcer Performance Index', 'Risk of Ruin', 'Kelly Criterion'],
}

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Recovery Factor': 'Recov. F.',
  'Ulcer Index': 'Ulcer',
  'Serenity Index': 'Serenity',
  'Tail Ratio': 'Tail R.',
  'Common Sense Ratio': 'CS Ratio',
  'Outlier Win Ratio': 'Out Win',
  'Outlier Loss Ratio': 'Out Loss',
  'Ulcer Performance Index': 'Ulcer Perf',
  'Risk of Ruin': 'Ruin',
  'Kelly Criterion': 'Kelly',
}

// Headers that need 2-row wrapping
const METRIC_HEADER_JSX: Record<string, React.ReactNode> = {
  'Recovery Factor': <span>Recov.<br/>F.</span>,
  'Common Sense Ratio': <span>CS<br/>Ratio</span>,
  'Outlier Win Ratio': <span>Out<br/>Win</span>,
  'Outlier Loss Ratio': <span>Out<br/>Loss</span>,
  'Tail Ratio': <span>Tail<br/>R.</span>,
}

interface Block5RecoveryTailRiskProps {
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

  if (typeof value === 'number') {
    return value.toFixed(2)
  }

  return String(value)
}

export function Block5RecoveryTailRisk({ items, title }: Block5RecoveryTailRiskProps) {
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

  // Recovery metrics bar chart data
  const recoveryBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = ['Recovery Factor', 'Tail Ratio']

    metrics.forEach(metric => {
      const point: Record<string, string | number> = { metric: metric.replace(' Factor', '').replace(' Ratio', '') }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, metric)
      })
      data.push(point)
    })

    return data
  }, [successfulItems])

  // Advanced Risk bar chart data (Ulcer Perf, Kelly)
  const advancedRiskBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'Ulcer Perf', key: 'Ulcer Performance Index' },
      { metric: 'Kelly', key: 'Kelly Criterion' },
    ]

    metrics.forEach(({ metric, key }) => {
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

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Block Header */}
      <div className="bg-slate-700 px-4 py-2">
        <h2 className="text-lg font-bold text-white">{title || BLOCK_5_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Recovery Metrics Table */}
        <div className="border-r border-slate-200 overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-1 px-1.5 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_5_METRICS.metrics.map(metric => (
                  <th key={metric} className="text-right py-1 px-1.5 font-semibold text-black text-sm leading-tight">
                    {METRIC_HEADER_JSX[metric] || getShortName(metric)}
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
                  {BLOCK_5_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows */}
              {Array.from({ length: Math.max(0, 6 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-300">-</td>
                  {BLOCK_5_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 text-slate-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Recovery Bar Chart */}
        <div className="p-3">
          <h3 className="text-base font-semibold text-black mb-1">Recovery & Tail Metrics</h3>
          <div className="h-[280px]">
            {recoveryBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoveryBarData} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="metric" {...XAXIS_PROPS} />
                  <YAxis hide />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  <ReferenceLine y={1} stroke="#059669" strokeDasharray="3 3" label={{ value: '1.0', fontSize: 10, fill: '#059669' }} />
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
      </div>

      {/* Block 5B: Advanced Risk Metrics (sub-section with chart) */}
      <div className="border-t border-slate-300 bg-slate-50">
        <div className="px-4 py-2">
          <h3 className="text-base font-semibold text-black">{BLOCK_5B_METRICS.subtitle}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Table */}
          <div className="border-r border-slate-200 overflow-auto px-2 pb-2">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                  {BLOCK_5B_METRICS.metrics.map(metric => (
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
                    className={`border-b border-slate-100 ${item.isBenchmark ? 'bg-slate-100' : ''}`}
                  >
                    <SymbolCell name={item.name} description={item.description} isBenchmark={item.isBenchmark} />
                    {BLOCK_5B_METRICS.metrics.map(metric => (
                      <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                        {formatMetricValue(item.data, metric)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Advanced Risk Chart */}
          <div className="p-3">
            <h4 className="text-base font-semibold text-black mb-1">Ulcer Perf & Kelly</h4>
            <div className="h-[180px]">
              {advancedRiskBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={advancedRiskBarData} margin={BAR_CHART_MARGIN_SMALL}>
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
          </div>
        </div>
      </div>
    </div>
  )
}
