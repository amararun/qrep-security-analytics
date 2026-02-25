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

// Trading Statistics metrics
const BLOCK_3_METRICS = {
  title: 'Trading Statistics',
  metrics: ['Win Days %', 'Win Month %', 'Win Year %', 'Best Day', 'Worst Day', 'Best Month', 'Worst Month'],
}

// Block 3B: Extended Trading Stats
const BLOCK_3B_METRICS = {
  subtitle: 'Extended Stats',
  metrics: ['Avg. Up Month', 'Avg. Down Month', 'Max Consecutive Wins', 'Max Consecutive Losses'],
}

// Metrics that should be displayed as percentages
const PERCENTAGE_METRICS = [
  'Win Days %', 'Win Month %', 'Win Year %', 'Best Day', 'Worst Day', 'Best Month', 'Worst Month',
  'Avg. Up Month', 'Avg. Down Month',
]

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Win Days %': 'Win D%',
  'Win Month %': 'Win M%',
  'Win Year %': 'Win Y%',
  'Best Day': 'Best D',
  'Worst Day': 'Worst D',
  'Best Month': 'Best M',
  'Worst Month': 'Worst M',
  'Avg. Up Month': 'Avg Up M',
  'Avg. Down Month': 'Avg Dn M',
  'Max Consecutive Wins': 'Consec Win',
  'Max Consecutive Losses': 'Consec Loss',
}

interface Block3TradingStatsProps {
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

// Win rates show 0dp, best/worst show 1dp
const ZERO_DP_METRICS = ['Win Days %', 'Win Month %', 'Win Year %']
const ONE_DP_METRICS = ['Best Day', 'Worst Day', 'Best Month', 'Worst Month', 'Avg. Up Month', 'Avg. Down Month']
const INTEGER_METRICS = ['Max Consecutive Wins', 'Max Consecutive Losses']

const formatMetricValue = (data: MetricsData, metricKey: string): string => {
  const metrics = data.all_metrics || data.metrics || {}
  const value = metrics[metricKey]

  if (value === null || value === undefined) return '-'
  if (value === '-' || value === 'N/A') return String(value)

  const isPercentage = PERCENTAGE_METRICS.includes(metricKey)

  if (typeof value === 'number') {
    if (isPercentage) {
      if (ZERO_DP_METRICS.includes(metricKey)) {
        return `${(value * 100).toFixed(0)}%`
      }
      if (ONE_DP_METRICS.includes(metricKey)) {
        return `${(value * 100).toFixed(1)}%`
      }
      return `${(value * 100).toFixed(0)}%`
    }
    if (INTEGER_METRICS.includes(metricKey)) {
      return value.toFixed(0)
    }
    return value.toFixed(2)
  }

  return String(value)
}

export function Block3TradingStats({ items, title }: Block3TradingStatsProps) {
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

  // Win rate bar chart data
  const winRateBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const periods = [
      { metric: 'Daily', key: 'Win Days %' },
      { metric: 'Monthly', key: 'Win Month %' },
      { metric: 'Yearly', key: 'Win Year %' },
    ]

    periods.forEach(({ metric, key }) => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, key) * 100
      })
      data.push(point)
    })

    return data
  }, [successfulItems])

  // Extended stats bar chart data (Avg Up/Down Month)
  const extendedStatsBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'Avg Up M', key: 'Avg. Up Month', isPercent: true },
      { metric: 'Avg Dn M', key: 'Avg. Down Month', isPercent: true },
    ]

    metrics.forEach(({ metric, key, isPercent }) => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        const val = getRawMetricValue(item.data, key)
        point[item.name] = isPercent ? val * 100 : val
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
        <h2 className="text-lg font-bold text-white">{title || BLOCK_3_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Trading Stats Table */}
        <div className="border-r border-slate-200 overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_3_METRICS.metrics.map(metric => (
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
                  {BLOCK_3_METRICS.metrics.map(metric => (
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
                  {BLOCK_3_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 text-slate-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Win Rate Bar Chart */}
        <div className="p-3">
          <h3 className="text-base font-semibold text-black mb-1">Win Rate by Period</h3>
          <div className="h-[280px]">
            {winRateBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateBarData} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="metric" {...XAXIS_PROPS} />
                  <YAxis hide />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '50%', fontSize: 10, fill: '#94a3b8' }} />
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

      {/* Block 3B: Extended Trading Stats (sub-section with chart) */}
      <div className="border-t border-slate-300 bg-slate-50">
        <div className="px-4 py-2">
          <h3 className="text-base font-semibold text-black">{BLOCK_3B_METRICS.subtitle}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Table */}
          <div className="border-r border-slate-200 overflow-auto px-2 pb-2">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                  {BLOCK_3B_METRICS.metrics.map(metric => (
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
                    {BLOCK_3B_METRICS.metrics.map(metric => (
                      <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                        {formatMetricValue(item.data, metric)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Avg Up/Down Month Chart */}
          <div className="p-3">
            <h4 className="text-base font-semibold text-black mb-1">Avg Monthly Returns</h4>
            <div className="h-[180px]">
              {extendedStatsBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extendedStatsBarData} margin={BAR_CHART_MARGIN_SMALL}>
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
