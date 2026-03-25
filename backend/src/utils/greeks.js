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
 * Calculates theoretical Black-Scholes price including dividend yield (q)
 */
function blackScholesPrice(type, S, K, t, r, v, q = 0) {
    if (t <= 0) return Math.max(0, type === 'CE' ? S - K : K - S);
    const d1 = (Math.log(S / K) + (r - q + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    if (type === 'CE') {
        return S * Math.exp(-q * t) * cnd(d1) - K * Math.exp(-r * t) * cnd(d2);
    } else {
        return K * Math.exp(-r * t) * cnd(-d2) - S * Math.exp(-q * t) * cnd(-d1);
    }
}

/**
 * Derives Implied Volatility (IV) from option price using Bisection Method (more robust for expiry day)
 */
function calculateIV(type, S, K, t, r, marketPrice, q = 0) {
    const intrinsicValue = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
    const extrinsicValue = marketPrice - intrinsicValue;
    
    // If market price is strictly less than intrinsic value or too small, return a floor IV
    if (extrinsicValue < 0.05 || marketPrice < 0.10) return 0.15; 
    
    let low = 0.001;
    let high = 5.0; // Up to 500% IV
    let v = 0.25;
    
    for (let i = 0; i < 25; i++) {
        v = (low + high) / 2;
        const price = blackScholesPrice(type, S, K, t, r, v, q);
        
        if (price > marketPrice) {
            high = v;
        } else {
            low = v;
        }
        
        if (Math.abs(high - low) < 0.0001) break;
    }
    return v;
}

/**
 * Calculates Greeks using Black-Scholes model including dividend yield (q)
 */
function calculateGreeks(type, S, K, t, r, v, q = 0) {
    if (t <= 0) t = 0.00001; 
    if (v <= 0) v = 0.01;

    const d1 = (Math.log(S / K) + (r - q + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    const n_d1 = nd(d1);
    const N_d1 = cnd(d1);
    const N_d2 = cnd(d2);

    let delta, theta, gamma, vega;

    gamma = (n_d1 * Math.exp(-q * t)) / (S * v * Math.sqrt(t));
    vega = (S * Math.exp(-q * t) * n_d1 * Math.sqrt(t)) / 100;

    if (type === 'CE') {
        delta = Math.exp(-q * t) * N_d1;
        theta = (-(S * v * Math.exp(-q * t) * n_d1) / (2 * Math.sqrt(t)) 
                 + q * S * Math.exp(-q * t) * N_d1 
                 - r * K * Math.exp(-r * t) * N_d2) / 365;
    } else {
        delta = Math.exp(-q * t) * (N_d1 - 1);
        theta = (-(S * v * Math.exp(-q * t) * n_d1) / (2 * Math.sqrt(t)) 
                 - q * S * Math.exp(-q * t) * (1 - N_d1) 
                 + r * K * Math.exp(-r * t) * (1 - N_d2)) / 365;
    }

    return {
        delta: parseFloat(delta.toFixed(4)),
        gamma: parseFloat(gamma.toFixed(6)),
        theta: parseFloat(theta.toFixed(4)),
        vega: parseFloat(vega.toFixed(4)),
        iv: v * 100 
    };
}

module.exports = { calculateGreeks, calculateIV, blackScholesPrice };
