import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DataStatus, NewsItem, NewsSnapshot, RefreshMetadata } from '../../shared/types.js';
import { GoldNewsRelevanceService } from '../news/goldNewsRelevanceService.js';
import type { NewsProvider } from './newsProvider.js';

type RawEntity={symbol?:string;name?:string;sentiment_score?:number};
type RawArticle={uuid?:string;title?:string;description?:string;keywords?:string;snippet?:string;url?:string;image_url?:string;published_at?:string;source?:string;relevance_score?:number;entities?:RawEntity[]};
type CacheFile={snapshot?:NewsSnapshot|null;budgetDate?:string;requestCountToday?:number;recoveryAttemptedDate?:string|null;lastQueryVersion?:string|null;lastAttempt?:string|null;lastSuccessfulFetch?:string|null;lastError?:string|null;lastFailureStatus?:DataStatus;consecutiveFailures?:number;nextAllowedFetch?:string|null;lastHttpStatus?:number|null;errorCode?:string|null;usageLimit?:string|null;usageRemaining?:string|null;rateLimit?:string|null;rateRemaining?:string|null};
const BACKOFF=[60000,120000,300000,600000];
const QUERY_VERSION='gold-search-v2';
const GOLD_SEARCH='gold|XAUUSD|"Federal Reserve"|FOMC|inflation|CPI|PCE|"Treasury yields"|"US dollar"|DXY|geopolitical|sanctions|oil';

export class MarketauxNewsProvider implements NewsProvider {
  readonly refreshInterval=Math.max(1200000,Number(process.env.MARKETAUX_NEWS_REFRESH_MS)||1200000);
  private readonly manualCooldown=Math.max(300000,Number(process.env.MARKETAUX_MANUAL_REFRESH_COOLDOWN_MS)||300000);
  private readonly dailyBudget=Math.min(80,Math.max(1,Number(process.env.MARKETAUX_DAILY_REQUEST_BUDGET)||80));
  private readonly key=process.env.MARKETAUX_API_KEY?.trim()||'';
  private readonly cacheFile=join(process.cwd(),'data','marketaux-news-cache.json');
  private readonly relevance=new GoldNewsRelevanceService();
  private cache:NewsSnapshot|null=null; private inflight?:Promise<NewsSnapshot>;
  private lastAttempt:string|null=null; private lastSuccessfulFetch:string|null=null; private lastError:string|null=null;
  private lastFailureStatus:DataStatus='UNAVAILABLE'; private consecutiveFailures=0;
  private budgetDate=this.today(); private requestCountToday=0; private recoveryAttemptedDate:string|null=null; private lastQueryVersion:string|null=null; private nextAllowedFetch:string|null=null;
  private lastHttpStatus:number|null=null; private errorCode:string|null=null;
  private usageLimit:string|null=null; private usageRemaining:string|null=null; private rateLimit:string|null=null; private rateRemaining:string|null=null;

  constructor(){this.restore();console.info('[MARKETAUX] Provider initialized');console.info(`[MARKETAUX] API key configured: ${this.key?'yes':'no'}`)}

  // Read endpoints are cache-only. Startup, the scheduler and manual refresh call refresh().
  async getNews():Promise<NewsSnapshot>{this.rollBudget();if(!this.key)return this.empty('NOT_CONFIGURED','MARKETAUX NOT CONFIGURED');return this.cache?this.view():this.empty(this.lastFailureStatus,this.lastError??'MARKETAUX NEWS IS INITIALIZING')}

