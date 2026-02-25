import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BarChart3, Loader2, AlertCircle, Plus, X, ChevronDown, ChevronUp, Settings2, Download, Info } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { SymbolSearchInput } from '@/components/SymbolSearchInput'
import { Block1AReturns, BlockItem } from '@/components/blocks/Block1AReturns'
import { Block1AExtended } from '@/components/blocks/Block1AExtended'
import { Block1BRatios } from '@/components/blocks/Block1BRatios'
import { Block2Drawdowns } from '@/components/blocks/Block2Drawdowns'
import { Block3TradingStats } from '@/components/blocks/Block3TradingStats'
import { Block4BenchmarkComparison } from '@/components/blocks/Block4BenchmarkComparison'
import { Block5RecoveryTailRisk } from '@/components/blocks/Block5RecoveryTailRisk'
import { Block7AdvancedRatios } from '@/components/blocks/Block7AdvancedRatios'
import { RelativePerformanceChart } from '@/components/charts/RelativePerformanceChart'
import { TechnicalChart, type CloseDataRow } from '@/components/charts/TechnicalChart'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
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

// Chart colors for up to 6 symbols + benchmark
const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const BENCHMARK_COLOR = '#64748b'

// Common bar chart props for consistent styling
const BAR_CHART_MARGIN_EXPANDED = { top: 40, right: 40, left: 20, bottom: 20 }
const XAXIS_PROPS = { tick: { fontSize: 14, fill: '#000' }, axisLine: false }
const LABEL_STYLE_EXPANDED = { fontSize: 16, fill: '#000' }

// Metrics that should be displayed as percentages (multiply by 100)
const PERCENTAGE_METRICS = [
  'CAGR﹪', 'Cumulative Return', 'MTD', 'YTD', '1Y', '3Y (ann.)', '5Y (ann.)', '10Y (ann.)',
  'Max Drawdown', 'Volatility (ann.)', 'Daily Value-at-Risk', 'Expected Shortfall (cVaR)',
  'Avg. Drawdown', 'Best Day', 'Worst Day', 'Best Month', 'Worst Month',
  'Win Days %', 'Win Month %', 'Win Year %',
  'Alpha', 'Avg. Up Month', 'Avg. Down Month',
  // Block 6 - Extended Returns (period returns are percentages)
  '3M', '6M', 'All-time (ann.)', 'Best Year', 'Worst Year',
  // Metadata
  'Time in Market'
]

// Types for API response
interface TimeSeriesData {
  dates: string[]
  cumulative_returns: number[]
  drawdowns: number[]
}

interface SymbolMetrics {
  symbol: string
  success: boolean
  trading_days?: number
  error?: string
  all_metrics?: Record<string, string | number | null>
  categorized?: Record<string, CategoryData>
  time_series?: TimeSeriesData
}

interface CategoryData {
  title: string
  metrics: Record<string, string | number | null>
}

interface PriceData {
  dates: string[]
  symbols: Record<string, (number | null)[]>
}

interface CompareResponse {
  success: boolean
  benchmark: string
  start_date: string
  end_date: string
  risk_free_rate: number
  symbols: SymbolMetrics[]
  benchmark_metrics?: SymbolMetrics
  categories: { key: string; title: string }[]
  message: string
  price_data?: PriceData
}

// Metric definitions for each block - SPLIT INTO SUB-BLOCKS
// Metric block definitions kept for reference but used inline
// const BLOCK_1A_METRICS = { title: 'Returns & Performance', metrics: ['CAGR﹪', 'Cumulative Return', 'MTD', 'YTD', '3M', '6M', '1Y'] }
// const BLOCK_1B_METRICS = { title: 'Performance Ratios', metrics: ['Sharpe', 'Sortino', 'Calmar', 'Omega', 'Payoff Ratio', 'Profit Factor'] }
// const BLOCK_6_METRICS = { title: 'Extended Returns', metrics: ['3Y (ann.)', '5Y (ann.)', '10Y (ann.)', 'Best Year', 'Worst Year'] }

// InfoTooltip component for Advanced Settings explanations
function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex ml-1.5">
      <Info className="w-4 h-4 text-slate-400 hover:text-teal-600 cursor-help" />
      <span className="absolute left-6 top-0 z-50 hidden group-hover:block w-72 p-3 bg-slate-800 text-white text-sm rounded-lg shadow-lg leading-relaxed">
        {text}
        <span className="absolute left-0 top-2 -ml-2 border-8 border-transparent border-r-slate-800" />
      </span>
    </span>
  )
}

