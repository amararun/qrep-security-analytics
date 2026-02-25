# QREP Security Analytics

Portfolio analytics dashboard — compare up to 6 securities with 90+ metrics, interactive charts, and 10 technical indicators.

Live app: [qrep.tigzig.com](https://qrep.tigzig.com)

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI | Radix UI, Recharts, Lucide Icons |
| Export | html2canvas, jsPDF |
| API Proxy | Vercel Serverless Functions (Node.js) |
| Rate Limiting | Upstash Redis (@upstash/ratelimit) |
| Backend | Python FastAPI, QuantStats 0.0.81, yfinance |
| Hosting | Vercel (frontend), Coolify/Hetzner (backend) |
| DNS & CDN | Cloudflare |

## Key Folders

| Path | Description |
|------|-------------|
| `src/` | React frontend source |
| `api/` | Vercel serverless proxy functions |
| `public/` | Static assets |
| `docs/` | About page, security assessment |

## Proxy Endpoints (Vercel Serverless)

| File | What It Does |
|------|-------------|
| `api/qpulse-proxy.js` | Proxies all analytics requests to FastAPI backend (compare, analyze, portfolio, export, search) |
| `api/yf-proxy.js` | Proxies Yahoo Finance API calls for price chart data |
| `api/yf-search.js` | Proxies Yahoo Finance symbol search |

## 10-Point Frontend Security Hardening

| # | Layer | What It Does |
|---|-------|-------------|
| 1 | SSRF protection | Report proxy whitelisted to backend URL only — blocks requests to internal/cloud metadata endpoints |
| 2 | CORS origin allowlist | All proxies restricted to `qrep.tigzig.com` and Vercel preview domains — no wildcard `*` |
| 3 | Rate limiting (Upstash Redis) | All Vercel serverless endpoints rate-limited: 30 req/min for compare/analyze, 60 req/min for search/yf-proxy |
| 4 | Security headers | Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via vercel.json |
| 5 | Generic error messages | All proxy catch blocks return generic errors — no stack traces, file paths, or library names leaked |
| 6 | Input validation (search) | Search query length capped at 50 characters |
| 7 | Input validation (symbols) | Symbol format validated with regex before proxying to Yahoo Finance or backend |
| 8 | API key isolation | Backend API key stored as Vercel env var, injected server-side by proxy — never exposed to browser |
| 9 | DOMPurify sanitization | HTML content sanitized before rendering with `dangerouslySetInnerHTML` |
| 10 | Session-scoped storage | Analysis results stored in sessionStorage (tab-scoped, cleared on close) — not localStorage |

This is a public demo app — no user auth (login/signup) since it's API-key protected and open for anyone to try. For private apps requiring user authentication, OAuth, brute-force protection, and additional hardening layers, refer to the full [Security Checklist for Web Apps](https://www.tigzig.com/security) (72 items covering React, FastAPI, Postgres, DuckDB, Cloudflare, and more).

## Related

| Component | Repository |
|-----------|-----------|
| Frontend + Vercel Proxies | [qrep-security-analytics](https://github.com/amararun/qrep-security-analytics) (shared public repo) |
| Backend (FastAPI + QuantStats) | [qrep-backend-fastapi](https://github.com/amararun/qrep-backend-fastapi) (shared public repo) |

## License

Apache License 2.0. See [LICENSE](LICENSE).

Built on [QuantStats](https://github.com/ranaroussi/quantstats) (Apache 2.0) by Ran Aroussi and [yfinance](https://github.com/ranaroussi/yfinance) (Apache 2.0) by Ran Aroussi.

## Author

Built by [Amar Harolikar](https://www.linkedin.com/in/amarharolikar/)

Explore 30+ open source AI tools for analytics, databases & automation at [tigzig.com](https://tigzig.com)

