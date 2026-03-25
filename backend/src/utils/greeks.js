/**
 * Black-Scholes Greek Calculator - High Precision
 */

// Precise Standard Normal Cumulative Distribution Function (CDF)
function cnd(x) {
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c = 0.39894228;

    if (x >= 0.0) {
        let t = 1.0 / (1.0 + p * x);
        return (1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
    } else {
        let t = 1.0 / (1.0 - p * x);
        return (c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
    }
}

// Standard Normal Probability Density Function (PDF)
function nd(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates theoretical Black-Scholes price
 */
function blackScholesPrice(type, S, K, t, r, v) {
    if (t <= 0) return Math.max(0, type === 'CE' ? S - K : K - S);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    if (type === 'CE') {
        return S * cnd(d1) - K * Math.exp(-r * t) * cnd(d2);
    } else {
        return K * Math.exp(-r * t) * cnd(-d2) - S * cnd(-d1);
    }
}

/**
 * Derives Implied Volatility (IV) from option price using Newton-Raphson
 */
function calculateIV(type, S, K, t, r, marketPrice) {
    if (marketPrice <= 0.05) return 0.15; // Default low IV for near-zero prices
    
    let v = 0.3; // Initial guess (30%)
    const maxIterations = 20;
    const precision = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
        const price = blackScholesPrice(type, S, K, t, r, v);
        const diff = marketPrice - price;
        if (Math.abs(diff) < precision) return v;

        // Vega (derivative of price with respect to volatility)
        const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
        const vega = S * Math.sqrt(t) * nd(d1);
        
        if (vega < 0.0001) break; // Avoid division by very small vega
        v = v + diff / vega;
        if (v <= 0) v = 0.01; // Floor volatility
    }
    return v;
}

/**
 * Calculates Greeks using Black-Scholes model
 */
function calculateGreeks(type, S, K, t, r, v) {
    if (t <= 0) t = 0.00001; 
    if (v <= 0) v = 0.01;

    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    const n_d1 = nd(d1);
    const N_d1 = cnd(d1);
    const N_d2 = cnd(d2);

    let delta, theta, gamma, vega;

    gamma = n_d1 / (S * v * Math.sqrt(t));
    vega = (S * n_d1 * Math.sqrt(t)) / 100;

    if (type === 'CE') {
        delta = N_d1;
        theta = (-(S * n_d1 * v) / (2 * Math.sqrt(t)) - r * K * Math.exp(-r * t) * N_d2) / 365;
    } else {
        delta = N_d1 - 1;
        theta = (-(S * n_d1 * v) / (2 * Math.sqrt(t)) + r * K * Math.exp(-r * t) * (1 - N_d2)) / 365;
    }

    return {
        delta: parseFloat(delta.toFixed(4)),
        gamma: parseFloat(gamma.toFixed(6)),
        theta: parseFloat(theta.toFixed(4)),
        vega: parseFloat(vega.toFixed(4)),
        iv: v * 100 // Return as percentage
    };
}

module.exports = { calculateGreeks, calculateIV, blackScholesPrice };
