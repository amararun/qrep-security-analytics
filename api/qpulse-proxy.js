/**
 * Vercel Serverless API - QPulse Backend Proxy
 *
 * Proxies requests to the QPulse backend (qpulse-api.tigzig.com) with CORS headers.
 * Uses the new backend with original QuantStats library (not quantstats-lumi).
 *
 * Endpoints:
 * POST /api/qpulse-proxy?action=analyze  - Generate tearsheet
 * POST /api/qpulse-proxy?action=compare  - Multi-security comparison
 * POST /api/qpulse-proxy?action=portfolio - Portfolio comparison (weighted holdings)
 * POST /api/qpulse-proxy?action=export   - Export comparison as HTML/PDF
 * GET /api/qpulse-proxy?action=report&url=<report_url>  - Fetch generated HTML report
 * GET /api/qpulse-proxy?action=search&q=<query>  - Search Yahoo Finance for symbols
 */

const BACKEND_URL = 'https://qpulse-api.tigzig.com';
const API_KEY = process.env.QPULSE_API_KEY || '';
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://qpulse.tigzig.com',
  'https://qrep.tigzig.com',
  'https://qpulse-app-amar-hs-projects.vercel.app',
];

// Rate limiting config
const RATE_LIMITS = {
  analyze: { max: 30, window: 60 },   // 30 req/min
  compare: { max: 30, window: 60 },
  portfolio: { max: 30, window: 60 },
  export: { max: 30, window: 60 },
  report: { max: 60, window: 60 },    // 60 req/min
  search: { max: 60, window: 60 },
};

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow Vercel preview deployments
  if (origin && origin.endsWith('.vercel.app')) return origin;
  return ALLOWED_ORIGINS[0];
}

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function redisCmd(args) {
  if (!KV_URL || !KV_TOKEN) return null;
  const resp = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await resp.json();
  return data.result;
}

async function checkRateLimit(req, action) {
  if (!KV_URL || !KV_TOKEN) return true; // fail open
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const limit = RATE_LIMITS[action] || { max: 60, window: 60 };
    const key = `qrep:${action}:${ip}`;
    const count = await redisCmd(['INCR', key]);
    if (count === 1) await redisCmd(['EXPIRE', key, limit.window]);
    return count <= limit.max;
  } catch {
    return true; // fail open if Redis is down
  }
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    return res.status(200).end();
  }

  setCorsHeaders(req, res);

  const { action, url } = req.query;

  // Rate limit check
  if (action && !(await checkRateLimit(req, action))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    if (action === 'analyze') {
      // POST: Generate tearsheet via backend
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const response = await fetch(`${BACKEND_URL}/qpulse/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else if (action === 'compare') {
      // POST: Multi-security comparison
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const response = await fetch(`${BACKEND_URL}/qpulse/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else if (action === 'portfolio') {
      // POST: Portfolio comparison (weighted holdings)
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const response = await fetch(`${BACKEND_URL}/qpulse/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else if (action === 'export') {
      // POST: Export comparison as HTML or PDF
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const response = await fetch(`${BACKEND_URL}/qpulse/compare/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        return res.status(response.status).json(errorData);
      }

      // Get content type from response
      const contentType = response.headers.get('content-type') || 'text/html';

      if (contentType.includes('application/pdf')) {
        // Return PDF as binary
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="comparison_report.pdf"');
        return res.status(200).send(Buffer.from(buffer));
      } else {
        // Return HTML
        const html = await response.text();
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }

    } else if (action === 'report') {
      // GET: Fetch generated HTML report
      if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      // F1: SSRF fix - only allow URLs from our backend
      const reportUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
      if (!reportUrl.startsWith(BACKEND_URL)) {
        return res.status(400).json({ error: 'Invalid report URL' });
      }

      const response = await fetch(reportUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch report' });
      }

      const html = await response.text();
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);

    } else if (action === 'search') {
      // GET: Search Yahoo Finance for symbols (direct call, no backend)
      const { q, max } = req.query;

      if (!q || q.length < 1 || q.length > 50) {
        return res.status(400).json({ error: 'Invalid search query' });
      }

      const maxResults = Math.min(parseInt(max) || 10, 20);

      // Call Yahoo Finance search API directly
      const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${maxResults}&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;

      const response = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Search request failed' });
      }

      const data = await response.json();

      // Transform and filter results
      const results = (data.quotes || [])
        .filter(quote => quote.symbol && quote.quoteType !== 'NONE')
        .map(quote => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || '',
          longname: quote.longname || '',
          shortname: quote.shortname || '',
          exchange: quote.exchange || '',
          type: quote.quoteType || '',
          score: quote.score || 0,
        }));

      return res.status(200).json({
        query: q,
        count: results.length,
        results,
      });

    } else {
      return res.status(400).json({
        error: 'Missing or invalid action. Use: analyze, compare, portfolio, export, report, or search'
      });
    }

  } catch (error) {
    console.error('QPulse proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
