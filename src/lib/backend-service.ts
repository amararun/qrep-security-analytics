/**
 * Backend Service - QREP API
 *
 * Calls the QREP backend API via Vercel serverless proxy for generating tearsheets.
 * Backend handles all data fetching via qs.utils.download_returns().
 *
 * All requests go through /api/qpulse-proxy to avoid CORS issues.
 */

// Progress callback type
export type ProgressCallback = (message: string, percent: number) => void;

// Price data from backend
export interface PriceData {
  dates: string[];
  symbols: Record<string, (number | null)[]>;
}

// Response type from backend
interface QPulseAnalysisResponse {
  success: boolean;
  html_url: string;
  message: string;
  price_data?: PriceData;
}

// Return type for tearsheet generation
export interface TearsheetResult {
  htmlContent: string;
  priceData?: PriceData;
}

/**
 * Generate tearsheet using backend API (via Vercel serverless proxy)
 * Backend uses native quantstats with qs.utils.download_returns()
 */
export async function generateTearsheetBackend(
  symbol: string,
  benchmark: string,
  startDate: string,
  endDate: string,
  riskFreeRate: number = 0.0,
  onProgress?: ProgressCallback
): Promise<TearsheetResult> {
  onProgress?.('Sending request to QREP backend...', 10);

  // Call the backend API via Vercel serverless proxy
  const response = await fetch('/api/qpulse-proxy?action=analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      symbol,
      benchmark,
      start_date: startDate,
      end_date: endDate,
      risk_free_rate: riskFreeRate / 100,  // Convert percentage to decimal
    }),
  });

  onProgress?.('Waiting for backend to generate report...', 40);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Backend error: ${response.statusText}`);
  }

  const data: QPulseAnalysisResponse = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Backend failed to generate report');
  }

  onProgress?.('Fetching generated HTML report...', 70);

  // Fetch the HTML file via proxy
  const reportUrl = encodeURIComponent(data.html_url);
  const htmlResponse = await fetch(`/api/qpulse-proxy?action=report&url=${reportUrl}`);

  if (!htmlResponse.ok) {
    throw new Error(`Failed to fetch report: ${htmlResponse.statusText}`);
  }

  onProgress?.('Report ready!', 100);

  const htmlContent = await htmlResponse.text();
  return { htmlContent, priceData: data.price_data };
}
