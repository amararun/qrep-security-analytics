import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Activity, FileText, Loader2, Download, AlertCircle } from 'lucide-react'
import { generateTearsheetBackend, type PriceData } from '../lib/backend-service'
import { SymbolSearchInput } from '@/components/SymbolSearchInput'
import { Footer } from '@/components/layout/Footer'
import { RelativePerformanceChart } from '@/components/charts/RelativePerformanceChart'
import { TechnicalChart, type CloseDataRow } from '@/components/charts/TechnicalChart'

// Price Charts Section for Tearsheet: Relative Performance + Technical charts for symbol & benchmark
function TearsheetChartsSection({ priceData }: { priceData: PriceData; symbol: string; benchmark: string }) {
  const symbolKeys = Object.keys(priceData.symbols)
  const [activeTab, setActiveTab] = useState<string>('relative')

  const tabs = [
    { key: 'relative', label: 'Relative Performance' },
    ...symbolKeys.map(sym => ({ key: sym, label: sym })),
  ]

  const getCloseData = (sym: string): CloseDataRow[] => {
    const prices = priceData.symbols[sym]
    if (!prices) return []
    return priceData.dates
      .map((date, i) => ({ date, close: prices[i] }))
      .filter((row): row is CloseDataRow => row.close !== null)
  }

  return (
    <div className="mt-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base font-bold text-black">Price Charts & Technical Indicators</h3>
      </div>

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

      <div className="p-4">
        {activeTab === 'relative' ? (
          <RelativePerformanceChart priceData={priceData} height={400} />
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

export default function TearsheetPage() {
  const [symbol, setSymbol] = useState('')
  const [benchmark, setBenchmark] = useState('^GSPC')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [riskFreeRate, setRiskFreeRate] = useState('0.0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ message: '', percent: 0 })
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [reportFilename, setReportFilename] = useState('')
  const [priceData, setPriceData] = useState<PriceData | null>(() => {
    try {
      const cached = sessionStorage.getItem('qrep_tearsheet_priceData')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const downloadLinkRef = useRef<HTMLAnchorElement>(null)

  // Set default dates and restore cached report on mount
  useEffect(() => {
    const today = new Date()
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(today.getFullYear() - 5)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(fiveYearsAgo.toISOString().split('T')[0])

    // Restore cached report HTML
    try {
      const cachedHtml = sessionStorage.getItem('qrep_tearsheet_html')
      const cachedFilename = sessionStorage.getItem('qrep_tearsheet_filename')
      if (cachedHtml) {
        const blob = new Blob([cachedHtml], { type: 'text/html' })
        setReportUrl(URL.createObjectURL(blob))
        setReportFilename(cachedFilename || 'tearsheet.html')
      }
    } catch {}
  }, [])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (reportUrl) {
        URL.revokeObjectURL(reportUrl)
      }
    }
  }, [reportUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProgress({ message: '', percent: 0 })

    // Clean up previous report URL
    if (reportUrl) {
      URL.revokeObjectURL(reportUrl)
      setReportUrl(null)
    }
    setPriceData(null)

    if (!symbol.trim()) {
      setError('Please enter a stock symbol')
      return
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates')
      return
    }

    // Parse risk-free rate
    const rfRate = parseFloat(riskFreeRate) || 0.0

    setIsLoading(true)

    try {
      const result = await generateTearsheetBackend(
        symbol.trim(),
        benchmark.trim() || '^GSPC',
        startDate,
        endDate,
        rfRate,
        (message, percent) => setProgress({ message, percent })
      )

      // Create blob URL for download/view
      const blob = new Blob([result.htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setReportUrl(url)
      const fname = `${symbol.trim()}_tearsheet_${startDate}_to_${endDate}.html`
      setReportFilename(fname)
      try { sessionStorage.setItem('qrep_tearsheet_html', result.htmlContent); sessionStorage.setItem('qrep_tearsheet_filename', fname) } catch {}
      const pd = result.priceData || null
      setPriceData(pd)
      try { if (pd) sessionStorage.setItem('qrep_tearsheet_priceData', JSON.stringify(pd)); else sessionStorage.removeItem('qrep_tearsheet_priceData') } catch {}

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tearsheet')
    } finally {
      setIsLoading(false)
      setProgress({ message: '', percent: 0 })
    }
  }

  const handleOpenReport = () => {
    if (reportUrl && downloadLinkRef.current) {
      // Use the anchor element to open - this avoids popup blocker
      downloadLinkRef.current.click()
    }
  }

  const handleDownloadPriceCSV = () => {
    if (!priceData) return
    const { dates, symbols: priceSymbols } = priceData
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
    a.download = `QREP_prices_${symbol.trim()}_${benchmark.trim()}_${startDate}_to_${endDate}.csv`
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
            <Link
              to="/"
              className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all"
            >
              Multi Security
            </Link>
            <span className="text-base md:text-lg font-semibold text-blue-700 bg-blue-50 px-3 md:px-4 py-1.5 border-b-2 border-blue-600">
              Tearsheet
            </span>
            <Link
              to="/metrics"
              className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-3 md:px-4 py-4 flex-1">
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">Full HTML Tearsheet</h1>
              <p className="text-base text-black">
                Original QuantStats HTML Tearsheet, As-Is - with 90+ KPIs and 10+ Charts
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* All inputs in one row: Symbol, Benchmark, From, To, Risk-Free Rate */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-base font-semibold text-black mb-2">
                  Stock Symbol
                </label>
                <SymbolSearchInput
                  value={symbol}
                  onChange={setSymbol}
                  placeholder="e.g., AAPL"
                  disabled={isLoading}
                  autoComplete={true}
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-black mb-2">
                  Benchmark
                </label>
                <SymbolSearchInput
                  value={benchmark}
                  onChange={setBenchmark}
                  placeholder="e.g., SPY"
                  disabled={isLoading}
                  autoComplete={true}
                />
              </div>
              <div>
                <label htmlFor="startDate" className="block text-base font-semibold text-black mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-base font-semibold text-black mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="riskFreeRate" className="block text-base font-semibold text-black mb-2">
                  Risk-Free Rate (%)
                </label>
                <input
                  type="number"
                  id="riskFreeRate"
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.0"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-base font-medium text-black">
                  <span>{progress.message || 'Starting...'}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-base font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button - Center aligned */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {progress.message || 'Generating...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Tearsheet
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Report Actions - shown when report is ready - Center aligned */}
          {reportUrl && (
            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-4">
                <span className="text-base font-semibold text-green-800">Report Ready!</span>

                {/* Hidden anchor for opening in new tab */}
                <a
                  ref={downloadLinkRef}
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden"
                >
                  Open
                </a>

                <button
                  onClick={handleOpenReport}
                  className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Report
                </button>

                <a
                  href={reportUrl}
                  download={reportFilename}
                  className="px-5 py-2 bg-white border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </a>

                {priceData && (
                  <button
                    onClick={handleDownloadPriceCSV}
                    className="px-5 py-2 bg-white border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Price Data CSV
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Price Charts Section */}
          {priceData && <TearsheetChartsSection priceData={priceData} symbol={symbol.trim()} benchmark={benchmark.trim()} />}

          {/* Info Box */}
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-base text-black">
              <span className="font-semibold">Includes:</span> Performance metrics (CAGR, Sharpe, Sortino, Max Drawdown), Cumulative returns chart, Drawdown analysis, Monthly returns heatmap, Rolling statistics, Benchmark comparison
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
