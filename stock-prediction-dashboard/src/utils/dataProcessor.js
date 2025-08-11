export const cleanData = (data) => {
    return data.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume, 10)
    }));
};

export const aggregateData = (data, interval) => {
    const aggregated = {};
    data.forEach(item => {
        const dateKey = new Date(item.date).toISOString().split('T')[0];
        if (!aggregated[dateKey]) {
            aggregated[dateKey] = { ...item, count: 1 };
        } else {
            aggregated[dateKey].close = item.close; // Update close price
            aggregated[dateKey].count += 1; // Increment count
        }
    });
    return Object.values(aggregated);
};

export const formatStockData = (data) => {
    return data.map(item => ({
        date: item.date,
        price: item.close,
        volume: item.volume
    }));
};