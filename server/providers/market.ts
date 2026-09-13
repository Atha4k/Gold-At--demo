import type { MarketLevels, MarketMode, MarketSnapshot, MarketStatus, MarketTimeframe, NormalizedCandle, NormalizedPrice } from '../../shared/types.js';

export interface MarketDataProvider {
  readonly source: 'OANDA' | 'TWELVE_DATA' | 'MOCK';
  readonly mode: MarketMode;
  isConfigured(): boolean;
  getStatus(): MarketStatus;
  getCurrentPrice(): Promise<NormalizedPrice>;
  refreshCurrentPrice?(): Promise<NormalizedPrice>;
  getCandles(timeframe: MarketTimeframe, count: number, before?: string): Promise<NormalizedCandle[]>;
  getLevels(timeframe?: MarketTimeframe): Promise<MarketLevels>;
  getSnapshot(): Promise<MarketSnapshot>;
  subscribeToPrice(listener: (price: NormalizedPrice) => void): () => void;
  start(): void;
  stop(): void;
}

export const TIMEFRAME_GRANULARITY: Record<MarketTimeframe, string> = { '5M':'M5', '15M':'M15', '1H':'H1', '4H':'H4', '1D':'D' };

export function atr14(candles: NormalizedCandle[]): number {
  if (candles.length < 15) return 0;
  const series = candles.slice(-15);
  const ranges = series.slice(1).map((c,i) => Math.max(c.high-c.low, Math.abs(c.high-series[i].close), Math.abs(c.low-series[i].close)));
  return ranges.reduce((sum,v)=>sum+v,0)/ranges.length;
}

export function technicalLevels(candles: NormalizedCandle[], daily: NormalizedCandle[], timeframe: MarketTimeframe, source: 'OANDA'|'TWELVE_DATA'|'MOCK', status: MarketStatus): MarketLevels {
  const currentDay = daily.at(-1)!; const previousDay = daily.at(-2) ?? currentDay;
  const completed = candles.filter(c=>c.complete); const recent=completed.slice(-20);
  const swingHighs = recent.filter((c,i,a)=>i>1&&i<a.length-2&&c.high>a[i-1].high&&c.high>a[i-2].high&&c.high>a[i+1].high&&c.high>a[i+2].high);
  const swingLows = recent.filter((c,i,a)=>i>1&&i<a.length-2&&c.low<a[i-1].low&&c.low<a[i-2].low&&c.low<a[i+1].low&&c.low<a[i+2].low);
  const highs=swingHighs.slice(-2), lows=swingLows.slice(-2);
  const bullish=highs.length===2&&lows.length===2&&highs[1].high>highs[0].high&&lows[1].low>lows[0].low;
  const bearish=highs.length===2&&lows.length===2&&highs[1].high<highs[0].high&&lows[1].low<lows[0].low;
  const last=completed.at(-1)!; const priorStructure=bullish?'BULLISH':bearish?'BEARISH':'RANGE';
  const latestHigh=swingHighs.at(-1)?.high??Math.max(...recent.map(c=>c.high)); const latestLow=swingLows.at(-1)?.low??Math.min(...recent.map(c=>c.low));
  return { dayHigh:currentDay.high,dayLow:currentDay.low,previousDayHigh:previousDay.high,previousDayLow:previousDay.low,atr14:atr14(completed),recentSwingHigh:latestHigh,recentSwingLow:latestLow,structure:priorStructure,breakOfStructure:bullish?last.close>(highs.at(-2)?.high??Infinity):bearish?last.close<(lows.at(-2)?.low??-Infinity):false,changeOfCharacter:bullish?last.close<latestLow:bearish?last.close>latestHigh:false,timeframe,source,status };
}
