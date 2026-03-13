# Backend Architecture Plan - AI STOCK

## Data Collection Layer
- **Stock Market API Implementation**: 
  - Utilize Korea Investment & Securities API or OpenDART for real-time and historical data.
  - Implement a Scheduler (e.g., node-cron) to fetch daily OHLCV and supply/demand data after market close (15:30 KST).
- **Data Ingestion Pipeline**:
  - Raw data is fetched, validated, and normalized before being stored in the database.

## AI Analysis Core
- **Classification Engine**:
  - Analyzes historical volatility and volume patterns to classify stocks into Short/Swing/Long terms.
- **Timing Generation**:
  - Uses RSI, MACD, and Bollinger Bands combined with supply/demand trends (foreign/inst. net buying) to generate buy/sell alerts.
- **Scalability**:
  - Deploy AI models as microservices (Python/FastAPI) to handle intensive computations separately from the main Node.js/Go backend.

## Reliability & Trust
- **Validation Logic**: Cross-reference AI signals with traditional indicators to prevent "false positives".
- **Real-time Processing**: WebSocket integration for instant supply/demand alerts.
