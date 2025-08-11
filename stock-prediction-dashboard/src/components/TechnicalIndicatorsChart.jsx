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
import technicalIndicatorsService from '../services/technicalIndicatorsService';
import '../styles/TechnicalIndicatorsChart.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TechnicalIndicatorsChart = ({ stockData, selectedStock }) => {
    const [selectedIndicators, setSelectedIndicators] = useState(['RSI', 'MACD']);
    const [showDropdown, setShowDropdown] = useState(false);
    const [realTimeIndicators, setRealTimeIndicators] = useState(null);

    // Fetch real-time technical indicators from the same ML API source
    useEffect(() => {
        if (selectedStock) {
            // Clear previous indicators immediately when stock changes
            setRealTimeIndicators(null);

            fetchRealTimeIndicators();

            // Subscribe to indicator updates
            const unsubscribe = technicalIndicatorsService.subscribe((symbol, data) => {
                if (symbol === selectedStock) {
                    console.log(`TechnicalChart: Updating indicators for ${symbol}:`, data);
                    setRealTimeIndicators(data);
                }
            });

            return () => {
                unsubscribe();
                // Clear indicators when component unmounts or stock changes
                setRealTimeIndicators(null);
            };
        } else {
            setRealTimeIndicators(null);
        }
    }, [selectedStock]);

    const fetchRealTimeIndicators = async () => {
        try {
            console.log('TechnicalChart: Fetching indicators for', selectedStock);

            // Clear any cached data for this symbol first
            technicalIndicatorsService.clearCache(selectedStock);

            const result = await technicalIndicatorsService.getRealTimeIndicators(selectedStock);
            if (result.success) {
                console.log('TechnicalChart: Received indicators:', result.data);
                setRealTimeIndicators(result.data);
            } else {
                console.error('TechnicalChart: Failed to fetch indicators:', result.error);
            }
        } catch (error) {
            console.error('Error fetching real-time indicators:', error);
        }
    };

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

    // Prepare chart data for different indicator types
    const prepareChartData = () => {
        if (!stockData || stockData.length === 0) return null;

        const labels = stockData.map(item => item.date);
        const datasets = [];

        // Separate indicators by type for better visualization
        const oscillatorIndicators = ['RSI'];
        const priceIndicators = ['SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'BB_Upper', 'BB_Lower', 'BB_Middle'];
        const macdIndicators = ['MACD', 'MACD_Signal'];

        selectedIndicators.forEach(indicatorKey => {
            const indicator = availableIndicators.find(ind => ind.key === indicatorKey);
            if (!indicator) return;

            let data;

            // For RSI and MACD, ONLY use real-time indicators from ML API
            // This ensures consistency with PredictionPanel
            if (indicatorKey === 'RSI' || indicatorKey === 'MACD' || indicatorKey === 'MACD_Signal') {
                if (!realTimeIndicators) {
                    console.warn(`No real-time ${indicatorKey} data available from ML API`);
                    return; // Skip this indicator if no real-time data
                }

                // Create array with the real-time value for all data points
                // This shows the current indicator value across the timeline
                data = stockData.map((item, index) => {
                    if (indicatorKey === 'RSI') {
                        return realTimeIndicators.rsi;
                    } else if (indicatorKey === 'MACD') {
                        return realTimeIndicators.macd;
                    } else if (indicatorKey === 'MACD_Signal') {
                        return realTimeIndicators.macd_signal;
                    }
                    return null;
                });
            } else {
                // For other indicators (SMA, EMA, Bollinger Bands), use historical data
                const hasData = stockData.some(item => item[indicatorKey] !== undefined && item[indicatorKey] !== null);
                if (!hasData) return;

                data = stockData.map(item => {
                    const value = item[indicatorKey];
                    return value !== undefined && value !== null ? parseFloat(value) : null;
                });
            }

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
                yAxisID: oscillatorIndicators.includes(indicatorKey) ? 'y1' : 'y'
            });
        });

        return { labels, datasets };
    };

    const chartData = prepareChartData();

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            title: {
                display: true,
                text: `${selectedStock} - Technical Indicators ${realTimeIndicators ? (realTimeIndicators.fallback ? '(Demo Data)' : '(Live Data)') : ''}`,
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
                display: selectedIndicators.some(ind => ['RSI'].includes(ind)),
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

    if (!stockData || stockData.length === 0) {
        return (
            <div className="technical-indicators-chart">
                <div className="chart-header">
                    <h3>Technical Indicators</h3>
                    <p>No data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="technical-indicators-chart">
            <div className="chart-header">
                <div className="header-content">
                    <h3>Technical Indicators</h3>
                    {realTimeIndicators && (
                        <div className="data-source-status">
                            <span className={`status-indicator ${realTimeIndicators.fallback ? 'mock' : 'live'}`}>
                                {realTimeIndicators.fallback ? 'Demo Data' : 'Live Data'}
                            </span>
                            <small>
                                <strong>Real-time:</strong> RSI: {realTimeIndicators.rsi?.toFixed(2)} | MACD: {realTimeIndicators.macd?.toFixed(4)}
                                {realTimeIndicators.source && ` | Source: ${realTimeIndicators.source}`}
                            </small>
                        </div>
                    )}
                </div>
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

            {selectedIndicators.length > 0 && chartData && (
                <div className="chart-container" style={{ height: '400px' }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            )}

            {selectedIndicators.length === 0 && (
                <div className="no-indicators-selected">
                    <p>Select indicators from the dropdown above to display them on the chart.</p>
                </div>
            )}
        </div>
    );
};

export default TechnicalIndicatorsChart;
