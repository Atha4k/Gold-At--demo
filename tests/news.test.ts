import { describe, expect, it } from 'vitest';
import { GoldNewsRelevanceService } from '../server/news/goldNewsRelevanceService';

describe('GoldNewsRelevanceService',()=>{const service=new GoldNewsRelevanceService();
  it('marks direct gold and Fed decision coverage as high relevance',()=>expect(service.assess({title:'Gold rises after Federal Reserve rate decision'})).toMatchObject({level:'high',usdRelevant:true}));
  it('recognizes US macro context without requiring the literal USD token',()=>expect(service.assess({title:'Treasury yields jump after nonfarm payrolls'})).toMatchObject({level:'high',usdRelevant:true}));
  it('rejects unrelated company news',()=>expect(service.assess({title:'Software company launches a new mobile application'}).level).toBeNull());
});
