import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MarketSnapshot, MarketTimeframe, NormalizedCandle, NormalizedPrice } from '../shared/types';
import { fetchMarketSnapshot, refreshMarketPrice } from './api';

type MarketContextValue={snapshot:MarketSnapshot|null;price:NormalizedPrice|null;connected:boolean;latestCandle:{timeframe:MarketTimeframe;candle:NormalizedCandle}|null;refresh:()=>Promise<void>};
const MarketContext=createContext<MarketContextValue>({snapshot:null,price:null,connected:false,latestCandle:null,refresh:async()=>{}});

export function MarketProvider({children}:{children:ReactNode}){
  const [snapshot,setSnapshot]=useState<MarketSnapshot|null>(null);const [price,setPrice]=useState<NormalizedPrice|null>(null);const [connected,setConnected]=useState(false);const [latestCandle,setLatestCandle]=useState<{timeframe:MarketTimeframe;candle:NormalizedCandle}|null>(null);const [,setClock]=useState(0);const socket=useRef<WebSocket|null>(null);
  const loadSnapshot=async()=>{const next=await fetchMarketSnapshot();setSnapshot(next);setPrice(next.price)};
  const refresh=async()=>{await refreshMarketPrice();await loadSnapshot()};
  useEffect(()=>{let stopped=false,retry:ReturnType<typeof setTimeout>|undefined,attempt=0;void loadSnapshot();const statusTimer=setInterval(()=>void loadSnapshot(),5000);const connect=()=>{if(stopped||socket.current)return;const protocol=location.protocol==='https:'?'wss':'ws';const ws=new WebSocket(`${protocol}://${location.hostname}:4173/ws/market`);socket.current=ws;ws.onopen=()=>{setConnected(true);attempt=0};ws.onmessage=e=>{const message=JSON.parse(e.data);if(message.type==='price')setPrice(message.data);if(message.type==='candle')setLatestCandle(message.data);if(message.type==='snapshot'){setSnapshot(message.data);setPrice(message.data.price)}};ws.onclose=()=>{socket.current=null;setConnected(false);if(!stopped){retry=setTimeout(connect,Math.min(30000,1000*2**attempt++))}};ws.onerror=()=>ws.close()};connect();return()=>{stopped=true;clearInterval(statusTimer);if(retry)clearTimeout(retry);socket.current?.close();socket.current=null}},[]);
  useEffect(()=>{const timer=setInterval(()=>setClock(x=>x+1),1000);return()=>clearInterval(timer)},[]);
  const effective=price&&['LIVE','CURRENT','API'].includes(price.status)&&Date.now()-Date.parse(price.receivedAt??price.timestamp)>(snapshot?.staleAfterMs??120000)?{...price,status:'STALE' as const}:price;
  return <MarketContext.Provider value={{snapshot,price:effective,connected,latestCandle,refresh}}>{children}</MarketContext.Provider>
}
export const useMarket=()=>useContext(MarketContext);
export const priceStatusLabel=(price:NormalizedPrice|null,snapshot:MarketSnapshot|null)=>{const status=(price?.status??snapshot?.status??'DISCONNECTED').replaceAll('_',' ');if(price?.status==='SIMULATION'||snapshot?.status==='NOT_CONFIGURED')return 'DEMO';return `*** · ${status}`};
