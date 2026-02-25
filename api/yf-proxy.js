/**
 * Vercel Serverless API - Yahoo Finance Proxy
 *
 * Proxies requests to Yahoo Finance API with CORS headers.
 * Alternative to Cloudflare Worker at yf.tigzig.com
 *
 * Endpoints:
 * GET /api/yf-proxy?type=history&symbol=AAPL&period1=XXX&period2=XXX&interval=1d
 * GET /api/yf-proxy?type=chart&symbol=AAPL&range=5y&interval=1d
 * GET /api/yf-proxy?type=quote&symbol=AAPL,MSFT
 */

const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com';
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://qpulse.tigzig.com',
  'https://qrep.tigzig.com',
  'https://qpulse-app-amar-hs-projects.vercel.app',
];

// Symbol validation regex
const SYMBOL_REGEX = /^[A-Za-z0-9.\-=^,]{1,100}$/;

// Rate limiting: 60 req/min per IP
const RATE_LIMIT = { max: 60, window: 60 };

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin && origin.endsWith('.vercel.app')) return origin;
  return ALLOWED_ORIGINS[0];
}

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

async function checkRateLimit(req) {
  if (!KV_URL || !KV_TOKEN) return true;
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const key = `qrep:yf:${ip}`;
    const count = await redisCmd(['INCR', key]);
    if (count === 1) await redisCmd(['EXPIRE', key, RATE_LIMIT.window]);
    return count <= RATE_LIMIT.max;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    return res.status(200).end();
  }

  setCorsHeaders(req, res);

  const { type, symbol, period1, period2, interval, range } = req.query;

  if (!type || !symbol) {
    return res.status(400).json({ error: 'Missing required parameters: type and symbol' });
  }

  // Validate symbol format
  if (!SYMBOL_REGEX.test(String(symbol))) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }

  // Rate limit check
  if (!(await checkRateLimit(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  let url;

  try {
    switch (type) {
      case 'history':
        // Historical data endpoint
        if (!period1 || !period2) {
          return res.status(400).json({ error: 'history type requires period1 and period2' });
        }
        url = `${YAHOO_FINANCE_BASE}/v8/finance/chart/${encodeURIComponent(String(symbol))}?period1=${period1}&period2=${period2}&interval=${interval || '1d'}&includeAdjustedClose=true`;
        break;

      case 'chart':
        // Chart data endpoint
        url = `${YAHOO_FINANCE_BASE}/v8/finance/chart/${encodeURIComponent(String(symbol))}?range=${range || '5y'}&interval=${interval || '1d'}&includeAdjustedClose=true`;
        break;

      case 'quote':
        // Real-time quote endpoint
        url = `${YAHOO_FINANCE_BASE}/v7/finance/quote?symbols=${encodeURIComponent(String(symbol))}`;
        break;

      default:
        return res.status(400).json({ error: 'Unknown type. Use: history, chart, or quote' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yahoo Finance request failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Yahoo Finance proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
