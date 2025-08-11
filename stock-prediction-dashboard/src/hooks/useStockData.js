import { useState, useEffect } from 'react';
import { fetchStockData } from '../services/stockAPI';

const useStockData = (stockSymbol) => {
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getStockData = async () => {
            try {
                setLoading(true);
                const data = await fetchStockData(stockSymbol);
                setStockData(data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (stockSymbol) {
            getStockData();
        }
    }, [stockSymbol]);

    return { stockData, loading, error };
};

export default useStockData;