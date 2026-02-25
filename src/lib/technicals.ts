// Technical indicator calculations for stock price data
// Adapted from Global Macros - validated formulas using standard textbook methods

export function computeEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const k = 2 / (period + 1)
  let ema: number | null = null

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      // First EMA = SMA of first 'period' values
      let sum = 0
      for (let j = 0; j < period; j++) sum += values[j]
      ema = sum / period
      result.push(ema)
    } else {
      ema = values[i] * k + ema! * (1 - k)
      result.push(ema)
    }
  }
  return result
}

export interface MACDPoint {
  macd: number | null
  signal: number | null
  histogram: number | null
}

export function computeMACD(closes: number[]): MACDPoint[] {
  const ema12 = computeEMA(closes, 12)
  const ema26 = computeEMA(closes, 26)

  // MACD line = EMA12 - EMA26
  const macdLine: (number | null)[] = ema12.map((v, i) =>
    v !== null && ema26[i] !== null ? v - ema26[i]! : null
  )

  // Signal line = EMA(9) of MACD line (skip nulls for computation)
  const validMacd: number[] = []
  const validIndices: number[] = []
  macdLine.forEach((v, i) => {
    if (v !== null) {
      validMacd.push(v)
      validIndices.push(i)
    }
  })

  const signalEma = computeEMA(validMacd, 9)

  // Map back to full array
  const result: MACDPoint[] = closes.map(() => ({ macd: null, signal: null, histogram: null }))
  for (let j = 0; j < validIndices.length; j++) {
    const idx = validIndices[j]
    result[idx].macd = validMacd[j]
    result[idx].signal = signalEma[j]
    result[idx].histogram =
      validMacd[j] !== null && signalEma[j] !== null
        ? validMacd[j] - signalEma[j]!
        : null
  }

  return result
}

export function computeRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null] // first element has no change

  if (closes.length < period + 1) {
    return closes.map(() => null)
  }

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  // First average gain/loss = simple average of first 'period' changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  // Fill nulls for the warmup period
  for (let i = 0; i < period - 1; i++) result.push(null)

  // First RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs))

  // Subsequent values use smoothed averages
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    result.push(rsi)
  }

  return result
}

export interface BollingerPoint {
  sma: number | null
  upper: number | null
  lower: number | null
}

export function computeBollinger(closes: number[], period = 20, stdDev = 2): BollingerPoint[] {
  const result: BollingerPoint[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push({ sma: null, upper: null, lower: null })
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += closes[j]
      const sma = sum / period
      let sqSum = 0
      for (let j = i - period + 1; j <= i; j++) sqSum += (closes[j] - sma) ** 2
      const sd = Math.sqrt(sqSum / period)
      result.push({ sma, upper: sma + stdDev * sd, lower: sma - stdDev * sd })
    }
  }
  return result
}

export function computeROC(closes: number[], period = 12): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null)
    } else {
      result.push(((closes[i] - closes[i - period]) / closes[i - period]) * 100)
    }
  }
  return result
}

export function computeSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += values[j]
      result.push(sum / period)
    }
  }
  return result
}

export function computeMACDCustom(closes: number[], fast: number, slow: number, sig: number): MACDPoint[] {
  const emaFast = computeEMA(closes, fast)
  const emaSlow = computeEMA(closes, slow)

  const macdLine: (number | null)[] = emaFast.map((v, i) =>
    v !== null && emaSlow[i] !== null ? v - emaSlow[i]! : null
  )

  const validMacd: number[] = []
  const validIndices: number[] = []
  macdLine.forEach((v, i) => {
    if (v !== null) {
      validMacd.push(v)
      validIndices.push(i)
    }
  })

  const signalEma = computeEMA(validMacd, sig)

  const result: MACDPoint[] = closes.map(() => ({ macd: null, signal: null, histogram: null }))
  for (let j = 0; j < validIndices.length; j++) {
    const idx = validIndices[j]
    result[idx].macd = validMacd[j]
    result[idx].signal = signalEma[j]
    result[idx].histogram =
      validMacd[j] !== null && signalEma[j] !== null
        ? validMacd[j] - signalEma[j]!
        : null
  }
  return result
}

export function computeTRIX(closes: number[], period = 15): (number | null)[] {
  // TRIX = 1-period ROC of triple-smoothed EMA
  // Step 1: EMA of closes
  const ema1 = computeEMA(closes, period)
  // Step 2: EMA of EMA (skip nulls)
  const valid1: number[] = []
  const idx1: number[] = []
  ema1.forEach((v, i) => { if (v !== null) { valid1.push(v); idx1.push(i) } })
  const ema2Raw = computeEMA(valid1, period)
  // Step 3: EMA of EMA of EMA (skip nulls)
  const valid2: number[] = []
  const idx2: number[] = []
  ema2Raw.forEach((v, i) => { if (v !== null) { valid2.push(v); idx2.push(i) } })
  const ema3Raw = computeEMA(valid2, period)

  // Map triple EMA back to original indices
  const tripleEma: (number | null)[] = new Array(closes.length).fill(null)
  for (let j = 0; j < idx2.length; j++) {
    const origIdx = idx1[idx2[j]]
    if (ema3Raw[j] !== null) tripleEma[origIdx] = ema3Raw[j]
  }

  // TRIX = 1-period percentage change of triple EMA
  const result: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i === 0 || tripleEma[i] === null || tripleEma[i - 1] === null || tripleEma[i - 1] === 0) {
      result.push(null)
    } else {
      result.push(((tripleEma[i]! - tripleEma[i - 1]!) / tripleEma[i - 1]!) * 100)
    }
  }
  return result
}

export function computeHistoricalVolatility(closes: number[], period = 20): (number | null)[] {
  const result: (number | null)[] = [null] // first has no return
  if (closes.length < 2) return closes.map(() => null)

  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }

  for (let i = 0; i < returns.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += returns[j]
      const mean = sum / period
      let sqSum = 0
      for (let j = i - period + 1; j <= i; j++) sqSum += (returns[j] - mean) ** 2
      const stdDev = Math.sqrt(sqSum / period)
      result.push(stdDev * Math.sqrt(252) * 100) // annualized, as percentage
    }
  }
  return result
}
