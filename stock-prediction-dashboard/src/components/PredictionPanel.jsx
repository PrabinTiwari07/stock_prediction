import { useEffect, useState } from 'react';
import predictionAPI from '../services/predictionAPI';
import technicalIndicatorsService from '../services/technicalIndicatorsService';

const PredictionPanel = ({ selectedStock, stockData, predictions, setPredictions, loading }) => {
    const [predictionDays, setPredictionDays] = useState(7);
    const [prediction, setPrediction] = useState(null);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [technicalIndicators, setTechnicalIndicators] = useState(null);
    const [confidence, setConfidence] = useState(null);

    // Fetch technical indicators when stock changes
    useEffect(() => {
        if (selectedStock) {
            // Clear previous indicators immediately when stock changes
            setTechnicalIndicators(null);

            fetchTechnicalIndicators();

            // Subscribe to indicator updates from the centralized service
            const unsubscribe = technicalIndicatorsService.subscribe((symbol, data) => {
                if (symbol === selectedStock) {
                    console.log(`PredictionPanel: Updating indicators for ${symbol}:`, data);
                    setTechnicalIndicators(data);
                }
            });

            return () => {
                unsubscribe();
                // Clear indicators when component unmounts or stock changes
                setTechnicalIndicators(null);
            };
        } else {
            setTechnicalIndicators(null);
        }
    }, [selectedStock]);

    const fetchTechnicalIndicators = async () => {
        try {
            console.log('PredictionPanel: Fetching indicators for', selectedStock);

            // Clear any cached data for this symbol first
            technicalIndicatorsService.clearCache(selectedStock);

            const result = await technicalIndicatorsService.getRealTimeIndicators(selectedStock);
            if (result.success) {
                console.log('PredictionPanel: Received indicators:', result.data);
                setTechnicalIndicators(result.data);
            } else {
                console.error('PredictionPanel: Failed to fetch indicators:', result.error);
            }
        } catch (error) {
            console.error('Error fetching technical indicators:', error);
        }
    };

    const handlePredictionDaysChange = (newDays) => {
        setPredictionDays(Number(newDays));
        // Clear current predictions to encourage new generation
        setPredictions([]);
        setError(null);
    };

    const generatePrediction = async () => {
        if (!selectedStock) return;

        setPredictionLoading(true);
        setError(null);

        try {
            const result = await predictionAPI.generatePrediction(selectedStock, predictionDays);

            if (result.success) {
                setPredictions(result.data.predictions);
                setConfidence(result.data.signal_confidence);

                // Update technical indicators if available
                if (result.data.technical_indicators) {
                    setTechnicalIndicators(prev => ({
                        ...prev,
                        ...result.data.technical_indicators
                    }));
                }
            } else {
                setError('Failed to generate prediction');
            }
        } catch (error) {
            console.error('Prediction error:', error);
            setError('Error generating prediction. Please try again.');
        } finally {
            setPredictionLoading(false);
        }
    };

    const getSignal = () => {
        if (!predictions || predictions.length === 0) return null;

        // Use the current price from technical indicators or stock data
        const currentPrice = technicalIndicators?.current_price ||
            (stockData && stockData.length > 0 ? stockData[stockData.length - 1].close || stockData[stockData.length - 1].price : null);

        if (!currentPrice) return null;

        const futurePrice = predictions[predictions.length - 1].predicted_price || predictions[predictions.length - 1].price;
        const change = ((futurePrice - currentPrice) / currentPrice) * 100;

        if (change > 2) return predictionAPI.getSignalInterpretation(1, confidence || 0.75);
        if (change < -2) return predictionAPI.getSignalInterpretation(-1, confidence || 0.75);
        return predictionAPI.getSignalInterpretation(0, confidence || 0.75);
    };

    const signal = getSignal();

    const formatIndicatorValue = (value, type = 'default') => {
        if (value === null || value === undefined) return 'N/A';

        switch (type) {
            case 'price':
                return `$${value.toFixed(2)}`;
            case 'percentage':
                return `${value.toFixed(2)}%`;
            case 'decimal':
                return value.toFixed(4);
            default:
                return value.toFixed(2);
        }
    };

    return (
        <div className="prediction-panel">
            <div className="panel-header">
                <h3>AI Stock Analysis</h3>
            </div>

            <div className="prediction-controls">
                <div className="control-group">
                    <label>Prediction Period:</label>
                    <select
                        value={predictionDays}
                        onChange={(e) => setPredictionDays(Number(e.target.value))}
                        disabled={predictionLoading}
                    >
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                    </select>
                </div>

                <button
                    className="predict-btn"
                    onClick={generatePrediction}
                    disabled={!selectedStock || loading || predictionLoading}
                >
                    {predictionLoading ? 'Analyzing...' : 'Generate Analysis'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={generatePrediction}>Retry</button>
                </div>
            )}

            {signal && (
                <div className="trading-signal">
                    <div className="signal-header">Trading Signal</div>
                    <div
                        className="signal-badge"
                        style={{ backgroundColor: signal.color }}
                    >
                        {signal.type}
                    </div>
                    <div className="signal-details">
                        <div className="confidence">
                            Confidence: {(signal.confidence * 100).toFixed(1)}% ({signal.confidenceLevel})
                        </div>
                        <div className="description">{signal.description}</div>
                        <div className="action">{signal.action}</div>
                        <div className="reliability">Reliability: {signal.reliability}</div>
                    </div>
                </div>
            )}

            {predictions && predictions.length > 0 && (
                <div className="prediction-results">
                    <h4>Price Predictions ({predictionDays} days)</h4>
                    <div className="predictions-list">
                        {predictions.slice(0, 5).map((pred, index) => (
                            <div key={index} className="prediction-item">
                                <span>Day {pred.day || index + 1}:</span>
                                <span className="price">
                                    ${(pred.predicted_price || pred.price).toFixed(2)}
                                </span>
                                <span className="conf">
                                    {((pred.confidence || 0.75) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                        {predictions.length > 5 && (
                            <div className="more-predictions">
                                ...and {predictions.length - 5} more predictions
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="technical-indicators">
                <h4>Market Analysis {technicalIndicators && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${technicalIndicators.fallback ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {technicalIndicators.fallback ? 'Demo' : 'Live'}
                    </span>
                )}</h4>
                <div className="indicators-grid">
                    <div className="indicator">
                        <span>RSI:</span>
                        <span className={`value ${technicalIndicators?.rsi > 70 ? 'negative' : technicalIndicators?.rsi < 30 ? 'positive' : ''}`}>
                            {formatIndicatorValue(technicalIndicators?.rsi)}
                            {technicalIndicators?.rsi > 70 ? ' (Overbought)' :
                                technicalIndicators?.rsi < 30 ? ' (Oversold)' :
                                    ' (Neutral)'}
                        </span>
                    </div>
                    <div className="indicator">
                        <span>MACD:</span>
                        <span className={`value ${technicalIndicators?.macd > technicalIndicators?.macd_signal ? 'positive' : 'negative'}`}>
                            {formatIndicatorValue(technicalIndicators?.macd, 'decimal')}
                            {technicalIndicators?.macd > technicalIndicators?.macd_signal ? ' (Bullish)' : ' (Bearish)'}
                        </span>
                    </div>
                    <div className="indicator">
                        <span>20-Day Average:</span>
                        <span className={`value ${technicalIndicators?.current_price > technicalIndicators?.sma_20 ? 'positive' : 'negative'}`}>
                            {formatIndicatorValue(technicalIndicators?.sma_20, 'price')}
                            {technicalIndicators?.current_price > technicalIndicators?.sma_20 ? ' (Above)' : ' (Below)'}
                        </span>
                    </div>
                    <div className="indicator">
                        <span>50-Day Average:</span>
                        <span className={`value ${technicalIndicators?.current_price > technicalIndicators?.sma_50 ? 'positive' : 'negative'}`}>
                            {formatIndicatorValue(technicalIndicators?.sma_50, 'price')}
                            {technicalIndicators?.current_price > technicalIndicators?.sma_50 ? ' (Above)' : ' (Below)'}
                        </span>
                    </div>
                </div>

                {technicalIndicators?.fallback && (
                    <div className="fallback-notice">
                        <small>Demo mode - Connect to live data for real-time analysis</small>
                    </div>
                )}

                {!technicalIndicators?.fallback && technicalIndicators?.source && (
                    <div className="real-data-notice">
                        <small>Live market data from {technicalIndicators.source}</small>
                    </div>
                )}
            </div>

            <div className="ai-status">
                <div className="status-info">
                    <div className="status-item">
                        <span>Analysis Engine:</span>
                        <span>Advanced Machine Learning</span>
                    </div>
                    <div className="status-item">
                        <span>Data Source:</span>
                        <span>{technicalIndicators?.source || 'Market Data API'}</span>
                    </div>
                    <div className="status-item">
                        <span>Last Updated:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PredictionPanel;
