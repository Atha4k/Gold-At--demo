import type { MarketSnapshot, MarketStatus, MarketTimeframe, NormalizedCandle, NormalizedPrice } from '../../shared/types.js';
import { technicalLevels, type MarketDataProvider } from './market.js';

export class MockMarketDataProvider implements MarketDataProvider {
  readonly source='MOCK' as const; readonly mode='SIMULATION' as const;
  private listeners=new Set<(p:NormalizedPrice)=>void>(); private timer?:NodeJS.Timeout; private mid=4558.2;
  isConfigured(){return true} getStatus():MarketStatus{return 'SIMULATION'}
  async getCurrentPrice(){return this.price()}
  async getCandles(timeframe:MarketTimeframe,count:number,before?:string):Promise<NormalizedCandle[]>{
    const unit:{[K in MarketTimeframe]:number}={'5M':300000,'15M':900000,'1H':3600000,'4H':14400000,'1D':86400000};
    const end=before?Date.parse(before):Date.now();return Array.from({length:Math.min(5000,Math.max(15,count))},(_,i)=>{const base=4520+i*.45+Math.sin(i/4)*18+Math.sin(i/11)*10;const prev=4520+(i-1)*.45+Math.sin((i-1)/4)*18+Math.sin((i-1)/11)*10;return {time:new Date(end-(count-i)*unit[timeframe]).toISOString(),open:+prev.toFixed(2),high:+(Math.max(prev,base)+3+Math.abs(Math.sin(i))*4).toFixed(2),low:+(Math.min(prev,base)-3-Math.abs(Math.cos(i))*4).toFixed(2),close:+base.toFixed(2),volume:100+i,complete:i<count-1}})
  }
  async getLevels(timeframe:MarketTimeframe='1H'){return technicalLevels(await this.getCandles(timeframe,100),await this.getCandles('1D',20),timeframe,this.source,this.getStatus())}
  async getSnapshot():Promise<MarketSnapshot>{return {price:this.price(),levels:await this.getLevels(),configured:true,mode:this.mode,status:this.getStatus(),staleAfterMs:15000}}
  subscribeToPrice(listener:(p:NormalizedPrice)=>void){this.listeners.add(listener);listener(this.price());return()=>this.listeners.delete(listener)}
  start(){if(this.timer)return;this.timer=setInterval(()=>{this.mid+=Math.sin(Date.now()/1300)*.08+(Math.random()-.5)*.06;const p=this.price();this.listeners.forEach(l=>l(p))},1000)}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=undefined}
  private price():NormalizedPrice{const spread=.24;return {instrument:'XAUUSD',bid:+(this.mid-spread/2).toFixed(2),ask:+(this.mid+spread/2).toFixed(2),mid:+this.mid.toFixed(2),spread,timestamp:new Date().toISOString(),source:this.source,mode:this.mode,status:this.getStatus()}}
}