  refresh(manual=false):Promise<NewsSnapshot>{
    this.rollBudget();
    if(this.inflight)return this.inflight;
    if(!this.key)return Promise.resolve(this.empty('NOT_CONFIGURED','MARKETAUX NOT CONFIGURED'));
    const now=Date.now(),allowed=this.nextAllowedFetch?Date.parse(this.nextAllowedFetch):0;
    // A single explicit recovery probe is allowed when the old implementation burned its
    // local counter without ever producing a cache. It is persisted, so repeat clicks cannot loop.
    const queryUpgrade=manual&&!this.cache&&this.lastQueryVersion!==QUERY_VERSION;
    const recovery=manual&&!this.cache&&((this.errorCode==='local_daily_budget'&&this.recoveryAttemptedDate!==this.today())||queryUpgrade);
    if(this.requestCountToday>=this.dailyBudget&&!recovery){this.lastFailureStatus='DAILY_LIMIT';this.lastError=`LOCAL DAILY REQUEST BUDGET REACHED (${this.dailyBudget})`;this.errorCode='local_daily_budget';this.nextAllowedFetch=this.nextUtcDay();this.persist();return Promise.resolve(this.failure())}
    if(allowed>now&&!recovery)return Promise.resolve(this.failure());
    if(recovery){this.recoveryAttemptedDate=this.today();this.nextAllowedFetch=null;this.lastError=null;this.persist();console.info('[MARKETAUX] One-time manual recovery probe authorized')}
    const sinceSuccess=this.lastSuccessfulFetch?now-Date.parse(this.lastSuccessfulFetch):Infinity;
    const sinceAttempt=this.lastAttempt?now-Date.parse(this.lastAttempt):Infinity;
    if(manual&&!recovery&&sinceAttempt<this.manualCooldown)return Promise.resolve(this.cache?this.view():this.failure());
    if(!manual&&sinceSuccess<this.refreshInterval)return Promise.resolve(this.view());
    if(!manual&&sinceAttempt<this.refreshInterval)return Promise.resolve(this.cache?this.view():this.failure());
    if(queryUpgrade){this.lastQueryVersion=QUERY_VERSION;this.persist()}
    this.inflight=this.load().finally(()=>{this.inflight=undefined});return this.inflight;
  }

