import predictionAPI from './predictionAPI';

/**
 * Centralized Technical Indicators Service
 * 
 * This service ensures that all components use the same real-time technical indicators
 * from the ML API backend, providing consistency across the dashboard.
 */
class TechnicalIndicatorsService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 1000; // Reduced to 5 seconds for debugging
        this.subscribers = new Set();
        this.lastUpdate = null;

        // Clear cache on initialization to ensure fresh data
        this.clearCache();
        console.log('TechnicalIndicatorsService initialized - cache cleared');
    }

    // Subscribe to indicator updates
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    // Notify all subscribers of updates
    notifySubscribers(symbol, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(symbol, data);
            } catch (error) {
                console.error('Error notifying subscriber:', error);
            }
        });
    }

    // Get cached indicators if available and not expired
    getCachedIndicators(symbol) {
        const cached = this.cache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    // Set indicators in cache
    setCachedIndicators(symbol, data) {
        this.cache.set(symbol, {
            data,
            timestamp: Date.now()
        });
        this.lastUpdate = new Date();
    }

    // Get real-time technical indicators for a symbol
    async getRealTimeIndicators(symbol) {
        // Always clear cache for this symbol to ensure fresh data
        this.cache.delete(symbol);

        console.log(`Fetching real-time indicators for ${symbol} (FRESH - no cache)...`);

        try {
            const result = await predictionAPI.getTechnicalIndicators(symbol);

            if (result.success) {
                // Ensure the data is for the correct symbol
                if (result.data.symbol && result.data.symbol.toUpperCase() !== symbol.toUpperCase()) {
                    console.warn(`Symbol mismatch: requested ${symbol}, got ${result.data.symbol}`);
                }

                // Add symbol to data to ensure correctness
                const dataWithSymbol = {
                    ...result.data,
                    symbol: symbol.toUpperCase(),
                    timestamp: new Date().toISOString()
                };

                // Cache the result with symbol-specific key
                this.setCachedIndicators(symbol, dataWithSymbol);

                // Notify all subscribers with specific symbol
                this.notifySubscribers(symbol, dataWithSymbol);

                console.log(`Successfully fetched indicators for ${symbol}`);
                console.log(`${symbol} - RSI: ${dataWithSymbol.rsi?.toFixed(2)}, MACD: ${dataWithSymbol.macd?.toFixed(4)}`);
                console.log(`${symbol} - Current Price: $${dataWithSymbol.current_price?.toFixed(2)}`);

                return {
                    success: true,
                    data: dataWithSymbol
                };
            }

            throw new Error('Failed to fetch indicators');

        } catch (error) {
            console.error(`Error fetching indicators for ${symbol}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Ensure all components have the same indicators
    async syncIndicators(symbol) {
        const result = await this.getRealTimeIndicators(symbol);
        if (result.success) {
            // Force update all components by clearing cache and notifying
            this.cache.delete(symbol);
            this.notifySubscribers(symbol, result.data);
        }
        return result;
    }

    // Get formatted indicator values for display
    formatIndicators(indicators) {
        if (!indicators) return {};

        return {
            rsi: {
                value: indicators.rsi?.toFixed(2) || 'N/A',
                status: indicators.rsi > 70 ? 'Overbought' :
                    indicators.rsi < 30 ? 'Oversold' : 'Neutral',
                color: indicators.rsi > 70 ? '#ef4444' :
                    indicators.rsi < 30 ? '#10b981' : '#6b7280'
            },
            macd: {
                value: indicators.macd?.toFixed(4) || 'N/A',
                signal: indicators.macd_signal?.toFixed(4) || 'N/A',
                status: indicators.macd > indicators.macd_signal ? 'Bullish' : 'Bearish',
                color: indicators.macd > indicators.macd_signal ? '#10b981' : '#ef4444'
            },
            sma20: {
                value: indicators.sma_20 ? `$${indicators.sma_20.toFixed(2)}` : 'N/A',
                status: indicators.current_price > indicators.sma_20 ? 'Above' : 'Below',
                color: indicators.current_price > indicators.sma_20 ? '#10b981' : '#ef4444'
            },
            sma50: {
                value: indicators.sma_50 ? `$${indicators.sma_50.toFixed(2)}` : 'N/A',
                status: indicators.current_price > indicators.sma_50 ? 'Above' : 'Below',
                color: indicators.current_price > indicators.sma_50 ? '#10b981' : '#ef4444'
            },
            currentPrice: indicators.current_price ? `$${indicators.current_price.toFixed(2)}` : 'N/A',
            source: indicators.source || 'Unknown',
            fallback: indicators.fallback || false,
            lastUpdate: this.lastUpdate
        };
    }

    // Clear cache for a symbol or all symbols
    clearCache(symbol = null) {
        if (symbol) {
            this.cache.delete(symbol);
        } else {
            this.cache.clear();
        }
    }

    // Get cache status
    getCacheStatus() {
        return {
            size: this.cache.size,
            symbols: Array.from(this.cache.keys()),
            lastUpdate: this.lastUpdate
        };
    }
}

// Export singleton instance
export default new TechnicalIndicatorsService();
