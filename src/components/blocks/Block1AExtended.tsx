import { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from 'recharts'
import { BlockItem, MetricsData } from './Block1AReturns'
import { SymbolCell } from '@/components/ui/SymbolCell'

// Chart colors for up to 6 items + benchmark
const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const BENCHMARK_COLOR = '#64748b'

// Common chart props
const BAR_CHART_MARGIN_SMALL = { top: 30, right: 20, left: 10, bottom: 5 }
const XAXIS_PROPS = { tick: { fontSize: 14, fill: '#000' }, axisLine: false }
const LABEL_STYLE_SMALL = { fontSize: 14, fill: '#000' }

// Extended Returns metrics
const EXTENDED_METRICS = ['3Y (ann.)', '5Y (ann.)', '10Y (ann.)', 'Best Year', 'Worst Year']

// Metrics that should be displayed as percentages
const PERCENTAGE_METRICS = ['3Y (ann.)', '5Y (ann.)', '10Y (ann.)', 'Best Year', 'Worst Year']

// Short names for table headers
const METRIC_SHORT_NAMES: Record<string, string> = {
  '3Y (ann.)': '3Y',
  '5Y (ann.)': '5Y',
  '10Y (ann.)': '10Y',
  'Best Year': 'Best Y',
  'Worst Year': 'Worst Y',
}

interface Block1AExtendedProps {
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

export function Block1AExtended({ items, title }: Block1AExtendedProps) {
  const [chartTab, setChartTab] = useState<'3y' | '5y' | '10y'>('3y')

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

  // 3Y bar chart data
  const threeYearBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '3Y' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '3Y (ann.)') * 100
    })
    return [point]
  }, [successfulItems])

  // 5Y bar chart data
  const fiveYearBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '5Y' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '5Y (ann.)') * 100
    })
    return [point]
  }, [successfulItems])

  // 10Y bar chart data
  const tenYearBarData = useMemo(() => {
    const point: Record<string, string | number> = { metric: '10Y' }
    successfulItems.forEach(item => {
      point[item.name] = getRawMetricValue(item.data, '10Y (ann.)') * 100
    })
    return [point]
  }, [successfulItems])

  // Get color for an item
  const getItemColor = (item: BlockItem): string => {
    if (item.isBenchmark) return BENCHMARK_COLOR
    if (item.color) return item.color
    const nonBenchmarkIndex = nonBenchmarkItems.findIndex(i => i.name === item.name)
    return CHART_COLORS[nonBenchmarkIndex % CHART_COLORS.length]
  }

  // Render bar chart
  const renderBarChart = (data: Record<string, string | number>[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={BAR_CHART_MARGIN_SMALL}>
        <XAxis dataKey="metric" {...XAXIS_PROPS} />
        <YAxis hide />
        <Legend wrapperStyle={{ fontSize: '12px', maxHeight: '36px', overflow: 'hidden' }} />
        {benchmarkItem && (
          <Bar dataKey={benchmarkItem.name} fill={BENCHMARK_COLOR}>
            <LabelList dataKey={benchmarkItem.name} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_SMALL} />
          </Bar>
        )}
        {nonBenchmarkItems.map((item) => (
          <Bar key={item.name} dataKey={item.name} fill={getItemColor(item)}>
            <LabelList dataKey={item.name} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_SMALL} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="border-t border-slate-300 bg-slate-50">
      <div className="px-4 py-2">
        <h3 className="text-base font-semibold text-black">{title || 'Extended Returns'}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Table */}
        <div className="border-r border-slate-200 overflow-auto px-2 pb-2">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-black min-w-[60px]">Name</th>
                {EXTENDED_METRICS.map(metric => (
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
                  {EXTENDED_METRICS.map(metric => (
                    <td key={metric} className="text-right py-2 px-2 font-mono text-black">
                      {formatMetricValue(item.data, metric)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Tabbed Period Returns Charts */}
        <div className="p-3">
          {/* Chart tabs */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {[
              { key: '3y', label: '3Y' },
              { key: '5y', label: '5Y' },
              { key: '10y', label: '10Y' },
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
            {/* 3Y Bar Chart */}
            {chartTab === '3y' && threeYearBarData.length > 0 && renderBarChart(threeYearBarData)}

            {/* 5Y Bar Chart */}
            {chartTab === '5y' && fiveYearBarData.length > 0 && renderBarChart(fiveYearBarData)}

            {/* 10Y Bar Chart */}
            {chartTab === '10y' && tenYearBarData.length > 0 && renderBarChart(tenYearBarData)}
          </div>
        </div>
      </div>
    </div>
  )
}
