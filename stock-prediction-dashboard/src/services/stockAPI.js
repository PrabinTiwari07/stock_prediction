import axios from 'axios';

// Our Python ML API backend
const ML_API_BASE_URL = 'http://localhost:5000';

class StockAPI {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 1 * 60 * 1000; // 1 minute for real-time data
    }

    // Get cached data if available and not expired
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    // Set data in cache
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Map frontend timeframes to yfinance parameters
    mapTimeframeToParams(timeframe) {
        const timeframeMap = {
            '10sec': { period: '1d', interval: '1m' },    // 1 minute intervals for 1 day (closest to 10sec)
            '1min': { period: '5d', interval: '1m' },     // 1 minute intervals for 5 days
            '1day': { period: '1y', interval: '1d' },     // Daily intervals for 1 year
            '1week': { period: '2y', interval: '1wk' },   // Weekly intervals for 2 years
            '1month': { period: '5y', interval: '1mo' },  // Monthly intervals for 5 years
            '1year': { period: '1y', interval: '1d' },    // Daily intervals for 1 year
            // Legacy support
            '1y': { period: '1y', interval: '1d' },
            '6m': { period: '6mo', interval: '1d' },
            '3m': { period: '3mo', interval: '1d' }
        };

        return timeframeMap[timeframe] || { period: '1y', interval: '1d' };
    }

    // Fetch real stock data from our Python ML API
    async fetchStockData(symbol, timeframe = '1y') {
        // Clear any cached data to ensure fresh fetch
        this.cache.clear();

        const cacheKey = `${symbol}_${timeframe}`;

        try {
            console.log(`🚀 Fetching REAL data for ${symbol} from ML API...`);

            // Map frontend timeframes to yfinance parameters
            const { period, interval } = this.mapTimeframeToParams(timeframe);

            // First get current stock data from our ML API
            const response = await axios.get(`${ML_API_BASE_URL}/api/stock_data/${symbol}`, {
                timeout: 10000,
                params: {
                    period: period,
                    interval: interval,
                    _t: Date.now() // Cache buster
                }
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                console.log(` Successfully fetched REAL data for ${symbol}! ${response.data.data.length} data points`);
                console.log(`💰 Current price: $${response.data.data[response.data.data.length - 1]?.close}`);
                const data = this.parseMLAPIData(response.data.data, symbol);
                this.setCachedData(cacheKey, data);
                return data;
            } else {
                throw new Error('No data received from ML API');
            }
        } catch (error) {
            console.error(` Error fetching real data for ${symbol}:`, error.message);
            console.log('🔄 Falling back to Yahoo Finance alternative...');

            // Fallback to Alpha Vantage if ML API fails
            try {
                return await this.fetchStockDataAlphaVantage(symbol, timeframe);
            } catch (fallbackError) {
                console.error(' Alpha Vantage also failed:', fallbackError.message);
                console.log('⚠️ Using fallback data for demo purposes');
                return this.generateFallbackData(symbol, timeframe);
            }
        }
    }

    // Parse ML API response
    parseMLAPIData(data, symbol) {
        return data.map(item => ({
            date: item.date,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume),
            price: parseFloat(item.close)
        }));
    }

    // Parse Alpha Vantage response
    parseAlphaVantageData(data, timeframe) {
        const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));

        if (!timeSeriesKey || !data[timeSeriesKey]) {
            throw new Error('Invalid response format');
        }

        const timeSeries = data[timeSeriesKey];
        const parsedData = [];

        const dates = Object.keys(timeSeries).sort();
        const maxDays = timeframe === '1y' ? 365 : timeframe === '6m' ? 180 : 90;
        const recentDates = dates.slice(-maxDays);

        recentDates.forEach(date => {
            const dayData = timeSeries[date];
            parsedData.push({
                date,
                open: parseFloat(dayData['1. open']),
                high: parseFloat(dayData['2. high']),
                low: parseFloat(dayData['3. low']),
                close: parseFloat(dayData['4. close']),
                volume: parseInt(dayData['5. volume']),
                price: parseFloat(dayData['4. close']) // For chart compatibility
            });
        });

        return parsedData;
    }

    // Enhanced fallback data generator (more realistic)
    generateFallbackData(symbol, timeframe) {
        const { period, interval } = this.mapTimeframeToParams(timeframe);

        // Calculate number of data points based on interval and period
        let dataPoints;
        let dateIncrement; // in milliseconds

        switch (interval) {
            case '1m':
                dataPoints = timeframe === '10sec' ? 390 : 2000; // Market hours for 1 day or 5 days
                dateIncrement = 60 * 1000; // 1 minute
                break;
            case '1d':
                if (period === '1y') dataPoints = 252; // Trading days in a year
                else if (period === '6mo') dataPoints = 126;
                else dataPoints = 63; // 3 months
                dateIncrement = 24 * 60 * 60 * 1000; // 1 day
                break;
            case '1wk':
                dataPoints = 104; // 2 years of weeks
                dateIncrement = 7 * 24 * 60 * 60 * 1000; // 1 week
                break;
            case '1mo':
                dataPoints = 60; // 5 years of months
                dateIncrement = 30 * 24 * 60 * 60 * 1000; // 1 month (approximate)
                break;
            default:
                dataPoints = 252;
                dateIncrement = 24 * 60 * 60 * 1000;
        }

        const data = [];

        // Different base prices for different stocks
        const basePrices = {
            'AAPL': 180,
            'GOOGL': 140,
            'MSFT': 340,
            'AMZN': 140,
            'TSLA': 250,
            'META': 320,
            'NVDA': 450,
            'NFLX': 440
        };

        let price = basePrices[symbol] || 150;
        const volatility = interval === '1m' ? 0.001 : 0.02; // Lower volatility for minute data

        for (let i = 0; i < dataPoints; i++) {
            const date = new Date(Date.now() - (dataPoints - i) * dateIncrement);

            // Generate more realistic price movements
            const randomChange = (Math.random() - 0.5) * 2 * volatility;
            const trendFactor = Math.sin(i / 30) * 0.01; // Long-term trend
            const dayOfWeekFactor = date.getDay() === 1 ? 0.005 : 0; // Monday effect

            price *= (1 + randomChange + trendFactor + dayOfWeekFactor);
            price = Math.max(price, 10); // Minimum price

            const open = price * (1 + (Math.random() - 0.5) * 0.01);
            const high = Math.max(open, price) * (1 + Math.random() * 0.02);
            const low = Math.min(open, price) * (1 - Math.random() * 0.02);
            const volume = Math.floor((Math.random() * 0.5 + 0.5) * 50000000); // 25M-75M volume

            // Format date based on interval
            let dateStr;
            if (interval === '1m') {
                dateStr = date.toISOString().slice(0, 19).replace('T', ' ');
            } else {
                dateStr = date.toISOString().split('T')[0];
            }

            data.push({
                date: dateStr,
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(price * 100) / 100,
                volume,
                price: Math.round(price * 100) / 100
            });
        }

        return data;
    }

    // Calculate technical indicators
    calculateTechnicalIndicators(data) {
        if (!data || data.length < 20) return data;

        const indicators = {
            rsi: this.calculateRSI(data, 14),
            macd: this.calculateMACD(data),
            sma20: this.calculateSMA(data, 20),
            sma50: this.calculateSMA(data, 50),
            ema12: this.calculateEMA(data, 12),
            ema26: this.calculateEMA(data, 26),
            bollingerBands: this.calculateBollingerBands(data, 20, 2)
        };

        return data.map((item, index) => ({
            ...item,
            RSI: indicators.rsi[index],
            MACD: indicators.macd.macd[index],
            MACD_Signal: indicators.macd.signal[index],
            MACD_Histogram: indicators.macd.histogram[index],
            SMA_20: indicators.sma20[index],
            SMA_50: indicators.sma50[index],
            EMA_12: indicators.ema12[index],
            EMA_26: indicators.ema26[index],
            BB_Upper: indicators.bollingerBands.upper[index],
            BB_Lower: indicators.bollingerBands.lower[index],
            BB_Middle: indicators.bollingerBands.middle[index]
        }));
    }

    // RSI Calculation
    calculateRSI(data, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];

        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        for (let i = 0; i < data.length; i++) {
            if (i < period) {
                rsi.push(null);
            } else {
                const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }

        return rsi;
    }

    // MACD Calculation
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const emaFast = this.calculateEMAFromPrices(data.map(d => d.close), fastPeriod);
        const emaSlow = this.calculateEMAFromPrices(data.map(d => d.close), slowPeriod);

        const macd = emaFast.map((fast, i) => fast && emaSlow[i] ? fast - emaSlow[i] : null);
        const signal = this.calculateEMAFromPrices(macd.filter(v => v !== null), signalPeriod);

        // Pad signal array to match macd length
        const paddedSignal = [...Array(macd.length - signal.length).fill(null), ...signal];
        const histogram = macd.map((m, i) => m && paddedSignal[i] ? m - paddedSignal[i] : null);

        return { macd, signal: paddedSignal, histogram };
    }

    // EMA Calculation
    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                ema.push(data[i]);
            } else if (data[i] !== null) {
                ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
            } else {
                ema.push(null);
            }
        }

        return ema;
    }

    // EMA Calculation for stock data
    calculateEMA(data, period) {
        const prices = data.map(d => d.close);
        return this.calculateEMAFromPrices(prices, period);
    }

    // EMA Calculation from price array
    calculateEMAFromPrices(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                ema.push(data[i]);
            } else if (data[i] !== null) {
                ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
            } else {
                ema.push(null);
            }
        }

        return ema;
    }

    // SMA Calculation
    calculateSMA(data, period) {
        const sma = [];

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
                sma.push(sum / period);
            }
        }

        return sma;
    }

    // Bollinger Bands Calculation
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(data, period);
        const upper = [];
        const lower = [];
        const middle = sma;

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                upper.push(null);
                lower.push(null);
            } else {
                const slice = data.slice(i - period + 1, i + 1);
                const mean = sma[i];
                const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - mean, 2), 0) / period;
                const standardDeviation = Math.sqrt(variance);

                upper.push(mean + (standardDeviation * stdDev));
                lower.push(mean - (standardDeviation * stdDev));
            }
        }

        return { upper, lower, middle };
    }
}

export default new StockAPI();