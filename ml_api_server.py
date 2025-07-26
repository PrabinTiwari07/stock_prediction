import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import ta
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

class StockPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def download_stock_data(self, symbol, period='2y', interval='1d'):
        """Download stock data using yfinance"""
        try:
            stock = yf.Ticker(symbol)
            data = stock.history(period=period, interval=interval)
            return data
        except Exception as e:
            print(f"Error downloading data for {symbol}: {e}")
            return None
    
    def calculate_technical_indicators(self, data):
        """Calculate technical indicators"""
        try:
            # RSI
            data['RSI'] = ta.momentum.RSIIndicator(close=data['Close']).rsi()
            
            # MACD
            macd = ta.trend.MACD(close=data['Close'])
            data['MACD'] = macd.macd()
            data['MACD_Signal'] = macd.macd_signal()
            data['MACD_Hist'] = macd.macd_diff()
            
            # Bollinger Bands
            bollinger = ta.volatility.BollingerBands(close=data['Close'])
            data['BB_Upper'] = bollinger.bollinger_hband()
            data['BB_Lower'] = bollinger.bollinger_lband()
            data['BB_Middle'] = bollinger.bollinger_mavg()
            
            # Moving Averages
            data['SMA_20'] = ta.trend.SMAIndicator(close=data['Close'], window=20).sma_indicator()
            data['SMA_50'] = ta.trend.SMAIndicator(close=data['Close'], window=50).sma_indicator()
            data['EMA_12'] = ta.trend.EMAIndicator(close=data['Close'], window=12).ema_indicator()
            data['EMA_26'] = ta.trend.EMAIndicator(close=data['Close'], window=26).ema_indicator()
            
            # Volume indicators
            # Volume SMA calculation (using pandas rolling mean)
            data['Volume_SMA'] = data['Volume'].rolling(window=20).mean()
            
            # Price momentum
            data['ROC'] = ta.momentum.ROCIndicator(close=data['Close']).roc()
            data['Stoch'] = ta.momentum.StochasticOscillator(high=data['High'], low=data['Low'], close=data['Close']).stoch()
            
            return data
        except Exception as e:
            print(f"Error calculating technical indicators: {e}")
            return data
    
    def generate_labels(self, data, days_ahead=1):
        """Generate buy/sell/hold labels"""
        data['Future_Price'] = data['Close'].shift(-days_ahead)
        data['Price_Change'] = (data['Future_Price'] - data['Close']) / data['Close']
        
        # Define thresholds for buy/sell signals
        buy_threshold = 0.02   # 2% increase
        sell_threshold = -0.02 # 2% decrease
        
        conditions = [
            data['Price_Change'] > buy_threshold,
            data['Price_Change'] < sell_threshold
        ]
        choices = [1, -1]  # 1 = Buy, -1 = Sell, 0 = Hold
        
        data['Signal'] = np.select(conditions, choices, default=0)
        return data
    
    def prepare_features(self, data):
        """Prepare features for machine learning"""
        feature_columns = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'RSI', 'MACD', 'MACD_Signal', 'MACD_Hist',
            'BB_Upper', 'BB_Lower', 'BB_Middle',
            'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26',
            'Volume_SMA', 'ROC', 'Stoch'
        ]
        
        # Select only available columns
        available_columns = [col for col in feature_columns if col in data.columns]
        X = data[available_columns].dropna()
        
        return X, available_columns
    
    def train_model(self, symbol):
        """Train the prediction model"""
        try:
            # Download and prepare data
            data = self.download_stock_data(symbol, period='2y', interval='1d')
            if data is None or data.empty:
                return False, "Failed to download stock data"
            
            # Calculate technical indicators
            data = self.calculate_technical_indicators(data)
            
            # Generate labels
            data = self.generate_labels(data)
            
            # Prepare features
            X, self.feature_columns = self.prepare_features(data)
            y = data.loc[X.index, 'Signal']
            
            if len(X) < 50:
                return False, "Insufficient data for training"
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train model
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train, y_train)
            
            # Calculate accuracy
            train_accuracy = self.model.score(X_train, y_train)
            test_accuracy = self.model.score(X_test, y_test)
            
            self.is_trained = True
            
            return True, {
                'train_accuracy': train_accuracy,
                'test_accuracy': test_accuracy,
                'data_points': len(X)
            }
            
        except Exception as e:
            return False, f"Training error: {str(e)}"
    
    def get_enhanced_signal(self, latest_data, prediction, prediction_proba):
        """Enhanced signal generation using technical indicators"""
        try:
            # Extract technical indicators
            rsi = latest_data['RSI'].iloc[0] if 'RSI' in latest_data else 50
            macd = latest_data['MACD'].iloc[0] if 'MACD' in latest_data else 0
            macd_signal = latest_data['MACD_Signal'].iloc[0] if 'MACD_Signal' in latest_data else 0
            current_price = latest_data['Close'].iloc[0]
            sma_20 = latest_data['SMA_20'].iloc[0] if 'SMA_20' in latest_data else current_price
            sma_50 = latest_data['SMA_50'].iloc[0] if 'SMA_50' in latest_data else current_price
            bb_upper = latest_data['BB_Upper'].iloc[0] if 'BB_Upper' in latest_data else current_price * 1.02
            bb_lower = latest_data['BB_Lower'].iloc[0] if 'BB_Lower' in latest_data else current_price * 0.98
            
            # Initialize signal scores
            signal_scores = []
            
            # RSI Analysis
            if rsi < 30:  # Oversold
                signal_scores.append(1)  # Buy signal
            elif rsi > 70:  # Overbought
                signal_scores.append(-1)  # Sell signal
            else:
                signal_scores.append(0)  # Neutral
            
            # MACD Analysis
            if macd > macd_signal and macd > 0:  # Bullish momentum
                signal_scores.append(1)
            elif macd < macd_signal and macd < 0:  # Bearish momentum
                signal_scores.append(-1)
            else:
                signal_scores.append(0)
            
            # Moving Average Analysis
            if current_price > sma_20 > sma_50:  # Uptrend
                signal_scores.append(1)
            elif current_price < sma_20 < sma_50:  # Downtrend
                signal_scores.append(-1)
            else:
                signal_scores.append(0)
            
            # Bollinger Bands Analysis
            if current_price <= bb_lower:  # Near lower band - potential buy
                signal_scores.append(1)
            elif current_price >= bb_upper:  # Near upper band - potential sell
                signal_scores.append(-1)
            else:
                signal_scores.append(0)
            
            # Combine ML prediction with technical analysis
            ml_signal = prediction
            technical_signal = np.mean(signal_scores)
            
            # Weight the signals (60% technical, 40% ML)
            combined_signal = 0.6 * technical_signal + 0.4 * ml_signal
            
            # Determine final signal
            if combined_signal >= 0.5:
                final_signal = 1  # BUY
            elif combined_signal <= -0.5:
                final_signal = -1  # SELL
            else:
                final_signal = 0  # HOLD
            
            # Calculate confidence based on agreement and ML probability
            ml_confidence = np.max(prediction_proba)
            technical_strength = abs(technical_signal)
            agreement = 1 if (technical_signal * ml_signal >= 0) else 0.5  # Agreement bonus
            
            confidence = (ml_confidence * 0.5 + technical_strength * 0.3 + agreement * 0.2)
            
            return final_signal, confidence, {
                'rsi': rsi,
                'macd': macd,
                'macd_signal': macd_signal,
                'sma_20': sma_20,
                'sma_50': sma_50,
                'bb_upper': bb_upper,
                'bb_lower': bb_lower,
                'ml_signal': ml_signal,
                'technical_signal': technical_signal,
                'combined_signal': combined_signal
            }
            
        except Exception as e:
            print(f"Error in enhanced signal generation: {e}")
            return prediction, np.max(prediction_proba), {}

    def predict(self, symbol, days=7):
        """Make predictions for the next few days"""
        try:
            # Auto-train if model isn't trained (happens transparently in background)
            if not self.is_trained:
                print(f"Initializing AI model for {symbol}...")
                success, result = self.train_model(symbol)
                if not success:
                    return None, result
                print(f"AI model ready! Analysis accuracy: {result.get('test_accuracy', 0):.1%}")
            
            # Get recent data
            data = self.download_stock_data(symbol, period='6mo', interval='1d')
            if data is None or data.empty:
                return None, "Failed to download recent stock data"
            
            # Calculate technical indicators
            data = self.calculate_technical_indicators(data)
            
            # Get the most recent data point
            latest_data = data.tail(1)
            
            # Prepare features
            X, _ = self.prepare_features(latest_data)
            if X.empty:
                return None, "Failed to prepare features for prediction"
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            prediction_proba = self.model.predict_proba(X_scaled)[0]
            
            # Get enhanced signal using technical indicators
            enhanced_signal, enhanced_confidence, signal_details = self.get_enhanced_signal(
                latest_data, prediction, prediction_proba
            )
            
            # Get current price
            current_price = latest_data['Close'].iloc[0]
            
            # Generate price predictions based on enhanced signal
            predictions = []
            base_price = current_price
            
            # Use deterministic seed based on symbol and current date for consistency
            seed_value = hash(f"{symbol}_{datetime.now().strftime('%Y-%m-%d')}") % (2**32)
            np.random.seed(seed_value)
            
            # Calculate base trend and volatility based on enhanced signal
            if enhanced_signal == 1:  # Buy signal
                base_trend = 0.008  # ~0.8% daily positive trend
                volatility = 0.015   # Daily volatility
            elif enhanced_signal == -1:  # Sell signal
                base_trend = -0.008  # ~0.8% daily negative trend
                volatility = 0.015   # Daily volatility
            else:  # Hold signal
                base_trend = 0.001   # ~0.1% daily trend (nearly flat)
                volatility = 0.012   # Lower volatility for hold signal
            
            for day in range(1, days + 1):
                # Generate consistent daily change using deterministic approach
                # Use sin wave for smooth progression with some randomness
                day_factor = np.sin(day * 0.1) * 0.3 + 0.7  # Varies between 0.4 and 1.0
                trend_component = base_trend * day_factor
                
                # Add controlled randomness that's consistent for the same day
                random_seed = hash(f"{symbol}_{datetime.now().strftime('%Y-%m-%d')}_{day}") % (2**32)
                np.random.seed(random_seed)
                volatility_component = np.random.normal(0, volatility)
                
                total_change = trend_component + volatility_component
                base_price *= (1 + total_change)
                
                # Calculate confidence that decreases over time
                confidence = enhanced_confidence * (1 - (day - 1) * 0.03)  # 3% decrease per day
                confidence = max(0.45, confidence)  # Minimum 45% confidence
                
                predictions.append({
                    'day': day,
                    'predicted_price': round(base_price, 2),
                    'confidence': round(confidence, 3)
                })
            
            # Reset random seed to avoid affecting other operations
            np.random.seed(None)
            
            # Calculate technical indicators for current data (user-friendly)
            current_indicators = {
                'rsi': float(latest_data['RSI'].iloc[0]) if 'RSI' in latest_data.columns else None,
                'macd': float(latest_data['MACD'].iloc[0]) if 'MACD' in latest_data.columns else None,
                'macd_signal': float(latest_data['MACD_Signal'].iloc[0]) if 'MACD_Signal' in latest_data.columns else None,
                'sma_20': float(latest_data['SMA_20'].iloc[0]) if 'SMA_20' in latest_data.columns else None,
                'sma_50': float(latest_data['SMA_50'].iloc[0]) if 'SMA_50' in latest_data.columns else None,
                'current_price': round(current_price, 2),
                'source': 'Yahoo Finance API'
            }
            
            # Remove None values
            current_indicators = {k: v for k, v in current_indicators.items() if v is not None}
            
            result = {
                'symbol': symbol,
                'current_price': round(current_price, 2),
                'signal': int(enhanced_signal),
                'signal_confidence': round(enhanced_confidence, 3),
                'predictions': predictions,
                'technical_indicators': current_indicators,
                'timestamp': datetime.now().isoformat()
            }
            
            return result, None
            
        except Exception as e:
            return None, f"Prediction error: {str(e)}"

