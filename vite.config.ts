import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Cloudflare Worker URL - used for local dev proxy (YF and PyPI)
const CF_WORKER_URL = 'https://yf.tigzig.com'

// QPulse Backend URL - for qpulse-proxy (new backend with original quantstats)
const QPULSE_BACKEND_URL = 'https://qpulse-api.tigzig.com'
const QPULSE_API_KEY = process.env.QPULSE_API_KEY || ''

// Yahoo Finance Search URL - for symbol search
const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com'

export default defineConfig(({ command }) => {
  const baseConfig = {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3300,
      strictPort: true,
      fs: {
        allow: ['..']
      },
      watch: {
        // Ignore api folder - it's for Vercel serverless functions
        ignored: ['**/api/**']
      },
      // Proxy /api/* to Cloudflare Worker for local dev
      // This allows using VITE_PROXY_MODE=vercel locally
      proxy: {
        '/api/yf-proxy': {
          target: CF_WORKER_URL,
          changeOrigin: true,
          rewrite: (path) => {
            // /api/yf-proxy?type=history&symbol=AAPL&... -> /history?symbol=AAPL&...
            const url = new URL(path, 'http://localhost')
            const type = url.searchParams.get('type')
            url.searchParams.delete('type')
            return `/${type}${url.search}`
          }
        },
        '/api/pypi-proxy': {
          target: CF_WORKER_URL,
          changeOrigin: true,
          rewrite: (path) => {
            // /api/pypi-proxy?package=quantstats&version=0.0.81 -> /pypi?package=quantstats&version=0.0.81
            const url = new URL(path, 'http://localhost')
            return `/pypi${url.search}`
          }
        },
        // Yahoo Finance search proxy - direct call for symbol lookup
        // GET /api/yf-search?q=apple&max=10 -> Yahoo Finance search API
        '/api/yf-search': {
          target: YAHOO_SEARCH_URL,
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path, 'http://localhost')
            const q = url.searchParams.get('q') || ''
            const max = url.searchParams.get('max') || '10'
            return `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${max}&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`
          }
        },
        // QPulse backend proxy for local development
        // analyze action: POST /api/qpulse-proxy?action=analyze -> POST /qpulse/analyze
        // compare action: POST /api/qpulse-proxy?action=compare -> POST /qpulse/compare
        // portfolio action: POST /api/qpulse-proxy?action=portfolio -> POST /qpulse/portfolio
        // report action: GET /api/qpulse-proxy?action=report&url=/reports/xxx -> GET /reports/xxx
        '/api/qpulse-proxy': {
          target: QPULSE_BACKEND_URL,
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path, 'http://localhost')
            const action = url.searchParams.get('action')
            if (action === 'analyze') {
              return '/qpulse/analyze'
            } else if (action === 'compare') {
              return '/qpulse/compare'
            } else if (action === 'portfolio') {
              return '/qpulse/portfolio'
            } else if (action === 'report') {
              const reportUrl = url.searchParams.get('url')
              // Decode the URL parameter since it's encoded
              return reportUrl ? decodeURIComponent(reportUrl) : '/reports/'
            }
            return path
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Add API key header for authentication
              proxyReq.setHeader('X-API-Key', QPULSE_API_KEY)
            })
          }
        }
      }
    },
    // Exclude api folder from Vite processing
    optimizeDeps: {
      exclude: ['api']
    }
  } as const

  if (command === 'build') {
    return {
      ...baseConfig,
      build: {
        minify: 'esbuild',
      },
      esbuild: {
        drop: ['console', 'debugger'],
        pure: ['console.log', 'console.info', 'console.debug', 'console.trace']
      }
    }
  }

  return baseConfig
})
