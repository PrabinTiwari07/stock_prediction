import axios from 'axios';
import { useEffect, useState } from 'react';

const Portfolio = () => {
    const [portfolios, setPortfolios] = useState([]);
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);
    const [portfolioHoldings, setPortfolioHoldings] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showAddStockForm, setShowAddStockForm] = useState(false);
    const [showEditStockForm, setShowEditStockForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [watchlist, setWatchlist] = useState([]);
    const [showWatchlistForm, setShowWatchlistForm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingHolding, setEditingHolding] = useState(null);

    // Form states
    const [newPortfolio, setNewPortfolio] = useState({
        name: '',
        description: '',
        initial_capital: 10000
    });

    const [editPortfolio, setEditPortfolio] = useState({
        id: null,
        name: '',
        description: ''
    });

    const [newStock, setNewStock] = useState({
        symbol: '',
        shares: '',
        price: '',
        transaction_type: 'BUY'
    });

    const [editStock, setEditStock] = useState({
        id: null,
        shares: '',
        avg_price: ''
    });

    const [newWatchlistItem, setNewWatchlistItem] = useState({
        symbol: '',
        target_price: '',
        notes: ''
    });

    useEffect(() => {
        fetchPortfolios();
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

    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5001/api/portfolio/list');
            if (response.data.success) {
                setPortfolios(response.data.portfolios);
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to fetch portfolios', true);
        } finally {
            setLoading(false);
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/watchlist');
            if (response.data.success) {
                setWatchlist(response.data.watchlist);
            }
        } catch (error) {
            console.error('Error fetching watchlist:', error);
        }
    };

    const fetchPortfolioPerformance = async (portfolioId) => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5001/api/portfolio/${portfolioId}/performance`);
            if (response.data.success) {
                setSelectedPortfolio(response.data.portfolio);
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to fetch portfolio performance', true);
        } finally {
            setLoading(false);
        }
    };

    const createPortfolio = async (e) => {
        e.preventDefault();
        try {
            clearMessages();
            const response = await axios.post('http://localhost:5001/api/portfolio/create', newPortfolio);
            if (response.data.success) {
                showMessage('Portfolio created successfully!');
                setNewPortfolio({ name: '', description: '', initial_capital: 10000 });
                setShowCreateForm(false);
                fetchPortfolios();
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to create portfolio', true);
        }
    };

    const addStockToPortfolio = async (e) => {
        e.preventDefault();
        if (!selectedPortfolio) {
            showMessage('Please select a portfolio first', true);
            return;
        }

        try {
            clearMessages();
            const stockData = {
                ...newStock,
                shares: parseFloat(newStock.shares),
                price: parseFloat(newStock.price)
            };

            const response = await axios.post(`http://localhost:5001/api/portfolio/${selectedPortfolio.portfolio_id}/add`, stockData);
            if (response.data.success) {
                showMessage('Stock added successfully!');
                setNewStock({ symbol: '', shares: '', price: '', transaction_type: 'BUY' });
                setShowAddStockForm(false);
                fetchPortfolioHoldings(selectedPortfolio.portfolio_id);
                fetchPortfolios(); // Refresh portfolio list to update values
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            console.error('Error adding stock:', error);
            showMessage('Failed to add stock', true);
        }
    };

    const addToWatchlist = async (e) => {
        e.preventDefault();
        try {
            clearMessages();
            const watchlistData = {
                ...newWatchlistItem,
                target_price: parseFloat(newWatchlistItem.target_price) || null
            };

            const response = await axios.post('http://localhost:5001/api/watchlist/add', watchlistData);
            if (response.data.success) {
                showMessage('Added to watchlist successfully!');
                setNewWatchlistItem({ symbol: '', target_price: '', notes: '' });
                setShowWatchlistForm(false);
                fetchWatchlist();
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to add to watchlist', true);
        }
    };

    const deletePortfolio = async (portfolioId) => {
        if (window.confirm('Are you sure you want to delete this portfolio?')) {
            try {
                const response = await axios.delete(`http://localhost:5001/api/portfolio/${portfolioId}`);
                if (response.data.success) {
                    showMessage('Portfolio deleted successfully!');
                    fetchPortfolios();
                    if (selectedPortfolio?.portfolio_id === portfolioId) {
                        setSelectedPortfolio(null);
                    }
                } else {
                    showMessage(response.data.message, true);
                }
            } catch (error) {
                showMessage('Failed to delete portfolio', true);
            }
        }
    };

    const updatePortfolio = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await axios.put(`http://localhost:5001/api/portfolio/${editPortfolio.id}`, {
                name: editPortfolio.name,
                description: editPortfolio.description
            });

            if (response.data.success) {
                showMessage('Portfolio updated successfully!');
                setEditPortfolio({ id: null, name: '', description: '' });
                setShowEditForm(false);
                fetchPortfolios();
                if (selectedPortfolio?.portfolio_id === editPortfolio.id) {
                    fetchPortfolioPerformance(editPortfolio.id);
                }
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to update portfolio', true);
        } finally {
            setLoading(false);
        }
    };

    const fetchPortfolioHoldings = async (portfolioId) => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5001/api/portfolio/${portfolioId}/holdings`);
            if (response.data.success) {
                setPortfolioHoldings(response.data.holdings);
            } else {
                showMessage('Failed to fetch holdings', true);
            }
        } catch (error) {
            showMessage('Failed to fetch holdings', true);
        } finally {
            setLoading(false);
        }
    };

    const updateHolding = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await axios.put(
                `http://localhost:5001/api/portfolio/${selectedPortfolio.portfolio_id}/holding/${editStock.id}`,
                {
                    shares: parseFloat(editStock.shares),
                    avg_price: parseFloat(editStock.avg_price)
                }
            );

            if (response.data.success) {
                showMessage('Holding updated successfully!');
                setEditStock({ id: null, shares: '', avg_price: '' });
                setShowEditStockForm(false);
                fetchPortfolioHoldings(selectedPortfolio.portfolio_id);
                fetchPortfolioPerformance(selectedPortfolio.portfolio_id);
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to update holding', true);
        } finally {
            setLoading(false);
        }
    };

    const deleteHolding = async (holdingId) => {
        if (window.confirm('Are you sure you want to delete this holding?')) {
            try {
                setLoading(true);
                const response = await axios.delete(
                    `http://localhost:5001/api/portfolio/${selectedPortfolio.portfolio_id}/holding/${holdingId}`
                );

                if (response.data.success) {
                    showMessage('Holding deleted successfully!');
                    fetchPortfolioHoldings(selectedPortfolio.portfolio_id);
                    fetchPortfolioPerformance(selectedPortfolio.portfolio_id);
                } else {
                    showMessage(response.data.message, true);
                }
            } catch (error) {
                showMessage('Failed to delete holding', true);
            } finally {
                setLoading(false);
            }
        }
    };

    const openEditPortfolioForm = (portfolio) => {
        setEditPortfolio({
            id: portfolio.id,
            name: portfolio.name,
            description: portfolio.description
        });
        setShowEditForm(true);
    };

    const openEditStockForm = (holding) => {
        setEditStock({
            id: holding.id,
            shares: holding.shares,
            avg_price: holding.avg_price
        });
        setEditingHolding(holding);
        setShowEditStockForm(true);
    };

    const selectPortfolio = async (portfolio) => {
        setSelectedPortfolio(portfolio);
        await fetchPortfolioPerformance(portfolio.id);
        await fetchPortfolioHoldings(portfolio.id);
    };

    const deleteWatchlistItem = async (itemId) => {
        try {
            const response = await axios.delete(`http://localhost:5001/api/watchlist/${itemId}`);
            if (response.data.success) {
                showMessage('Removed from watchlist');
                fetchWatchlist();
            } else {
                showMessage(response.data.message, true);
            }
        } catch (error) {
            showMessage('Failed to remove from watchlist', true);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatPercentage = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
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
                                💼 Portfolio Management
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Manage your investment portfolios and track your watchlist
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            >
                                ➕ Create Portfolio
                            </button>
                            <button
                                onClick={() => setShowWatchlistForm(true)}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            >
                                ⭐ Add to Watchlist
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Portfolio List - Only show when no portfolio is selected */}
                {!selectedPortfolio && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                My Portfolios
                            </h2>
                            {portfolios.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading portfolios...</span>
                            </div>
                        ) : portfolios.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">📈</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No portfolios yet</h3>
                                <p className="text-gray-600 mb-6">Create your first portfolio to start tracking investments</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                                >
                                    Create Portfolio
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {portfolios.map(portfolio => (
                                    <div
                                        key={portfolio.id}
                                        className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer ${selectedPortfolio?.portfolio_id === portfolio.id
                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                            : ''
                                            }`}
                                        onClick={() => fetchPortfolioPerformance(portfolio.id)}
                                    >
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">{portfolio.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditPortfolio({
                                                            id: portfolio.id,
                                                            name: portfolio.name,
                                                            description: portfolio.description || ''
                                                        });
                                                    }}
                                                    title="Edit portfolio"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deletePortfolio(portfolio.id);
                                                    }}
                                                    title="Delete portfolio"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {portfolio.description && (
                                                <p className="text-gray-600 mb-4 text-sm">{portfolio.description}</p>
                                            )}

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-500">Current Value</span>
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {formatCurrency(portfolio.current_value || portfolio.initial_capital)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-500">Total Return</span>
                                                    <span className={`text-lg font-bold ${(portfolio.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {formatPercentage(portfolio.total_return || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-500">Initial Capital</span>
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {formatCurrency(portfolio.initial_capital)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Portfolio Details */}
                {selectedPortfolio && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedPortfolio(null)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                                    title="Back to portfolio list"
                                >
                                    ← Back
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    📈 {selectedPortfolio.portfolio_name}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowAddStockForm(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                                >
                                    💰 Buy Stock
                                </button>
                                <button
                                    onClick={() => setShowAddStockForm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                                >
                                    ➕ Add Stock
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className="text-2xl font-bold text-blue-900">
                                        {formatCurrency(selectedPortfolio.total_value || selectedPortfolio.current_value)}
                                    </div>
                                    <div className="text-sm text-blue-700 mt-1">Total Value</div>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className={`text-2xl font-bold ${(selectedPortfolio.total_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatPercentage(selectedPortfolio.total_return || 0)}
                                    </div>
                                    <div className="text-sm text-blue-700 mt-1">Total Return</div>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className={`text-2xl font-bold ${(selectedPortfolio.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatCurrency(selectedPortfolio.unrealized_pnl || 0)}
                                    </div>
                                    <div className="text-sm text-blue-700 mt-1">Unrealized P&L</div>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className="text-2xl font-bold text-blue-900">
                                        {formatCurrency(selectedPortfolio.cash_position || selectedPortfolio.initial_capital)}
                                    </div>
                                    <div className="text-sm text-blue-700 mt-1">Cash Available</div>
                                </div>
                            </div>

                            {/* Holdings Table */}
                            {selectedPortfolio.holdings && selectedPortfolio.holdings.length > 0 ? (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        🏢 Holdings
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Symbol</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Shares</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Avg Price</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Current Price</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Market Value</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">P&L</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">P&L %</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Weight</th>
                                                    <th className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPortfolio.holdings.map((holding, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">{holding.symbol}</td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm">{holding.shares.toFixed(2)}</td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm">{formatCurrency(holding.avg_price)}</td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm">{formatCurrency(holding.current_price)}</td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm font-medium">{formatCurrency(holding.market_value)}</td>
                                                        <td className={`px-4 py-3 border-b border-gray-200 text-sm font-medium ${holding.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {formatCurrency(holding.unrealized_pnl)}
                                                        </td>
                                                        <td className={`px-4 py-3 border-b border-gray-200 text-sm font-medium ${holding.unrealized_pnl_pct >= 0 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {formatPercentage(holding.unrealized_pnl_pct)}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm">{holding.weight.toFixed(1)}%</td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditStock({
                                                                            id: holding.id,
                                                                            shares: holding.shares,
                                                                            avg_price: holding.avg_price
                                                                        });
                                                                        setEditingHolding(holding);
                                                                        setShowEditStockForm(true);
                                                                    }}
                                                                    className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded"
                                                                    title="Edit holding"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`Delete ${holding.symbol} from portfolio?`)) {
                                                                            deleteHolding(holding.id);
                                                                        }
                                                                    }}
                                                                    className="text-red-600 hover:text-red-800 transition-colors p-1 rounded"
                                                                    title="Delete holding"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">Portfolio</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No holdings yet</h3>
                                    <p className="text-gray-600 mb-6">Add your first stock to start tracking performance</p>
                                    <button
                                        onClick={() => setShowAddStockForm(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                                    >
                                        Add Stock
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Watchlist */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            ⭐ Watchlist
                        </h2>
                        {watchlist.length > 0 && (
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                {watchlist.length} item{watchlist.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="p-6">
                        {watchlist.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">👀</div>
                                <h4 className="text-xl font-semibold text-gray-900 mb-2">Your watchlist is empty</h4>
                                <p className="text-gray-600 mb-6">Add stocks to track their prices</p>
                                <button
                                    onClick={() => setShowWatchlistForm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                                >
                                    Add to Watchlist
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {watchlist.map(item => (
                                    <div key={item.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow duration-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-lg font-bold text-gray-900">{item.symbol}</span>
                                            <button
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                onClick={() => deleteWatchlistItem(item.id)}
                                                title="Remove from watchlist"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {formatCurrency(item.current_price || 0)}
                                            </div>
                                            {item.target_price && (
                                                <div className="text-sm text-gray-600">
                                                    Target: {formatCurrency(item.target_price)}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${item.alert_status?.toLowerCase() === 'reached'
                                            ? 'bg-green-100 text-green-800'
                                            : item.alert_status?.toLowerCase() === 'approaching'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {item.alert_message || 'Watching'}
                                        </div>

                                        {item.notes && (
                                            <div className="mt-3 text-sm text-gray-600 italic">
                                                {item.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Portfolio Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">💼 Create New Portfolio</h2>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setShowCreateForm(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={createPortfolio}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio Name *</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="text"
                                        value={newPortfolio.name}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                                        placeholder="e.g., Tech Growth Portfolio"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                        value={newPortfolio.description}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                                        placeholder="Brief description of your investment strategy..."
                                        rows="3"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital *</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="number"
                                        value={newPortfolio.initial_capital}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, initial_capital: parseFloat(e.target.value) || 0 })}
                                        min="0"
                                        step="0.01"
                                        placeholder="10000"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                        onClick={() => setShowCreateForm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Create Portfolio
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Stock Modal */}
            {showAddStockForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Add Stock to Portfolio</h2>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setShowAddStockForm(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={addStockToPortfolio}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Symbol *</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="text"
                                        value={newStock.symbol}
                                        onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
                                        placeholder="e.g., AAPL"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Shares *</label>
                                        <input
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            type="number"
                                            value={newStock.shares}
                                            onChange={(e) => setNewStock({ ...newStock, shares: e.target.value })}
                                            min="0"
                                            step="0.001"
                                            placeholder="10"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per Share *</label>
                                        <input
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            type="number"
                                            value={newStock.price}
                                            onChange={(e) => setNewStock({ ...newStock, price: e.target.value })}
                                            min="0"
                                            step="0.01"
                                            placeholder="150.00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                                        value={newStock.transaction_type}
                                        onChange={(e) => setNewStock({ ...newStock, transaction_type: e.target.value })}
                                    >
                                        <option value="BUY">Buy</option>
                                        <option value="SELL">Sell</option>
                                    </select>
                                </div>

                                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                                    <strong className="text-gray-900">
                                        Total: ${(parseFloat(newStock.shares) * parseFloat(newStock.price) || 0).toFixed(2)}
                                    </strong>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                        onClick={() => setShowAddStockForm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Add Stock
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add to Watchlist Modal */}
            {showWatchlistForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">⭐ Add to Watchlist</h2>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setShowWatchlistForm(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={addToWatchlist}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Symbol *</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="text"
                                        value={newWatchlistItem.symbol}
                                        onChange={(e) => setNewWatchlistItem({ ...newWatchlistItem, symbol: e.target.value.toUpperCase() })}
                                        placeholder="e.g., TSLA"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Price (optional)</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="number"
                                        value={newWatchlistItem.target_price}
                                        onChange={(e) => setNewWatchlistItem({ ...newWatchlistItem, target_price: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        placeholder="200.00"
                                    />
                                    <small className="text-gray-500 text-xs mt-1 block">Set a target price to get notified when reached</small>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                    <textarea
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                        value={newWatchlistItem.notes}
                                        onChange={(e) => setNewWatchlistItem({ ...newWatchlistItem, notes: e.target.value })}
                                        placeholder="Why are you watching this stock?"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                        onClick={() => setShowWatchlistForm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Add to Watchlist
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Portfolio Modal */}
            {editPortfolio.id && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Edit Portfolio</h2>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setEditPortfolio({ id: null, name: '', description: '' })}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={updatePortfolio}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio Name *</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        type="text"
                                        value={editPortfolio.name}
                                        onChange={(e) => setEditPortfolio({ ...editPortfolio, name: e.target.value })}
                                        placeholder="My Investment Portfolio"
                                        required
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                        value={editPortfolio.description}
                                        onChange={(e) => setEditPortfolio({ ...editPortfolio, description: e.target.value })}
                                        placeholder="Brief description of your investment strategy..."
                                        rows="3"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                        onClick={() => setEditPortfolio({ id: null, name: '', description: '' })}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Update Portfolio
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Holding Modal */}
            {showEditStockForm && editingHolding && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Edit Holding</h2>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => {
                                    setShowEditStockForm(false);
                                    setEditingHolding(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={updateHolding}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Symbol</label>
                                    <input
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-600"
                                        type="text"
                                        value={editingHolding.symbol}
                                        readOnly
                                    />
                                    <small className="text-gray-500 text-xs mt-1 block">Symbol cannot be changed</small>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Shares *</label>
                                        <input
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            type="number"
                                            value={editingHolding.shares}
                                            onChange={(e) => setEditingHolding({ ...editingHolding, shares: parseFloat(e.target.value) })}
                                            min="0"
                                            step="0.001"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Average Price *</label>
                                        <input
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            type="number"
                                            value={editingHolding.avg_price}
                                            onChange={(e) => setEditingHolding({ ...editingHolding, avg_price: parseFloat(e.target.value) })}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                                    <strong className="text-gray-900">
                                        Total Value: ${(editingHolding.shares * editingHolding.avg_price || 0).toFixed(2)}
                                    </strong>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                        onClick={() => {
                                            setShowEditStockForm(false);
                                            setEditingHolding(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Update Holding
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
