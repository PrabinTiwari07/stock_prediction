// This file contains helper functions for additional functionality related to stock data.

export const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
};

export const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

export const calculatePercentageChange = (oldValue, newValue) => {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
};