// Price Charts Section with tabs: Relative Performance + Technical charts per symbol
function PriceChartsSection({ priceData }: { priceData: PriceData }) {
  const symbolKeys = Object.keys(priceData.symbols)
  const [activeTab, setActiveTab] = useState<string>('relative')

  // Build tabs: Relative Performance + one per symbol
  const tabs = [
    { key: 'relative', label: 'Relative Performance' },
    ...symbolKeys.map(sym => ({ key: sym, label: sym })),
  ]

  // Prepare close data for individual technical charts
  const getCloseData = (symbol: string): CloseDataRow[] => {
    const prices = priceData.symbols[symbol]
    if (!prices) return []
    return priceData.dates
      .map((date, i) => ({ date, close: prices[i] }))
      .filter((row): row is CloseDataRow => row.close !== null)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base font-bold text-black">Price Charts & Technical Indicators</h3>
      </div>

      {/* Tab buttons */}
      <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              activeTab === tab.key
                ? 'border-teal-500 text-teal-700 bg-teal-50'
                : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart content */}
      <div className="p-4">
        {activeTab === 'relative' ? (
          <RelativePerformanceChart priceData={priceData} height={450} />
        ) : (
          <TechnicalChart
            data={getCloseData(activeTab)}
            label={activeTab}
          />
        )}
      </div>
    </div>
  )
}

