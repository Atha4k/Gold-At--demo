export type Bias = 'LONG' | 'SHORT' | 'NEUTRAL' | 'NO_TRADE';
export type Signal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface MarketInputs {
  xauusd: number; dxy: number; us2y: number; us10y: number; realYield: number;
  fedStance: 'VERY_HAWKISH' | 'HAWKISH' | 'NEUTRAL' | 'DOVISH' | 'VERY_DOVISH';
  economicData: 'HOT' | 'INLINE' | 'COOL'; cot: 'HEAVILY_LONG' | 'BALANCED' | 'HEAVILY_SHORT';
  centralBanks: 'BUYING' | 'NEUTRAL' | 'SELLING'; geopolitics: 'LOW' | 'ELEVATED' | 'SEVERE';
  newsSentiment: Signal; technicalStructure: Signal;
  liquidity: 'BUY_SIDE_NEARBY' | 'SELL_SIDE_NEARBY' | 'BALANCED';
  eventRisk: boolean;
}

export interface Evidence { category: string; score: number; weight: number; confidence: number; explanation: string; }
export interface Analysis {
  id?: number; bias: Bias; conviction: number; bullish: number; bearish: number; uncertain: number;
  primaryScenario: string; alternativeScenario: string; keyLevel: number; invalidation: string;
  watching: string[]; createdAt: string; evidence: Evidence[];
  trade: null | { direction: 'LONG' | 'SHORT'; entryLow: number; entryHigh: number; stop: number; tp1: number; tp2: number; tp3: number; rr: number; status: string; horizon: string };
  blockers: string[];
}

export interface JournalEntry {
  id?: number; dateTime: string; instrument: string; direction: string; marketConditions: string; thesis: string;
  entry?: number | null; stopLoss?: number | null; tp1?: number | null; tp2?: number | null; tp3?: number | null;
  rr?: number | null; positionSize?: string; conviction: string; invalidation: string; result: string;
  rMultiple?: number | null; wentRight?: string; wentWrong?: string; lesson?: string;
}

export type MarketTimeframe = '5M' | '15M' | '1H' | '4H' | '1D';
export type MarketMode = 'SIMULATION' | 'LIVE';
export type MarketStatus = 'CONNECTING' | 'LIVE' | 'CURRENT' | 'API' | 'SIMULATION' | 'CACHED' | 'STALE' | 'RECONNECTING' | 'DISCONNECTED' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'INVALID_API_KEY' | 'NOT_CONFIGURED';
export interface NormalizedPrice { instrument: 'XAUUSD'; bid: number | null; ask: number | null; mid: number; spread: number | null; timestamp: string; providerTimestamp?: string | null; receivedAt?: string; source: 'OANDA' | 'TWELVE_DATA' | 'MOCK'; mode: MarketMode; status: MarketStatus; }
export interface NormalizedCandle { time: string; open: number; high: number; low: number; close: number; volume: number; complete: boolean; }
export interface MarketLevels { dayHigh: number; dayLow: number; previousDayHigh: number; previousDayLow: number; atr14: number; recentSwingHigh: number; recentSwingLow: number; structure: 'BULLISH' | 'BEARISH' | 'RANGE'; breakOfStructure: boolean; changeOfCharacter: boolean; timeframe: MarketTimeframe; source: 'OANDA' | 'TWELVE_DATA' | 'MOCK'; status: MarketStatus; }
export interface MarketSnapshot { price: NormalizedPrice | null; levels: MarketLevels | null; configured: boolean; mode: MarketMode; status: MarketStatus; staleAfterMs?: number; message?: string; }

export type DataStatus='LOADING'|'CONNECTING'|'LIVE'|'CURRENT'|'API'|'EOD'|'CACHED'|'STALE'|'RECONNECTING'|'BLOCKED'|'UNAVAILABLE'|'INVALID_API_KEY'|'RATE_LIMITED'|'DAILY_LIMIT'|'NOT_CONFIGURED';
export interface RefreshMetadata {lastAttempt:string|null;lastSuccessfulFetch:string|null;lastError:string|null;cacheAge:number|null;isRefreshing:boolean;consecutiveFailures:number;}
export type NewsImpact='high'|'medium'|'low'|'none';
export interface NewsItem {id:string;title:string;description?:string;source:string;dataProvider?:'FOREX FACTORY'|'MARKETAUX';sourceUrl:string;articleUrl?:string;forexFactoryUrl?:string;timestamp:string;publishedAt?:string;imageUrl?:string|null;currency:string;currencies?:string[];country:string;symbols?:string[];sentiment?:number|null;relevance?:number|null;impact:NewsImpact|null;goldRelevance?:Exclude<NewsImpact,'none'>;usdRelevant?:boolean;actual:string;forecast:string;previous:string;category:'economic_event'|'headline';isUpcoming:boolean;goldRelevant:boolean;}
export interface NewsSnapshot extends RefreshMetadata {items:NewsItem[];source:'FOREX FACTORY'|'MARKETAUX';lastUpdated:string|null;status:DataStatus;message?:string;requestCountToday?:number;nextAllowedFetch?:string|null;lastHttpStatus?:number|null;errorCode?:string|null;usageLimit?:string|null;usageRemaining?:string|null;rateLimit?:string|null;rateRemaining?:string|null;}
export interface DxySnapshot {symbol:string|null;value:number|null;previousClose:number|null;change:number|null;changePercent:number|null;dayHigh:number|null;dayLow:number|null;timestamp:string|null;providerTimestamp?:string|null;receivedAt?:string|null;lastSuccessfulUpdate?:string|null;source:'BIQUOTE'|'TWELVE DATA';transport?:'LIVE STREAM'|'API'|null;lastUpdated:string|null;status:DataStatus;message?:string;}
export interface FedWatchProbability {targetRange:string;probability:number;}
export interface FedWatchMeeting {date:string;probabilities:FedWatchProbability[];}
export interface FedWatchSnapshot {currentTargetRange:string|null;nextMeeting:FedWatchMeeting|null;meetings:FedWatchMeeting[];summary:{easing:number;unchanged:number;hike:number}|null;timestamp:string|null;source:'CME FedWatch';lastUpdated:string|null;status:DataStatus;message?:string;}
export interface FredRateSnapshot extends RefreshMetadata {rate:number|null;previousRate:number|null;change:number|null;observationDate:string|null;source:'FRED / EFFR';lastUpdated:string|null;status:DataStatus;message?:string;}
export interface FedRateExpectationsSnapshot extends RefreshMetadata {nextMeetingDate:string|null;decreaseProbability:number|null;unchangedProbability:number|null;increaseProbability:number|null;source:'TWELVE DATA / FED FUNDS FUTURES';lastUpdated:string|null;status:DataStatus;message?:string;instruments:Array<{symbol:string;name:string;exchange:string;type:string}>;}
export interface FedDataState {currentRate:FredRateSnapshot;expectations:FedRateExpectationsSnapshot;}
export interface CentralDataState {gold:MarketSnapshot;dxy:DxySnapshot;fed:FedDataState;news:NewsSnapshot;economicCalendar:NewsSnapshot;}
