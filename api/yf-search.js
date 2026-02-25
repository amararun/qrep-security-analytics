/**
 * Vercel Serverless API - Yahoo Finance Symbol Search
 *
 * Direct search to Yahoo Finance for symbol lookup.
 * No backend involved - calls Yahoo Finance directly.
 *
 * Usage:
 * GET /api/yf-search?q=kotak&max=10
 */

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://qpulse.tigzig.com',
  'https://qrep.tigzig.com',
  'https://qpulse-app-amar-hs-projects.vercel.app',
];

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
    const key = `qrep:search:${ip}`;
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

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, max } = req.query;

  if (!q || q.length < 1 || q.length > 50) {
    return res.status(400).json({ error: 'Invalid search query' });
  }

  // Rate limit check
  if (!(await checkRateLimit(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const maxResults = Math.min(parseInt(max) || 10, 20);

  try {
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

  } catch (error) {
    console.error('Yahoo Finance search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
