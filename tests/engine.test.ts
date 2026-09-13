import { describe, expect, it } from 'vitest';
import { runAnalysis } from '../server/analysis/engine';
import { DEFAULT_INPUTS } from '../shared/defaults';
describe('analysis engine',()=>{
  it('normalizes probabilities',()=>{const r=runAnalysis(DEFAULT_INPUTS);expect(r.bullish+r.bearish+r.uncertain).toBe(100)});
  it('blocks trades around events',()=>{const r=runAnalysis({...DEFAULT_INPUTS,eventRisk:true});expect(r.bias).toBe('NO_TRADE');expect(r.blockers.length).toBeGreaterThan(0)});
  it('creates levels only for actionable trades',()=>{const r=runAnalysis({...DEFAULT_INPUTS,technicalStructure:'BULLISH',fedStance:'DOVISH',economicData:'COOL',realYield:1,liquidity:'BUY_SIDE_NEARBY',newsSentiment:'BULLISH'});expect(r.bias).toBe('LONG');expect(r.trade?.stop).toBeLessThan(r.trade!.entryLow)})
});
