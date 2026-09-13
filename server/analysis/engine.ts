import type { Analysis, Evidence, MarketInputs, Signal } from '../../shared/types.js';

const signalScore = (v: Signal) => v === 'BULLISH' ? 70 : v === 'BEARISH' ? -70 : 0;
const ev = (category: string, score: number, weight: number, explanation: string, confidence = 80): Evidence => ({ category, score, weight, explanation, confidence });

export function runAnalysis(input: MarketInputs): Analysis {
  const evidence: Evidence[] = [
    ev('Technical Structure', signalScore(input.technicalStructure), 20, `${input.technicalStructure.toLowerCase()} multi-timeframe structure.`),
    ev('Liquidity', input.liquidity === 'SELL_SIDE_NEARBY' ? -55 : input.liquidity === 'BUY_SIDE_NEARBY' ? 55 : 0, 15, input.liquidity.replaceAll('_', ' ').toLowerCase()),
    ev('DXY', 0, 10, `Dollar index at ${input.dxy.toFixed(2)}; trend context unavailable, signal neutral.`, 40),
    ev('Treasury / Real Yields', input.realYield >= 2 ? -68 : input.realYield <= 1.2 ? 55 : -15, 10, `Real yield is ${input.realYield.toFixed(2)}%.`),
    ev('Fed Expectations', input.fedStance.includes('HAWKISH') ? -70 : input.fedStance.includes('DOVISH') ? 70 : 0, 10, `${input.fedStance.replaceAll('_', ' ').toLowerCase()} policy signal.`),
    ev('Economic Data', input.economicData === 'HOT' ? -55 : input.economicData === 'COOL' ? 48 : 0, 10, `${input.economicData.toLowerCase()} relative to expectations.`),
    ev('News / Geopolitics', Math.round((signalScore(input.newsSentiment) + (input.geopolitics === 'SEVERE' ? 75 : input.geopolitics === 'ELEVATED' ? 35 : 0)) / 2), 8, 'Headline tone balanced against safe-haven demand.', 66),
    ev('CFTC Positioning', input.cot === 'HEAVILY_LONG' ? -38 : input.cot === 'HEAVILY_SHORT' ? 42 : 0, 7, 'Crowding adjustment from simulated positioning.', 62),
    ev('Central Bank Demand', input.centralBanks === 'BUYING' ? 72 : input.centralBanks === 'SELLING' ? -60 : 0, 5, 'Structural official-sector demand.', 70),
    ev('Options / Volatility', input.eventRisk ? -10 : 8, 5, input.eventRisk ? 'Elevated event premium.' : 'Orderly implied-volatility regime.', 55)
  ];
  const net = evidence.reduce((sum, x) => sum + x.score * x.weight, 0) / evidence.reduce((sum, x) => sum + x.weight, 0);
  const dispersion = evidence.reduce((sum, x) => sum + Math.abs(x.score - net) * x.weight, 0) / 100;
  const directional = Math.min(78, 50 + Math.abs(net) * 0.38);
  let bullish = net >= 0 ? directional : 100 - directional;
  let bearish = net < 0 ? directional : 100 - directional;
  let uncertain = Math.min(42, 10 + dispersion * 0.28 + (input.eventRisk ? 22 : 0));
  const scale = 100 / (bullish + bearish + uncertain);
  bullish = Math.round(bullish * scale); bearish = Math.round(bearish * scale); uncertain = 100 - bullish - bearish;
  const alignment = Math.max(0, 100 - dispersion);
  const conviction = Math.round(Math.max(18, Math.min(92, Math.abs(net) * .72 + alignment * .28 - (input.eventRisk ? 30 : 0))));
  const blockers: string[] = [];
  if (input.eventRisk) blockers.push('High-impact catalyst risk is active');
  if (dispersion > 63) blockers.push('Macro and technical evidence conflict');
  if (conviction < 48) blockers.push('Conviction is below the execution threshold');
  const direction = net >= 0 ? 'LONG' : 'SHORT';
  const bias = blockers.length ? 'NO_TRADE' : Math.abs(net) < 13 ? 'NEUTRAL' : direction;
  const px = input.xauusd;
  const trade = bias === 'LONG' ? { direction: 'LONG' as const, entryLow: px - 6, entryHigh: px + 2, stop: px - 19, tp1: px + 22, tp2: px + 40, tp3: px + 64, rr: 2.1, status: 'WAITING FOR ENTRY', horizon: 'Intraday' }
    : bias === 'SHORT' ? { direction: 'SHORT' as const, entryLow: px - 2, entryHigh: px + 6, stop: px + 19, tp1: px - 22, tp2: px - 40, tp3: px - 64, rr: 2.1, status: 'WAITING FOR ENTRY', horizon: 'Intraday' } : null;
  return {
    bias, conviction, bullish, bearish, uncertain, evidence, trade, blockers,
    primaryScenario: direction === 'LONG' ? `Hold above ${Math.round(px - 15)} and expand toward ${Math.round(px + 40)}.` : `Reject ${Math.round(px + 5)}–${Math.round(px + 18)} and rotate toward ${Math.round(px - 40)}.`,
    alternativeScenario: direction === 'LONG' ? `Sweep below ${Math.round(px - 20)}, reclaim, then reassess.` : `Sweep above ${Math.round(px + 20)}, fail to hold, then reassess.`,
    keyLevel: Math.round(px / 50) * 50,
    invalidation: direction === 'LONG' ? `H1 close below ${Math.round(px - 19)}` : `H1 close above ${Math.round(px + 19)}`,
    watching: ['DXY', 'US10Y', input.eventRisk ? 'event window' : 'liquidity reaction'], createdAt: new Date().toISOString()
  };
}
