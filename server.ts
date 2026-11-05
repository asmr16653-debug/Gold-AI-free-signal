import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI client securely server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// In-memory cache for live price and historical candles
let cachedLivePrice: {
  price: number;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  isDemo: boolean;
  dataSource: string;
} | null = null;

let lastFetchTime = 0;

// Fetch live Gold price from public live sources (Binance PAXGUSDT is 1:1 backed physical gold)
async function fetchLiveGoldData(): Promise<typeof cachedLivePrice> {
  const now = Date.now();
  // Low latency cache: 400ms to allow real-time sub-second price ticks
  if (cachedLivePrice && now - lastFetchTime < 400) {
    return cachedLivePrice;
  }

  try {
    // Official Binance PAXGUSDT 24hr ticker & order book
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (tickerRes.ok) {
      const data = await tickerRes.json();
      const lastPrice = parseFloat(data.lastPrice);
      const bid = parseFloat(data.bidPrice) || lastPrice - 0.15;
      const ask = parseFloat(data.askPrice) || lastPrice + 0.15;
      const spread = parseFloat((ask - bid).toFixed(2));
      const change24h = parseFloat(data.priceChange);
      const change24hPercent = parseFloat(data.priceChangePercent);
      const high24h = parseFloat(data.highPrice);
      const low24h = parseFloat(data.lowPrice);
      const volume24h = parseFloat(data.volume);

      cachedLivePrice = {
        price: lastPrice,
        bid,
        ask,
        spread: spread >= 0 ? spread : 0.20,
        change24h,
        change24hPercent,
        high24h,
        low24h,
        volume24h,
        timestamp: now,
        isDemo: false,
        dataSource: 'Live Spot Gold (XAU/USD via Binance PAXG Feed)',
      };
      lastFetchTime = now;
      return cachedLivePrice;
    }
  } catch (err) {
    console.warn('Real market feed fetch failed:', (err as Error).message);
  }

  // Backup attempt: bookTicker for rapid order book top
  try {
    const bookRes = await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol=PAXGUSDT');
    if (bookRes.ok) {
      const bookData = await bookRes.json();
      const bid = parseFloat(bookData.bidPrice);
      const ask = parseFloat(bookData.askPrice);
      const price = parseFloat(((bid + ask) / 2).toFixed(2));
      const spread = parseFloat((ask - bid).toFixed(2));

      cachedLivePrice = {
        price,
        bid,
        ask,
        spread: spread >= 0 ? spread : 0.15,
        change24h: cachedLivePrice ? cachedLivePrice.change24h : 0,
        change24hPercent: cachedLivePrice ? cachedLivePrice.change24hPercent : 0,
        high24h: cachedLivePrice ? Math.max(cachedLivePrice.high24h, price) : price + 10,
        low24h: cachedLivePrice ? Math.min(cachedLivePrice.low24h, price) : price - 10,
        volume24h: cachedLivePrice ? cachedLivePrice.volume24h : 3800,
        timestamp: now,
        isDemo: false,
        dataSource: 'Live Spot Gold (XAU/USD via Binance BookTicker)',
      };
      lastFetchTime = now;
      return cachedLivePrice;
    }
  } catch (err) {
    console.warn('BookTicker fetch failed:', (err as Error).message);
  }

  // If network is completely offline:
  // Strictly maintain the last genuine verified price with zero artificial/fake oscillations
  if (cachedLivePrice) {
    return {
      ...cachedLivePrice,
      dataSource: 'Spot Gold (Market Feed Paused / Holding Last Valid Tick)',
      isDemo: true,
      timestamp: now,
    };
  }

  // Static baseline only if app has never connected once
  const staticPrice = 4114.20;
  cachedLivePrice = {
    price: staticPrice,
    bid: staticPrice - 0.20,
    ask: staticPrice + 0.20,
    spread: 0.40,
    change24h: 0,
    change24hPercent: 0,
    high24h: staticPrice + 12,
    low24h: staticPrice - 12,
    volume24h: 3500,
    timestamp: now,
    isDemo: true,
    dataSource: 'Demo Mode (Static Gold Benchmark - No Simulated Jitter)',
  };
  lastFetchTime = now;
  return cachedLivePrice;
}

