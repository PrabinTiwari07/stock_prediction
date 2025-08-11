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
                <div className={`dashboard-message ${error ? 'error' : 'success'}`}>
                    <div className="dashboard-message-content">
                        <span className="dashboard-message-text">{error || success}</span>
                        <button
                            onClick={clearMessages}
                            className="dashboard-message-close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}



            <div className="dashboard-content">
                <div className="dashboard-header-section">
                    <h1 className="dashboard-main-title">
                        Stock Price Prediction Using Artificial Intelligence and Machine Learning Techniques to enhance personal financial decision making.
                    </h1>
                </div>

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
                            onAddToWatchlist={addCurrentStockToWatchlist}
                            showWatchlistForm={showWatchlistForm}
                            setShowWatchlistForm={setShowWatchlistForm}
                            newWatchlistItem={newWatchlistItem}
                            setNewWatchlistItem={setNewWatchlistItem}
                            addToWatchlist={addToWatchlist}
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
        </div>
    );
};

export default Dashboard;