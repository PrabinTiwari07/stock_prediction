import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import './styles/Navigation.css';

function App() {
    const [currentView, setCurrentView] = useState('dashboard');

    const renderView = () => {
        switch (currentView) {
            case 'portfolio':
                return <Portfolio />;
            case 'watchlist':
                return <Watchlist />;
            default:
                return <Dashboard />;
        }
    };

    const navButtons = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'watchlist', label: 'Watchlist' }
    ];

    return (
        <div className="nav-container">
            <nav className="nav-header">
                <div className="nav-content">
                    <h1 className="nav-title">Stock Price Prediction </h1>

                    <div className="nav-buttons-container">
                        {navButtons.map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setCurrentView(btn.id)}
                                className={`nav-button ${currentView === btn.id ? 'active' : ''}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
