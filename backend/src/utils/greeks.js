/**
 * Black-Scholes Greek Calculator
 */

// Standard Normal Cumulative Distribution Function
function cnd(x) {
    const a1 = 0.319381530;
    const a2 = -0.356563782;
    const a3 = 1.781477937;
    const a4 = -1.821255978;
    const a5 = 1.330274429;
    const L = Math.abs(x);
    const K = 1.0 / (1.0 + 0.2316419 * L);
    let d = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2.0) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
    
    if (x < 0) {
        return 1.0 - d;
    }
    return d;
}

// Standard Normal Probability Density Function
function nd(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates Greeks using Black-Scholes model
 * @param {string} type - 'CE' or 'PE'
 * @param {number} S - Spot Price
 * @param {number} K - Strike Price
 * @param {number} t - Time to Expiry (years)
 * @param {number} r - Risk-free rate (decimal, e.g., 0.07 for 7%)
 * @param {number} v - Volatility (decimal, e.g., 0.2 for 20%)
 */
function calculateGreeks(type, S, K, t, r, v) {
    if (t <= 0) t = 0.00001; // Avoid division by zero
    if (v <= 0) v = 0.1;      // Default min volatility for calculation

    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    const n_d1 = nd(d1);
    const N_d1 = cnd(d1);
    const N_d2 = cnd(d2);

    let delta, theta, gamma, vega;

    // Gamma and Vega are same for both CALL and PUT
    gamma = n_d1 / (S * v * Math.sqrt(t));
    vega = (S * n_d1 * Math.sqrt(t)) / 100; // Divided by 100 to get value per 1% change in IV

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
        vega: parseFloat(vega.toFixed(4))
    };
}

module.exports = { calculateGreeks };
