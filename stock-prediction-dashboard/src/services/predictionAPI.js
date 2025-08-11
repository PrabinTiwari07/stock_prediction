import axios from 'axios';

const ML_API_BASE_URL = 'http://localhost:5000/api';

class PredictionAPI {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes for predictions
    }

    // Get cached prediction if available and not expired
    getCachedPrediction(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    // Set prediction in cache
    setCachedPrediction(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Health check for ML API
    async checkAPIHealth() {
        try {
            const response = await axios.get(`${ML_API_BASE_URL}/health`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('ML API health check failed:', error.message);
            return null;
        }
    }

    async generatePrediction(symbol, days = 7, modelType = 'Random Forest') {
        // Clear cache to always get fresh predictions for debugging
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${symbol}_${days}_${modelType}_${today}`;

        // Skip cache for now to ensure we always get fresh real data
        console.log(`Generating REAL ML prediction for ${symbol} using ${modelType} (FRESH - no cache)...`);

        try {
            const requestData = {
                symbol: symbol.toUpperCase(),
                days: parseInt(days),
                model_type: modelType
            };

            console.log('Sending prediction request:', requestData);

            const response = await axios.post(`${ML_API_BASE_URL}/predict`, requestData, {
                timeout: 30000, // 30 seconds timeout for ML processing
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Received prediction response:', response.status, response.statusText);
            console.log('Prediction data:', response.data);
            console.log(`Successfully generated REAL prediction for ${symbol}!`);

            if (!response.data || !response.data.predictions) {
                throw new Error('Invalid prediction response format');
            }

            const result = {
                success: true,
                data: {
                    ...response.data,
                    fallback: false, // This is REAL ML prediction
                    source: 'ML API + Yahoo Finance'
                },
                cached: false
            };

            // Cache the result
            this.setCachedPrediction(cacheKey, result.data);
            return result;

        } catch (error) {
            console.error('ML API prediction failed:', error.response?.status, error.response?.statusText);
            console.error('Error details:', error.message);
            console.error('Full error:', error);

            // Check if it's a network/server error vs data error
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                console.log('Network error - ML API server might be down');
            } else if (error.response?.status >= 500) {
                console.log('Server error - ML API internal error');
            } else if (error.response?.status >= 400) {
                console.log('Client error - Check request format');
            }

            console.log('Falling back to mock prediction due to error above');

            // Fallback to mock prediction
            return this.generateMockPrediction(symbol, days, modelType);
        }
    }

    // Get technical indicators from ML API
    async getTechnicalIndicators(symbol) {
        try {
            const upperSymbol = symbol.toUpperCase();
            console.log(`Fetching real-time technical indicators for ${upperSymbol}...`);

            const response = await axios.get(`${ML_API_BASE_URL}/indicators/${upperSymbol}`, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Received technical indicators for ${upperSymbol}:`, response.data);

            // Ensure the response contains the correct symbol
            const dataWithSymbol = {
                ...response.data,
                symbol: upperSymbol,
                fallback: false,
                source: 'Yahoo Finance Real-time API',
                timestamp: new Date().toISOString()
            };

            return {
                success: true,
                data: dataWithSymbol
            };

        } catch (error) {
            console.error(`Failed to fetch technical indicators for ${symbol}:`, error.message);

            // Return fallback mock data with correct symbol
            return {
                success: true,
                data: this.getMockTechnicalIndicators(symbol)
            };
        }
    }

    // Generate mock prediction as fallback
    generateMockPrediction(symbol, days = 7, modelType = 'Random Forest') {
        console.log(`Generating mock prediction for ${symbol} (${days} days)`);

        // Generate mock predictions
        const basePrice = 100 + Math.random() * 200; // Random base price between 100-300
        const predictions = [];

        for (let i = 1; i <= days; i++) {
            const variance = (Math.random() - 0.5) * 0.1; // +/- 5% daily variance
            const price = basePrice * (1 + variance * i / days);

            predictions.push({
                day: i,
                predicted_price: Math.round(price * 100) / 100,
                confidence: 0.65 + Math.random() * 0.2 // 65-85% confidence
            });
        }

        return {
            success: true,
            data: {
                predictions: predictions,
                signal_confidence: 0.7,
                technical_indicators: this.getMockTechnicalIndicators(symbol).data,
                fallback: true,
                source: 'Mock Data (ML API Unavailable)',
                model_used: modelType,
                symbol: symbol.toUpperCase()
            },
            cached: false
        };
    }

    // Get mock technical indicators as fallback
    getMockTechnicalIndicators(symbol) {
        const basePrice = 100 + Math.random() * 200;

        return {
            symbol: symbol.toUpperCase(),
            current_price: Math.round(basePrice * 100) / 100,
            rsi: Math.round((30 + Math.random() * 40) * 100) / 100, // 30-70 range
            macd: Math.round((Math.random() - 0.5) * 2 * 10000) / 10000, // -1 to 1
            macd_signal: Math.round((Math.random() - 0.5) * 1.5 * 10000) / 10000,
            sma_20: Math.round((basePrice * (0.95 + Math.random() * 0.1)) * 100) / 100,
            sma_50: Math.round((basePrice * (0.90 + Math.random() * 0.1)) * 100) / 100,
            fallback: true,
            source: 'Mock Data (API Unavailable)',
            timestamp: new Date().toISOString()
        };
    }


    // Get trading signal interpretation
    getSignalInterpretation(signal, confidence) {
        const signals = {
            1: {
                type: 'BUY',
                color: '#10b981',
                description: 'Positive momentum detected',
                action: 'Consider buying'
            },
            0: {
                type: 'HOLD',
                color: '#f59e0b',
                description: 'Neutral market conditions',
                action: 'Hold current position'
            },
            '-1': {
                type: 'SELL',
                color: '#ef4444',
                description: 'Negative momentum detected',
                action: 'Consider selling'
            }
        };

        const signalInfo = signals[signal] || signals[0];
        const confidenceLevel = confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low';

        return {
            ...signalInfo,
            confidence: confidence,
            confidenceLevel: confidenceLevel,
            reliability: confidence > 0.7 ? 'Reliable' : 'Use with caution'
        };
    }
}

export default new PredictionAPI();