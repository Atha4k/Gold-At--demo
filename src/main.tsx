import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { MarketProvider } from './market';
import { DataProvider } from './data';
import './styles.css';
import './data-status.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><MarketProvider><DataProvider><App /></DataProvider></MarketProvider></BrowserRouter></React.StrictMode>);