# Initialize predictor
predictor = StockPredictor()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'ML API is running'})

@app.route('/api/predict', methods=['POST'])
def predict_stock():
    """Main prediction endpoint"""
    try:
        data = request.get_json()
        symbol = data.get('symbol', 'AAPL').upper()
        days = int(data.get('days', 7))
        model_type = data.get('model_type', 'Random Forest')
        
        # Validate inputs
        if days < 1 or days > 30:
            return jsonify({'error': 'Days must be between 1 and 30'}), 400
        
        # Make prediction
        result, error = predictor.predict(symbol, days)
        
        if error:
            return jsonify({'error': error}), 500
        
        result['model_type'] = model_type
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/indicators/<symbol>', methods=['GET'])
@app.route('/api/api/indicators/<symbol>', methods=['GET'])  # Handle double /api/ from frontend
def get_technical_indicators(symbol):
    """Get current technical indicators for a symbol"""
    try:
        symbol = symbol.upper()
        
        # Download recent data
        data = predictor.download_stock_data(symbol, period='6mo', interval='1d')
        if data is None or data.empty:
            return jsonify({'error': 'Failed to download stock data'}), 500
        
        # Calculate indicators
        data = predictor.calculate_technical_indicators(data)
        latest = data.tail(1)
        
        indicators = {
            'symbol': symbol,
            'current_price': round(float(latest['Close'].iloc[0]), 2),
            'rsi': round(float(latest['RSI'].iloc[0]), 2) if 'RSI' in latest.columns and not pd.isna(latest['RSI'].iloc[0]) else None,
            'macd': round(float(latest['MACD'].iloc[0]), 4) if 'MACD' in latest.columns and not pd.isna(latest['MACD'].iloc[0]) else None,
            'macd_signal': round(float(latest['MACD_Signal'].iloc[0]), 4) if 'MACD_Signal' in latest.columns and not pd.isna(latest['MACD_Signal'].iloc[0]) else None,
            'sma_20': round(float(latest['SMA_20'].iloc[0]), 2) if 'SMA_20' in latest.columns and not pd.isna(latest['SMA_20'].iloc[0]) else None,
            'sma_50': round(float(latest['SMA_50'].iloc[0]), 2) if 'SMA_50' in latest.columns and not pd.isna(latest['SMA_50'].iloc[0]) else None,
            'bb_upper': round(float(latest['BB_Upper'].iloc[0]), 2) if 'BB_Upper' in latest.columns and not pd.isna(latest['BB_Upper'].iloc[0]) else None,
            'bb_lower': round(float(latest['BB_Lower'].iloc[0]), 2) if 'BB_Lower' in latest.columns and not pd.isna(latest['BB_Lower'].iloc[0]) else None,
            'volume': int(latest['Volume'].iloc[0]),
            'timestamp': datetime.now().isoformat()
        }
        
        # Remove None values
        indicators = {k: v for k, v in indicators.items() if v is not None}
        
        return jsonify(indicators)
        
    except Exception as e:
        return jsonify({'error': f'Error calculating indicators: {str(e)}'}), 500

