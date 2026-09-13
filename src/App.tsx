import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components';
import { Dashboard } from './pages/Dashboard';
import { Market, Macro, Technicals, Catalysts, Positioning, News, Backtest, Journal, InfoPage, SettingsPage } from './pages/Pages';
export default function App(){
  const [accepted,setAccepted]=useState(()=>sessionStorage.getItem('gold-intel-demo-accepted')==='true');
  const [theme,setTheme]=useState<'dark'|'light'>(()=>localStorage.getItem('gold-intel-theme')==='light'?'light':'dark');
  useEffect(()=>{document.documentElement.dataset.theme=theme;const onTheme=(event:Event)=>setTheme((event as CustomEvent<'dark'|'light'>).detail);window.addEventListener('gold-intel-theme',onTheme);return()=>window.removeEventListener('gold-intel-theme',onTheme)},[theme]);
  const acceptDemo=()=>{sessionStorage.setItem('gold-intel-demo-accepted','true');setAccepted(true)};
  return <><Shell><Routes><Route path="/" element={<Dashboard/>}/><Route path="/market" element={<Market/>}/><Route path="/macro" element={<Macro/>}/><Route path="/technicals" element={<Technicals/>}/><Route path="/catalysts" element={<Catalysts/>}/><Route path="/positioning" element={<Positioning/>}/><Route path="/news" element={<News/>}/><Route path="/backtest" element={<Backtest/>}/><Route path="/journal" element={<Journal/>}/><Route path="/info" element={<InfoPage/>}/><Route path="/settings" element={<SettingsPage/>}/></Routes></Shell>{!accepted&&<div className="demo-gate" role="dialog" aria-modal="true" aria-labelledby="demo-title"><section><span className="demo-kicker">GOLD INTEL · DEMO ACCESS</span><h1 id="demo-title">Welcome to the demo</h1><p>All prices, signals, news, events, analysis results and performance figures shown in this account are simulated mock data for demonstration purposes.</p><div className="demo-warning">This demo is not live market data, financial advice, or an execution service. Do not make trading decisions based on it.</div><button className="primary" onClick={acceptDemo}>I UNDERSTAND — ENTER DEMO</button></section></div>}</>;
}
