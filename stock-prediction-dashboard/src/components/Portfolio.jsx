import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/Portfolio.css';

const Portfolio = () => {
    const [portfolios, setPortfolios] = useState([]);
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);
    const [portfolioHoldings, setPortfolioHoldings] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showAddStockForm, setShowAddStockForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newPortfolio, setNewPortfolio] = useState({
        name: '',
        description: '',
        initial_capital: 10000
    });

    const [newStock, setNewStock] = useState({
        symbol: '',
        shares: '',
        price: '',
        transaction_type: 'BUY'
    });

    useEffect(() => {
        fetchPortfolios();
    }, []);

    useEffect(() => {
        if (selectedPortfolio) {
            fetchPortfolioHoldings();
        }
    }, [selectedPortfolio]);

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
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/api/portfolio');
            if (response.data.success) {
                setPortfolios(response.data.data);
                if (response.data.data.length > 0 && !selectedPortfolio) {
                    setSelectedPortfolio(response.data.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching portfolios:', error);
            showMessage('Failed to fetch portfolios', true);
        } finally {
            setLoading(false);
        }
    };

    const fetchPortfolioHoldings = async () => {
        if (!selectedPortfolio) return;

        try {
            const response = await axios.get(`http://localhost:5001/api/portfolio/${selectedPortfolio.id}/holdings`);
            if (response.data.success) {
                setPortfolioHoldings(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching portfolio holdings:', error);
            showMessage('Failed to fetch portfolio holdings', true);
        }
    };

    const createPortfolio = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5001/api/portfolio/create', newPortfolio);
            if (response.data.success) {
                showMessage('Portfolio created successfully!');
                setNewPortfolio({ name: '', description: '', initial_capital: 10000 });
                setShowCreateForm(false);
                fetchPortfolios();
            } else {
                showMessage(response.data.error || 'Failed to create portfolio', true);
            }
        } catch (error) {
            console.error('Error creating portfolio:', error);
            showMessage('Failed to create portfolio', true);
        }
    };

    const addStock = async (e) => {
        e.preventDefault();
        if (!selectedPortfolio) return;

        try {
            const stockData = {
                ...newStock,
                shares: parseInt(newStock.shares),
                price: parseFloat(newStock.price)
            };

            const response = await axios.post(`http://localhost:5001/api/portfolio/${selectedPortfolio.id}/add-stock`, stockData);
            if (response.data.success) {
                showMessage(`${stockData.symbol} ${stockData.transaction_type.toLowerCase()}ed successfully!`);
                setNewStock({ symbol: '', shares: '', price: '', transaction_type: 'BUY' });
                setShowAddStockForm(false);
                fetchPortfolioHoldings();
            } else {
                showMessage(response.data.error || 'Failed to add stock', true);
            }
        } catch (error) {
            console.error('Error adding stock:', error);
            showMessage('Failed to add stock', true);
        }
    };

    const deletePortfolio = async (portfolioId) => {
        if (!window.confirm('Are you sure you want to delete this portfolio?')) return;

        try {
            const response = await axios.delete(`http://localhost:5001/api/portfolio/${portfolioId}`);
            if (response.data.success) {
                showMessage('Portfolio deleted successfully!');
                fetchPortfolios();
                if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
                    setSelectedPortfolio(null);
                    setPortfolioHoldings([]);
                }
            }
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            showMessage('Failed to delete portfolio', true);
        }
    };

    const calculatePortfolioValue = () => {
        return portfolioHoldings.reduce((total, holding) => {
            return total + (holding.shares * holding.avg_price);
        }, 0);
    };

    const calculatePortfolioGainLoss = () => {
        if (!selectedPortfolio) return 0;
        const currentValue = calculatePortfolioValue();
        return currentValue - selectedPortfolio.initial_capital;
    };

    return (
        <div className="portfolio-container">
            {/* Messages */}
            {(error || success) && (
                <div className={`portfolio-message ${error ? 'error' : 'success'}`}>
                    <div className="portfolio-message-content">
                        <span className="portfolio-message-text">{error || success}</span>
                        <button onClick={clearMessages} className="portfolio-message-close">
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="portfolio-grid">
                {/* Portfolio List Sidebar */}
                <div className="portfolio-sidebar">
                    <div className="portfolio-sidebar-header">
                        <h2 className="portfolio-sidebar-title">💼 Portfolios</h2>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="portfolio-new-btn"
                        >
                            + New
                        </button>
                    </div>

                    <div className="portfolio-list">
                        {portfolios.length === 0 ? (
                            <p className="portfolio-empty">No portfolios yet</p>
                        ) : (
                            portfolios.map((portfolio) => (
                                <div
                                    key={portfolio.id}
                                    className={`portfolio-item ${selectedPortfolio?.id === portfolio.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedPortfolio(portfolio)}
                                >
                                    <div className="portfolio-item-content">
                                        <div className="portfolio-item-info">
                                            <h3 className="portfolio-item-name">{portfolio.name}</h3>
                                            <p className="portfolio-item-capital">
                                                ${portfolio.initial_capital?.toLocaleString() || '0'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletePortfolio(portfolio.id);
                                            }}
                                            className="portfolio-item-delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Portfolio Content */}
                <div className="portfolio-main">
                    {selectedPortfolio ? (
                        <div>
                            {/* Portfolio Overview */}
                            <div className="portfolio-overview">
                                <div className="portfolio-overview-header">
                                    <div className="portfolio-overview-info">
                                        <h1>{selectedPortfolio.name}</h1>
                                        <p>{selectedPortfolio.description}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddStockForm(true)}
                                        className="portfolio-add-stock-btn"
                                    >
                                        📊 Add Stock
                                    </button>
                                </div>

                                {/* Portfolio Stats */}
                                <div className="portfolio-stats">
                                    <div className="portfolio-stat blue">
                                        <div className="portfolio-stat-label">Initial Capital</div>
                                        <div className="portfolio-stat-value">
                                            ${selectedPortfolio.initial_capital?.toLocaleString() || '0'}
                                        </div>
                                    </div>
                                    <div className="portfolio-stat green">
                                        <div className="portfolio-stat-label">Current Value</div>
                                        <div className="portfolio-stat-value">
                                            ${calculatePortfolioValue().toLocaleString()}
                                        </div>
                                    </div>
                                    <div className={`portfolio-stat ${calculatePortfolioGainLoss() >= 0 ? 'green' : 'red'}`}>
                                        <div className="portfolio-stat-label">
                                            Gain/Loss
                                        </div>
                                        <div className="portfolio-stat-value">
                                            {calculatePortfolioGainLoss() >= 0 ? '+' : ''}${calculatePortfolioGainLoss().toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="portfolio-stat purple">
                                        <div className="portfolio-stat-label">Holdings</div>
                                        <div className="portfolio-stat-value">
                                            {portfolioHoldings.length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Holdings Table */}
                            <div className="portfolio-holdings">
                                <h3 className="portfolio-holdings-title">📈 Holdings</h3>

                                {portfolioHoldings.length === 0 ? (
                                    <div className="portfolio-holdings-empty">
                                        <div className="portfolio-holdings-empty-icon">📊</div>
                                        <p className="portfolio-holdings-empty-text">No stocks in this portfolio yet</p>
                                        <button
                                            onClick={() => setShowAddStockForm(true)}
                                            className="portfolio-holdings-empty-btn"
                                        >
                                            Add Your First Stock
                                        </button>
                                    </div>
                                ) : (
                                    <div className="portfolio-holdings-table-container">
                                        <table className="portfolio-holdings-table">
                                            <thead>
                                                <tr>
                                                    <th>Symbol</th>
                                                    <th>Shares</th>
                                                    <th>Avg Price</th>
                                                    <th>Total Value</th>
                                                    <th>Date Added</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {portfolioHoldings.map((holding, index) => (
                                                    <tr key={index} className="portfolio-holdings-row">
                                                        <td className="portfolio-holdings-symbol">{holding.symbol}</td>
                                                        <td className="portfolio-holdings-shares">{holding.shares}</td>
                                                        <td className="portfolio-holdings-price">${holding.avg_price?.toFixed(2)}</td>
                                                        <td className="portfolio-holdings-value">
                                                            ${(holding.shares * holding.avg_price).toLocaleString()}
                                                        </td>
                                                        <td className="portfolio-holdings-date">
                                                            {new Date(holding.created_at).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="portfolio-welcome">
                            <div className="portfolio-welcome-icon">💼</div>
                            <h2 className="portfolio-welcome-title">Welcome to Portfolio Management</h2>
                            <p className="portfolio-welcome-text">Create your first portfolio to start tracking your investments</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="portfolio-welcome-btn"
                            >
                                Create Portfolio
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Portfolio Modal */}
            {showCreateForm && (
                <div className="portfolio-modal-overlay">
                    <div className="portfolio-modal">
                        <div className="portfolio-modal-header">
                            <div className="portfolio-modal-header-content">
                                <h3 className="portfolio-modal-title">Create New Portfolio</h3>
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewPortfolio({ name: '', description: '', initial_capital: 10000 });
                                    }}
                                    className="portfolio-modal-close"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <form onSubmit={createPortfolio} className="portfolio-modal-content">
                            <div className="portfolio-modal-fields">
                                <div className="portfolio-form-field">
                                    <label className="portfolio-form-label">
                                        Portfolio Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., My Growth Portfolio"
                                        value={newPortfolio.name}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                                        className="portfolio-form-input"
                                        required
                                    />
                                </div>

                                <div className="portfolio-form-field">
                                    <label className="portfolio-form-label">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        placeholder="Describe your investment strategy..."
                                        value={newPortfolio.description}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                                        rows={3}
                                        className="portfolio-form-textarea"
                                    />
                                </div>

                                <div className="portfolio-form-field">
                                    <label className="portfolio-form-label">
                                        Initial Capital *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 10000"
                                        value={newPortfolio.initial_capital}
                                        onChange={(e) => setNewPortfolio({ ...newPortfolio, initial_capital: parseFloat(e.target.value) })}
                                        className="portfolio-form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="portfolio-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewPortfolio({ name: '', description: '', initial_capital: 10000 });
                                    }}
                                    className="portfolio-modal-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="portfolio-modal-submit"
                                >
                                    Create Portfolio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Stock Modal */}
            {showAddStockForm && (
                <div className="portfolio-modal-overlay">
                    <div className="portfolio-modal">
                        <div className="portfolio-modal-header stock">
                            <div className="portfolio-modal-header-content">
                                <h3 className="portfolio-modal-title">Add Stock Transaction</h3>
                                <button
                                    onClick={() => {
                                        setShowAddStockForm(false);
                                        setNewStock({ symbol: '', shares: '', price: '', transaction_type: 'BUY' });
                                    }}
                                    className="portfolio-modal-close"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <form onSubmit={addStock} className="portfolio-modal-content">
                            <div className="portfolio-modal-fields">
                                <div className="portfolio-form-field">
                                    <label className="portfolio-form-label">
                                        Stock Symbol *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., AAPL"
                                        value={newStock.symbol}
                                        onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
                                        className="portfolio-form-input"
                                        required
                                    />
                                </div>

                                <div className="portfolio-form-field">
                                    <label className="portfolio-form-label">
                                        Transaction Type *
                                    </label>
                                    <select
                                        value={newStock.transaction_type}
                                        onChange={(e) => setNewStock({ ...newStock, transaction_type: e.target.value })}
                                        className="portfolio-form-select"
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                </div>

                                <div className="portfolio-form-grid">
                                    <div className="portfolio-form-field">
                                        <label className="portfolio-form-label">
                                            Shares *
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g., 10"
                                            value={newStock.shares}
                                            onChange={(e) => setNewStock({ ...newStock, shares: e.target.value })}
                                            className="portfolio-form-input"
                                            required
                                        />
                                    </div>

                                    <div className="portfolio-form-field">
                                        <label className="portfolio-form-label">
                                            Price per Share *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g., 150.00"
                                            value={newStock.price}
                                            onChange={(e) => setNewStock({ ...newStock, price: e.target.value })}
                                            className="portfolio-form-input"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="portfolio-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddStockForm(false);
                                        setNewStock({ symbol: '', shares: '', price: '', transaction_type: 'BUY' });
                                    }}
                                    className="portfolio-modal-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="portfolio-modal-submit stock"
                                >
                                    Add Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