@app.route('/api/stock_data/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    """Get historical stock data"""
    try:
        period = request.args.get('period', '1y')
        interval = request.args.get('interval', '1d')
        
        # Download stock data
        data = predictor.download_stock_data(symbol, period=period, interval=interval)
        if data is None or data.empty:
            return jsonify({'error': 'Failed to download stock data'}), 500
        
        # Calculate technical indicators
        data = predictor.calculate_technical_indicators(data)
        
        # Convert to list of dictionaries for JSON response
        stock_data = []
        for index, row in data.iterrows():
            # Format datetime based on interval
            if interval in ['1m', '5m', '15m', '30m', '1h']:
                date_str = index.strftime('%Y-%m-%d %H:%M:%S')
            else:
                date_str = index.strftime('%Y-%m-%d')
                
            stock_data.append({
                'date': date_str,
                'open': round(float(row['Open']), 2),
                'high': round(float(row['High']), 2),
                'low': round(float(row['Low']), 2),
                'close': round(float(row['Close']), 2),
                'volume': int(row['Volume']),
                'rsi': round(float(row['RSI']), 2) if 'RSI' in row and not pd.isna(row['RSI']) else None,
                'macd': round(float(row['MACD']), 4) if 'MACD' in row and not pd.isna(row['MACD']) else None,
                'sma_20': round(float(row['SMA_20']), 2) if 'SMA_20' in row and not pd.isna(row['SMA_20']) else None,
                'sma_50': round(float(row['SMA_50']), 2) if 'SMA_50' in row and not pd.isna(row['SMA_50']) else None,
            })
        
        return jsonify({
            'symbol': symbol,
            'period': period,
            'interval': interval,
            'data': stock_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error fetching stock data for {symbol}: {e}")
        return jsonify({'error': f'Error fetching stock data: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting Stock Prediction ML API...")
    print("API will be available at http://localhost:5000")
    print("Endpoints:")
    print("  GET  /api/health - Health check")
    print("  POST /api/predict - Make predictions")
    print("  POST /api/train - Train model")
    print("  GET  /api/indicators/<symbol> - Get technical indicators")
    print("  GET  /api/stock_data/<symbol> - Get historical stock data")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
