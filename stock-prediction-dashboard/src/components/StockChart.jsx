import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import stockAPI from '../services/stockAPI';
import technicalIndicatorsService from '../services/technicalIndicatorsService';
import '../styles/StockChart.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const StockChart = ({
    selectedStock,
    stockData,
    setStockData,
    loading,
    setLoading,
    onAddToWatchlist,
    showWatchlistForm,
    setShowWatchlistForm,
    newWatchlistItem,
    setNewWatchlistItem,
    addToWatchlist
}) => {
    const [timeframe, setTimeframe] = useState('1day');
    const [showIndicators, setShowIndicators] = useState(false);
    const [selectedIndicators, setSelectedIndicators] = useState(['RSI', 'MACD']);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState(null);

    const availableIndicators = [
        { key: 'RSI', name: 'RSI (Relative Strength Index)', color: '#8b5cf6' },
        { key: 'MACD', name: 'MACD', color: '#06b6d4' },
        { key: 'MACD_Signal', name: 'MACD Signal', color: '#f59e0b' },
        { key: 'SMA_20', name: 'SMA (20)', color: '#10b981' },
        { key: 'SMA_50', name: 'SMA (50)', color: '#ef4444' },
        { key: 'BB_Upper', name: 'Bollinger Upper', color: '#6366f1' },
        { key: 'BB_Lower', name: 'Bollinger Lower', color: '#6366f1' },
        { key: 'BB_Middle', name: 'Bollinger Middle', color: '#8b5cf6' },
        { key: 'EMA_12', name: 'EMA (12)', color: '#f97316' },
        { key: 'EMA_26', name: 'EMA (26)', color: '#84cc16' }
    ];

    useEffect(() => {
        fetchStockData();
    }, [selectedStock, timeframe]);

    const handleIndicatorToggle = (indicatorKey) => {
        setSelectedIndicators(prev => {
            if (prev.includes(indicatorKey)) {
                return prev.filter(key => key !== indicatorKey);
            } else {
                return [...prev, indicatorKey];
            }
        });
    };

    const selectAllIndicators = () => {
        setSelectedIndicators(availableIndicators.map(ind => ind.key));
    };

    const clearAllIndicators = () => {
        setSelectedIndicators([]);
    };

    const fetchStockData = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log(` Fetching REAL data for ${selectedStock} (${timeframe})...`);

            // Force bypass cache by adding timestamp
            const data = await stockAPI.fetchStockData(selectedStock, timeframe);

            console.log(`Received data for ${selectedStock}:`, data?.length, 'data points');
            console.log(`Latest price: $${data?.[data.length - 1]?.close || 'N/A'}`);

            if (!data || data.length === 0) {
                throw new Error('No data received');
            }

            // Calculate technical indicators using the centralized ML API service
            // This ensures consistency across all components
            const dataWithIndicators = await stockAPI.calculateTechnicalIndicators(data);
            setStockData(dataWithIndicators);

            // Also sync with the centralized technical indicators service
            // to ensure all components have the same real-time values
            try {
                await technicalIndicatorsService.syncIndicators(selectedStock);
            } catch (indicatorError) {
                console.warn('Could not sync technical indicators:', indicatorError.message);
            }

        } catch (error) {
            console.error('Error fetching stock data:', error);
            setError(`Failed to load data for ${selectedStock}: ${error.message}`);
            setStockData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatChartData = () => {
        if (!stockData || stockData.length === 0) return null;

        const datasets = [
            {
                label: `${selectedStock} Price`,
                data: stockData.map(d => d.close || d.price),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 5,
            }
        ];

        // Add technical indicators if enabled
        if (showIndicators) {
            // Add SMA 20
            if (stockData.some(d => d.sma20)) {
                datasets.push({
                    label: 'SMA 20',
                    data: stockData.map(d => d.sma20),
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 0,
                });
            }

            // Add SMA 50
            if (stockData.some(d => d.sma50)) {
                datasets.push({
                    label: 'SMA 50',
                    data: stockData.map(d => d.sma50),
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 0,
                });
            }

            // Add Bollinger Bands
            if (stockData.some(d => d.bollingerUpper)) {
                datasets.push({
                    label: 'Bollinger Upper',
                    data: stockData.map(d => d.bollingerUpper),
                    borderColor: '#6b7280',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                });

                datasets.push({
                    label: 'Bollinger Lower',
                    data: stockData.map(d => d.bollingerLower),
                    borderColor: '#6b7280',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                });
            }
        }

        return {
            labels: stockData.map(d => d.date),
            datasets
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    filter: function (item, chart) {
                        // Hide indicator legends if indicators are off
                        if (!showIndicators && item.text !== `${selectedStock} Price`) {
                            return false;
                        }
                        return true;
                    }
                }
            },
            title: {
                display: true,
                text: `${selectedStock} Stock Price Chart (${timeframe})`,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += '$' + context.parsed.y.toFixed(2);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: timeframe === '10sec' || timeframe === '1min' ? 'Time' : 'Date'
                },
                ticks: {
                    maxTicksLimit: timeframe === '10sec' || timeframe === '1min' ? 15 : 10,
                    callback: function (value, index, values) {
                        const label = this.getLabelForValue(value);
                        if (timeframe === '10sec' || timeframe === '1min') {
                            // Show only time for intraday data
                            return label.includes(' ') ? label.split(' ')[1] : label;
                        }
                        return label;
                    }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Price ($)'
                },
                ticks: {
                    callback: function (value) {
                        return '$' + value.toFixed(2);
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    const getStatsData = () => {
        if (!stockData || stockData.length === 0) return null;

        const latest = stockData[stockData.length - 1];
        if (!latest) return null;

        const currentPrice = latest.close || latest.price;
        let change, changePercent, periodHigh, periodLow, comparisonPoint;

        // Determine comparison based on timeframe
        if (timeframe === '1year') {
            // Compare with first data point (year ago)
            comparisonPoint = stockData[0];
            const yearAgoPrice = comparisonPoint.close || comparisonPoint.price;
            change = currentPrice - yearAgoPrice;
            changePercent = (change / yearAgoPrice) * 100;

            // Get high/low for the entire year
            periodHigh = Math.max(...stockData.map(d => d.high || d.price));
            periodLow = Math.min(...stockData.map(d => d.low || d.price));
        } else if (timeframe === '1month') {
            // Compare with first data point (month ago)
            comparisonPoint = stockData[0];
            const monthAgoPrice = comparisonPoint.close || comparisonPoint.price;
            change = currentPrice - monthAgoPrice;
            changePercent = (change / monthAgoPrice) * 100;

            // Get high/low for the entire month
            periodHigh = Math.max(...stockData.map(d => d.high || d.price));
            periodLow = Math.min(...stockData.map(d => d.low || d.price));
        } else if (timeframe === '1week') {
            // Compare with first data point (week ago)
            comparisonPoint = stockData[0];
            const weekAgoPrice = comparisonPoint.close || comparisonPoint.price;
            change = currentPrice - weekAgoPrice;
            changePercent = (change / weekAgoPrice) * 100;

            // Get high/low for the entire week
            periodHigh = Math.max(...stockData.map(d => d.high || d.price));
            periodLow = Math.min(...stockData.map(d => d.low || d.price));
        } else {
            // For short timeframes (10sec, 1min, 1day), compare with previous data point
            const previous = stockData[stockData.length - 2];
            if (!previous) return null;

            const previousPrice = previous.close || previous.price;
            change = currentPrice - previousPrice;
            changePercent = (change / previousPrice) * 100;

            // For intraday, show daily high/low from recent data
            if (timeframe === '10sec' || timeframe === '1min') {
                periodHigh = Math.max(...stockData.slice(-390).map(d => d.high || d.price)); // Last trading day
                periodLow = Math.min(...stockData.slice(-390).map(d => d.low || d.price));
            } else {
                periodHigh = Math.max(...stockData.slice(-1).map(d => d.high || d.price));
                periodLow = Math.min(...stockData.slice(-1).map(d => d.low || d.price));
            }
        }

        return {
            currentPrice,
            change,
            changePercent,
            volume: latest.volume,
            periodHigh,
            periodLow,
            timeframe
        };
    };

    // Prepare technical indicators chart data
    const prepareIndicatorsChartData = () => {
        if (!stockData || stockData.length === 0) return null;

        const labels = stockData.map(item => item.date);
        const datasets = [];

        selectedIndicators.forEach(indicatorKey => {
            const indicator = availableIndicators.find(ind => ind.key === indicatorKey);
            if (!indicator) return;

            // Check if indicator data exists in stock data
            const hasData = stockData.some(item => item[indicatorKey] !== undefined && item[indicatorKey] !== null);
            if (!hasData) return;

            const data = stockData.map(item => {
                const value = item[indicatorKey];
                return value !== undefined && value !== null ? parseFloat(value) : null;
            });

            datasets.push({
                label: indicator.name,
                data: data,
                borderColor: indicator.color,
                backgroundColor: indicator.color + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                yAxisID: indicatorKey === 'RSI' ? 'y1' : 'y'
            });
        });

        return { labels, datasets };
    };

    const indicatorsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            title: {
                display: true,
                text: `${selectedStock} - Technical Indicators`,
                font: {
                    size: 16,
                    weight: 'bold'
                },
                color: '#374151'
            },
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#374151',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function (context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;

                        if (label.includes('RSI')) {
                            return `${label}: ${value?.toFixed(2)}`;
                        } else if (label.includes('MACD')) {
                            return `${label}: ${value?.toFixed(4)}`;
                        } else {
                            return `${label}: $${value?.toFixed(2)}`;
                        }
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date',
                    color: '#6b7280'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    maxTicksLimit: 10,
                    color: '#6b7280'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Price ($)',
                    color: '#6b7280'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: '#6b7280',
                    callback: function (value) {
                        return '$' + value.toFixed(0);
                    }
                }
            },
            y1: {
                type: 'linear',
                display: selectedIndicators.includes('RSI'),
                position: 'right',
                title: {
                    display: true,
                    text: 'RSI',
                    color: '#6b7280'
                },
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: '#6b7280',
                    min: 0,
                    max: 100
                }
            }
        }
    };

    const stats = getStatsData();
    const chartData = formatChartData();
    const indicatorsChartData = prepareIndicatorsChartData();

    return (
        <div className="stock-chart">
            <div className="chart-header">
                <h3>{selectedStock} Price Chart ({timeframe})</h3>
                <div className="chart-controls">
                    <div className="timeframe-buttons">
                        {['10sec', '1min', '1day', '1week', '1month', '1year'].map(tf => (
                            <button
                                key={tf}
                                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                                onClick={() => setTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button
                        className={`indicator-btn ${showIndicators ? 'active' : ''}`}
                        onClick={() => setShowIndicators(!showIndicators)}
                    >
                        Technical Indicators
                    </button>
                    {onAddToWatchlist && (
                        <button
                            onClick={onAddToWatchlist}
                            className="watchlist-btn"
                            title={`Add ${selectedStock} to watchlist`}
                        >
                            + Add to Watchlist
                        </button>
                    )}
                </div>
            </div>

            <div className="chart-container">
                {loading ? (
                    <div className="loading">Loading chart data...</div>
                ) : error ? (
                    <div className="error">
                        <p>{error}</p>
                        <button onClick={fetchStockData}>Retry</button>
                    </div>
                ) : chartData ? (
                    <Line data={chartData} options={chartOptions} />
                ) : (
                    <div className="no-data">No data available</div>
                )}
            </div>

            {stats && (
                <div className="chart-stats">
                    <div className="stat">
                        <span>Current Price:</span>
                        <span>${stats.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="stat">
                        <span>
                            {timeframe === '1year' ? 'Year Change:' :
                                timeframe === '1month' ? 'Month Change:' :
                                    timeframe === '1week' ? 'Week Change:' :
                                        timeframe === '1day' ? 'Day Change:' :
                                            'Period Change:'}
                        </span>
                        <span className={stats.change >= 0 ? 'positive' : 'negative'}>
                            {stats.change >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
                        </span>
                    </div>
                    <div className="stat">
                        <span>Volume:</span>
                        <span>{stats.volume.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                        <span>
                            {timeframe === '1year' ? 'Year High:' :
                                timeframe === '1month' ? 'Month High:' :
                                    timeframe === '1week' ? 'Week High:' :
                                        timeframe === '1day' ? 'Day High:' :
                                            'Period High:'}
                        </span>
                        <span>${stats.periodHigh.toFixed(2)}</span>
                    </div>
                    <div className="stat">
                        <span>
                            {timeframe === '1year' ? 'Year Low:' :
                                timeframe === '1month' ? 'Month Low:' :
                                    timeframe === '1week' ? 'Week Low:' :
                                        timeframe === '1day' ? 'Day Low:' :
                                            'Period Low:'}
                        </span>
                        <span>${stats.periodLow.toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Technical Indicators Section */}
            <div className="technical-indicators-section">
                <div className="indicators-header">
                    <h3>Technical Indicators</h3>
                    <div className="indicators-controls">
                        <div className="dropdown-container">
                            <button
                                className="dropdown-toggle"
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                Select Indicators ({selectedIndicators.length})
                                <span className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}>▼</span>
                            </button>

                            {showDropdown && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-actions">
                                        <button
                                            className="action-btn select-all"
                                            onClick={selectAllIndicators}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            className="action-btn clear-all"
                                            onClick={clearAllIndicators}
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    <div className="indicators-list">
                                        {availableIndicators.map((indicator) => (
                                            <div
                                                key={indicator.key}
                                                className="indicator-option"
                                            >
                                                <label className="indicator-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIndicators.includes(indicator.key)}
                                                        onChange={() => handleIndicatorToggle(indicator.key)}
                                                    />
                                                    <span className="checkmark"></span>
                                                    <span
                                                        className="indicator-color"
                                                        style={{ backgroundColor: indicator.color }}
                                                    ></span>
                                                    <span className="indicator-name">{indicator.name}</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {selectedIndicators.length > 0 && indicatorsChartData && stockData && (
                    <div className="indicators-chart-container" style={{ height: '400px' }}>
                        <Line data={indicatorsChartData} options={indicatorsChartOptions} />
                    </div>
                )}

                {selectedIndicators.length === 0 && (
                    <div className="no-indicators-selected">
                        <p>Select indicators from the dropdown above to display them on the chart.</p>
                    </div>
                )}
            </div>

            {/* Watchlist Modal */}
            {showWatchlistForm && (
                <div className="stockchart-modal-overlay">
                    <div className="stockchart-modal">
                        <div className="stockchart-modal-header">
                            <h3 className="stockchart-modal-title">Add to Watchlist</h3>
                            <button
                                onClick={() => setShowWatchlistForm(false)}
                                className="stockchart-modal-close"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={addToWatchlist} className="stockchart-modal-content">
                            <div className="stockchart-form-fields">
                                <div className="stockchart-form-field">
                                    <label className="stockchart-form-label">
                                        Stock Symbol *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., AAPL, TSLA, MSFT"
                                        value={newWatchlistItem.symbol}
                                        onChange={(e) => setNewWatchlistItem({
                                            ...newWatchlistItem,
                                            symbol: e.target.value.toUpperCase()
                                        })}
                                        className="stockchart-form-input"
                                        required
                                    />
                                </div>

                                <div className="stockchart-form-field">
                                    <label className="stockchart-form-label">
                                        Target Price (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 150.00"
                                        value={newWatchlistItem.target_price}
                                        onChange={(e) => setNewWatchlistItem({
                                            ...newWatchlistItem,
                                            target_price: e.target.value
                                        })}
                                        className="stockchart-form-input"
                                    />
                                </div>

                                <div className="stockchart-form-field">
                                    <label className="stockchart-form-label">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        placeholder="Why are you tracking this stock?"
                                        value={newWatchlistItem.notes}
                                        onChange={(e) => setNewWatchlistItem({
                                            ...newWatchlistItem,
                                            notes: e.target.value
                                        })}
                                        rows={3}
                                        className="stockchart-form-textarea"
                                    />
                                </div>
                            </div>

                            <div className="stockchart-form-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowWatchlistForm(false)}
                                    className="stockchart-form-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="stockchart-form-submit"
                                >
                                    <span>⭐</span>
                                    Add to Watchlist
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockChart;
