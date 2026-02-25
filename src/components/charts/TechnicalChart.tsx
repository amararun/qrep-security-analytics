import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Settings2, ChevronDown, X, Maximize2, Minimize2, Check, Eye, EyeOff, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  computeEMA, computeSMA, computeMACDCustom, computeRSI, computeROC,
  computeBollinger, computeTRIX, computeHistoricalVolatility,
} from '../../lib/technicals'

export interface CloseDataRow {
  date: string
  close: number
}

interface TechnicalChartProps {
  data: CloseDataRow[]
  label: string
}

// ─── Settings types ─────────────────────────────────────────────────────────

interface EMAConfig { enabled: boolean; period: number }
interface SMAConfig { enabled: boolean; period: number }
interface BBConfig { enabled: boolean; period: number; stdDev: number }
interface MACDConfig { fast: number; slow: number; signal: number }
interface RSIROCConfig { rsiPeriod: number; rocPeriod: number }
type ExtraPanel = 'none' | 'trix' | 'volatility'
type TimeRange = 'all' | '30d' | '60d' | '90d' | '6m' | '1y' | '2y' | '5y'

const EXTRA_PANEL_OPTIONS: { key: ExtraPanel; label: string; desc: string }[] = [
  { key: 'trix', label: 'TRIX', desc: 'Triple-smoothed EMA trend — filters noise, shows major reversals' },
  { key: 'volatility', label: 'Hist. Volatility', desc: 'Annualized rolling volatility — shows realized risk %' },
]

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: '30d', label: '30D', days: 30 },
  { key: '60d', label: '60D', days: 60 },
  { key: '90d', label: '90D', days: 90 },
  { key: '6m', label: '6M', days: 126 },
  { key: '1y', label: '1Y', days: 252 },
  { key: '2y', label: '2Y', days: 504 },
  { key: '5y', label: '5Y', days: 1260 },
  { key: 'all', label: 'All', days: Infinity },
]

// ─── Styling constants ──────────────────────────────────────────────────────

const EMA_COLORS = ['#F59E0B', '#EC4899', '#8B5CF6']
const SMA_COLORS = ['#0D9488', '#6366F1']
const GRID_STYLE = '#E5E7EB'
const AXIS_STYLE = { fontSize: '11px', fill: '#000000' }
const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  color: '#000000',
  fontSize: '12px',
  fontWeight: 500,
}

// Hide number input spinners via inline style
const INPUT_NO_SPINNER: React.CSSProperties = {
  MozAppearance: 'textfield',
}

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const formatNumber = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(2)
}

// ─── Draft param input (edits local state, apply on confirm) ────────────────

function DraftInput({ value, onChange, min = 1, max = 500 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  const [draft, setDraft] = useState(String(value))
  const [dirty, setDirty] = useState(false)
  const prevValue = useRef(value)

  // Synchronous render-time sync (avoids async useEffect timing issues)
  if (value !== prevValue.current) {
    prevValue.current = value
    setDraft(String(value))
    setDirty(false)
  }

  const apply = () => {
    const v = parseInt(draft)
    if (!isNaN(v) && v >= min && v <= max) {
      prevValue.current = v
      onChange(v)
      setDirty(false)
    }
  }

  return (
    <span className="inline-flex items-center">
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={e => { setDraft(e.target.value); setDirty(true) }}
        onKeyDown={e => { if (e.key === 'Enter') apply() }}
        style={INPUT_NO_SPINNER}
        className="w-14 px-1.5 py-1 text-sm border border-slate-300 rounded-md text-center bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {dirty && (
        <button
          onClick={apply}
          className="ml-1 p-0.5 rounded bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          title="Apply"
        >
          <Check size={14} />
        </button>
      )}
    </span>
  )
}

function ParamRow({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-black">
      <span className="text-slate-600 font-medium">{label}</span>
      <DraftInput value={value} onChange={onChange} min={min} max={max} />
    </label>
  )
}

// ─── Toggle chip (for overlays) ─────────────────────────────────────────────