  private async load():Promise<NewsSnapshot>{
    this.lastAttempt=new Date().toISOString();this.requestCountToday++;this.persist();
    console.info('[MARKETAUX] Refresh started');console.info(`[MARKETAUX] Request count today: ${this.requestCountToday}`);
    try{
      const url=new URL('https://api.marketaux.com/v1/news/all');
      url.searchParams.set('api_token',this.key);url.searchParams.set('language','en');url.searchParams.set('limit','50');url.searchParams.set('search',GOLD_SEARCH);url.searchParams.set('sort','published_at');url.searchParams.set('published_after',new Date(Date.now()-48*3600000).toISOString().slice(0,19));
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
      this.captureHeaders(response);
      let json:any={};try{json=await response.json()}catch{json={error:{message:`MARKETAUX HTTP ${response.status}`}}}
      this.errorCode=json?.error?.code?String(json.error.code):null;this.logResponse();
      if(!response.ok||json.error){const error=new Error(String(json?.error?.message??`MARKETAUX HTTP ${response.status}`));(error as any).status=response.status;throw error}
      const raw=Array.isArray(json.data)?json.data as RawArticle[]:[];
      const items=raw.map(article=>this.normalize(article)).filter((item):item is NewsItem=>Boolean(item)).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)||this.rank(b.goldRelevance)-this.rank(a.goldRelevance));
      console.info(`[MARKETAUX] Articles received: ${raw.length}`);console.info(`[MARKETAUX] Articles accepted: ${items.length}`);
      if(!items.length)throw new Error('MARKETAUX RETURNED NO GOLD-RELEVANT ARTICLES');
      const now=new Date().toISOString();this.lastSuccessfulFetch=now;this.lastError=null;this.lastFailureStatus='CURRENT';this.consecutiveFailures=0;this.nextAllowedFetch=new Date(Date.now()+this.refreshInterval).toISOString();this.errorCode=null;
      this.cache={items,source:'MARKETAUX',lastUpdated:now,status:'CURRENT',...this.meta(),...this.quota(),requestCountToday:this.requestCountToday};this.persist();console.info('[MARKETAUX] Cache updated');return this.view();
    }catch(error){
      this.consecutiveFailures++;this.lastError=error instanceof Error?error.message:'Marketaux refresh failed';const status=Number((error as any)?.status)||this.lastHttpStatus;
      if(status===402||this.errorCode==='usage_limit_reached'){this.lastFailureStatus='DAILY_LIMIT';this.nextAllowedFetch=this.nextUtcDay()}
      else if(status===429||this.errorCode==='rate_limit_reached'){this.lastFailureStatus='RATE_LIMITED';this.nextAllowedFetch=new Date(Date.now()+this.retryDelay()).toISOString()}
      else if(status===401||status===403){this.lastFailureStatus='INVALID_API_KEY';this.nextAllowedFetch=new Date(Date.now()+this.refreshInterval).toISOString()}
      else{this.lastFailureStatus='UNAVAILABLE';this.nextAllowedFetch=new Date(Date.now()+this.refreshInterval).toISOString()}
      console.error(`[MARKETAUX] Refresh failed: ${this.lastError}`);this.persist();return this.failure();
    }
  }

  private captureHeaders(r:Response){this.lastHttpStatus=r.status;this.usageLimit=r.headers.get('x-usagelimit-limit');this.usageRemaining=r.headers.get('x-usagelimit-remaining');this.rateLimit=r.headers.get('x-ratelimit-limit');this.rateRemaining=r.headers.get('x-ratelimit-remaining');const retry=r.headers.get('retry-after');if(retry){const seconds=Number(retry);this.nextAllowedFetch=Number.isFinite(seconds)?new Date(Date.now()+seconds*1000).toISOString():new Date(retry).toISOString()}}
  private logResponse(){console.info(`[MARKETAUX] HTTP status: ${this.lastHttpStatus??'unknown'}`);console.info(`[MARKETAUX] error code: ${this.errorCode??'none'}`);console.info(`[MARKETAUX] usage limit: ${this.usageLimit??'unavailable'}`);console.info(`[MARKETAUX] usage remaining: ${this.usageRemaining??'unavailable'}`);console.info(`[MARKETAUX] rate limit: ${this.rateLimit??'unavailable'}`);console.info(`[MARKETAUX] rate remaining: ${this.rateRemaining??'unavailable'}`)}
  private normalize(a:RawArticle):NewsItem|null{const published=Date.parse(a.published_at??'');if(!a.uuid||!a.title||!a.url||!Number.isFinite(published))return null;const entities=a.entities??[];const assessment=this.relevance.assess({title:a.title,description:a.description??a.snippet,keywords:a.keywords,symbols:entities.map(x=>x.symbol??'').filter(Boolean),entityNames:entities.map(x=>x.name??'').filter(Boolean)});if(!assessment.level)return null;const sentiments=entities.map(x=>Number(x.sentiment_score)).filter(Number.isFinite);const sentiment=sentiments.length?sentiments.reduce((x,y)=>x+y,0)/sentiments.length:null;const symbols=[...new Set(entities.map(x=>x.symbol??'').filter(Boolean))];return {id:a.uuid,title:a.title,description:a.description??a.snippet??'',source:a.source??new URL(a.url).hostname,dataProvider:'MARKETAUX',sourceUrl:a.url,articleUrl:a.url,timestamp:new Date(published).toISOString(),publishedAt:new Date(published).toISOString(),imageUrl:a.image_url??null,currency:assessment.usdRelevant?'USD':'',currencies:assessment.usdRelevant?['USD']:[],country:assessment.usdRelevant?'US':'',symbols,sentiment,relevance:Number.isFinite(Number(a.relevance_score))?Number(a.relevance_score):assessment.score,impact:null,goldRelevance:assessment.level,usdRelevant:assessment.usdRelevant,actual:'',forecast:'',previous:'',category:'headline',isUpcoming:false,goldRelevant:true}}
  private failure():NewsSnapshot{return this.cache?{...this.view(),status:'CACHED',message:this.lastError??undefined}:this.empty(this.lastFailureStatus,this.lastError??'MARKETAUX NEWS UNAVAILABLE')}
  private empty(status:DataStatus,message:string):NewsSnapshot{return {items:[],source:'MARKETAUX',lastUpdated:null,status,message,...this.meta(),...this.quota(),requestCountToday:this.requestCountToday}}
  private view():NewsSnapshot{const status:DataStatus=this.lastError?'CACHED':this.age()<=this.refreshInterval?'CURRENT':'STALE';return {...this.cache!,status,message:this.lastError??undefined,...this.meta(),...this.quota(),requestCountToday:this.requestCountToday}}
  private meta():RefreshMetadata{return {lastAttempt:this.lastAttempt,lastSuccessfulFetch:this.lastSuccessfulFetch,lastError:this.lastError,cacheAge:this.lastSuccessfulFetch?this.age():null,isRefreshing:Boolean(this.inflight),consecutiveFailures:this.consecutiveFailures}}
  private quota(){return {nextAllowedFetch:this.nextAllowedFetch,lastHttpStatus:this.lastHttpStatus,errorCode:this.errorCode,usageLimit:this.usageLimit,usageRemaining:this.usageRemaining,rateLimit:this.rateLimit,rateRemaining:this.rateRemaining}}
  private age(){return this.lastSuccessfulFetch?Date.now()-Date.parse(this.lastSuccessfulFetch):Infinity}
  private rank(level=undefined as NewsItem['goldRelevance']){return level==='high'?3:level==='medium'?2:1}
  private today(){return new Date().toISOString().slice(0,10)}
  private nextUtcDay(){const date=new Date();date.setUTCHours(24,0,0,0);return date.toISOString()}
  private retryDelay(){return BACKOFF[Math.min(this.consecutiveFailures-1,BACKOFF.length-1)]}
  private rollBudget(){const today=this.today();if(today!==this.budgetDate){this.budgetDate=today;this.requestCountToday=0;if(this.lastFailureStatus==='DAILY_LIMIT'){this.lastFailureStatus='UNAVAILABLE';this.lastError=null;this.nextAllowedFetch=null;this.errorCode=null}this.persist()}}
  private restore(){try{const s=JSON.parse(readFileSync(this.cacheFile,'utf8')) as CacheFile;this.cache=s.snapshot??null;this.lastSuccessfulFetch=s.lastSuccessfulFetch??this.cache?.lastSuccessfulFetch??this.cache?.lastUpdated??null;this.lastAttempt=s.lastAttempt??this.cache?.lastAttempt??null;this.lastError=s.lastError??this.cache?.lastError??null;this.lastFailureStatus=s.lastFailureStatus??'UNAVAILABLE';this.consecutiveFailures=s.consecutiveFailures??0;this.budgetDate=s.budgetDate??this.today();this.requestCountToday=this.budgetDate===this.today()?s.requestCountToday??0:0;this.recoveryAttemptedDate=s.recoveryAttemptedDate??null;this.lastQueryVersion=s.lastQueryVersion??null;this.nextAllowedFetch=s.nextAllowedFetch??null;this.lastHttpStatus=s.lastHttpStatus??null;this.errorCode=s.errorCode??null;this.usageLimit=s.usageLimit??null;this.usageRemaining=s.usageRemaining??null;this.rateLimit=s.rateLimit??null;this.rateRemaining=s.rateRemaining??null}catch{/* no cache yet */}}
  private persist(){try{mkdirSync(dirname(this.cacheFile),{recursive:true});writeFileSync(this.cacheFile,JSON.stringify({snapshot:this.cache,budgetDate:this.budgetDate,requestCountToday:this.requestCountToday,recoveryAttemptedDate:this.recoveryAttemptedDate,lastQueryVersion:this.lastQueryVersion,lastAttempt:this.lastAttempt,lastSuccessfulFetch:this.lastSuccessfulFetch,lastError:this.lastError,lastFailureStatus:this.lastFailureStatus,consecutiveFailures:this.consecutiveFailures,nextAllowedFetch:this.nextAllowedFetch,lastHttpStatus:this.lastHttpStatus,errorCode:this.errorCode,usageLimit:this.usageLimit,usageRemaining:this.usageRemaining,rateLimit:this.rateLimit,rateRemaining:this.rateRemaining},null,2))}catch(error){console.error('[MARKETAUX] Cache persistence failed:',error instanceof Error?error.message:error)}}
}
