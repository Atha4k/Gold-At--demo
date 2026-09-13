# GoldAT Demo

Local-first XAUUSD trading intelligence and decision-support prototype. XAUUSD can use Twelve Data, OANDA, or the local simulator; macro, news, and positioning inputs remain simulated. AI is offline and trade execution is intentionally absent.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:4173 and Vite proxies `/api` calls.

The project includes a gitignored `.env`. Paste your key after `TWELVE_DATA_API_KEY=`, keep `MARKET_DATA_PROVIDER=twelvedata`, and restart the app. Then choose **LIVE · TwelveDataMarketDataProvider** in Settings. Credentials remain backend-only. Without a key, LIVE mode reports `TWELVE DATA NOT CONFIGURED` and never substitutes simulated prices.

The provider requests Twelve Data's verified `XAU/USD` symbol. It first tries the account's WebSocket entitlement and automatically uses cached 60-second REST polling when XAU/USD streaming is unavailable. Twelve Data supplies a midpoint/last price here, so bid, ask, and spread display as unavailable rather than being fabricated. OANDA remains available by setting `MARKET_DATA_PROVIDER=oanda` and its existing credentials.

Forex Factory economic events are loaded by the backend from its weekly JSON export and cached for ten minutes. DXY is resolved through Twelve Data's index catalog; if the actual index is unavailable, GOLD INTEL shows `DXY DATA UNAVAILABLE` and does not substitute an ETF or currency proxy. The effective federal funds rate is loaded from FRED series `EFFR`, cached for six hours, and fails closed until `FRED_API_KEY` is configured. EFFR is an observed daily rate and is never presented as a rate-probability feed.

## Architecture

- `src/`: React/TypeScript terminal UI and feature pages
- `server/`: Express API, SQLite persistence and deterministic analysis pipeline
- `server/providers/`: swappable mock/Twelve Data/OANDA market providers, candle normalization, ATR and structure calculations
- `shared/`: provider-neutral types and default mock state
- `tests/`: scoring and safety-guardrail tests
- `data/gold-intel.db`: local SQLite database, created on first run

The analysis engine converts each independent input to a normalized gold-impact score, applies configurable category weights, measures signal disagreement, then calculates directional probabilities separately from conviction. In LIVE mode, the current provider price and candle-derived structure enter the analysis context. Catalyst risk and low alignment can force `NO TRADE` even when one direction has the higher probability.

Journal records use the 19-column format of the supplied `GOLD_INTEL_Trade_Journal.xlsx`. Use **Import XLSX** or **Export XLSX** on the journal page for compatible workbook exchange.

## Future providers

Keep external data adapters behind typed provider interfaces returning the `MarketInputs` domain shape, then swap them in at the API composition layer. A future AI provider should return structured evidence or narrative enrichment; final trade gates remain deterministic and validated. A future live-price provider should map vendor timestamps, freshness and symbols before reaching the analysis engine.

## Limitations

- Backtests, news and macro series are generated mock data. The Market chart uses live provider candles in LIVE mode.
- Settings weights are represented in the engine but not yet editable in the UI.
- No authentication, broker connectivity, order routing or real-money execution.