export default function CompareBlocksPage() {
  // Form state - pre-populated for testing (6 symbols: tech, commodities, crypto, index)
  const [symbols, setSymbols] = useState<string[]>(['GOOG', 'MSFT', 'GC=F', 'CL=F', 'BTC-USD', '^GSPC'])
  const [benchmark, setBenchmark] = useState('^GSPC')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [riskFreeRate, setRiskFreeRate] = useState('0.0')
  const [omegaThreshold, setOmegaThreshold] = useState('0.0')
  const [varConfidence, setVarConfidence] = useState('95')
  const [periods] = useState('252')
  const [tailCutoff, setTailCutoff] = useState('95')

  // Advanced settings panel visibility
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  // Results state - restore from sessionStorage on mount
  const [results, setResults] = useState<CompareResponse | null>(() => {
    try {
      const cached = sessionStorage.getItem('qrep_compare_results')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })

  // Form collapse state
  const [isFormExpanded, setIsFormExpanded] = useState(() => !results)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportModal, setExportModal] = useState<'html' | 'pdf' | null>(null)
  const [showCsvMenu, setShowCsvMenu] = useState(false)
  const csvMenuRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Expanded chart modal state
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  // Metrics info modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [metricsHtml, setMetricsHtml] = useState('')

  // ESC key handler for modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMetricsModal(false)
        setExpandedChart(null)
        setExportModal(null)
        setShowCsvMenu(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Close CSV menu on outside click
  useEffect(() => {
    if (!showCsvMenu) return
    const handleClick = (e: MouseEvent) => {
      if (csvMenuRef.current && !csvMenuRef.current.contains(e.target as Node)) {
        setShowCsvMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCsvMenu])

  // Set default dates on mount (5 years ago to today)
  useEffect(() => {
    const today = new Date()
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(today.getFullYear() - 5)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(fiveYearsAgo.toISOString().split('T')[0])
  }, [])

  // Load metrics HTML when modal opens
  const handleOpenMetricsModal = async () => {
    if (!metricsHtml) {
      try {
        const response = await fetch('/metrics.html')
        const html = await response.text()
        // Extract just the body content
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        setMetricsHtml(bodyMatch ? bodyMatch[1] : html)
      } catch (err) {
        setMetricsHtml('<p>Failed to load metrics documentation.</p>')
      }
    }
    setShowMetricsModal(true)
  }

  // Add a new symbol input (max 6)
  const addSymbol = () => {
    if (symbols.length < 6) {
      setSymbols([...symbols, ''])
    }
  }

  // Remove a symbol input
  const removeSymbol = (index: number) => {
    if (symbols.length > 2) {
      setSymbols(symbols.filter((_, i) => i !== index))
    }
  }

  // Update a symbol
  const updateSymbol = (index: number, value: string) => {
    const newSymbols = [...symbols]
    newSymbols[index] = value.toUpperCase()
    setSymbols(newSymbols)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResults(null)

    const validSymbols = symbols.filter(s => s.trim())

    if (validSymbols.length < 1) {
      setError('Please enter at least one stock symbol')
      return
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates')
      return
    }

    const rfRate = parseFloat(riskFreeRate) || 0.0
    const omegaThresholdValue = parseFloat(omegaThreshold) || 0.0
    const periodsValue = parseInt(periods) || 252
    const varConfidenceValue = parseFloat(varConfidence) || 95
    const tailCutoffValue = parseFloat(tailCutoff) || 95

    setIsLoading(true)
    setProgress('Fetching data...')

    try {
      // Build payload with all Advanced Settings
      const payload: Record<string, unknown> = {
        symbols: validSymbols,
        benchmark: benchmark.trim() || '^GSPC',
        start_date: startDate,
        end_date: endDate,
        risk_free_rate: rfRate / 100,
        periods: periodsValue,
        var_confidence: varConfidenceValue / 100,  // Convert percentage to decimal (95 → 0.95)
        tail_cutoff: tailCutoffValue / 100,  // Convert percentage to decimal (95 → 0.95)
      }
      if (omegaThresholdValue > 0) {
        payload.omega_threshold = omegaThresholdValue / 100  // Convert percentage to decimal
      }

      const response = await fetch('/api/qpulse-proxy?action=compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      setProgress('Processing...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Error: ${response.statusText}`)
      }

      const data: CompareResponse = await response.json()
      setResults(data)
      try { sessionStorage.setItem('qrep_compare_results', JSON.stringify(data)) } catch {}
      setIsFormExpanded(false)
      // drawdown view reset removed — state was unused

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare securities')
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }

  // Format metric value - with percentage conversion
  const formatValue = (value: string | number | null | undefined, metricName: string): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') {
      if (Number.isNaN(value) || !Number.isFinite(value)) return '-'

      // Check if this metric should be displayed as percentage
      const isPercentage = PERCENTAGE_METRICS.includes(metricName)

      if (isPercentage) {
        // Convert decimal to percentage (0.14 -> 14%)
        const pctValue = value * 100
        if (Math.abs(pctValue) >= 1000) {
          return pctValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
        }
        return pctValue.toFixed(1) + '%'
      } else {
        // Regular number formatting
        if (Math.abs(value) >= 1000) {
          return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
        return value.toFixed(2)
      }
    }
    return String(value)
  }

  // Get metric value from all_metrics
  const getMetricFromAllMetrics = (symbol: SymbolMetrics, metricName: string): string => {
    if (!symbol.success || !symbol.all_metrics) return '-'
    const value = symbol.all_metrics[metricName]
    return formatValue(value, metricName)
  }

  // Get raw metric value (for charts)
  const getRawMetricValue = (symbol: SymbolMetrics, metricName: string): number => {
    if (!symbol.success || !symbol.all_metrics) return 0
    const value = symbol.all_metrics[metricName]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    // Handle string values (e.g., "54.3%" or "54.3")
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace('%', ''))
      return Number.isFinite(parsed) ? parsed / (value.includes('%') ? 100 : 1) : 0
    }
    return 0
  }

  // Cumulative returns chart data
  const cumulativeReturnsData = useMemo(() => {
    if (!results) return []

    const allDates = new Set<string>()
    results.symbols.forEach(s => {
      if (s.success && s.time_series?.dates) {
        s.time_series.dates.forEach(d => allDates.add(d))
      }
    })
    if (results.benchmark_metrics?.success && results.benchmark_metrics.time_series?.dates) {
      results.benchmark_metrics.time_series.dates.forEach(d => allDates.add(d))
    }

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map(date => {
      const point: Record<string, string | number> = { date }
      if (results.benchmark_metrics?.success && results.benchmark_metrics.time_series?.dates) {
        const idx = results.benchmark_metrics.time_series.dates.indexOf(date)
        if (idx !== -1) {
          point[results.benchmark] = results.benchmark_metrics.time_series.cumulative_returns[idx] * 100
        }
      }
      results.symbols.forEach(s => {
        if (s.success && s.time_series?.dates) {
          const idx = s.time_series.dates.indexOf(date)
          if (idx !== -1) {
            point[s.symbol] = s.time_series.cumulative_returns[idx] * 100
          }
        }
      })
      return point
    })
  }, [results])

  // CAGR & Cumulative bar chart data
  const cagrBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const metrics = [
      { metric: 'CAGR', key: 'CAGR﹪' },
      { metric: 'Cuml.', key: 'Cumulative Return' },
    ]
    metrics.forEach(({ metric, key }) => {
      const point: Record<string, string | number> = { metric }
      if (results.benchmark_metrics?.success) {
        point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, key) * 100
      }
      results.symbols.forEach(s => {
        if (s.success) {
          point[s.symbol] = getRawMetricValue(s, key) * 100
        }
      })
      data.push(point)
    })
    return data
  }, [results])

  // MTD return bar chart data (single period)
  const mtdBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const point: Record<string, string | number> = { metric: 'MTD' }
    if (results.benchmark_metrics?.success) {
      point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, 'MTD') * 100
    }
    results.symbols.forEach(s => {
      if (s.success) {
        point[s.symbol] = getRawMetricValue(s, 'MTD') * 100
      }
    })
    data.push(point)
    return data
  }, [results])

  // YTD return bar chart data (single period)
  const ytdBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const point: Record<string, string | number> = { metric: 'YTD' }
    if (results.benchmark_metrics?.success) {
      point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, 'YTD') * 100
    }
    results.symbols.forEach(s => {
      if (s.success) {
        point[s.symbol] = getRawMetricValue(s, 'YTD') * 100
      }
    })
    data.push(point)
    return data
  }, [results])

  // 3M return bar chart data (single period) - for Returns block
  const threeMonthReturnsBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const point: Record<string, string | number> = { metric: '3M' }
    if (results.benchmark_metrics?.success) {
      point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, '3M') * 100
    }
    results.symbols.forEach(s => {
      if (s.success) {
        point[s.symbol] = getRawMetricValue(s, '3M') * 100
      }
    })
    data.push(point)
    return data
  }, [results])

  // 6M return bar chart data (single period) - for Returns block
  const sixMonthReturnsBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const point: Record<string, string | number> = { metric: '6M' }
    if (results.benchmark_metrics?.success) {
      point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, '6M') * 100
    }
    results.symbols.forEach(s => {
      if (s.success) {
        point[s.symbol] = getRawMetricValue(s, '6M') * 100
      }
    })
    data.push(point)
    return data
  }, [results])

  // 1Y return bar chart data (single period)
  const oneYearBarData = useMemo(() => {
    if (!results) return []
    const data: Record<string, string | number>[] = []
    const point: Record<string, string | number> = { metric: '1Y' }
    if (results.benchmark_metrics?.success) {
      point[results.benchmark] = getRawMetricValue(results.benchmark_metrics, '1Y') * 100
    }
    results.symbols.forEach(s => {
      if (s.success) {
        point[s.symbol] = getRawMetricValue(s, '1Y') * 100
      }
    })
    data.push(point)
    return data
  }, [results])

  // Get successful symbols
  const successfulSymbols = useMemo(() => {
    if (!results) return []
    return results.symbols.filter(s => s.success).map(s => s.symbol)
  }, [results])

  // Build all symbols list (benchmark + securities)
  const allSymbolsWithBenchmark = useMemo(() => {
    if (!results) return []
    const list: { symbol: string; isBenchmark: boolean; data: SymbolMetrics }[] = []

    // Add benchmark first
    if (results.benchmark_metrics?.success) {
      list.push({
        symbol: results.benchmark,
        isBenchmark: true,
        data: results.benchmark_metrics,
      })
    }

    // Add securities
    results.symbols.forEach(s => {
      if (s.success) {
        list.push({
          symbol: s.symbol,
          isBenchmark: false,
          data: s,
        })
      }
    })

    return list
  }, [results])

  // Convert to BlockItem[] format for Block1AReturns component
  const block1AItems = useMemo((): BlockItem[] => {
    return allSymbolsWithBenchmark.map(item => ({
      name: item.symbol,
      data: item.data,
      isBenchmark: item.isBenchmark,
    }))
  }, [allSymbolsWithBenchmark])

  // Export to HTML
  const handleExportHTML = async () => {
    if (!resultsRef.current || !results) return

    setIsExporting(true)

    try {
      // Capture the results section as canvas (scale 1.5 for good quality at smaller size)
      const canvas = await html2canvas(resultsRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f1f5f9', // bg-slate-100
      })

      // Convert to JPEG data URL (much smaller than PNG)
      const imgData = canvas.toDataURL('image/jpeg', 0.82)

      // Build HTML document
      const symbolsList = symbols.filter(s => s.trim()).join(', ')
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QREP Compare Report - ${symbolsList} vs ${benchmark}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f1f5f9; }
    .header { background: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { margin: 0 0 8px 0; color: #0f766e; font-size: 24px; }
    .header p { margin: 0; color: #334155; font-size: 14px; }
    .powered-by { font-size: 13px; color: #64748b; white-space: nowrap; padding-top: 4px; }
    .powered-by strong { color: #1e293b; }
    .meta { display: flex; gap: 20px; margin-top: 12px; font-size: 13px; color: #475569; }
    .meta span { background: #f8fafc; padding: 4px 10px; border-radius: 4px; }
    .content { text-align: center; }
    .content img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-row">
      <h1>QREP Portfolio Comparison Report</h1>
      <div class="powered-by">Powered by <strong>QuantStats</strong></div>
    </div>
    <p><strong>Securities:</strong> ${symbolsList} &nbsp;|&nbsp; <strong>Benchmark:</strong> ${benchmark}</p>
    <div class="meta">
      <span><strong>Period:</strong> ${startDate} to ${endDate}</span>
      <span><strong>Risk-Free Rate:</strong> ${riskFreeRate}%</span>
      <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
    </div>
  </div>
  <div class="content">
    <img src="${imgData}" alt="Portfolio Comparison Results" />
  </div>
  <div class="footer">
    Generated by QREP - Portfolio Analytics Platform
  </div>
</body>
</html>`

      // Download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `QREP-compare-${symbolsList.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Export failed:', err)
      setError('Failed to export HTML')
    } finally {
      setIsExporting(false)
    }
  }

  // Export to PDF
  const handleExportPDF = async () => {
    if (!resultsRef.current || !results) return

    setIsExporting(true)

    try {
      // Capture the results section as canvas (scale 1.5 for good quality at smaller size)
      const canvas = await html2canvas(resultsRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f1f5f9',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.82)
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Calculate PDF dimensions (A4 width with proportional height)
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth

      // Create PDF with custom height to fit content
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, Math.max(pdfHeight + 40, 297)], // At least A4 height
      })

      // Add header
      const symbolsList = symbols.filter(s => s.trim()).join(', ')
      pdf.setFontSize(18)
      pdf.setTextColor(15, 118, 110) // teal-700
      pdf.text('QREP Portfolio Comparison Report', 10, 15)

      pdf.setFontSize(10)
      pdf.setTextColor(51, 65, 85) // slate-700
      pdf.text(`Securities: ${symbolsList}  |  Benchmark: ${benchmark}`, 10, 22)
      pdf.text(`Period: ${startDate} to ${endDate}  |  Risk-Free Rate: ${riskFreeRate}%  |  Generated: ${new Date().toLocaleString()}`, 10, 28)

      // Add image
      pdf.addImage(imgData, 'JPEG', 5, 35, pdfWidth - 10, pdfHeight - 10)

      // Download PDF
      pdf.save(`QREP-compare-${symbolsList.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)

    } catch (err) {
      console.error('Export failed:', err)
      setError('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Download price data as CSV
  const handleDownloadPriceCSV = () => {
    if (!results?.price_data) return
    const { dates, symbols: priceSymbols } = results.price_data
    const cols = Object.keys(priceSymbols)
    const header = ['Date', ...cols].join(',')
    const rows = dates.map((date, i) =>
      [date, ...cols.map(col => priceSymbols[col][i] ?? '')].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QREP_prices_${cols.join('_')}_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download all metrics as CSV (transposed: metrics as rows, symbols as columns)
  const handleDownloadMetricsCSV = () => {
    if (!results) return

    // Collect all symbol names in order: benchmark first, then securities
    const symbolNames: string[] = []
    const symbolData: Record<string, string | number | null>[] = []

    if (results.benchmark_metrics?.success && results.benchmark_metrics.all_metrics) {
      symbolNames.push(results.benchmark + ' (B)')
      symbolData.push(results.benchmark_metrics.all_metrics)
    }
    results.symbols.forEach(s => {
      if (s.success && s.all_metrics) {
        symbolNames.push(s.symbol)
        symbolData.push(s.all_metrics)
      }
    })

    if (symbolNames.length === 0) return

    // Collect all unique metric keys (preserving order from first symbol)
    const metricKeys: string[] = []
    const seen = new Set<string>()
    symbolData.forEach(data => {
      Object.keys(data).forEach(key => {
        if (!seen.has(key)) {
          seen.add(key)
          metricKeys.push(key)
        }
      })
    })

    // Build CSV: header row, then one row per metric
    const escCsv = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
    const header = ['Metric', ...symbolNames].map(escCsv).join(',')
    const rows = metricKeys.map(key => {
      const values = symbolData.map(data => {
        const v = data[key]
        if (v === null || v === undefined) return '-'
        if (typeof v === 'number') {
          // Format percentages
          if (PERCENTAGE_METRICS.includes(key)) return `${(v * 100).toFixed(1)}%`
          return v.toFixed(2)
        }
        return String(v)
      })
      return [escCsv(key), ...values].join(',')
    })

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const syms = symbols.filter(s => s.trim()).join('_')
    a.download = `QREP_metrics_${syms}_vs_${benchmark}_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50">
        <div className="bg-black">
          <div className="max-w-7xl mx-auto flex items-center justify-between py-1.5 px-3 md:px-4">
            {/* Left: Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Activity className="h-6 w-6" style={{ color: '#0D9488' }} />
                <span className="text-2xl md:text-3xl font-bold tracking-tight text-white">QREP</span>
                <span className="hidden xl:inline text-base font-medium tracking-wide uppercase text-slate-300 ml-3">
                  Security Analytics &amp; Tearsheets
                </span>
              </Link>
            </div>

            {/* Right: Powered by QuantStats + TIGZIG */}
            <div className="flex items-center shrink-0">
              <span className="hidden sm:inline text-base font-medium text-slate-400">Powered by</span>
              <a
                href="https://github.com/ranaroussi/quantstats"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 ml-2 hover:opacity-80 transition-opacity"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span className="hidden sm:inline text-lg font-bold text-white">QuantStats</span>
              </a>
              <a href="https://www.tigzig.com" target="_blank" rel="noopener noreferrer" className="text-2xl md:text-3xl font-bold tracking-tight text-white ml-4 md:ml-8 hover:opacity-80 transition-opacity">TIGZIG</a>
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-3 md:px-4 flex items-center gap-2 md:gap-4 py-0">
            <span className="text-base md:text-lg font-semibold text-blue-700 bg-blue-50 px-3 md:px-4 py-1.5 border-b-2 border-blue-600">
              Multi Security
            </span>
            <Link
              to="/tearsheet"
              className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all"
            >
              Tearsheet
            </Link>
            <Link
              to="/metrics"
              className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <main className="px-4 py-3 flex-1">
        {/* Form Section - Compact Collapsible */}
        <div className="bg-white border border-slate-200 rounded-lg mb-4">
          {results && !isFormExpanded ? (
            // Collapsed summary with export buttons
            <div className="px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base text-black flex-wrap">
                <BarChart3 className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold">{symbols.filter(s => s.trim()).join(', ')}</span>
                <span className="text-slate-400">vs</span>
                <span className="font-semibold text-teal-700">{benchmark}</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="hidden sm:inline">{startDate} to {endDate}</span>
                <span className="hidden md:inline text-slate-300">|</span>
                <span className="hidden md:inline">RF: {riskFreeRate}%</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Export dropdown */}
                <div className="relative" ref={csvMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowCsvMenu(!showCsvMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showCsvMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[240px] z-20">
                      <button
                        type="button"
                        onClick={() => { setShowCsvMenu(false); setExportModal('html') }}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-sm font-medium text-black">HTML Report</div>
                        <div className="text-sm text-black">Dashboard as image in HTML file</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCsvMenu(false); setExportModal('pdf') }}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-sm font-medium text-black">PDF Report</div>
                        <div className="text-sm text-black">Single-page PDF with full dashboard</div>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      {results?.price_data && (
                        <button
                          type="button"
                          onClick={() => { handleDownloadPriceCSV(); setShowCsvMenu(false) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-black">Prices CSV</div>
                          <div className="text-sm text-black">Daily adjusted close prices for all symbols</div>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { handleDownloadMetricsCSV(); setShowCsvMenu(false) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-black">Metrics CSV</div>
                        <div className="text-sm text-black">All calculated metrics for each symbol</div>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setIsFormExpanded(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-base font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Edit
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // Expanded form
            <form onSubmit={handleSubmit} className="p-4">
              {results && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setIsFormExpanded(false)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Collapse
                  </button>
                </div>
              )}

              {/* Symbols Row */}
              <div className="mb-3">
                <label className="block text-base font-semibold text-black mb-1">
                  Securities (Max 6)
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {symbols.map((symbol, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <SymbolSearchInput
                        value={symbol}
                        onChange={(value) => updateSymbol(index, value)}
                        placeholder={`Symbol ${index + 1}`}
                        disabled={isLoading}
                        autoComplete={true}
                      />
                      {symbols.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSymbol(index)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          disabled={isLoading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {symbols.length < 6 && (
                    <button
                      type="button"
                      onClick={addSymbol}
                      className="px-2 py-1.5 border border-dashed border-slate-400 rounded-lg text-base text-black hover:border-teal-500 hover:text-teal-700 transition-colors flex items-center gap-1"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  )}
                </div>
              </div>

              {/* Parameters Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-base font-semibold text-black mb-1">Benchmark</label>
                  <SymbolSearchInput
                    value={benchmark}
                    onChange={setBenchmark}
                    placeholder="^GSPC"
                    disabled={isLoading}
                    className="w-full"
                    autoComplete={true}
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-black mb-1">From</label>
                  <DatePicker
                    selected={startDate ? new Date(startDate) : null}
                    onChange={(date: Date | null) => date && setStartDate(date.toISOString().split('T')[0])}
                    dateFormat="dd-MM-yyyy"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={30}
                    scrollableYearDropdown
                    maxDate={new Date()}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-black mb-1">To</label>
                  <DatePicker
                    selected={endDate ? new Date(endDate) : null}
                    onChange={(date: Date | null) => date && setEndDate(date.toISOString().split('T')[0])}
                    dateFormat="dd-MM-yyyy"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={30}
                    scrollableYearDropdown
                    maxDate={new Date()}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-base font-semibold text-black mb-1">RF Rate (%)</label>
                    <input
                      type="number"
                      value={riskFreeRate}
                      onChange={(e) => setRiskFreeRate(e.target.value)}
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${showAdvancedSettings ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-black border-slate-300 hover:border-teal-500 hover:text-teal-700'}`}
                    title="Advanced metric parameters"
                  >
                    <Settings2 className="w-5 h-5" />
                    <span className="text-base">Settings</span>
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-1.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progress}
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Compare
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced Settings Panel */}
              {showAdvancedSettings && (
                <div className="mt-3 p-3 bg-white border border-slate-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-5 h-5 text-teal-700" />
                    <span className="text-base font-semibold text-black">Advanced Metric Parameters</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="flex items-center text-base font-medium text-black mb-1">
                        Omega Threshold (%)
                        <InfoTooltip text="The minimum acceptable return threshold for calculating the Omega Ratio. Returns above this threshold are considered gains, below are losses. Default 0% means any positive return is a gain. Set higher (e.g., 2%) if you want to measure performance above a target return." />
                      </label>
                      <input
                        type="number"
                        value={omegaThreshold}
                        onChange={(e) => setOmegaThreshold(e.target.value)}
                        step="0.1"
                        min="0"
                        max="50"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={isLoading}
                      />
                      <p className="text-sm text-black mt-1">Min. acceptable return</p>
                    </div>
                    <div>
                      <label className="flex items-center text-base font-medium text-black mb-1">
                        VaR/CVaR Confidence
                        <InfoTooltip text="Confidence level for Value-at-Risk (VaR) and Conditional VaR (CVaR/Expected Shortfall). At 95%, VaR shows the maximum loss you'd expect 95% of the time. Higher confidence (99%) captures more extreme tail risks but may be less stable with limited data." />
                      </label>
                      <select
                        value={varConfidence}
                        onChange={(e) => setVarConfidence(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={isLoading}
                      >
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                        <option value="99">99%</option>
                      </select>
                      <p className="text-sm text-black mt-1">Risk metric confidence</p>
                    </div>
                    <div className="opacity-60">
                      <label className="flex items-center text-base font-medium text-slate-500 mb-1">
                        Periods (Annualization)
                        <InfoTooltip text="Fixed at 252 (daily trading days/year) since QREP uses daily price data. This affects Sharpe Ratio, Sortino, Volatility, and other annualized metrics. Would only need changing if using weekly (52) or monthly (12) data." />
                      </label>
                      <select
                        value={periods}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-base text-slate-500 bg-slate-50 cursor-not-allowed"
                        disabled={true}
                      >
                        <option value="252">252 (Daily)</option>
                        <option value="52">52 (Weekly)</option>
                        <option value="12">12 (Monthly)</option>
                      </select>
                      <p className="text-sm text-slate-500 mt-1">Fixed for daily data</p>
                    </div>
                    <div>
                      <label className="flex items-center text-base font-medium text-black mb-1">
                        Tail Ratio Cutoff
                        <InfoTooltip text="Percentile used to calculate the Tail Ratio, which compares right-tail gains to left-tail losses. At 95%, it compares your best 5% of returns to your worst 5%. A ratio above 1 means your best days are bigger than your worst days. Higher percentiles focus on more extreme events." />
                      </label>
                      <select
                        value={tailCutoff}
                        onChange={(e) => setTailCutoff(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={isLoading}
                      >
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                        <option value="99">99%</option>
                      </select>
                      <p className="text-sm text-black mt-1">Percentile for tail ratio</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-base font-medium text-red-700">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Results - Block Layout */}
        {results && (
          <div ref={resultsRef} className="space-y-4">
            {/* ═══════════════════════════════════════════════════════════════════════
                DATA OVERVIEW: Compact metadata bar (Time in Market, Trading Days)
            ═══════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 overflow-auto">
                <table className="w-full border-collapse text-base">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-black min-w-[70px]">Symbol</th>
                      {allSymbolsWithBenchmark.map((item) => (
                        <th key={item.symbol} className={`text-center py-2 px-2 font-bold ${item.isBenchmark ? 'text-teal-700' : 'text-black'}`}>
                          {item.symbol}{item.isBenchmark && ' (B)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 font-semibold text-black">Time in Mkt</td>
                      {allSymbolsWithBenchmark.map((item) => (
                        <td key={item.symbol} className="text-center py-2 px-2 font-mono text-black">
                          {getMetricFromAllMetrics(item.data, 'Time in Market')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-semibold text-black">Trading Days</td>
                      {allSymbolsWithBenchmark.map((item) => (
                        <td key={item.symbol} className="text-center py-2 px-2 font-mono text-black">
                          {item.data.trading_days?.toLocaleString() || '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PRICE CHARTS SECTION */}
            {results?.price_data && <PriceChartsSection priceData={results.price_data} />}

            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 1A: CAGR & PERIOD RETURNS (Table Left, Cumulative Chart Right)
            ═══════════════════════════════════════════════════════════════════════ */}
            <Block1AReturns
              items={block1AItems}
              onExpandChart={(chartType) => setExpandedChart(chartType)}
            >
              <Block1AExtended items={block1AItems} />
            </Block1AReturns>

            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 1B: PERFORMANCE RATIOS (Sharpe/Sortino Chart Left, Table Right)
            ═══════════════════════════════════════════════════════════════════════ */}
            <Block1BRatios
              items={block1AItems}
              onInfoClick={handleOpenMetricsModal}
            />

            {/* BLOCK 2: RISK & VOLATILITY */}
            <Block2Drawdowns items={block1AItems} />

            {/* BLOCK 3: TRADING STATISTICS */}
            <Block3TradingStats items={block1AItems} />

            {/* BLOCK 4: BENCHMARK COMPARISON */}
            <Block4BenchmarkComparison items={block1AItems} />

            {/* BLOCK 5: RECOVERY & TAIL RISK */}
            <Block5RecoveryTailRisk items={block1AItems} />

            {/* BLOCK 7: ADVANCED RATIOS */}
            <Block7AdvancedRatios items={block1AItems} />
          </div>
        )}

        {/* Info Box - shown when no results */}
        {!results && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-black mb-2">Block Layout View (Beta)</h3>
            <p className="text-base text-black">
              This is a new layout with chart + table blocks. Enter securities above to see the comparison.
              Each block shows a chart alongside its related metrics in a horizontal layout.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-lg w-[90vw] h-[80vh] p-6 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">
                {expandedChart === 'cumulative' && 'Cumulative Returns'}
                {expandedChart === 'cagr' && 'CAGR & Total Returns'}
                {expandedChart === 'mtd' && 'MTD Returns'}
                {expandedChart === 'ytd' && 'YTD Returns'}
                {expandedChart === '3m' && '3M Returns'}
                {expandedChart === '6m' && '6M Returns'}
                {expandedChart === '1y' && '1Y Period Returns'}
                {expandedChart === 'drawdown' && 'Drawdowns'}
                {expandedChart === 'ratios' && 'Performance Ratios'}
                {expandedChart === 'winrate' && 'Win Rate by Period'}
                {expandedChart === 'alphabeta' && 'Alpha & Beta'}
              </h2>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="h-[calc(100%-60px)]">
              {expandedChart === 'cumulative' && cumulativeReturnsData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeReturnsData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                        <XAxis
                      dataKey="date"
                      tick={{ fontSize: 14, fill: '#000' }}
                      tickFormatter={(v) => v.slice(0, 4)}
                      interval={Math.floor(cumulativeReturnsData.length / 10)}
                    />
                    <YAxis
                      orientation="right"
                      tick={{ fontSize: 14, fill: '#000' }}
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: '14px' }}
                      formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                      labelFormatter={(l) => l}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && results.benchmark_metrics.time_series && (
                      <Line
                        key={results.benchmark}
                        type="monotone"
                        dataKey={results.benchmark}
                        stroke={BENCHMARK_COLOR}
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                        name={results.benchmark}
                        connectNulls
                      />
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Line
                        key={symbol}
                        type="monotone"
                        dataKey={symbol}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={symbol}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
              {/* CAGR & Total Returns Bar Chart - Expanded */}
              {expandedChart === 'cagr' && cagrBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cagrBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* MTD Returns Bar Chart - Expanded */}
              {expandedChart === 'mtd' && mtdBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mtdBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* YTD Returns Bar Chart - Expanded */}
              {expandedChart === 'ytd' && ytdBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ytdBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* 3M Returns Bar Chart - Expanded */}
              {expandedChart === '3m' && threeMonthReturnsBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={threeMonthReturnsBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* 6M Returns Bar Chart - Expanded */}
              {expandedChart === '6m' && sixMonthReturnsBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sixMonthReturnsBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* 1Y Period Returns Bar Chart - Expanded */}
              {expandedChart === '1y' && oneYearBarData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oneYearBarData} margin={BAR_CHART_MARGIN_EXPANDED}>
                                        <XAxis dataKey="metric" {...XAXIS_PROPS} />
                    <YAxis hide />
                    <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px', maxHeight: '50px', overflow: 'hidden' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {results?.benchmark_metrics?.success && (
                      <Bar key={results.benchmark} dataKey={results.benchmark} fill={BENCHMARK_COLOR} name={results.benchmark}>
                        <LabelList dataKey={results.benchmark} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    )}
                    {successfulSymbols.map((symbol, idx) => (
                      <Bar key={symbol} dataKey={symbol} fill={CHART_COLORS[idx % CHART_COLORS.length]} name={symbol}>
                        <LabelList dataKey={symbol} position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={LABEL_STYLE_EXPANDED} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Disclaimer Modal */}
      {exportModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setExportModal(null)}
        >
          <div
            className="bg-white rounded-lg w-[480px] max-w-[90vw] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-black">
                {exportModal === 'html' ? 'HTML Export' : 'PDF Export'}
              </h2>
              <button
                onClick={() => setExportModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 text-base text-black space-y-3">
              <p>
                The current export uses <strong>image-based rendering</strong> (screenshot of the dashboard).
                Native HTML table export is under development.
              </p>
              {exportModal === 'pdf' && (
                <p>
                  The PDF will be a single continuous page containing the full dashboard image.
                </p>
              )}
              <p className="text-sm text-slate-500">
                For raw data, use the <strong>Prices CSV</strong> or <strong>Metrics CSV</strong> download options.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setExportModal(null)}
                className="px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const format = exportModal
                  setExportModal(null)
                  if (format === 'html') handleExportHTML()
                  else handleExportPDF()
                }}
                className="px-4 py-2 text-base font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                Download {exportModal === 'html' ? 'HTML' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Info Modal */}
      {showMetricsModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMetricsModal(false)}
        >
          <div
            className="bg-white rounded-lg w-[800px] max-w-[90vw] h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-black">Metrics Reference</h2>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div
              className="flex-1 overflow-auto px-6 py-4"
              style={{ fontSize: '16px', lineHeight: '1.6', color: '#000' }}
              dangerouslySetInnerHTML={{ __html: metricsHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
