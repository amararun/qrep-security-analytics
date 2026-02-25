import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { PriceData } from '../../lib/backend-service'

interface RelativePerformanceChartProps {
  priceData: PriceData
  height?: number
}

const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const BENCHMARK_COLOR = '#64748b'

const GRID_STYLE = '#E5E7EB'
const AXIS_STYLE = { fontSize: '11px', fill: '#000000' }
const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  color: '#000000',
  fontSize: '12px',
  fontWeight: 500,
}

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function RelativePerformanceChart({ priceData, height = 400 }: RelativePerformanceChartProps) {
  const { chartData, symbols } = useMemo(() => {
    const { dates, symbols: priceSymbols } = priceData
    const symbolKeys = Object.keys(priceSymbols)

    // Find first valid price for each symbol to use as base (index 100)
    const basePrices: Record<string, number | null> = {}
    for (const sym of symbolKeys) {
      const prices = priceSymbols[sym]
      basePrices[sym] = prices.find(p => p !== null) ?? null
    }

    // Build indexed data (base = 100)
    const data = dates.map((date, i) => {
      const row: Record<string, any> = { date }
      for (const sym of symbolKeys) {
        const price = priceSymbols[sym][i]
        const base = basePrices[sym]
        if (price !== null && base !== null && base !== 0) {
          row[sym] = Number(((price / base) * 100).toFixed(2))
        } else {
          row[sym] = null
        }
      }
      return row
    })

    return { chartData: data, symbols: symbolKeys }
  }, [priceData])

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-slate-400 text-base">
        No price data available
      </div>
    )
  }

  // Detect benchmark (common patterns: ^GSPC, ^DJI, ^IXIC, SPY, etc.)
  const benchmarkPatterns = ['^', 'SPY', 'QQQ', 'IWM', 'DIA', 'VTI']
  const benchmarkSymbol = symbols.find(s => benchmarkPatterns.some(p => s.startsWith(p) || s === p))

  return (
    <div>
      <div className="text-sm font-semibold text-black mb-2">Relative Performance (Indexed to 100)</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid stroke={GRID_STYLE} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke={GRID_STYLE}
            style={AXIS_STYLE}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            stroke={GRID_STYLE}
            style={AXIS_STYLE}
            domain={['auto', 'auto']}
          />
          <ReferenceLine y={100} stroke="#94A3B8" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)}`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#000' }}
          />
          {symbols.map((sym, idx) => {
            const isBenchmark = sym === benchmarkSymbol
            return (
              <Line
                key={sym}
                type="linear"
                dataKey={sym}
                stroke={isBenchmark ? BENCHMARK_COLOR : CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={isBenchmark ? 2 : 1.5}
                strokeDasharray={isBenchmark ? '6 3' : undefined}
                dot={false}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
