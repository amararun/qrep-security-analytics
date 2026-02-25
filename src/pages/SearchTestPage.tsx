import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowLeft, Loader2 } from 'lucide-react'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
  score: number
}


export default function SearchTestPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search term')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    const startTime = performance.now()

    const apiUrl = `/api/yf-search?q=${encodeURIComponent(query.trim())}&max=15`
    let debugLog = `REQUEST:\nURL: ${apiUrl}\nQuery: "${query.trim()}"\n\n`

    try {
      console.log('Fetching:', apiUrl)
      const response = await fetch(apiUrl)

      debugLog += `RESPONSE:\nStatus: ${response.status} ${response.statusText}\n`
      debugLog += `Content-Type: ${response.headers.get('content-type')}\n\n`

      // Get raw text first for debugging
      const rawText = await response.text()
      debugLog += `RAW RESPONSE (first 500 chars):\n${rawText.substring(0, 500)}\n`

      console.log('Response status:', response.status)
      console.log('Response text:', rawText.substring(0, 200))

      setDebugInfo(debugLog)

      // Check for text response (rate limit returns HTML/text)
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        if (rawText.includes('Too Many Requests') || rawText.includes('Rate limit')) {
          throw new Error('Rate limited by Yahoo Finance. Please wait a moment and try again.')
        }
        throw new Error(`Non-JSON response (${contentType}): ${rawText.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      // Parse the JSON from raw text
      const data = JSON.parse(rawText)
      const endTime = performance.now()

      // Handle both Yahoo's raw format (quotes) and our transformed format (results)
      let searchResults: SearchResult[] = []
      if (data.results) {
        // Our serverless function format
        searchResults = data.results
      } else if (data.quotes) {
        // Raw Yahoo Finance format (from Vite proxy)
        searchResults = data.quotes
          .filter((q: any) => q.symbol && q.quoteType !== 'NONE')
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || '',
            exchange: q.exchange || '',
            type: q.quoteType || '',
            score: q.score || 0,
          }))
      }

      debugLog += `\nPARSED DATA:\nCount: ${data.count || searchResults.length}\nResults: ${JSON.stringify(searchResults?.slice(0, 2), null, 2)}`
      setDebugInfo(debugLog)

      setResults(searchResults)
      setLastQuery(data.query || query)
      setSearchTime(Math.round(endTime - startTime))
    } catch (err) {
      console.error('Search error:', err)
      debugLog += `\nERROR: ${err instanceof Error ? err.message : String(err)}`
      setDebugInfo(debugLog)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-black">Symbol Search Test</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Box */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <label className="block text-base font-semibold text-black mb-2">
            Search for Symbol or Company Name
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Enter a ticker symbol (e.g., AAPL, TCS.NS) or company name (e.g., Kotak, Apple, Reliance)
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type symbol or company name..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Search
            </button>
          </div>

          {/* Quick test buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Quick tests:</span>
            {['Apple', 'Kotak', 'TCS', 'Reliance', 'MSFT', 'Toyota', 'HDFC'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term)
                  setTimeout(() => {
                    const searchBtn = document.querySelector('button[class*="bg-teal"]') as HTMLButtonElement
                    searchBtn?.click()
                  }, 100)
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-black">
                Results for "{lastQuery}" ({results.length} found)
              </h2>
              {searchTime && (
                <span className="text-sm text-gray-500">
                  {searchTime}ms
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-black">Symbol</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Exchange</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr
                      key={`${result.symbol}-${idx}`}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(result.symbol)
                        alert(`Copied: ${result.symbol}`)
                      }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-teal-600">{result.symbol}</span>
                      </td>
                      <td className="py-3 px-4 text-black">{result.name}</td>
                      <td className="py-3 px-4 text-gray-600">{result.exchange}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.type === 'EQUITY' ? 'bg-green-100 text-green-700' :
                          result.type === 'ETF' ? 'bg-blue-100 text-blue-700' :
                          result.type === 'MUTUALFUND' ? 'bg-purple-100 text-purple-700' :
                          result.type === 'INDEX' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Click any row to copy the symbol to clipboard
            </p>
          </div>
        )}

        {/* No results message */}
        {!loading && lastQuery && results.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700">No results found for "{lastQuery}"</p>
          </div>
        )}

        {/* Debug Panel */}
        {debugInfo && (
          <div className="mt-6 bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <h3 className="font-semibold text-green-400 mb-2">Debug Log</h3>
            <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-black mb-2">How it works</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>- This searches Yahoo Finance directly via our serverless function</li>
            <li>- Works with partial names: "Kotak" finds Kotak Mahindra Bank (.NS)</li>
            <li>- Works with symbols: "TCS" finds TCS.NS, TCSGX, etc.</li>
            <li>- Supports global markets: US, India (.NS, .BO), Japan (.T), UK (.L), etc.</li>
            <li>- Fuzzy matching enabled for typos</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