function ToggleChip({ label, color, active, onClick }: {
  label: string; color: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
        active
          ? 'border-slate-400 text-black bg-slate-100'
          : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300 hover:text-slate-600'
      }`}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
      />
      {label}
    </button>
  )
}

// ─── Modal backdrop ─────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={ref} className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 min-w-[340px] max-w-[440px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-black">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-black transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Add Panel dropdown ─────────────────────────────────────────────────────

function AddPanelDropdown({ value, onChange, trixPeriod, volPeriod }: {
  value: ExtraPanel; onChange: (v: ExtraPanel) => void; trixPeriod: number; volPeriod: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeLabel = value === 'trix' ? `TRIX (${trixPeriod})` : value === 'volatility' ? `Hist. Vol (${volPeriod})` : ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border-2 transition-all ${
          value !== 'none'
            ? 'border-teal-500 text-teal-700 bg-teal-50 hover:bg-teal-100'
            : 'border-dashed border-slate-300 text-slate-500 bg-white hover:border-slate-400 hover:text-black'
        }`}
      >
        {value !== 'none' ? (
          <>
            <span>{activeLabel}</span>
            <button
              onClick={e => { e.stopPropagation(); onChange('none') }}
              className="ml-0.5 text-slate-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span>+ Add Panel</span>
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-40 w-80 overflow-hidden">
          {EXTRA_PANEL_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false) }}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                value === opt.key ? 'bg-teal-50' : ''
              }`}
            >
              <div className="text-sm font-bold text-black">
                {opt.key === 'trix' ? `TRIX (${trixPeriod})` : `Hist. Volatility (${volPeriod})`}
              </div>
              <div className="text-xs text-black mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panel visibility toggle ────────────────────────────────────────────────

function PanelToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-1 rounded text-slate-400 hover:text-black transition-colors"
      title={visible ? 'Hide panel' : 'Show panel'}
    >
      {visible ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TechnicalChart({ data, label }: TechnicalChartProps) {
  const [expanded, setExpanded] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('all')

  // Price overlay settings
  const [emas, setEmas] = useState<EMAConfig[]>([
    { enabled: true, period: 12 },
    { enabled: true, period: 26 },
    { enabled: false, period: 50 },
  ])
  const [smas, setSmas] = useState<SMAConfig[]>([
    { enabled: false, period: 50 },
    { enabled: false, period: 200 },
  ])
  const [bb, setBB] = useState<BBConfig>({ enabled: false, period: 20, stdDev: 2 })

  // Panel settings
  const [macd, setMacd] = useState<MACDConfig>({ fast: 12, slow: 26, signal: 9 })
  const [rsiRoc, setRsiRoc] = useState<RSIROCConfig>({ rsiPeriod: 14, rocPeriod: 12 })
  const [extraPanel, setExtraPanel] = useState<ExtraPanel>('none')
  const [trixPeriod, setTrixPeriod] = useState(15)
  const [volPeriod, setVolPeriod] = useState(20)

  // Panel visibility
  const [showMacd, setShowMacd] = useState(true)
  const [showRsiRoc, setShowRsiRoc] = useState(true)

  // Gear/modal open states
  const [priceGear, setPriceGear] = useState(false)
  const [macdModal, setMacdModal] = useState(false)
  const [rsiGear, setRsiGear] = useState(false)

  const toggleEma = useCallback((idx: number) => {
    setEmas(prev => prev.map((e, i) => i === idx ? { ...e, enabled: !e.enabled } : e))
  }, [])

  const updateEmaPeriod = useCallback((idx: number, period: number) => {
    setEmas(prev => prev.map((e, i) => i === idx ? { ...e, period } : e))
  }, [])

  const toggleSma = useCallback((idx: number) => {
    setSmas(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s))
  }, [])

  const updateSmaPeriod = useCallback((idx: number, period: number) => {
    setSmas(prev => prev.map((s, i) => i === idx ? { ...s, period } : s))
  }, [])

  // Filter data by time range — indicators computed on FULL data, then sliced for display
  const rangeConfig = TIME_RANGES.find(r => r.key === timeRange)!
  const availableRanges = TIME_RANGES.filter(r => r.days <= data.length || r.key === 'all')

  // Compute all indicator data on FULL data set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullChartData = useMemo<any[]>(() => {
    if (data.length === 0) return []
    const closes = data.map(d => d.close)

    const emaResults = emas.map(e => e.enabled ? computeEMA(closes, e.period) : null)
    const smaResults = smas.map(s => s.enabled ? computeSMA(closes, s.period) : null)
    const bbData = bb.enabled ? computeBollinger(closes, bb.period, bb.stdDev) : null
    const macdData = computeMACDCustom(closes, macd.fast, macd.slow, macd.signal)
    const rsiData = computeRSI(closes, rsiRoc.rsiPeriod)
    const rocData = computeROC(closes, rsiRoc.rocPeriod)
    const trixData = extraPanel === 'trix' ? computeTRIX(closes, trixPeriod) : null
    const volData = extraPanel === 'volatility' ? computeHistoricalVolatility(closes, volPeriod) : null

    return data.map((d, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = {
        date: d.date,
        close: d.close,
        macd: macdData[i].macd,
        signal: macdData[i].signal,
        histogram: macdData[i].histogram,
        rsi: rsiData[i],
        roc: rocData[i],
      }
      emaResults.forEach((r, j) => { if (r) row[`ema${j}`] = r[i] })
      smaResults.forEach((r, j) => { if (r) row[`sma${j}`] = r[i] })
      if (bbData) {
        row.bbUpper = bbData[i].upper
        row.bbMiddle = bbData[i].sma
        row.bbLower = bbData[i].lower
      }
      if (trixData) row.trix = trixData[i]
      if (volData) row.hvol = volData[i]
      return row
    })
  }, [data, emas, smas, bb, macd, rsiRoc, extraPanel, trixPeriod, volPeriod])

  // Slice to display range
  const chartData = useMemo(() => {
    if (rangeConfig.days === Infinity || rangeConfig.days >= fullChartData.length) return fullChartData
    return fullChartData.slice(-rangeConfig.days)
  }, [fullChartData, rangeConfig.days])

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-slate-400 text-base">
        No data for this range
      </div>
    )
  }

  // Count visible panels to determine price chart height
  const visiblePanels = (!expanded ? ((showMacd ? 1 : 0) + (showRsiRoc ? 1 : 0) + (extraPanel !== 'none' ? 1 : 0)) : 0)
  const priceHeight = expanded ? 660 : (visiblePanels >= 3 ? 450 : visiblePanels >= 2 ? 480 : 530)
  const panelHeight = 180

  // Build dynamic title
  const overlayParts: string[] = []
  const activeEmas = emas.filter(e => e.enabled)
  if (activeEmas.length > 0) overlayParts.push(`EMA (${activeEmas.map(e => e.period).join(',')})`)
  const activeSmas = smas.filter(s => s.enabled)
  if (activeSmas.length > 0) overlayParts.push(`SMA (${activeSmas.map(s => s.period).join(',')})`)
  if (bb.enabled) overlayParts.push(`BB (${bb.period},${bb.stdDev})`)
  const titleOverlays = overlayParts.length > 0 ? ` + ${overlayParts.join(', ')}` : ''

  // Tooltip labels
  const priceTooltipLabels: Record<string, string> = { close: 'Price', bbUpper: 'BB Upper', bbMiddle: `BB Mid (SMA ${bb.period})`, bbLower: 'BB Lower' }
  emas.forEach((e, j) => { if (e.enabled) priceTooltipLabels[`ema${j}`] = `EMA ${e.period}` })
  smas.forEach((s, j) => { if (s.enabled) priceTooltipLabels[`sma${j}`] = `SMA ${s.period}` })

  return (
    <div className="space-y-2">
      {/* ═══ Row 1: Title + controls ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-sm font-bold text-black mr-1">{label} — Price{titleOverlays}</div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <button
            onClick={() => setPriceGear(p => !p)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-bold rounded-lg border-2 transition-all ${
              priceGear
                ? 'border-teal-500 text-teal-700 bg-teal-50'
                : 'border-slate-300 text-slate-600 bg-white hover:border-teal-400 hover:text-teal-600'
            }`}
            title="Configure overlays"
          >
            <Settings2 size={16} />
            <span>Settings</span>
          </button>

          <AddPanelDropdown value={extraPanel} onChange={setExtraPanel} trixPeriod={trixPeriod} volPeriod={volPeriod} />

          <button
            onClick={() => setExpanded(e => !e)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-bold rounded-lg border-2 transition-all ${
              expanded
                ? 'border-teal-500 text-teal-700 bg-teal-50'
                : 'border-slate-300 text-slate-600 bg-white hover:border-slate-400 hover:text-black'
            }`}
            title={expanded ? 'Show all panels' : 'Price chart only'}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{expanded ? 'All Panels' : 'Price Only'}</span>
          </button>
        </div>
      </div>

      {/* ═══ Row 2: Overlay chips (left) + Time range (right) ═══ */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {emas.map((e, j) => (
            <ToggleChip key={`ema${j}`} label={`EMA ${e.period}`} color={EMA_COLORS[j]} active={e.enabled} onClick={() => toggleEma(j)} />
          ))}
          {smas.map((s, j) => (
            <ToggleChip key={`sma${j}`} label={`SMA ${s.period}`} color={SMA_COLORS[j]} active={s.enabled} onClick={() => toggleSma(j)} />
          ))}
          <ToggleChip label={`BB (${bb.period},${bb.stdDev})`} color="#E11D48" active={bb.enabled} onClick={() => setBB(prev => ({ ...prev, enabled: !prev.enabled }))} />
        </div>

        {/* Time range pills — right-aligned, prominent */}
        <div className="flex items-center gap-1 ml-auto bg-slate-100 rounded-lg px-1 py-1">
          {availableRanges.map(r => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
                timeRange === r.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-black hover:bg-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Price settings panel (inline) ═══ */}
      {priceGear && (
        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex gap-12">
            {/* Price overlay params */}
            <div className="space-y-3">
              <div className={`flex items-center gap-5 flex-wrap ${emas.some(e => e.enabled) ? '' : 'opacity-40 pointer-events-none'}`}>
                <span className="text-sm font-bold text-black w-12">EMA</span>
                {emas.map((e, j) => (
                  <div key={`ema-cfg-${j}`} className={`flex items-center gap-1.5 ${e.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EMA_COLORS[j] }} />
                    <ParamRow label={`#${j + 1}`} value={e.period} onChange={v => updateEmaPeriod(j, v)} />
                  </div>
                ))}
              </div>
              <div className={`flex items-center gap-5 flex-wrap ${smas.some(s => s.enabled) ? '' : 'opacity-40 pointer-events-none'}`}>
                <span className="text-sm font-bold text-black w-12">SMA</span>
                {smas.map((s, j) => (
                  <div key={`sma-cfg-${j}`} className={`flex items-center gap-1.5 ${s.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SMA_COLORS[j] }} />
                    <ParamRow label={`#${j + 1}`} value={s.period} onChange={v => updateSmaPeriod(j, v)} />
                  </div>
                ))}
              </div>
              <div className={`flex items-center gap-5 flex-wrap ${bb.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                <span className="text-sm font-bold text-black w-12">BB</span>
                <ParamRow label="Period" value={bb.period} onChange={v => setBB(prev => ({ ...prev, period: v }))} />
                <ParamRow label="Std Dev" value={bb.stdDev} onChange={v => setBB(prev => ({ ...prev, stdDev: v }))} min={1} max={5} />
              </div>
            </div>
            {/* Extra panel params — beside the main column */}
            <div className="space-y-3 pt-0.5">
              <div className={`flex items-center gap-5 ${extraPanel !== 'trix' ? 'opacity-40 pointer-events-none' : ''}`}>
                <span className="text-sm font-bold text-black w-12">TRIX</span>
                <ParamRow label="Period" value={trixPeriod} onChange={v => setTrixPeriod(v)} />
              </div>
              <div className={`flex items-center gap-5 ${extraPanel !== 'volatility' ? 'opacity-40 pointer-events-none' : ''}`}>
                <span className="text-sm font-bold text-black w-12">HV</span>
                <ParamRow label="Period" value={volPeriod} onChange={v => setVolPeriod(v)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-black">Type a value and press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-sm font-mono">Enter</kbd> or click <Check size={12} className="inline text-teal-500" /> to apply</p>
            <Link
              to="/metrics"
              className="flex items-center gap-1.5 text-sm font-bold text-black hover:text-teal-700 transition-colors"
              onClick={() => sessionStorage.setItem('docs-tab', 'technicals')}
            >
              <Info size={16} />
              <span>Guide to Technical Indicators</span>
            </Link>
          </div>
        </div>
      )}

      {/* ═══ Panel 1: Price chart ═══ */}
      <div>
        <ResponsiveContainer width="100%" height={priceHeight}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
            <CartesianGrid stroke={GRID_STYLE} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke={GRID_STYLE} style={AXIS_STYLE} interval="preserveStartEnd" minTickGap={60} />
            <YAxis yAxisId="price" stroke={GRID_STYLE} style={AXIS_STYLE} domain={['auto', 'auto']} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={formatDate}
              formatter={(value: number, name: string) => [formatNumber(value), priceTooltipLabels[name] || name]}
            />
            <Line yAxisId="price" type="linear" dataKey="close" stroke="#0369A1" strokeWidth={2} dot={false} connectNulls />
            {emas.map((e, j) => e.enabled && (
              <Line key={`ema${j}`} yAxisId="price" type="linear" dataKey={`ema${j}`} stroke={EMA_COLORS[j]} strokeWidth={1.5} dot={false} connectNulls />
            ))}
            {smas.map((s, j) => s.enabled && (
              <Line key={`sma${j}`} yAxisId="price" type="linear" dataKey={`sma${j}`} stroke={SMA_COLORS[j]} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            ))}
            {bb.enabled && (
              <>
                <Line yAxisId="price" type="linear" dataKey="bbUpper" stroke="#E11D48" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
                <Line yAxisId="price" type="linear" dataKey="bbMiddle" stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
                <Line yAxisId="price" type="linear" dataKey="bbLower" stroke="#059669" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ Panel 2: MACD ═══ */}
      {!expanded && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PanelToggle visible={showMacd} onToggle={() => setShowMacd(p => !p)} />
              <div className="text-sm font-bold text-black">MACD ({macd.fast}, {macd.slow}, {macd.signal})</div>
              {showMacd && (
                <button
                  onClick={() => setMacdModal(true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border border-slate-300 text-slate-500 bg-white hover:border-teal-400 hover:text-teal-600 transition-all"
                >
                  <Settings2 size={13} />
                  <span>Params</span>
                </button>
              )}
            </div>
            {showMacd && (
              <ResponsiveContainer width="100%" height={panelHeight}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke={GRID_STYLE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke={GRID_STYLE} style={AXIS_STYLE} interval="preserveStartEnd" minTickGap={60} />
                  <YAxis yAxisId="macd" stroke={GRID_STYLE} style={AXIS_STYLE} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => [
                      value?.toFixed(2) ?? '—',
                      name === 'histogram' ? 'Histogram' : name === 'macd' ? 'MACD' : 'Signal',
                    ]}
                  />
                  <ReferenceLine yAxisId="macd" y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                  <Bar yAxisId="macd" dataKey="histogram">
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.histogram !== null && entry.histogram >= 0 ? '#059669' : '#DC2626'} />
                    ))}
                  </Bar>
                  <Line yAxisId="macd" type="linear" dataKey="macd" stroke="#0369A1" strokeWidth={1.5} dot={false} connectNulls />
                  <Line yAxisId="macd" type="linear" dataKey="signal" stroke="#F97316" strokeWidth={1.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* MACD Settings Modal */}
          <Modal open={macdModal} onClose={() => setMacdModal(false)} title="MACD Parameters">
            <div className="space-y-4">
              <ParamRow label="Fast EMA" value={macd.fast} onChange={v => setMacd(prev => ({ ...prev, fast: v }))} />
              <ParamRow label="Slow EMA" value={macd.slow} onChange={v => setMacd(prev => ({ ...prev, slow: v }))} />
              <ParamRow label="Signal EMA" value={macd.signal} onChange={v => setMacd(prev => ({ ...prev, signal: v }))} />
              <p className="text-sm text-black mt-2">Type a value and press Enter or click the green checkmark. Default: 12, 26, 9</p>
            </div>
          </Modal>

          {/* ═══ Panel 3: RSI + ROC ═══ */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PanelToggle visible={showRsiRoc} onToggle={() => setShowRsiRoc(p => !p)} />
              <div className="text-sm font-bold text-black">RSI ({rsiRoc.rsiPeriod}) & ROC ({rsiRoc.rocPeriod})</div>
              {showRsiRoc && (
                <button
                  onClick={() => setRsiGear(p => !p)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border transition-all ${
                    rsiGear
                      ? 'border-teal-500 text-teal-600 bg-teal-50'
                      : 'border-slate-300 text-slate-500 bg-white hover:border-teal-400 hover:text-teal-600'
                  }`}
                >
                  <Settings2 size={13} />
                  <span>Params</span>
                </button>
              )}
            </div>
            {showRsiRoc && (
              <>
                {rsiGear && (
                  <div className="flex items-center gap-5 mb-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <ParamRow label="RSI Period" value={rsiRoc.rsiPeriod} onChange={v => setRsiRoc(prev => ({ ...prev, rsiPeriod: v }))} />
                    <ParamRow label="ROC Period" value={rsiRoc.rocPeriod} onChange={v => setRsiRoc(prev => ({ ...prev, rocPeriod: v }))} />
                  </div>
                )}
                <ResponsiveContainer width="100%" height={panelHeight}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid stroke={GRID_STYLE} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke={GRID_STYLE} style={AXIS_STYLE} interval="preserveStartEnd" minTickGap={60} />
                    <YAxis yAxisId="rsi" domain={[0, 100]} stroke={GRID_STYLE} style={AXIS_STYLE} tickFormatter={(v: number) => `${v}`} />
                    <YAxis yAxisId="roc" orientation="right" stroke={GRID_STYLE} style={{ ...AXIS_STYLE, fill: '#0D9488' }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={formatDate}
                      formatter={(value: number, name: string) => [value?.toFixed(2) ?? '—', name === 'rsi' ? 'RSI' : 'ROC %']}
                    />
                    <ReferenceLine yAxisId="rsi" y={70} stroke="#DC2626" strokeDasharray="3 3" />
                    <ReferenceLine yAxisId="rsi" y={30} stroke="#059669" strokeDasharray="3 3" />
                    <ReferenceLine yAxisId="roc" y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Line yAxisId="rsi" type="linear" dataKey="rsi" stroke="#7C3AED" strokeWidth={1.5} dot={false} connectNulls />
                    <Line yAxisId="roc" type="linear" dataKey="roc" stroke="#0D9488" strokeWidth={1.5} dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* ═══ Extra Panel ═══ */}
          {extraPanel !== 'none' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-bold text-black">
                  {extraPanel === 'trix' ? `TRIX (${trixPeriod})` : `Historical Volatility (${volPeriod})`}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={panelHeight}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke={GRID_STYLE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke={GRID_STYLE} style={AXIS_STYLE} interval="preserveStartEnd" minTickGap={60} />

                  {extraPanel === 'trix' && (
                    <>
                      <YAxis yAxisId="trix" stroke={GRID_STYLE} style={AXIS_STYLE} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatDate} formatter={(value: number) => [value?.toFixed(4) ?? '—', 'TRIX']} />
                      <ReferenceLine yAxisId="trix" y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                      <Line yAxisId="trix" type="linear" dataKey="trix" stroke="#6366F1" strokeWidth={1.5} dot={false} connectNulls />
                    </>
                  )}

                  {extraPanel === 'volatility' && (
                    <>
                      <YAxis yAxisId="vol" stroke={GRID_STYLE} style={AXIS_STYLE} domain={['auto', 'auto']} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatDate} formatter={(value: number) => [`${value?.toFixed(1)}%`, 'HV (ann.)']} />
                      <Line yAxisId="vol" type="linear" dataKey="hvol" stroke="#DC2626" strokeWidth={1.5} dot={false} connectNulls />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
