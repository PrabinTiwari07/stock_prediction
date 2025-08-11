import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/Watchlist.css';

const Watchlist = () => {
    const [watchlist, setWatchlist] = useState([]);
    const [showWatchlistForm, setShowWatchlistForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newWatchlistItem, setNewWatchlistItem] = useState({
        symbol: '',
        target_price: '',
        notes: ''
    });

    useEffect(() => {
        fetchWatchlist();
    }, []);

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

    const fetchWatchlist = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/api/watchlist');
            if (response.data.success) {
                setWatchlist(response.data.watchlist);
            }
        } catch (error) {
            console.error('Error fetching watchlist:', error);
            showMessage('Failed to fetch watchlist', true);
        } finally {
            setLoading(false);
        }
    };

    const addToWatchlist = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const watchlistData = {
                ...newWatchlistItem,
                target_price: parseFloat(newWatchlistItem.target_price) || null
            };

            const response = await axios.post('http://localhost:5001/api/watchlist/add', watchlistData);
            if (response.data.success) {
                showMessage('Added to watchlist successfully!');
                setNewWatchlistItem({ symbol: '', target_price: '', notes: '' });
                setShowWatchlistForm(false);
                await fetchWatchlist();
            } else {
                showMessage(response.data.error || 'Failed to add to watchlist', true);
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            showMessage('Failed to add to watchlist', true);
        } finally {
            setLoading(false);
        }
    };

    const deleteWatchlistItem = async (itemId) => {
        if (!window.confirm('Remove this item from watchlist?')) return;

        setLoading(true);
        try {
            const response = await axios.delete(`http://localhost:5001/api/watchlist/${itemId}`);
            if (response.data.success) {
                showMessage('Removed from watchlist');
                await fetchWatchlist();
            } else {
                showMessage('Failed to remove from watchlist', true);
            }
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            showMessage('Failed to remove from watchlist', true);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getPriceChangeColor = (change) => {
        if (change > 0) return 'positive';
        if (change < 0) return 'negative';
        return 'neutral';
    };

    const getPriceChangeIcon = (change) => {
        if (change > 0) return '↑';
        if (change < 0) return '↓';
        return '→';
    };

    return (
        <div className="watchlist-container">
            {/* Success/Error Messages */}
            {(error || success) && (
                <div className={`watchlist-message ${error ? 'error' : 'success'}`}>
                    <div className="watchlist-message-content">
                        <span className="watchlist-message-text">{error || success}</span>
                        <button
                            onClick={clearMessages}
                            className="watchlist-message-close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="watchlist-header">
                <div className="watchlist-header-container">
                    <div className="watchlist-header-content">
                        <div className="watchlist-header-info">
                            <h1 className="watchlist-title">
                                My Watchlist
                            </h1>
                            <p className="watchlist-subtitle">
                                Track your favorite stocks and monitor price targets
                            </p>
                        </div>
                        <div className="watchlist-header-actions">
                            <button
                                onClick={() => setShowWatchlistForm(true)}
                                className="watchlist-add-btn"
                            >
                                <span className="text-lg"></span>
                                Add to Watchlist
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="watchlist-main">
                {loading && (
                    <div className="watchlist-loading">
                        <div className="watchlist-spinner"></div>
                        <p className="watchlist-loading-text">Loading watchlist...</p>
                    </div>
                )}

                {!loading && (
                    <div className="watchlist-card">
                        <div className="watchlist-card-header">
                            <h2 className="watchlist-card-title">
                                Tracked Stocks
                            </h2>
                            {watchlist.length > 0 && (
                                <span className="watchlist-count-badge">
                                    {watchlist.length} stock{watchlist.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="watchlist-card-content">{watchlist.length === 0 ? (
                            <div className="watchlist-empty">
                                <div className="watchlist-empty-icon">📊</div>
                                <h3 className="watchlist-empty-title">Your watchlist is empty</h3>
                                <p className="watchlist-empty-text">
                                    Start tracking stocks that interest you. Get real-time price updates and set target alerts.
                                </p>
                                <button
                                    onClick={() => setShowWatchlistForm(true)}
                                    className="watchlist-empty-btn"
                                >
                                    <span className="text-lg"></span>
                                    Add Your First Stock
                                </button>
                            </div>
                        ) : (
                            <div className="watchlist-grid">
                                {watchlist.map(item => (
                                    <div key={item.id} className="watchlist-item">
                                        <div className="watchlist-item-header">
                                            <div className="watchlist-item-symbol-container">
                                                <span className="watchlist-item-symbol">{item.symbol}</span>
                                                <span className="watchlist-item-badge">
                                                    STOCK
                                                </span>
                                            </div>
                                            <button
                                                className="watchlist-item-delete"
                                                onClick={() => deleteWatchlistItem(item.id)}
                                                title="Remove from watchlist"
                                            >
                                                Delete
                                            </button>
                                        </div>

                                        <div className="watchlist-item-content">
                                            <div className="watchlist-price-row">
                                                <span className="watchlist-price-label">Current Price</span>
                                                <div className="watchlist-price-info">
                                                    <div className="watchlist-current-price">
                                                        {formatCurrency(item.current_price || 0)}
                                                    </div>
                                                    {item.price_change !== undefined && (
                                                        <div className={`watchlist-price-change ${getPriceChangeColor(item.price_change)}`}>
                                                            <span>{getPriceChangeIcon(item.price_change)}</span>
                                                            <span>{item.price_change >= 0 ? '+' : ''}{item.price_change?.toFixed(2)}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {item.target_price && (
                                                <div className="watchlist-target-row">
                                                    <span className="watchlist-price-label">Target Price</span>
                                                    <span className="watchlist-target-price">
                                                        {formatCurrency(item.target_price)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`watchlist-alert-status ${item.alert_status?.toLowerCase() === 'reached'
                                                ? 'reached'
                                                : item.alert_status?.toLowerCase() === 'approaching'
                                                    ? 'approaching'
                                                    : 'watching'
                                                }`}>
                                                <div className={`watchlist-alert-text ${item.alert_status?.toLowerCase() === 'reached'
                                                    ? 'reached'
                                                    : item.alert_status?.toLowerCase() === 'approaching'
                                                        ? 'approaching'
                                                        : 'watching'
                                                    }`}>
                                                    {item.alert_status?.toLowerCase() === 'reached' && '🎯 Target Reached!'}
                                                    {item.alert_status?.toLowerCase() === 'approaching' && 'Approaching Target'}
                                                    {(!item.alert_status || item.alert_status.toLowerCase() === 'watching') && 'Watching'}
                                                </div>
                                            </div>

                                            {item.notes && (
                                                <div className="watchlist-notes-section">
                                                    <p className="watchlist-notes-text">
                                                        "{item.notes}"
                                                    </p>
                                                </div>
                                            )}

                                            <div className="watchlist-date-added">
                                                Added {new Date(item.added_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </main>

            {/* Add to Watchlist Modal */}
            {showWatchlistForm && (
                <div className="watchlist-modal-overlay">
                    <div className="watchlist-modal">
                        <div className="watchlist-modal-header">
                            <h3 className="watchlist-modal-title">Add to Watchlist</h3>
                            <button
                                onClick={() => setShowWatchlistForm(false)}
                                className="watchlist-modal-close"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={addToWatchlist} className="watchlist-modal-content">
                            <div className="watchlist-form-fields">
                                <div className="watchlist-form-field">
                                    <label className="watchlist-form-label">
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
                                        className="watchlist-form-input"
                                        required
                                    />
                                </div>

                                <div className="watchlist-form-field">
                                    <label className="watchlist-form-label">
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
                                        className="watchlist-form-input"
                                    />
                                </div>

                                <div className="watchlist-form-field">
                                    <label className="watchlist-form-label">
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
                                        className="watchlist-form-textarea"
                                    />
                                </div>
                            </div>

                            <div className="watchlist-form-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowWatchlistForm(false)}
                                    className="watchlist-form-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="watchlist-form-submit"
                                >
                                    {loading ? (
                                        <>
                                            <div className="watchlist-form-submit-spinner"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <span></span>
                                            Add to Watchlist
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Watchlist;
