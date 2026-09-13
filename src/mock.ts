export const candles = Array.from({ length: 80 }, (_, i) => {
  const base = 4520 + i * .45 + Math.sin(i / 4) * 18 + Math.sin(i / 11) * 10;
  const open = i === 0 ? base - 2.6 : 4520 + (i - 1) * .45 + Math.sin((i - 1) / 4) * 18 + Math.sin((i - 1) / 11) * 10;
  const high = Math.max(open, base) + 2.4 + Math.abs(Math.sin(i * 1.7)) * 4.2;
  const low = Math.min(open, base) - 2.1 - Math.abs(Math.cos(i * 1.3)) * 3.8;
  return { i, open: +open.toFixed(1), high: +high.toFixed(1), low: +low.toFixed(1), close: +base.toFixed(1), price: +base.toFixed(1), dxy: 100.3 - i * .008 + Math.sin(i / 7) * .18 };
});
export const news = [
  ['20m', 'Dollar steadies as markets reassess rate path', 'Bearish', 'Macro'],
  ['1h', 'Central-bank purchases remain a structural support', 'Bullish', 'Flows'],
  ['2h', 'Gold volatility firms ahead of employment data', 'Neutral', 'Catalyst'],
  ['4h', 'Real yields hold near the top of the weekly range', 'Bearish', 'Rates']
];
export const catalysts = [
  ['US CPI', 'Sep 10 · 15:30', 'HIGH', '2.8%', 'Cooler → gold positive', 'Hotter → gold negative'],
  ['Jobless Claims', 'Sep 11 · 15:30', 'MED', '231K', 'Weak labor → positive', 'Strong labor → negative'],
  ['FOMC Decision', 'Sep 16 · 21:00', 'HIGH', 'Hold', 'Dovish guidance', 'Hawkish hold']
];
