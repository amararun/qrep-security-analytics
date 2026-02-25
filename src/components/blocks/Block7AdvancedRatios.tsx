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

// Advanced Ratios metrics
const BLOCK_7_METRICS = {
  title: 'Advanced Ratios',
  metrics: ['Prob. Sharpe Ratio', 'Smart Sharpe', 'Smart Sortino', 'Sortino/√2', 'Gain/Pain Ratio', 'CPC Index', 'Correlation'],
}

// Short names for table headers (JSX handled separately for multi-line)
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Prob. Sharpe Ratio': 'Prob. Sharpe',
  'Gain/Pain Ratio': 'Gain/Pain',
  'CPC Index': 'CPC',
}

// Headers that need 2-row wrapping
const METRIC_HEADER_JSX: Record<string, React.ReactNode> = {
  'Prob. Sharpe Ratio': <span>Prob.<br/>Sharpe</span>,
  'Smart Sharpe': <span>Smart<br/>Sharpe</span>,
  'Smart Sortino': <span>Smart<br/>Sortino</span>,
  'Sortino/√2': <span>Sortino<br/>/√2</span>,
  'Gain/Pain Ratio': <span>Gain<br/>/Pain</span>,
}

interface Block7AdvancedRatiosProps {
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

export function Block7AdvancedRatios({ items, title }: Block7AdvancedRatiosProps) {
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

  // Advanced ratios bar chart data
  const advancedRatiosBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'Prob. Sharpe', key: 'Prob. Sharpe Ratio' },
      { metric: 'Smart Sharpe', key: 'Smart Sharpe' },
      { metric: 'Smart Sortino', key: 'Smart Sortino' },
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
        <h2 className="text-lg font-bold text-white">{title || BLOCK_7_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns (Chart Left, Table Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Advanced Ratios Bar Chart */}
        <div className="border-r border-slate-200 p-3">
          <h3 className="text-base font-semibold text-black mb-1">Smart Ratios Comparison</h3>
          <div className="h-[280px]">
            {advancedRatiosBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={advancedRatiosBarData} margin={BAR_CHART_MARGIN_SMALL}>
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
            )}
          </div>
        </div>

        {/* Right: Advanced Ratios Table */}
        <div className="overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-1 px-1.5 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_7_METRICS.metrics.map(metric => (
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
                  {BLOCK_7_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows */}
              {Array.from({ length: Math.max(0, 6 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-1.5 text-slate-300">-</td>
                  {BLOCK_7_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 text-slate-300">-</td>
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
