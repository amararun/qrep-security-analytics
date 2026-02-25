import React, { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
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

// Drawdown metrics
const BLOCK_2_METRICS = {
  title: 'Drawdowns (DD)',
  metrics: ['Max Drawdown', 'Volatility (ann.)', 'Daily Value-at-Risk', 'Expected Shortfall (cVaR)', 'Avg. Drawdown', 'Longest DD Days', 'Skew', 'Kurtosis'],
}

// Metrics that should be displayed as percentages
const PERCENTAGE_METRICS = [
  'Max Drawdown', 'Volatility (ann.)', 'Daily Value-at-Risk', 'Expected Shortfall (cVaR)', 'Avg. Drawdown',
]

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Max Drawdown': 'Max DD',
  'Volatility (ann.)': 'Vol.',
  'Daily Value-at-Risk': 'VaR',
  'Expected Shortfall (cVaR)': 'CVaR',
  'Avg. Drawdown': 'Avg DD',
  'Longest DD Days': 'DD Days',
}

// Headers that need 2-row wrapping
const METRIC_HEADER_JSX: Record<string, React.ReactNode> = {
  'Max Drawdown': <span>Max<br/>DD</span>,
  'Avg. Drawdown': <span>Avg<br/>DD</span>,
  'Longest DD Days': <span>DD<br/>Days</span>,
}

