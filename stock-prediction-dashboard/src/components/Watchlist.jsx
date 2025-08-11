import axios from 'axios';
import { useEffect, useState } from 'react';

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
        if (change > 0) return 'text-green-600';
        if (change < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getPriceChangeIcon = (change) => {
        if (change > 0) return '↑';
        if (change < 0) return '↓';
        return '→';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Success/Error Messages */}
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

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                ⭐ My Watchlist
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Track your favorite stocks and monitor price targets
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowWatchlistForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            >
                                <span className="text-lg">⭐</span>
                                Add to Watchlist
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading watchlist...</p>
                    </div>
                )}

                {!loading && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                📈 Tracked Stocks
                            </h2>
                            {watchlist.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {watchlist.length} stock{watchlist.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            {watchlist.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-8xl mb-6">👀</div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Your watchlist is empty</h3>
                                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                        Start tracking stocks that interest you. Get real-time price updates and set target alerts.
                                    </p>
                                    <button
                                        onClick={() => setShowWatchlistForm(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
                                    >
                                        <span className="text-lg">⭐</span>
                                        Add Your First Stock
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {watchlist.map(item => (
                                        <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-gray-900">{item.symbol}</span>
                                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                        STOCK
                                                    </span>
                                                </div>
                                                <button
                                                    className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-full"
                                                    onClick={() => deleteWatchlistItem(item.id)}
                                                    title="Remove from watchlist"
                                                >
                                                    Delete
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Current Price</span>
                                                    <div className="text-right">
                                                        <div className="text-xl font-bold text-gray-900">
                                                            {formatCurrency(item.current_price || 0)}
                                                        </div>
                                                        {item.price_change !== undefined && (
                                                            <div className={`text-sm font-medium flex items-center justify-end gap-1 ${getPriceChangeColor(item.price_change)}`}>
                                                                <span>{getPriceChangeIcon(item.price_change)}</span>
                                                                <span>{item.price_change >= 0 ? '+' : ''}{item.price_change?.toFixed(2)}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.target_price && (
                                                    <div className="flex items-center justify-between border-t pt-3">
                                                        <span className="text-sm text-gray-600">Target Price</span>
                                                        <span className="text-sm font-medium text-orange-600">
                                                            {formatCurrency(item.target_price)}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className={`p-3 rounded-lg text-center ${item.alert_status?.toLowerCase() === 'reached'
                                                    ? 'bg-green-50 border border-green-200'
                                                    : item.alert_status?.toLowerCase() === 'approaching'
                                                        ? 'bg-yellow-50 border border-yellow-200'
                                                        : 'bg-gray-50 border border-gray-200'
                                                    }`}>
                                                    <div className={`text-sm font-medium ${item.alert_status?.toLowerCase() === 'reached'
                                                        ? 'text-green-800'
                                                        : item.alert_status?.toLowerCase() === 'approaching'
                                                            ? 'text-yellow-800'
                                                            : 'text-gray-600'
                                                        }`}>
                                                        {item.alert_status?.toLowerCase() === 'reached' && '🎯 Target Reached!'}
                                                        {item.alert_status?.toLowerCase() === 'approaching' && 'Approaching Target'}
                                                        {(!item.alert_status || item.alert_status.toLowerCase() === 'watching') && 'Watching'}
                                                    </div>
                                                </div>

                                                {item.notes && (
                                                    <div className="border-t pt-3">
                                                        <p className="text-sm text-gray-600 italic">
                                                            "{item.notes}"
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="text-xs text-gray-500 text-center">
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
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <span>⭐</span>
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
