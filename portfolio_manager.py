"""
Portfolio Management System for Stock Prediction Dashboard
Provides portfolio optimization, risk management, and watchlist functionality
"""

import json
import sqlite3
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import scipy.optimize as sco
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy import stats


class PortfolioManager:
    def __init__(self, db_path='portfolio.db'):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for portfolio management"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create portfolios table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                initial_capital REAL DEFAULT 10000,
                created_date TEXT,
                updated_date TEXT
            )
        ''')
        
        # Create portfolio holdings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                portfolio_id INTEGER,
                symbol TEXT,
                shares REAL,
                avg_price REAL,
                purchase_date TEXT,
                FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
            )
        ''')
        
        # Create watchlist table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT,
                target_price REAL,
                notes TEXT,
                added_date TEXT,
                alert_enabled BOOLEAN DEFAULT 1
            )
        ''')
        
        # Create transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                portfolio_id INTEGER,
                symbol TEXT,
                transaction_type TEXT,
                shares REAL,
                price REAL,
                transaction_date TEXT,
                fees REAL DEFAULT 0,
                FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_portfolio(self, name, description="", initial_capital=10000):
        """Create a new portfolio"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO portfolios (name, description, initial_capital, created_date, updated_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, description, initial_capital, datetime.now().isoformat(), datetime.now().isoformat()))
            
            portfolio_id = cursor.lastrowid
            conn.commit()
            return True, portfolio_id
            
        except sqlite3.IntegrityError:
            return False, "Portfolio name already exists"
        finally:
            conn.close()
    
    def get_portfolios(self):
        """Get all portfolios"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM portfolios ORDER BY created_date DESC')
        portfolios = cursor.fetchall()
        
        portfolio_list = []
        for portfolio in portfolios:
            portfolio_data = {
                'id': portfolio[0],
                'name': portfolio[1],
                'description': portfolio[2],
                'initial_capital': portfolio[3],
                'created_date': portfolio[4],
                'updated_date': portfolio[5]
            }
            
            # Get current value
            current_value = self.calculate_portfolio_value(portfolio[0])
            portfolio_data['current_value'] = current_value
            portfolio_data['total_return'] = ((current_value - portfolio[3]) / portfolio[3]) * 100 if portfolio[3] > 0 else 0
            
            portfolio_list.append(portfolio_data)
        
        conn.close()
        return portfolio_list
    
    def add_to_portfolio(self, portfolio_id, symbol, shares, price, transaction_type='BUY'):
        """Add a stock to portfolio"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Add transaction record
            cursor.execute('''
                INSERT INTO transactions (portfolio_id, symbol, transaction_type, shares, price, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (portfolio_id, symbol, transaction_type, shares, price, datetime.now().isoformat()))
            
            # Update holdings
            if transaction_type.upper() == 'BUY':
                # Check if holding exists
                cursor.execute('''
                    SELECT shares, avg_price FROM holdings 
                    WHERE portfolio_id = ? AND symbol = ?
                ''', (portfolio_id, symbol))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing holding
                    old_shares, old_avg_price = existing
                    new_shares = old_shares + shares
                    new_avg_price = ((old_shares * old_avg_price) + (shares * price)) / new_shares
                    
                    cursor.execute('''
                        UPDATE holdings 
                        SET shares = ?, avg_price = ?
                        WHERE portfolio_id = ? AND symbol = ?
                    ''', (new_shares, new_avg_price, portfolio_id, symbol))
                else:
                    # Create new holding
                    cursor.execute('''
                        INSERT INTO holdings (portfolio_id, symbol, shares, avg_price, purchase_date)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (portfolio_id, symbol, shares, price, datetime.now().isoformat()))
            
            elif transaction_type.upper() == 'SELL':
                # Update existing holding
                cursor.execute('''
                    SELECT shares FROM holdings 
                    WHERE portfolio_id = ? AND symbol = ?
                ''', (portfolio_id, symbol))
                
                existing = cursor.fetchone()
                if existing and existing[0] >= shares:
                    new_shares = existing[0] - shares
                    if new_shares > 0:
                        cursor.execute('''
                            UPDATE holdings 
                            SET shares = ?
                            WHERE portfolio_id = ? AND symbol = ?
                        ''', (new_shares, portfolio_id, symbol))
                    else:
                        cursor.execute('''
                            DELETE FROM holdings 
                            WHERE portfolio_id = ? AND symbol = ?
                        ''', (portfolio_id, symbol))
                else:
                    return False, "Insufficient shares to sell"
            
            # Update portfolio timestamp
            cursor.execute('''
                UPDATE portfolios 
                SET updated_date = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), portfolio_id))
            
            conn.commit()
            return True, "Transaction completed successfully"
            
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def calculate_portfolio_value(self, portfolio_id):
        """Calculate current portfolio value"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT symbol, shares FROM holdings 
            WHERE portfolio_id = ?
        ''', (portfolio_id,))
        
        holdings = cursor.fetchall()
        conn.close()
        
        total_value = 0
        for symbol, shares in holdings:
            try:
                stock = yf.Ticker(symbol)
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                total_value += shares * current_price
            except:
                continue  # Skip if price fetch fails
        
        return total_value
    
    def get_portfolio_performance(self, portfolio_id, period='1y'):
        """Calculate portfolio performance metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get portfolio info
        cursor.execute('SELECT * FROM portfolios WHERE id = ?', (portfolio_id,))
        portfolio = cursor.fetchone()
        
        if not portfolio:
            return None
        
        # Get holdings
        cursor.execute('''
            SELECT symbol, shares, avg_price FROM holdings 
            WHERE portfolio_id = ?
        ''', (portfolio_id,))
        holdings = cursor.fetchall()
        
        # Get transactions
        cursor.execute('''
            SELECT * FROM transactions 
            WHERE portfolio_id = ? 
            ORDER BY transaction_date
        ''', (portfolio_id,))
        transactions = cursor.fetchall()
        
        conn.close()
        
        # Calculate metrics
        current_value = self.calculate_portfolio_value(portfolio_id)
        initial_capital = portfolio[3]
        
        # Calculate returns for each holding
        holding_data = []
        total_invested = 0
        
        for symbol, shares, avg_price in holdings:
            try:
                stock = yf.Ticker(symbol)
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                
                market_value = shares * current_price
                cost_basis = shares * avg_price
                unrealized_pnl = market_value - cost_basis
                unrealized_pnl_pct = (unrealized_pnl / cost_basis) * 100 if cost_basis > 0 else 0
                
                holding_data.append({
                    'symbol': symbol,
                    'shares': shares,
                    'avg_price': avg_price,
                    'current_price': current_price,
                    'market_value': market_value,
                    'cost_basis': cost_basis,
                    'unrealized_pnl': unrealized_pnl,
                    'unrealized_pnl_pct': unrealized_pnl_pct,
                    'weight': (market_value / current_value) * 100 if current_value > 0 else 0
                })
                
                total_invested += cost_basis
                
            except Exception as e:
                continue
        
        # Portfolio level metrics
        total_return = ((current_value - initial_capital) / initial_capital) * 100 if initial_capital > 0 else 0
        
        # Calculate portfolio volatility (simplified)
        portfolio_volatility = self._calculate_portfolio_volatility([h['symbol'] for h in holding_data])
        
        # Risk metrics
        sharpe_ratio = self._calculate_portfolio_sharpe([h['symbol'] for h in holding_data])
        
        return {
            'portfolio_id': portfolio_id,
            'portfolio_name': portfolio[1],
            'initial_capital': initial_capital,
            'current_value': current_value,
            'total_invested': total_invested,
            'cash_position': initial_capital - total_invested,
            'total_return': total_return,
            'total_pnl': current_value - initial_capital,
            'volatility': portfolio_volatility,
            'sharpe_ratio': sharpe_ratio,
            'holdings': holding_data,
            'num_holdings': len(holding_data),
            'last_updated': datetime.now().isoformat()
        }
    
    def _calculate_portfolio_volatility(self, symbols, period='1y'):
        """Calculate portfolio volatility"""
        try:
            if not symbols:
                return 0
            
            # Download price data
            data = yf.download(symbols, period=period, progress=False)['Close']
            if isinstance(data, pd.Series):
                returns = data.pct_change().dropna()
                return returns.std() * np.sqrt(252) * 100  # Annualized volatility
            else:
                returns = data.pct_change().dropna()
                # Equal weighted portfolio volatility
                portfolio_returns = returns.mean(axis=1)
                return portfolio_returns.std() * np.sqrt(252) * 100
                
        except:
            return 0
    
    def _calculate_portfolio_sharpe(self, symbols, risk_free_rate=0.02):
        """Calculate portfolio Sharpe ratio"""
        try:
            if not symbols:
                return 0
            
            # Download price data
            data = yf.download(symbols, period='1y', progress=False)['Close']
            if isinstance(data, pd.Series):
                returns = data.pct_change().dropna()
            else:
                returns = data.pct_change().dropna().mean(axis=1)
            
            excess_returns = returns - risk_free_rate/252
            return (excess_returns.mean() / excess_returns.std()) * np.sqrt(252) if excess_returns.std() != 0 else 0
            
        except:
            return 0
    
    def delete_portfolio(self, portfolio_id):
        """Delete a portfolio and all its holdings"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Delete holdings first
            cursor.execute('DELETE FROM holdings WHERE portfolio_id = ?', (portfolio_id,))
            
            # Delete transactions
            cursor.execute('DELETE FROM transactions WHERE portfolio_id = ?', (portfolio_id,))
            
            # Delete portfolio
            cursor.execute('DELETE FROM portfolios WHERE id = ?', (portfolio_id,))
            
            if cursor.rowcount > 0:
                conn.commit()
                return True, "Portfolio deleted successfully"
            else:
                return False, "Portfolio not found"
                
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def update_portfolio(self, portfolio_id, name=None, description=None):
        """Update portfolio details"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            update_fields = []
            params = []
            
            if name:
                update_fields.append("name = ?")
                params.append(name)
            
            if description is not None:
                update_fields.append("description = ?")
                params.append(description)
            
            if not update_fields:
                return False, "No fields to update"
            
            update_fields.append("updated_date = ?")
            params.append(datetime.now().isoformat())
            params.append(portfolio_id)
            
            query = f"UPDATE portfolios SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            
            if cursor.rowcount > 0:
                conn.commit()
                return True, "Portfolio updated successfully"
            else:
                return False, "Portfolio not found"
                
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def get_portfolio_holdings(self, portfolio_id):
        """Get detailed holdings for a portfolio"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT h.id, h.symbol, h.shares, h.avg_price, h.purchase_date
            FROM holdings h
            WHERE h.portfolio_id = ?
            ORDER BY h.purchase_date DESC
        ''', (portfolio_id,))
        
        holdings_data = cursor.fetchall()
        conn.close()
        
        holdings = []
        for holding in holdings_data:
            try:
                symbol = holding[1]
                shares = holding[2]
                avg_price = holding[3]
                
                # Get current price from Yahoo Finance
                stock = yf.Ticker(symbol)
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                
                market_value = shares * current_price
                cost_basis = shares * avg_price
                unrealized_pnl = market_value - cost_basis
                
                holdings.append({
                    'id': holding[0],
                    'symbol': symbol,
                    'shares': shares,
                    'avg_price': avg_price,
                    'current_price': current_price,
                    'market_value': market_value,
                    'cost_basis': cost_basis,
                    'unrealized_pnl': unrealized_pnl,
                    'unrealized_pnl_percent': (unrealized_pnl / cost_basis) * 100 if cost_basis > 0 else 0,
                    'purchase_date': holding[4]
                })
            except Exception as e:
                # If Yahoo Finance fails, add holding with basic info
                holdings.append({
                    'id': holding[0],
                    'symbol': holding[1],
                    'shares': holding[2],
                    'avg_price': holding[3],
                    'current_price': 0,
                    'market_value': 0,
                    'cost_basis': holding[2] * holding[3],
                    'unrealized_pnl': 0,
                    'unrealized_pnl_percent': 0,
                    'purchase_date': holding[4]
                })
        
        return holdings
    
    def update_holding(self, holding_id, shares=None, avg_price=None):
        """Update a holding's shares or average price"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            update_fields = []
            params = []
            
            if shares is not None:
                update_fields.append("shares = ?")
                params.append(shares)
            
            if avg_price is not None:
                update_fields.append("avg_price = ?")
                params.append(avg_price)
            
            if not update_fields:
                return False, "No fields to update"
            
            params.append(holding_id)
            
            query = f"UPDATE holdings SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            
            if cursor.rowcount > 0:
                conn.commit()
                return True, "Holding updated successfully"
            else:
                return False, "Holding not found"
                
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def delete_holding(self, holding_id):
        """Delete a holding from portfolio"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('DELETE FROM holdings WHERE id = ?', (holding_id,))
            
            if cursor.rowcount > 0:
                conn.commit()
                return True, "Holding deleted successfully"
            else:
                return False, "Holding not found"
                
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def remove_from_watchlist(self, item_id):
        """Remove item from watchlist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('DELETE FROM watchlist WHERE id = ?', (item_id,))
            
            if cursor.rowcount > 0:
                conn.commit()
                return True, "Removed from watchlist successfully"
            else:
                return False, "Item not found"
                
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
        """Add stock to watchlist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO watchlist (symbol, target_price, notes, added_date)
                VALUES (?, ?, ?, ?)
            ''', (symbol.upper(), target_price, notes, datetime.now().isoformat()))
            
            conn.commit()
            return True, "Added to watchlist successfully"
            
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def add_to_watchlist(self, symbol, target_price=None, notes=''):
        """Add stock to watchlist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO watchlist (symbol, target_price, notes, added_date, alert_enabled)
                VALUES (?, ?, ?, ?, ?)
            ''', (symbol.upper(), target_price, notes, datetime.now().isoformat(), True))
            
            conn.commit()
            return True, "Added to watchlist successfully"
            
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def delete_watchlist_item(self, item_id):
        """Delete item from watchlist (alias for remove_from_watchlist)"""
        return self.remove_from_watchlist(item_id)
    
    def get_watchlist(self):
        """Get watchlist with current prices and alerts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM watchlist ORDER BY added_date DESC')
        watchlist_items = cursor.fetchall()
        conn.close()
        
        watchlist = []
        for item in watchlist_items:
            try:
                symbol = item[1]
                stock = yf.Ticker(symbol)
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                
                watchlist_data = {
                    'id': item[0],
                    'symbol': symbol,
                    'current_price': current_price,
                    'target_price': item[2],
                    'notes': item[3],
                    'added_date': item[4],
                    'alert_enabled': bool(item[5])
                }
                
                # Calculate alert status
                if item[2]:  # If target price is set
                    if current_price >= item[2]:
                        watchlist_data['alert_status'] = 'TARGET_REACHED'
                        watchlist_data['alert_message'] = f'Price reached target of ${item[2]:.2f}'
                    else:
                        pct_to_target = ((item[2] - current_price) / current_price) * 100
                        watchlist_data['alert_status'] = 'MONITORING'
                        watchlist_data['alert_message'] = f'{pct_to_target:.1f}% to target'
                else:
                    watchlist_data['alert_status'] = 'NO_TARGET'
                    watchlist_data['alert_message'] = 'No target price set'
                
                watchlist.append(watchlist_data)
                
            except Exception as e:
                continue  # Skip items with errors
        
        return watchlist
    
    def optimize_portfolio(self, symbols, target_return=None, risk_tolerance='moderate'):
        """Optimize portfolio allocation using Modern Portfolio Theory"""
        try:
            # Download historical data
            data = yf.download(symbols, period='2y', progress=False)['Close']
            returns = data.pct_change().dropna()
            
            # Calculate expected returns and covariance matrix
            expected_returns = returns.mean() * 252  # Annualized
            cov_matrix = returns.cov() * 252  # Annualized
            
            num_assets = len(symbols)
            
            # Risk tolerance settings
            risk_settings = {
                'conservative': {'max_volatility': 0.15, 'target_return': 0.08},
                'moderate': {'max_volatility': 0.20, 'target_return': 0.12},
                'aggressive': {'max_volatility': 0.30, 'target_return': 0.18}
            }
            
            settings = risk_settings.get(risk_tolerance, risk_settings['moderate'])
            
            if target_return is None:
                target_return = settings['target_return']
            
            # Optimization constraints
            constraints = [
                {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},  # Weights sum to 1
                {'type': 'eq', 'fun': lambda x: np.sum(x * expected_returns) - target_return}  # Target return
            ]
            
            # Bounds for weights (0 to 40% per asset)
            bounds = tuple((0, 0.4) for _ in range(num_assets))
            
            # Initial guess (equal weights)
            x0 = np.array([1/num_assets] * num_assets)
            
            # Objective function: minimize portfolio variance
            def portfolio_variance(weights):
                return np.dot(weights.T, np.dot(cov_matrix, weights))
            
            # Optimize
            result = sco.minimize(portfolio_variance, x0, method='SLSQP', 
                                bounds=bounds, constraints=constraints)
            
            if result.success:
                optimal_weights = result.x
                
                # Calculate portfolio metrics
                portfolio_return = np.sum(optimal_weights * expected_returns)
                portfolio_volatility = np.sqrt(np.dot(optimal_weights.T, np.dot(cov_matrix, optimal_weights)))
                sharpe_ratio = portfolio_return / portfolio_volatility if portfolio_volatility > 0 else 0
                
                optimization_result = {
                    'success': True,
                    'symbols': symbols,
                    'weights': optimal_weights.tolist(),
                    'expected_return': portfolio_return,
                    'volatility': portfolio_volatility,
                    'sharpe_ratio': sharpe_ratio,
                    'allocations': [
                        {
                            'symbol': symbol,
                            'weight': weight,
                            'allocation_pct': weight * 100
                        }
                        for symbol, weight in zip(symbols, optimal_weights)
                    ]
                }
                
                return optimization_result
            else:
                return {'success': False, 'error': 'Optimization failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

# Initialize portfolio manager
portfolio_manager = PortfolioManager('portfolio_management.db')

# Flask API for portfolio management
app = Flask(__name__)
CORS(app)

@app.route('/api/portfolio/create', methods=['POST'])
def create_portfolio():
    """Create a new portfolio"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    initial_capital = data.get('initial_capital', 10000)
    
    success, result = portfolio_manager.create_portfolio(name, description, initial_capital)
    
    if success:
        return jsonify({'success': True, 'portfolio_id': result})
    else:
        return jsonify({'success': False, 'error': result}), 400

@app.route('/api/portfolio/list', methods=['GET'])
def list_portfolios():
    """Get all portfolios"""
    portfolios = portfolio_manager.get_portfolios()
    return jsonify({'success': True, 'portfolios': portfolios})

@app.route('/api/portfolio/<int:portfolio_id>/performance', methods=['GET'])
def get_portfolio_performance(portfolio_id):
    """Get portfolio performance"""
    performance = portfolio_manager.get_portfolio_performance(portfolio_id)
    if performance:
        return jsonify({'success': True, 'performance': performance})
    else:
        return jsonify({'success': False, 'error': 'Portfolio not found'}), 404

@app.route('/api/portfolio/<int:portfolio_id>/add', methods=['POST'])
def add_to_portfolio(portfolio_id):
    """Add stock to portfolio"""
    data = request.get_json()
    symbol = data.get('symbol').upper()
    shares = float(data.get('shares'))
    price = float(data.get('price'))
    transaction_type = data.get('transaction_type', 'BUY')
    
    success, message = portfolio_manager.add_to_portfolio(portfolio_id, symbol, shares, price, transaction_type)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/watchlist/add', methods=['POST'])
def add_to_watchlist():
    """Add stock to watchlist"""
    data = request.get_json()
    symbol = data.get('symbol').upper()
    target_price = data.get('target_price')
    notes = data.get('notes', '')
    
    success, message = portfolio_manager.add_to_watchlist(symbol, target_price, notes)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    """Get watchlist"""
    watchlist = portfolio_manager.get_watchlist()
    return jsonify({'success': True, 'watchlist': watchlist})

@app.route('/api/watchlist/<int:item_id>', methods=['DELETE'])
def delete_watchlist_item(item_id):
    """Delete item from watchlist"""
    success, message = portfolio_manager.delete_watchlist_item(item_id)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/portfolio/<int:portfolio_id>', methods=['PUT'])
def update_portfolio(portfolio_id):
    """Update portfolio details"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    success, message = portfolio_manager.update_portfolio(portfolio_id, name, description)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/portfolio/<int:portfolio_id>', methods=['DELETE'])
def delete_portfolio(portfolio_id):
    """Delete portfolio"""
    success, message = portfolio_manager.delete_portfolio(portfolio_id)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/portfolio/<int:portfolio_id>/holdings', methods=['GET'])
def get_portfolio_holdings(portfolio_id):
    """Get portfolio holdings"""
    holdings = portfolio_manager.get_portfolio_holdings(portfolio_id)
    return jsonify({'success': True, 'holdings': holdings})

@app.route('/api/portfolio/<int:portfolio_id>/holding/<int:holding_id>', methods=['PUT'])
def update_holding(portfolio_id, holding_id):
    """Update holding in portfolio"""
    data = request.get_json()
    shares = data.get('shares')
    avg_price = data.get('avg_price')
    
    success, message = portfolio_manager.update_holding(holding_id, shares, avg_price)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/portfolio/<int:portfolio_id>/holding/<int:holding_id>', methods=['DELETE'])
def delete_holding(portfolio_id, holding_id):
    """Delete holding from portfolio"""
    success, message = portfolio_manager.delete_holding(holding_id)
    
    if success:
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'error': message}), 400

@app.route('/api/portfolio/optimize', methods=['POST'])
def optimize_portfolio():
    """Optimize portfolio allocation"""
    data = request.get_json()
    symbols = data.get('symbols', [])
    target_return = data.get('target_return')
    risk_tolerance = data.get('risk_tolerance', 'moderate')
    
    result = portfolio_manager.optimize_portfolio(symbols, target_return, risk_tolerance)
    return jsonify(result)

if __name__ == '__main__':
    print("🏦 Portfolio Management API starting...")
    print(" Available endpoints:")
    print("  POST /api/portfolio/create - Create portfolio")
    print("  GET  /api/portfolio/list - List portfolios")
    print("  PUT  /api/portfolio/<id> - Update portfolio")
    print("  DELETE /api/portfolio/<id> - Delete portfolio")
    print("  GET  /api/portfolio/<id>/performance - Portfolio performance")
    print("  GET  /api/portfolio/<id>/holdings - Get portfolio holdings")
    print("  POST /api/portfolio/<id>/add - Add stock to portfolio")
    print("  PUT  /api/portfolio/<id>/holding/<holding_id> - Update holding")
    print("  DELETE /api/portfolio/<id>/holding/<holding_id> - Delete holding")
    print("  POST /api/watchlist/add - Add to watchlist")
    print("  GET  /api/watchlist - Get watchlist")
    print("  DELETE /api/watchlist/<id> - Remove from watchlist")
    print("  POST /api/portfolio/optimize - Optimize portfolio")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
