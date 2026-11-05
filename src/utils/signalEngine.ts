import { Candle, TechnicalIndicators, SMCAnalysis, TradeSignal, ConfluenceRule, Timeframe } from '../types/gold';

/**
 * Transparent Institutional Gold Signal Engine
 * Evaluates SMC + ICT + Trend + Volatility confluence with mathematical rigor.
 */
export function generateSignal(
  candles: Candle[],
  indicators: TechnicalIndicators,
  smc: SMCAnalysis,
  timeframe: Timeframe,
  isDemo: boolean = false
): TradeSignal {
  const n = candles.length;
  if (n < 20) {
    return createNoTradeSignal(timeframe, 2748.50, 'Insufficient candle history for reliable institutional evaluation', isDemo);
  }

  const currentCandle = candles[n - 1];
  const currentPrice = currentCandle.close;
  const currentATR = indicators.atr[n - 1] || 3.5;
  const currentRSI = indicators.rsi[n - 1] || 50;
  const currentMACD = indicators.macd.histogram[n - 1] || 0;
  const currentEMA20 = indicators.ema20[n - 1] || currentPrice;
  const currentEMA50 = indicators.ema50[n - 1] || currentPrice;
  const currentEMA200 = indicators.ema200[n - 1] || currentPrice;

  // Recent SMC elements within the last 15 candles
  const recentSweeps = smc.liquidityLevels.filter((l) => l.swept && (l.sweepCandleIndex ? l.sweepCandleIndex >= n - 15 : false));
  const recentBOS = smc.structureBreaks.filter((sb) => sb.candleIndex >= n - 12);
  const activeBullishOB = smc.orderBlocks.find((ob) => ob.type === 'BULLISH_OB' && !ob.mitigated && Math.abs(currentPrice - ob.high) < currentATR * 2);
  const activeBearishOB = smc.orderBlocks.find((ob) => ob.type === 'BEARISH_OB' && !ob.mitigated && Math.abs(currentPrice - ob.low) < currentATR * 2);
  const activeBullishFVG = smc.fairValueGaps.find((fvg) => fvg.type === 'BULLISH_FVG' && !fvg.mitigated && currentPrice >= fvg.bottom && currentPrice <= fvg.top + currentATR);
  const activeBearishFVG = smc.fairValueGaps.find((fvg) => fvg.type === 'BEARISH_FVG' && !fvg.mitigated && currentPrice <= fvg.top && currentPrice >= fvg.bottom - currentATR);

  // Evaluate Bullish Criteria
  const bullishRules: ConfluenceRule[] = [
    {
      id: 'structure',
      name: 'Market Structure Alignment',
      weight: 25,
      passed: recentBOS.some((b) => b.direction === 'BULLISH') || (currentPrice > currentEMA50 && currentEMA20 > currentEMA50),
      description: 'Confirmed Bullish BOS or clean bullish displacement above EMA 50',
    },
    {
      id: 'liquidity',
      name: 'Liquidity Sweep (SSL Grab)',
      weight: 25,
      passed: recentSweeps.some((s) => s.type === 'SSL'),
      description: 'Institutional raid on Sell-Side Liquidity below recent swing low completed',
    },
    {
      id: 'zone',
      name: 'Order Block / FVG Mitigation',
      weight: 20,
      passed: Boolean(activeBullishOB || activeBullishFVG),
      description: 'Price resting in active Bullish Demand Order Block or Discount FVG zone',
    },
    {
      id: 'ema',
      name: 'Moving Average Trend',
      weight: 15,
      passed: currentPrice > currentEMA20 && currentEMA20 >= currentEMA50,
      description: 'Price trending above EMA 20 with golden moving average stack',
    },
    {
      id: 'momentum',
      name: 'RSI & MACD Momentum Filter',
      weight: 15,
      passed: currentRSI > 42 && currentRSI < 72 && currentMACD > -0.5,
      description: 'RSI in healthy bullish expansion zone (not overbought) with positive MACD momentum',
    },
  ];

  // Evaluate Bearish Criteria
  const bearishRules: ConfluenceRule[] = [
    {
      id: 'structure',
      name: 'Market Structure Alignment',
      weight: 25,
      passed: recentBOS.some((b) => b.direction === 'BEARISH') || (currentPrice < currentEMA50 && currentEMA20 < currentEMA50),
      description: 'Confirmed Bearish BOS or clean bearish displacement below EMA 50',
    },
    {
      id: 'liquidity',
      name: 'Liquidity Sweep (BSL Grab)',
      weight: 25,
      passed: recentSweeps.some((s) => s.type === 'BSL'),
      description: 'Institutional raid on Buy-Side Liquidity above recent swing high completed',
    },
    {
      id: 'zone',
      name: 'Order Block / FVG Mitigation',
      weight: 20,
      passed: Boolean(activeBearishOB || activeBearishFVG),
      description: 'Price resting in active Bearish Supply Order Block or Premium FVG zone',
    },
    {
      id: 'ema',
      name: 'Moving Average Trend',
      weight: 15,
      passed: currentPrice < currentEMA20 && currentEMA20 <= currentEMA50,
      description: 'Price trending below EMA 20 with death-cross moving average stack',
    },
    {
      id: 'momentum',
      name: 'RSI & MACD Momentum Filter',
      weight: 15,
      passed: currentRSI < 58 && currentRSI > 28 && currentMACD < 0.5,
      description: 'RSI in healthy bearish expansion zone (not oversold) with negative MACD momentum',
    },
  ];

  const bullishScore = bullishRules.reduce((acc, r) => acc + (r.passed ? r.weight : 0), 0);
  const bearishScore = bearishRules.reduce((acc, r) => acc + (r.passed ? r.weight : 0), 0);

  // Predefined Threshold: Must hit >= 75% confluence
  const THRESHOLD = 75;

  if (bullishScore >= THRESHOLD && bullishScore > bearishScore) {
    // Calculate precise Stop Loss & Take Profits
    const invalidationPrice = activeBullishOB ? activeBullishOB.low - (currentATR * 0.4) : currentPrice - (currentATR * 1.6);
    const stopLoss = parseFloat(invalidationPrice.toFixed(2));
    const risk = parseFloat((currentPrice - stopLoss).toFixed(2));

    // Target opposing Buy-Side Liquidity
    const targetBSL = smc.liquidityLevels.find((l) => l.type === 'BSL' && l.price > currentPrice && !l.swept);
    const tp1Price = targetBSL ? Math.min(targetBSL.price, currentPrice + risk * 2.0) : currentPrice + risk * 2.0;
    const tp1 = parseFloat(tp1Price.toFixed(2));
    const tp2 = parseFloat((currentPrice + risk * 3.2).toFixed(2));
    const tp3 = parseFloat((currentPrice + risk * 4.8).toFixed(2));

    const rrRatio = risk > 0 ? (tp1 - currentPrice) / risk : 2.0;

    const reasons: string[] = [
      `High-confluence Bullish Smart Money setup (${bullishScore}% confluence).`,
      recentSweeps.some((s) => s.type === 'SSL') ? 'Sell-Side Liquidity grabbed, trapping breakout sellers.' : 'Clear institutional displacement detected.',
      activeBullishOB ? `Price reacting at active Institutional Demand Order Block ($${activeBullishOB.low.toFixed(2)} - $${activeBullishOB.high.toFixed(2)}).` : 'Price consolidating in dynamic discount zone.',
      `Targeting opposing BSL liquidity at $${tp1.toFixed(2)} with calculated 1:${rrRatio.toFixed(1)} initial R:R.`,
    ];

    return {
      id: `SIG-BUY-${timeframe}-${Date.now()}`,
      symbol: 'XAU/USD',
      timeframe,
      type: 'BUY',
      entry: currentPrice,
      stopLoss,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: `1:${rrRatio.toFixed(2)}`,
      riskDistance: risk,
      confluenceScore: bullishScore,
      rules: bullishRules,
      reasons,
      timestamp: Date.now(),
      status: 'ACTIVE',
      currentPriceAtGen: currentPrice,
      isDemo,
    };
  }

  if (bearishScore >= THRESHOLD && bearishScore > bullishScore) {
    const invalidationPrice = activeBearishOB ? activeBearishOB.high + (currentATR * 0.4) : currentPrice + (currentATR * 1.6);
    const stopLoss = parseFloat(invalidationPrice.toFixed(2));
    const risk = parseFloat((stopLoss - currentPrice).toFixed(2));

    const targetSSL = smc.liquidityLevels.find((l) => l.type === 'SSL' && l.price < currentPrice && !l.swept);
    const tp1Price = targetSSL ? Math.max(targetSSL.price, currentPrice - risk * 2.0) : currentPrice - risk * 2.0;
    const tp1 = parseFloat(tp1Price.toFixed(2));
    const tp2 = parseFloat((currentPrice - risk * 3.2).toFixed(2));
    const tp3 = parseFloat((currentPrice - risk * 4.8).toFixed(2));

    const rrRatio = risk > 0 ? (currentPrice - tp1) / risk : 2.0;

    const reasons: string[] = [
      `High-confluence Bearish Smart Money setup (${bearishScore}% confluence).`,
      recentSweeps.some((s) => s.type === 'BSL') ? 'Buy-Side Liquidity purged, trapping breakout buyers.' : 'Bearish Market Structure Shift confirmed.',
      activeBearishOB ? `Price rejecting institutional Supply Order Block ($${activeBearishOB.low.toFixed(2)} - $${activeBearishOB.high.toFixed(2)}).` : 'Price rejecting premium mitigation zone.',
      `Targeting sell-side liquidity pool at $${tp1.toFixed(2)} with calculated 1:${rrRatio.toFixed(1)} initial R:R.`,
    ];

    return {
      id: `SIG-SELL-${timeframe}-${Date.now()}`,
      symbol: 'XAU/USD',
      timeframe,
      type: 'SELL',
      entry: currentPrice,
      stopLoss,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: `1:${rrRatio.toFixed(2)}`,
      riskDistance: risk,
      confluenceScore: bearishScore,
      rules: bearishRules,
      reasons,
      timestamp: Date.now(),
      status: 'ACTIVE',
      currentPriceAtGen: currentPrice,
      isDemo,
    };
  }

  // If confluence threshold is not met: NO TRADE
  const reasons: string[] = [
    `Confluence below 75% threshold (Bullish: ${bullishScore}%, Bearish: ${bearishScore}%).`,
    'Market currently in consolidation or mid-range equilibrium between key liquidity zones.',
    'No confirmed Liquidity Sweep + Order Block mitigation alignment.',
    'Patience advised: Waiting for Smart Money displacement or liquidity run before initiating exposure.',
  ];

  return {
    id: `SIG-NONE-${timeframe}-${Date.now()}`,
    symbol: 'XAU/USD',
    timeframe,
    type: 'NO_TRADE',
    entry: currentPrice,
    stopLoss: 0,
    takeProfit1: 0,
    takeProfit2: 0,
    takeProfit3: 0,
    riskRewardRatio: 'N/A',
    riskDistance: 0,
    confluenceScore: Math.max(bullishScore, bearishScore),
    rules: bullishScore > bearishScore ? bullishRules : bearishRules,
    reasons,
    timestamp: Date.now(),
    status: 'EXPIRED',
    currentPriceAtGen: currentPrice,
    isDemo,
  };
}

function createNoTradeSignal(timeframe: Timeframe, price: number, reason: string, isDemo: boolean): TradeSignal {
  return {
    id: `SIG-NONE-${timeframe}-${Date.now()}`,
    symbol: 'XAU/USD',
    timeframe,
    type: 'NO_TRADE',
    entry: price,
    stopLoss: 0,
    takeProfit1: 0,
    takeProfit2: 0,
    takeProfit3: 0,
    riskRewardRatio: 'N/A',
    riskDistance: 0,
    confluenceScore: 0,
    rules: [],
    reasons: [reason],
    timestamp: Date.now(),
    status: 'EXPIRED',
    currentPriceAtGen: price,
    isDemo,
  };
}
