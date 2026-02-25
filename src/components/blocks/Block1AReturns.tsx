import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { Maximize2 } from 'lucide-react'
import { SymbolCell } from '@/components/ui/SymbolCell'

// Chart colors for up to 6 items + benchmark
const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const BENCHMARK_COLOR = '#64748b'

// Common chart props
const BAR_CHART_MARGIN_SMALL = { top: 30, right: 20, left: 10, bottom: 5 }
const XAXIS_PROPS = { tick: { fontSize: 14, fill: '#000' }, axisLine: false }
const LABEL_STYLE_SMALL = { fontSize: 14, fill: '#000' }

// Metrics configuration
const BLOCK_1A_METRICS = {
  title: 'Returns & Performance',
  subtitle: 'CAGR & Period Returns',
  metrics: ['CAGR﹪', 'Cumulative Return', 'MTD', 'YTD', '3M', '6M', '1Y'],
}

// Metrics that should be displayed as percentages
const PERCENTAGE_METRICS = [
  'CAGR﹪', 'Cumulative Return', 'MTD', 'YTD', '1Y', '3M', '6M',
]

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  'Cumulative Return': 'Cuml.',
}

// Types
export interface MetricsData {
  metrics?: Record<string, string | number | null>
  all_metrics?: Record<string, string | number | null>
  time_series?: {
    dates: string[]
    cumulative_returns: number[]
    drawdowns: number[]
  }
  success?: boolean
}

export interface BlockItem {
  name: string
  description?: string  // Optional description shown in tooltip
  data: MetricsData
  isBenchmark: boolean
  color?: string
}

interface Block1AReturnsProps {
  items: BlockItem[]
  title?: string
  onExpandChart?: (chartType: string) => void
  children?: React.ReactNode
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

export function Block1AReturns({ items, title, onExpandChart, children }: Block1AReturnsProps) {
  const [chartTab, setChartTab] = useState<'cumulative' | 'cagr' | 'mtd' | 'ytd' | '3m' | '6m' | '1y'>('cumulative')

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

  // Cumulative returns chart data
  const cumulativeReturnsData = useMemo(() => {
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
          if (idx !== -1) {
            point[item.name] = item.data.time_series.cumulative_returns[idx] * 100
          }
        }
      })
      return point
    })
  }, [successfulItems])

  // CAGR bar chart data
  const cagrBarData = useMemo(() => {
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'CAGR', key: 'CAGR﹪' },
      { metric: 'Cuml.', key: 'Cumulative Return' },
    ]
    metrics.forEach(({ metric, key }) => {
      const point: Record<string, string | number> = { metric }
      successfulItems.forEach(item => {
        point[item.name] = getRawMetricValue(item.data, key) * 100
      })
      data.push(point)
    })
    return data
  }, [successfulItems])

  // MTD bar chart data
  const mtdBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: 'MTD' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, 'MTD') * 100
    })
    return [point]
  }, [successfulItems])

  // YTD bar chart data
  const ytdBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: 'YTD' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, 'YTD') * 100
    })
    return [point]
  }, [successfulItems])

  // 3M bar chart data
  const threeMonthBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '3M' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '3M') * 100
    })
    return [point]
  }, [successfulItems])

  // 6M bar chart data
  const sixMonthBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '6M' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '6M') * 100
    })
    return [point]
  }, [successfulItems])

  // 1Y bar chart data
  const oneYearBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '1Y' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '1Y') * 100
    })
    return [point]
  }, [successfulItems])

  // Get color for an item
  const getItemColor = (item: BlockItem, _index: number): string => {
    if (item.isBenchmark) return BENCHMARK_COLOR
    if (item.color) return item.color
    const nonBenchmarkIndex = nonBenchmarkItems.findIndex(i => i.name === item.name)
    return CHART_COLORS[nonBenchmarkIndex % CHART_COLORS.length]
  }

  // Render bar chart for a single metric
  const renderBarChart = (data: Record<string, string | number>[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={BAR_CHART_MARGIN_SMALL}>
        <XAxis dataKey="metric" {...XAXIS_PROPS} />
        <YAxis hide />
        <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
        {benchmarkItem && (
          <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR}>
            <LabelList dataKey={benchmarkItem.name} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_SMALL} />
          </Bar>
        )}
        {nonBenchmarkItems.map((item, idx) => (
          <Bar key={item.name} dataKey={item.name} fill={getItemColor(item, idx)}>
            <LabelList dataKey={item.name} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_SMALL} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Block Header */}
      <div className="bg-slate-700 px-4 py-2">
        <h2 className="text-lg font-bold text-white">{title || BLOCK_1A_METRICS.title}</h2>
      </div>

      {/* Block Content - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Table */}
        <div className="border-r border-slate-200 overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                {BLOCK_1A_METRICS.metrics.map(metric => (
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
                  {BLOCK_1A_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty rows for consistent height (7 = benchmark + 6 items) */}
              {Array.from({ length: Math.max(0, 7 - successfulItems.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-300">-</td>
                  {BLOCK_1A_METRICS.metrics.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 text-slate-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Charts with tabs */}
        <div className="p-3">
          {/* Chart tabs */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { key: 'cumulative', label: 'Cumul.' },
                { key: 'cagr', label: 'CAGR' },
                { key: 'mtd', label: 'MTD' },
                { key: 'ytd', label: 'YTD' },
                { key: '3m', label: '3M' },
                { key: '6m', label: '6M' },
                { key: '1y', label: '1Y' },
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
            {onExpandChart && (
              <button
                onClick={() => onExpandChart(chartTab)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                title="Expand chart"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          {/* Fixed height chart container */}
          <div className="h-[320px]">
            {/* Cumulative Returns Line Chart */}
            {chartTab === 'cumulative' && cumulativeReturnsData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeReturnsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 14, fill: '#000' }} tickFormatter={(v) => v?.slice(0, 4)} interval="preserveStartEnd" />
                  <YAxis orientation="right" tick={{ fontSize: 14, fill: '#000' }} tickFormatter={(v) => `${v.toFixed(0)}%`} width={60} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} labelFormatter={(l) => l} />
                  <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  {benchmarkItem && (
                    <Line
                      type="monotone"
                      dataKey={benchmarkItem.name}
                      stroke={BENCHMARK_COLOR}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls
                    />
                  )}
                  {nonBenchmarkItems.map((item, idx) => (
                    <Line
                      key={item.name}
                      type="monotone"
                      dataKey={item.name}
                      stroke={getItemColor(item, idx)}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* CAGR Bar Chart */}
            {chartTab === 'cagr' && cagrBarData.length > 0 && renderBarChart(cagrBarData)}

            {/* MTD Bar Chart */}
            {chartTab === 'mtd' && mtdBarData.length > 0 && renderBarChart(mtdBarData)}

            {/* YTD Bar Chart */}
            {chartTab === 'ytd' && ytdBarData.length > 0 && renderBarChart(ytdBarData)}

            {/* 3M Bar Chart */}
            {chartTab === '3m' && threeMonthBarData.length > 0 && renderBarChart(threeMonthBarData)}

            {/* 6M Bar Chart */}
            {chartTab === '6m' && sixMonthBarData.length > 0 && renderBarChart(sixMonthBarData)}

            {/* 1Y Bar Chart */}
            {chartTab === '1y' && oneYearBarData.length > 0 && renderBarChart(oneYearBarData)}
          </div>
        </div>
      </div>

      {/* Extended sub-sections (optional) */}
      {children}
    </div>
  )
}
