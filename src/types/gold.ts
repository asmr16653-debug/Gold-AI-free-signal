export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveGoldPrice {
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
}

export interface TechnicalIndicators {
  ema20: number[];
  ema50: number[];
  ema200: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  atr: number[];
}

export interface OrderBlock {
  type: 'BULLISH_OB' | 'BEARISH_OB';
  high: number;
  low: number;
  candleIndex: number;
  mitigated: boolean;
  label: string;
}

export interface FairValueGap {
  type: 'BULLISH_FVG' | 'BEARISH_FVG';
  top: number;
  bottom: number;
  candleIndex: number;
  mitigated: boolean;
  label: string;
}

export interface LiquidityLevel {
  type: 'BSL' | 'SSL'; // Buy-Side Liquidity (above highs), Sell-Side Liquidity (below lows)
  price: number;
  candleIndex: number;
  swept: boolean;
  sweepCandleIndex?: number;
  label: string;
}

export interface StructureBreak {
  type: 'BOS' | 'CHoCH';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  candleIndex: number;
  label: string;
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityLevels: LiquidityLevel[];
  structureBreaks: StructureBreak[];
  currentTrend: 'BULLISH' | 'BEARISH' | 'RANGING';
}

export type SignalType = 'BUY' | 'SELL' | 'NO_TRADE';

export interface ConfluenceRule {
  id: string;
  name: string;
  passed: boolean;
  weight: number;
  description: string;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  type: SignalType;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: string;
  riskDistance: number;
  confluenceScore: number;
  rules: ConfluenceRule[];
  reasons: string[];
  timestamp: number;
  status: 'ACTIVE' | 'HIT_TP1' | 'HIT_TP2' | 'HIT_SL' | 'EXPIRED' | 'CANCELLED';
  currentPriceAtGen: number;
  isDemo: boolean;
}

export interface AIInstitutionalBriefing {
  institutionalBias: string;
  keyTakeaway: string;
  smartMoneyContext: string;
  macroCatalyst: string;
  invalidationLevel: number;
  tradeExecutionAdvice: string;
}

export interface PushAlert {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  type: 'BUY' | 'SELL' | 'ALERT' | 'INFO';
  read: boolean;
}
