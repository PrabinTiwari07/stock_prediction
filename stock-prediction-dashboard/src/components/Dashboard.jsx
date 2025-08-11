import axios from 'axios';
import { useEffect, useState } from 'react';
import technicalIndicatorsService from '../services/technicalIndicatorsService';
import '../styles/Dashboard.css';
import PredictionPanel from './PredictionPanel';
import StockChart from './StockChart';
import StockSelector from './StockSelector';

const Dashboard = () => {
    const [selectedStock, setSelectedStock] = useState('AAPL');
    const [stockData, setStockData] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showWatchlistForm, setShowWatchlistForm] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [newWatchlistItem, setNewWatchlistItem] = useState({
        symbol: '',
        target_price: '',
        notes: ''
    });

    const handleStockChange = (symbol) => {
        setSelectedStock(symbol);
        setStockData(null);
        setPredictions(null);
        // Clearing cached indicators to force fresh fetch
        technicalIndicatorsService.clearCache(symbol);
    };

    // Sync indicators between components every 30 seconds
    useEffect(() => {
        if (selectedStock) {
            const interval = setInterval(() => {
                technicalIndicatorsService.syncIndicators(selectedStock);
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [selectedStock]);

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const showMessage = (message, isError = false) => {
        if (isError) {
            setError(message);
            setSuccess('');
        } else {
            setSuccess(message);
            setError('');
        }
        setTimeout(clearMessages, 5000);
    };

    const addToWatchlist = async (e) => {
        e.preventDefault();
        try {
            const watchlistData = {
                ...newWatchlistItem,
                target_price: parseFloat(newWatchlistItem.target_price) || null
            };

            const response = await axios.post('http://localhost:5001/api/watchlist/add', watchlistData);
            if (response.data.success) {
                showMessage(`${newWatchlistItem.symbol} added to watchlist successfully!`);
                setNewWatchlistItem({ symbol: '', target_price: '', notes: '' });
                setShowWatchlistForm(false);
            } else {
                showMessage(response.data.error || 'Failed to add to watchlist', true);
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            showMessage('Failed to add to watchlist', true);
        }
    };

    const addCurrentStockToWatchlist = () => {
        setNewWatchlistItem({
            symbol: selectedStock,
            target_price: '',
            notes: `Added from dashboard on ${new Date().toLocaleDateString()}`
        });
        setShowWatchlistForm(true);
    };

    return (
        <div className="dashboard">
            {(error || success) && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-up max-w-md ${error
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-green-50 border border-green-200 text-green-800'
                    }`}>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">{error || success}</span>
                        <button
                            onClick={clearMessages}
                            className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <header className="dashboard-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>Stock Price Prediction Dashboard</h1>
                        <p>AI-Powered Stock Analysis & Prediction System</p>
                    </div>
                    {selectedStock && (
                        <button
                            onClick={addCurrentStockToWatchlist}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            title={`Add ${selectedStock} to watchlist`}
                        >
                            <span>⭐</span>
                            Add {selectedStock} to Watchlist
                        </button>
                    )}
                </div>
            </header>

            <div className="dashboard-content">
                <div className="top-section">
                    <StockSelector
                        selectedStock={selectedStock}
                        onStockChange={handleStockChange}
                    />
                </div>

                <div className="main-content">
                    <div className="chart-section">
                        <StockChart
                            selectedStock={selectedStock}
                            stockData={stockData}
                            setStockData={setStockData}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    </div>

                    <div className="prediction-section">
                        <PredictionPanel
                            selectedStock={selectedStock}
                            stockData={stockData}
                            predictions={predictions}
                            setPredictions={setPredictions}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Adding Watchlist Modal */}
            {showWatchlistForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Add to Watchlist</h3>
                            <button
                                onClick={() => setShowWatchlistForm(false)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={addToWatchlist} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowWatchlistForm(false)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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

export default Dashboard;