// Fetch or generate realistic candles for 1m, 5m, 15m, 30m, 1h, 4h
async function fetchCandles(timeframe: string, limit: number = 120): Promise<{ candles: Candle[]; isDemo: boolean; dataSource: string }> {
  const tfMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
  };

  const binanceInterval = tfMap[timeframe] || '15m';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${binanceInterval}&limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const candles: Candle[] = data.map((item: any[]) => ({
          time: Math.floor(item[0] / 1000), // convert ms to seconds
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));

        return {
          candles,
          isDemo: false,
          dataSource: `Live Binance PAXGUSDT ${timeframe} Feed`,
        };
      }
    }
  } catch (err) {
    console.warn('Real klines fetch failed, falling back to Demo Mode:', (err as Error).message);
  }

  // Generate realistic SMC historical demo candles with liquidity sweeps, order blocks, and FVGs
  const tfMinutesMap: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
  };
  const stepMinutes = tfMinutesMap[timeframe] || 15;
  const stepSeconds = stepMinutes * 60;
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - limit * stepSeconds;

  const candles: Candle[] = [];
  let currentPrice = 2735.0;

  for (let i = 0; i < limit; i++) {
    const t = startSec + i * stepSeconds;
    // Institutional wave cycle
    const cycle = Math.sin(i / 14) * 6 + Math.sin(i / 5) * 3 + (i / limit) * 12;
    const volatility = stepMinutes === 1 ? 1.2 : stepMinutes === 5 ? 2.5 : stepMinutes === 15 ? 4.8 : 8.5;
    
    // Add periodic liquidity sweep wicks
    const isSweepBar = i % 18 === 0;
    const isOrderBlockBar = (i - 1) % 18 === 0;
    
    const open = currentPrice;
    let change = (Math.sin(i * 0.7) * 0.8 + (Math.random() - 0.48)) * volatility;
    if (isOrderBlockBar) {
      change = -volatility * 1.5; // sell before the run
    } else if (isSweepBar) {
      change = volatility * 2.2; // expansion
    }
    const close = parseFloat((open + change).toFixed(2));
    const highWick = isSweepBar ? volatility * 2.5 : Math.random() * volatility * 0.9;
    const lowWick = Math.random() * volatility * 0.9;
    const high = parseFloat((Math.max(open, close) + highWick).toFixed(2));
    const low = parseFloat((Math.min(open, close) - lowWick).toFixed(2));
    const volume = Math.floor(300 + Math.random() * 800 + (isSweepBar ? 1500 : 0));

    candles.push({
      time: t,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return {
    candles,
    isDemo: true,
    dataSource: `Demo Mode (Simulated ${timeframe} Gold Klines)`,
  };
}

// API Routes
app.get('/api/gold/live', async (req: Request, res: Response) => {
  try {
    const data = await fetchLiveGoldData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve live gold price', details: err.message });
  }
});

// Real-time Server-Sent Events (SSE) Stream for Instant Price Movement
app.get('/api/gold/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isActive = true;

  const pushTick = async () => {
    if (!isActive) return;
    try {
      const data = await fetchLiveGoldData();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // quiet catch on stream
    }
  };

  // Push immediate tick
  await pushTick();

  // Push updates every 800ms for authentic real-time ticks
  const interval = setInterval(pushTick, 800);

  req.on('close', () => {
    isActive = false;
    clearInterval(interval);
    res.end();
  });
});

app.get('/api/gold/candles', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || '15m';
    const limit = parseInt((req.query.limit as string) || '120', 10);
    const data = await fetchCandles(timeframe, Math.min(limit, 300));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve candles', details: err.message });
  }
});

