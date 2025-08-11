
const StockSelector = ({ selectedStock, onStockChange }) => {
    const popularStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corp.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' },
        { symbol: 'META', name: 'Meta Platforms Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.' },
        { symbol: 'NFLX', name: 'Netflix Inc.' }
    ];

    return (
        <div className="stock-selector">
            <div className="selector-header">
                <h3>Select Stock</h3>
            </div>

            <div className="selector-content">
                <select
                    value={selectedStock}
                    onChange={(e) => onStockChange(e.target.value)}
                    className="stock-dropdown"
                >
                    {popularStocks.map(stock => (
                        <option key={stock.symbol} value={stock.symbol}>
                            {stock.symbol} - {stock.name}
                        </option>
                    ))}
                </select>

                <div className="quick-select">
                    <span>Quick Select:</span>
                    {popularStocks.slice(0, 5).map(stock => (
                        <button
                            key={stock.symbol}
                            className={`quick-btn ${selectedStock === stock.symbol ? 'active' : ''}`}
                            onClick={() => onStockChange(stock.symbol)}
                        >
                            {stock.symbol}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StockSelector;