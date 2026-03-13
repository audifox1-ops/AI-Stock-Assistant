-- AI STOCK Database Schema

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE portfolio_stocks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(100) NOT NULL,
    avg_buy_price DECIMAL(18, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    classification VARCHAR(20), -- 'short', 'swing', 'long'
    target_price DECIMAL(18, 2),
    stop_loss_price DECIMAL(18, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE interest_stocks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10) NOT NULL,
    alert_enabled BOOLEAN DEFAULT TRUE,
    last_processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE market_data_history (
    stock_code VARCHAR(10) NOT NULL,
    trade_date DATE NOT NULL,
    open_p DECIMAL(18, 2),
    high_p DECIMAL(18, 2),
    low_p DECIMAL(18, 2),
    close_p DECIMAL(18, 2),
    volume BIGINT,
    foreign_buy BIGINT,
    institutional_buy BIGINT,
    PRIMARY KEY (stock_code, trade_date)
);
