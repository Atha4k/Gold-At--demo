import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, BookOpen, BrainCircuit, CalendarClock, CandlestickChart, ChevronRight, CircleHelp, FlaskConical, Gauge, Landmark, Newspaper, RefreshCw, Settings } from 'lucide-react';
import { useCentralData } from './data';

export const nav = [
  ['/', 'Gold Intel', BrainCircuit], ['/market', 'Market', CandlestickChart], ['/macro', 'Macro', Landmark], ['/technicals', 'Technicals', Activity], ['/catalysts', 'Catalysts', CalendarClock], ['/positioning', 'Positioning', Gauge], ['/news', 'News', Newspaper], ['/backtest', 'Backtest Lab', FlaskConical], ['/journal', 'Trade Journal', BookOpen], ['/info', 'Info', CircleHelp], ['/settings', 'Settings', Settings]
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const {refreshing,refresh}=useCentralData();
  return <div className="shell"><aside><div className="brand"><span>AU</span><div><b>GOLD INTEL</b><small>DEMO EXPERIENCE</small></div></div><nav>{nav.map(([to,label,Icon]) => <NavLink key={to} to={to} end={to==='/' }><Icon size={17}/><span>{label}</span><ChevronRight className="chev" size={14}/></NavLink>)}</nav><div className="status"><small>DATA STATUS</small><Status label="Price" value="DEMO"/><Status label="DXY" value="DEMO"/><Status label="Calendar" value="DEMO"/><Status label="News" value="DEMO"/><Status label="Fed rate" value="DEMO"/><button className="data-refresh" disabled={refreshing} onClick={()=>void refresh()}><RefreshCw size={11}/>{refreshing?'REFRESHING...':'REFRESH DATA'}</button><Status label="Macro" value="DEMO"/><Status label="AI" value="NOT CONNECTED"/><Status label="Database" value="DEMO"/></div></aside><main>{children}</main></div>;
}
function Status({label,value}:{label:string,value:string}) {return <div><span><i className="amber"/>{label}</span><b>{value}</b></div> }
export function PageHead({eyebrow='GOLD INTEL / MOCK ENVIRONMENT', title, sub, actions}:{eyebrow?:string,title:string,sub:string,actions?:ReactNode}) { return <header className="pagehead"><div><small>{eyebrow}</small><h1>{title}</h1><p>{sub}</p></div>{actions}</header> }
export function Card({title,meta,children,className=''}:{title?:string,meta?:string,children:ReactNode,className?:string}) { return <section className={`card ${className}`}>{title&&<div className="cardhead"><h2>{title}</h2>{meta&&<span>{meta}</span>}</div>}{children}</section> }
export function Metric({label,value,sub,tone}:{label:string,value:string|number,sub?:string,tone?:string}) { return <div className={`metric ${tone??''}`}><small>{label}</small><strong>{value}</strong>{sub&&<span>{sub}</span>}</div> }
export function MockBadge(){ return <span className="mockbadge"><i/> SIMULATED DATA</span> }
