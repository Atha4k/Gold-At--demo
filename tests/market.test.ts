import { describe, expect, it } from 'vitest';
import { atr14, technicalLevels, TIMEFRAME_GRANULARITY } from '../server/providers/market';
import { MockMarketDataProvider } from '../server/providers/mockMarketDataProvider';
import { OandaMarketDataProvider } from '../server/providers/oandaMarketDataProvider';
import { TwelveDataMarketDataProvider, TWELVE_DATA_INTERVAL } from '../server/providers/twelveDataMarketDataProvider';
import { normalizeEffr } from '../server/providers/fredFedRateProvider';
import { FedProbabilityEngine } from '../server/providers/fedProbabilityEngine';

describe('market data normalization',()=>{
  it('maps supported GOLD INTEL timeframes to OANDA granularities',()=>expect(TIMEFRAME_GRANULARITY).toEqual({'5M':'M5','15M':'M15','1H':'H1','4H':'H4','1D':'D'}));
  it('maps supported GOLD INTEL timeframes to Twelve Data intervals',()=>expect(TWELVE_DATA_INTERVAL).toEqual({'5M':'5min','15M':'15min','1H':'1h','4H':'4h','1D':'1day'}));
  it('calculates standard ATR from true ranges',()=>{const candles=Array.from({length:15},(_,i)=>({time:String(i),open:100,high:105,low:95,close:100,volume:1,complete:true}));expect(atr14(candles)).toBe(10)});
  it('keeps simulation available without OANDA credentials',async()=>{const provider=new MockMarketDataProvider();const snapshot=await provider.getSnapshot();expect(snapshot.status).toBe('SIMULATION');expect(snapshot.price?.source).toBe('MOCK');expect(snapshot.levels?.atr14).toBeGreaterThan(0)});
  it('fails closed instead of returning mock data when OANDA is not configured',async()=>{const provider=new OandaMarketDataProvider();const snapshot=await provider.getSnapshot();expect(snapshot.status).toBe('NOT_CONFIGURED');expect(snapshot.price).toBeNull();expect(snapshot.levels).toBeNull()});
  it('fails closed instead of returning mock data when Twelve Data is not configured',async()=>{const provider=new TwelveDataMarketDataProvider();const snapshot=await provider.getSnapshot();expect(snapshot.status).toBe('NOT_CONFIGURED');expect(snapshot.price).toBeNull();expect(snapshot.levels).toBeNull()});
  it('selects the latest two valid EFFR observations and ignores missing values',()=>{const result=normalizeEffr([{date:'2026-09-03',value:'.'},{date:'2026-09-02',value:'3.64'},{date:'2026-09-01',value:'3.63'}],'2026-09-04T00:00:00.000Z');expect(result).toMatchObject({rate:3.64,previousRate:3.63,change:0.01,observationDate:'2026-09-02',status:'CURRENT'})});
  it('normalizes market-implied Fed probabilities to 100 percent',()=>{const result=new FedProbabilityEngine().calculate({futuresPrice:96.425,currentEffr:3.63,meetingDate:'2026-09-16',contractYear:2026,contractMonth:9});expect(result.decreaseProbability+result.unchangedProbability+result.increaseProbability).toBe(100);expect(result.decreaseProbability).toBeGreaterThanOrEqual(0);expect(result.increaseProbability).toBeGreaterThanOrEqual(0)});
});