// AI Institutional Gold Analysis Endpoint using Gemini 3.8 Flash
app.post('/api/gold/ai-analysis', async (req: Request, res: Response) => {
  try {
    const {
      currentPrice,
      timeframe,
      signalType,
      rsi,
      macd,
      ema20,
      ema50,
      ema200,
      atr,
      structures,
      entry,
      stopLoss,
      takeProfit,
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        analysis: {
          institutionalBias: signalType === 'BUY' ? 'Bullish Accumulation' : signalType === 'SELL' ? 'Bearish Distribution' : 'Neutral Equilibrium',
          keyTakeaway: `Price is trading around $${currentPrice?.toFixed(2) || '2,748.50'}. Order block retest in progress with structural liquidity target.`,
          smartMoneyContext: 'Large institutional liquidity pools identified around recent swing highs. Retail stop clusters are primed for mitigation.',
          macroCatalyst: 'Gold maintains safe-haven interest amid US Treasury yield dynamics and DXY (Dollar Index) structural consolidation.',
          riskWarning: 'Ensure risk is limited to 1% per setup with stop loss strictly honored. Auto-trade execution is disabled.',
          invalidationLevel: stopLoss || (currentPrice ? currentPrice - 10 : 2735.0),
        },
        mode: 'fallback_offline',
      });
    }

    const prompt = `You are the lead institutional precious metals strategist and Smart Money Concepts (SMC) quantitative trader at a top-tier London bullion desk.
Analyze the following live XAU/USD (Gold) market state and provide a disciplined, institutional Smart Money / ICT evaluation:

Current XAU/USD Price: $${currentPrice}
Active Timeframe: ${timeframe}
Algorithm Signal: ${signalType}
Entry Price: $${entry || currentPrice}
Stop Loss: $${stopLoss}
Take Profit: $${takeProfit}
Key Indicators:
- RSI (14): ${rsi?.toFixed(1) || 'N/A'}
- MACD Histogram: ${macd?.histogram?.toFixed(3) || 'N/A'}
- EMA 20: $${ema20?.toFixed(2) || 'N/A'}
- EMA 50: $${ema50?.toFixed(2) || 'N/A'}
- EMA 200: $${ema200?.toFixed(2) || 'N/A'}
- ATR (14): $${atr?.toFixed(2) || 'N/A'}
Detected SMC Elements: ${JSON.stringify(structures || [])}

Provide your response strictly in valid JSON matching this structure:
{
  "institutionalBias": "Bullish Accumulation" | "Bearish Distribution" | "Ranging Liquidity Hunt",
  "keyTakeaway": "1-2 sentence core institutional thesis",
  "smartMoneyContext": "Explanation of Liquidity sweeps (BSL/SSL), Order Blocks (OB), Fair Value Gaps (FVG), or Change of Character (CHoCH)",
  "macroCatalyst": "Macro environment notes on USD/DXY, Yields, or geopolitical safe-haven flow",
  "invalidationLevel": number (exact price where this setup is invalidated),
  "tradeExecutionAdvice": "Actionable risk management guidance (lot sizing, scaling at TP1)"
}

Do not include markdown backticks or commentary outside the JSON.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = aiResponse.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Clean possible stray backticks
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({
      analysis: parsed,
      mode: 'live_gemini',
    });
  } catch (err: any) {
    console.warn('Gemini AI Analysis transient error, serving resilient institutional synthesis:', err.message);
    const { currentPrice, signalType, stopLoss } = req.body;
    res.json({
      analysis: {
        institutionalBias: signalType === 'BUY' ? 'Bullish Accumulation' : signalType === 'SELL' ? 'Bearish Distribution' : 'Ranging Liquidity Hunt',
        keyTakeaway: `Spot gold is trading around $${currentPrice ? Number(currentPrice).toFixed(2) : '4,122.00'} with institutional liquidity concentrating around key order block mitigation zones.`,
        smartMoneyContext: 'High-volume liquidity resting above swing highs (BSL) and below key structural lows (SSL). Displacement confirms algorithmic Smart Money positioning.',
        macroCatalyst: 'Precious metals supported by DXY Dollar Index consolidation, safe-haven premium, and central bank physical bullion accumulation.',
        invalidationLevel: stopLoss || (currentPrice ? Number(currentPrice) - 6.5 : 4115.0),
        tradeExecutionAdvice: 'Risk strictly limited to 1% per setup. Take partial profits at TP1 and trail stop loss to entry.'
      },
      mode: 'fallback_resilient',
    });
  }
});

// App status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'Gold AI Pro',
    version: '2.4.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: Date.now(),
  });
});

// Setup Vite or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gold AI Pro] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
