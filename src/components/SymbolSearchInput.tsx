import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, X } from 'lucide-react'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface SymbolSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  autoComplete?: boolean  // Enable inline auto-search as you type
}

export function SymbolSearchInput({
  value,
  onChange,
  placeholder = 'Symbol',
  disabled = false,
  className = '',
  autoComplete = false,
}: SymbolSearchInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  // Sync inputValue with external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced auto-search
  useEffect(() => {
    if (!autoComplete || !isDropdownOpen) return
    if (inputValue.trim().length < 3) {
      setSearchResults([])
      return
    }

    const debounceTimer = setTimeout(() => {
      handleSearchInternal(inputValue.trim())
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [inputValue, autoComplete, isDropdownOpen])

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchResults])

  // Auto-scroll to keep focused item visible
  useEffect(() => {
    if (focusedIndex >= 0 && resultsContainerRef.current) {
      const container = resultsContainerRef.current
      const focusedElement = container.children[focusedIndex] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex])

  const handleSearchInternal = async (query: string) => {
    if (!query) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(`/api/yf-search?q=${encodeURIComponent(query)}&max=10`)
      const contentType = response.headers.get('content-type') || ''

      if (!contentType.includes('application/json')) {
        const text = await response.text()
        if (text.includes('Too Many Requests')) {
          throw new Error('Rate limited. Please wait.')
        }
        throw new Error('Search unavailable')
      }

      const data = await response.json()

      let results: SearchResult[] = []
      if (data.results) {
        results = data.results.map((r: any) => ({
          ...r,
          name: r.longname || r.name || r.shortname || '',
        }))
      } else if (data.quotes) {
        results = data.quotes
          .filter((q: any) => q.symbol && q.quoteType !== 'NONE')
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.longname || q.shortname || '',
            exchange: q.exchange || '',
            type: q.quoteType || '',
          }))
      }

      setSearchResults(results)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    onChange(result.symbol)
    setInputValue(result.symbol)
    setIsDropdownOpen(false)
    setSearchResults([])
    setFocusedIndex(-1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase()
    setInputValue(newValue)
    onChange(newValue)
    if (autoComplete && newValue.length >= 1) {
      setIsDropdownOpen(true)
    }
  }

  const handleFocus = () => {
    if (autoComplete) {
      setIsDropdownOpen(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (autoComplete && e.key !== 'Tab') {
        setIsDropdownOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsDropdownOpen(false)
      setSearchResults([])
      setFocusedIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (searchResults.length > 0) {
        setFocusedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (searchResults.length > 0) {
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && searchResults[focusedIndex]) {
        handleSelectResult(searchResults[focusedIndex])
      } else {
        // Just close dropdown, keep the typed value
        setIsDropdownOpen(false)
      }
    }
  }

  // For non-autoComplete mode, keep the old search icon behavior
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchButtonClick = () => {
    setIsSearchModalOpen(!isSearchModalOpen)
    setSearchQuery(value || '')
  }

  const handleModalSearch = () => {
    if (!searchQuery.trim()) return
    setSearchResults([])
    handleSearchInternal(searchQuery.trim())
  }

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsSearchModalOpen(false)
      setSearchQuery('')
      setSearchResults([])
      setFocusedIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (searchResults.length > 0) {
        setFocusedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (searchResults.length > 0) {
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && searchResults[focusedIndex]) {
        onChange(searchResults[focusedIndex].symbol)
        setIsSearchModalOpen(false)
        setSearchQuery('')
        setSearchResults([])
        setFocusedIndex(-1)
      } else {
        handleModalSearch()
      }
    }
  }

  const handleModalSelectResult = (result: SearchResult) => {
    onChange(result.symbol)
    setIsSearchModalOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setFocusedIndex(-1)
  }

  // Inline autocomplete mode
  if (autoComplete) {
    return (
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={`${className.includes('w-') ? '' : 'w-32'} px-2 py-1.5 pr-8 border border-slate-300 rounded-lg text-base text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
              isDropdownOpen ? 'w-64' : ''
            } ${className}`}
          />
          {isSearching && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
          {!isSearching && inputValue && isDropdownOpen && (
            <button
              type="button"
              onClick={() => {
                setInputValue('')
                onChange('')
                setSearchResults([])
                inputRef.current?.focus()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isDropdownOpen && (inputValue.length >= 1 || searchResults.length > 0) && (
          <div className="absolute z-50 mt-1 w-[420px] bg-white border border-slate-200 rounded-lg shadow-lg">
            <div className="max-h-96 overflow-y-auto">
              {searchError && (
                <div className="p-3 text-base text-red-600 bg-red-50">
                  {searchError}
                </div>
              )}

              {searchResults.length > 0 ? (
                <div ref={resultsContainerRef}>
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${result.symbol}-${idx}`}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full px-3 py-2.5 text-left border-b border-slate-100 last:border-0 ${
                        idx === focusedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base font-medium text-black truncate">
                        {result.name || result.symbol}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-base font-semibold text-teal-600">
                          {result.symbol}
                        </span>
                        <span className="text-base text-slate-500">
                          {result.type}
                        </span>
                        <span className="text-base text-slate-400">
                          {result.exchange}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : inputValue.length < 3 && !isSearching ? (
                <div className="p-3 text-base text-slate-500 text-center">
                  Type {3 - inputValue.length} more character{3 - inputValue.length > 1 ? 's' : ''} to search...
                </div>
              ) : isSearching ? (
                <div className="p-4 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                  <span className="text-base">Searching...</span>
                </div>
              ) : inputValue.length >= 3 && !searchError ? (
                <div className="p-3 text-base text-slate-500 text-center">
                  No results found
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Original mode with search icon button
  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className.includes('w-') ? '' : 'w-24'} px-2 py-1.5 border border-slate-300 rounded-lg text-base text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${className}`}
        />
        <button
          type="button"
          onClick={handleSearchButtonClick}
          disabled={disabled}
          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
          title="Search symbol"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Search modal dropdown */}
      {isSearchModalOpen && (
        <div className="absolute z-50 mt-1 w-[420px] bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleModalKeyDown}
                placeholder="Search by name or symbol..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-base text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleModalSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {searchError && (
              <div className="p-3 text-base text-red-600 bg-red-50">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 ? (
              <div ref={resultsContainerRef}>
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.symbol}-${idx}`}
                    type="button"
                    onClick={() => handleModalSelectResult(result)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`w-full px-3 py-2.5 text-left border-b border-slate-100 last:border-0 ${
                      idx === focusedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base font-medium text-black truncate">
                      {result.name || result.symbol}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-base font-semibold text-teal-600">
                        {result.symbol}
                      </span>
                      <span className="text-base text-slate-500">
                        {result.type}
                      </span>
                      <span className="text-base text-slate-400">
                        {result.exchange}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : !isSearching && searchQuery && !searchError ? (
              <div className="p-3 text-base text-slate-500 text-center">
                Press Search or Enter to find symbols
              </div>
            ) : null}

            {isSearching && (
              <div className="p-4 text-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                <span className="text-base">Searching...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
