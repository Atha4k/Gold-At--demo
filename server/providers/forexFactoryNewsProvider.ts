import type { DataStatus, NewsImpact, NewsItem, NewsSnapshot, RefreshMetadata } from '../../shared/types.js';

type RawEvent={title?:string;country?:string;date?:string;impact?:string;forecast?:string;previous?:string;actual?:string};
type FeedKind='calendar'|'news';

abstract class ForexFactoryProvider {
  abstract readonly url:string;
  protected abstract readonly interval:number;
  protected cache:NewsSnapshot|null=null;
  protected lastAttempt:string|null=null;
  protected lastSuccessfulFetch:string|null=null;
  protected lastError:string|null=null;
  protected lastFailureStatus:DataStatus='UNAVAILABLE';
  protected consecutiveFailures=0;
  protected inflight?:Promise<NewsSnapshot>;
  protected readonly blockedRetryMs=21600000;
  constructor(protected readonly kind:FeedKind){}
  get refreshInterval(){return this.interval}
  async getNews(force=false):Promise<NewsSnapshot>{if(force)return this.refresh(true);if(!this.cache){if(this.lastAttempt&&Date.now()-Date.parse(this.lastAttempt)<this.interval)return this.empty(this.lastFailureStatus,this.lastError??`${this.kind} unavailable`);return this.refresh()}if(this.age()>=this.interval)void this.refresh();return this.view()}
  refresh(force=false):Promise<NewsSnapshot>{if(this.inflight)return this.inflight;if(!force&&this.lastFailureStatus==='BLOCKED'&&this.lastAttempt&&Date.now()-Date.parse(this.lastAttempt)<this.blockedRetryMs)return Promise.resolve(this.empty('BLOCKED',this.lastError??`${this.kind} retrieval blocked`));this.inflight=this.load().finally(()=>{this.inflight=undefined});return this.inflight}
  protected abstract fetchItems():Promise<NewsItem[]>;
  private async load():Promise<NewsSnapshot>{this.lastAttempt=new Date().toISOString();console.info(`[FOREX FACTORY] ${this.kind} refresh started`);console.info(`[FOREX FACTORY] source: ${this.url}`);try{const items=await this.fetchItems();if(!items.length)throw new Error(`${this.kind} parser returned zero records`);const now=new Date().toISOString();this.lastSuccessfulFetch=now;this.lastError=null;this.consecutiveFailures=0;this.cache={items,source:'FOREX FACTORY',lastUpdated:now,status:'LIVE',...this.meta()};console.info(`[FOREX FACTORY] ${this.kind} records parsed: ${items.length}`);console.info(`[FOREX FACTORY] ${this.kind} cache updated`);return this.view()}catch(error){this.consecutiveFailures++;this.lastError=error instanceof Error?error.message:`${this.kind} refresh failed`;console.error(`[FOREX FACTORY] ${this.kind} refresh failed: ${this.lastError}`);if(this.cache?.items.length)return this.view();this.lastFailureStatus=/HTTP 403/.test(this.lastError)?'BLOCKED':/HTTP 429/.test(this.lastError)?'RATE_LIMITED':'UNAVAILABLE';return this.empty(this.lastFailureStatus,this.lastError)}}
  protected async response():Promise<Response>{const response=await fetch(this.url,{method:'GET',headers:{Accept:this.kind==='calendar'?'application/json':'text/html','User-Agent':'GOLD-INTEL/1.0'},redirect:'follow',signal:AbortSignal.timeout(15000)});const contentType=response.headers.get('content-type')??'unknown';console.info(`[FOREX FACTORY] ${this.kind} HTTP status: ${response.status}`);console.info(`[FOREX FACTORY] ${this.kind} content-type: ${contentType}`);if(!response.ok){const body=(await response.text()).replace(/\s+/g,' ').slice(0,180);const summary=/just a moment|cf-chl|cloudflare/i.test(body)?'Cloudflare challenge response':body||'empty response';throw new Error(`HTTP ${response.status} · ${contentType} · ${summary}`)}return response}
  private age(){return this.lastSuccessfulFetch?Date.now()-Date.parse(this.lastSuccessfulFetch):Infinity}
  private meta():RefreshMetadata{return {lastAttempt:this.lastAttempt,lastSuccessfulFetch:this.lastSuccessfulFetch,lastError:this.lastError,cacheAge:Number.isFinite(this.age())?this.age():null,isRefreshing:Boolean(this.inflight),consecutiveFailures:this.consecutiveFailures}}
  private view():NewsSnapshot{const age=this.age();const status:DataStatus=this.lastFailureStatus==='BLOCKED'&&this.lastError?'BLOCKED':this.lastError?(age<=this.interval?'CACHED':'STALE'):'LIVE';return {...this.cache!,status,message:this.lastError??undefined,...this.meta(),isRefreshing:false}}
  private empty(status:DataStatus,message:string):NewsSnapshot{return {items:[],source:'FOREX FACTORY',lastUpdated:null,status,message,...this.meta(),isRefreshing:false}}
}

export class ForexFactoryCalendarProvider extends ForexFactoryProvider {
  readonly url='https://nfs.faireconomy.media/ff_calendar_thisweek.json';
  protected readonly interval=Math.max(120000,Number(process.env.FOREX_FACTORY_CALENDAR_REFRESH_MS)||600000);
  constructor(){super('calendar')}
  protected async fetchItems():Promise<NewsItem[]>{const response=await this.response();const raw=await response.json() as RawEvent[];console.info(`[FOREX FACTORY] calendar records received: ${Array.isArray(raw)?raw.length:0}`);if(!Array.isArray(raw))throw new Error('Invalid calendar response');const now=Date.now();return raw.map((event,index)=>this.normalize(event,index,now)).filter((item):item is NewsItem=>Boolean(item)).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp))}
  private normalize(event:RawEvent,index:number,now:number):NewsItem|null{const stamp=Date.parse(event.date??'');if(!event.title||!Number.isFinite(stamp))return null;const impact=this.impact(event.impact);const currency=(event.country??'').toUpperCase();const goldTerms=/\b(usd|fed|fomc|rate|cpi|pce|employment|payroll|nfp|treasury|dxy|gold|inflation|gdp|retail sales|ism|jobless|war|conflict|central bank)\b/i;return {id:`ff-${stamp}-${index}`,title:event.title,source:'FOREX FACTORY',sourceUrl:'https://www.forexfactory.com/calendar',timestamp:new Date(stamp).toISOString(),currency,country:currency==='USD'?'US':'',impact,actual:event.actual??'',forecast:event.forecast??'',previous:event.previous??'',category:'economic_event',isUpcoming:stamp>now,goldRelevant:currency==='USD'||goldTerms.test(event.title)}}
  private impact(value?:string):NewsImpact{const normalized=(value??'').toLowerCase();if(normalized.includes('high'))return'high';if(normalized.includes('medium')||normalized.includes('med'))return'medium';if(normalized.includes('low'))return'low';return'none'}
}

export class ForexFactoryNewsProvider extends ForexFactoryProvider {
  readonly url='https://www.forexfactory.com/news';
  protected readonly interval=Math.max(120000,Number(process.env.FOREX_FACTORY_NEWS_REFRESH_MS)||180000);
  constructor(){super('news')}
  protected async fetchItems():Promise<NewsItem[]>{const response=await this.response();const html=await response.text();console.info(`[FOREX FACTORY] news records received: ${html.length} bytes`);if(/cloudflare|just a moment|cf-chl/i.test(html))throw new Error('HTTP 403 / Cloudflare challenge');throw new Error('Forex Factory news HTML parser is not available')}
}