interface Block2DrawdownsProps {
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

// Metrics that display as integers (no decimals)
const INTEGER_METRICS = ['Longest DD Days']

const formatMetricValue = (data: MetricsData, metricKey: string): string => {
  const metrics = data.all_metrics || data.metrics || {}
  const value = metrics[metricKey]

  if (value === null || value === undefined) return '-'
  if (value === '-' || value === 'N/A') return String(value)

  const isPercentage = PERCENTAGE_METRICS.includes(metricKey)
  const isInteger = INTEGER_METRICS.includes(metricKey)

  if (typeof value === 'number') {
    if (isPercentage) {
      return `${(value * 100).toFixed(0)}%`
    }
    if (isInteger) {
      return value.toFixed(0)
    }
    return value.toFixed(2)
  }

  return String(value)
}

export function Block2Drawdowns({ items, title }: Block2DrawdownsProps) {
  const [chartType, setChartType] = useState<'time' | 'metrics'>('time')
  const [selectedItem, setSelectedItem] = useState<string>('all')

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

  // Get all items for dropdown (including 'all' option)
  const allSelectableItems = useMemo(() => {
    const list: string[] = ['all']
    if (benchmarkItem) list.push(benchmarkItem.name)
    nonBenchmarkItems.forEach(item => list.push(item.name))
    return list
  }, [benchmarkItem, nonBenchmarkItems])

  // Drawdown time series data
  const drawdownData = useMemo(() => {
    const allDates = new Set<string>()
    successfulItems.forEach(item => {
      if (item.data.time_series?.dates) {
        item.data.time_series.dates.forEach(d => allDates.add(d))
      }
    })

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map(date => {
      const point: Record<string, string | number> = { date }
      successfulItems.forEach(item => {
        if (item.data.time_series?.dates) {
          const idx = item.data.time_series.dates.indexOf(date)
          if (idx !== -1 && item.data.time_series.drawdowns) {
            point[item.name] = item.data.time_series.drawdowns[idx] * 100
          }
        }
      })
      return point
    })
  }, [successfulItems])

  // Drawdown metrics bar chart data
  const drawdownMetricsBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'Max DD %', key: 'Max Drawdown', isPercent: true },
      { metric: 'DD Days', key: 'Longest DD Days', isPercent: false },
      { metric: 'Avg DD %', key: 'Avg. Drawdown', isPercent: true },
    ]

    metrics.forEach(({ metric, key, isPercent }) => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        const value = getRawMetricValue(item.data, key)
        point[item.name] = isPercent ? value * 100 : value
      })
      data.push(point)
    })

    return data
  }, [successfulItems])

  // Get color for an item
  const getItemColor = (itemName: string): string => {
    if (benchmarkItem && itemName === benchmarkItem.name) return BENCHMARK_COLOR
    const idx = nonBenchmarkItems.findIndex(item => item.name === itemName)
    return idx >= 0 ? CHART_COLORS[idx % CHART_COLORS.length] : CHART_COLORS[0]
  }

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Block Header */}
      <div className="bg-slate-700 px-4 py-2">
        <h2 className="text-lg font-bold text-white">{title || BLOCK_2_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Drawdown Chart with tabs */}
        <div className="border-r border-slate-200 p-3">
          {/* Row 1: Chart type tabs (Time Series vs Metrics) */}
          <div className="flex items-center gap-4 mb-1">
            <button
              onClick={() => setChartType('time')}
              className={`pb-1 text-base font-medium transition-colors ${
                chartType === 'time' ? 'text-black border-b-2 border-black' : 'text-slate-500 hover:text-black'
              }`}
            >
              Time Series
            </button>
            <button
              onClick={() => setChartType('metrics')}
              className={`pb-1 text-base font-medium transition-colors ${
                chartType === 'metrics' ? 'text-black border-b-2 border-black' : 'text-slate-500 hover:text-black'
              }`}
            >
              DD Metrics
            </button>
          </div>

          {/* Row 2: Item tabs (only for time series view) */}
          {chartType === 'time' && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {allSelectableItems.map((itemName) => (
                <button
                  key={itemName}
                  onClick={() => setSelectedItem(itemName)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    selectedItem === itemName
                      ? 'bg-slate-200 text-black border-b-2 border-slate-700'
                      : 'text-black hover:bg-slate-100'
                  }`}
                  style={itemName !== 'all' && selectedItem === itemName ? { borderBottomColor: getItemColor(itemName) } : {}}
                >
                  {itemName === 'all' ? 'All' : itemName}
                </button>
              ))}
            </div>
          )}

          {/* Drawdown Charts */}
          <div className={chartType === 'time' ? 'h-[260px]' : 'h-[290px]'}>
            {/* Time Series Chart */}
            {chartType === 'time' && drawdownData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="date" tick={{ fontSize: 14, fill: '#000' }} tickFormatter={(v) => v?.slice(0, 4)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 14, fill: '#000' }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={['dataMin', 0]} />
                  {selectedItem === 'all' && <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />}
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  {selectedItem === 'all' ? (
                    <>
                      {benchmarkItem && (
                        <Area
                          type="monotone"
                          dataKey={benchmarkItem.name}
                          stroke={BENCHMARK_COLOR}
                          fill="none"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          connectNulls
                        />
                      )}
                      {nonBenchmarkItems.map((item) => (
                        <Area
                          key={item.name}
                          type="monotone"
                          dataKey={item.name}
                          stroke={getItemColor(item.name)}
                          fill={getItemColor(item.name)}
                          fillOpacity={0.15}
                          strokeWidth={2}
                          connectNulls
                        />
                      ))}
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey={selectedItem}
                      stroke={getItemColor(selectedItem)}
                      fill={getItemColor(selectedItem)}
                      fillOpacity={0.3}
                      strokeWidth={2}
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Metrics Bar Chart */}
            {chartType === 'metrics' && drawdownMetricsBarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drawdownMetricsBarData} margin={BAR_CHART_MARGIN_SMALL}>
                  <XAxis dataKey="metric" {...XAXIS_PROPS} />
                  <YAxis hide />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  {benchmarkItem && (
                    <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR} />
                  )}
                  {nonBenchmarkItems.map((item) => (
                    <Bar key={item.name} dataKey={item.name} fill={getItemColor(item.name)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Risk Metrics Table */}
        <div className="overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-1 px-1.5 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_2_METRICS.metrics.map(metric => (
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
                  {BLOCK_2_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-1.5 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows for consistent height */}
              {Array.from({ length: Math.max(0, 7 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-300">-</td>
                  {BLOCK_2_METRICS.metrics.map(metric => (
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
