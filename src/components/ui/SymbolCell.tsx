/**
 * SymbolCell - Displays symbol/name with truncation and styled tooltip
 *
 * Features:
 * - Truncates names longer than maxLength (default 6)
 * - Shows styled CSS tooltip on hover with full name
 * - Optional description shown on second line of tooltip
 * - Benchmark indicator support
 */

interface SymbolCellProps {
  name: string
  description?: string  // Optional longer description for portfolios
  isBenchmark?: boolean
  maxLength?: number
  className?: string
}

export function SymbolCell({
  name,
  description,
  isBenchmark = false,
  maxLength = 6,
  className = ''
}: SymbolCellProps) {
  const needsTruncation = name.length > maxLength
  const displayName = needsTruncation ? `${name.slice(0, maxLength - 1)}…` : name

  const baseClasses = `font-bold text-base whitespace-nowrap ${isBenchmark ? 'text-teal-700' : 'text-black'}`

  return (
    <td className={`py-2 px-2 ${className}`}>
      <div className="relative group inline-flex items-center cursor-default">
        <span className={baseClasses}>
          {displayName}
        </span>
        {isBenchmark && <span className="text-xs font-normal ml-1 text-teal-700">(B)</span>}

        {/* Styled tooltip - always show on hover */}
        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-slate-800 text-white text-sm px-2 py-1.5 rounded shadow-lg whitespace-pre-line max-w-[200px]">
            <div className="font-semibold">{name}</div>
            {description && (
              <div className="text-slate-300 text-xs mt-0.5">{description}</div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
        </div>
      </div>
    </td>
  )
}

/**
 * SymbolSpan - Inline version for use outside of tables (e.g., in chart legends)
 */
interface SymbolSpanProps {
  name: string
  description?: string
  maxLength?: number
  className?: string
}

export function SymbolSpan({
  name,
  description,
  maxLength = 6,
  className = ''
}: SymbolSpanProps) {
  const needsTruncation = name.length > maxLength
  const displayName = needsTruncation ? `${name.slice(0, maxLength - 1)}…` : name

  return (
    <span className={`relative group inline-flex items-center cursor-default whitespace-nowrap ${className}`}>
      <span>{displayName}</span>

      {/* Styled tooltip - always show on hover */}
      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-slate-800 text-white text-sm px-2 py-1.5 rounded shadow-lg whitespace-pre-line max-w-[200px]">
          <div className="font-semibold">{name}</div>
          {description && (
            <div className="text-slate-300 text-xs mt-0.5">{description}</div>
          )}
        </div>
        <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
      </div>
    </span>
  )
}
