// Standard Normal Probability Density Function (PDF)
const standardNormalPDF = (x: number): number => {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
};

// Precise Standard Normal Cumulative Distribution Function (CDF)
const cnd = (x: number): number => {
    const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
    const p = 0.2316419, c = 0.39894228;
    if (x >= 0.0) {
        let t = 1.0 / (1.0 + p * x);
        return (1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
    } else {
        let t = 1.0 / (1.0 - p * x);
        return (c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
    }
};

export const calculateGreeks = (
    type: "CE" | "PE" | string,
    S: number, // Spot (Usually Synthetic Spot)
    K: number, // Strike
    t: number, // Time to expiry in years
    r: number, // Risk-free rate (e.g., 0.07)
    v: number, // Volatility (e.g., 0.15)
    q: number = 0 // Dividend yield
) => {
    const stableT = Math.max(1 / 365, t);
    const stableV = Math.max(0.01, v);

    const d1_stable = (Math.log(S / K) + (r - q + (stableV * stableV) / 2) * stableT) / (stableV * Math.sqrt(stableT));
    const d2_stable = d1_stable - stableV * Math.sqrt(stableT);

    const n_d1 = standardNormalPDF(d1_stable);
    const N_d1 = cnd(d1_stable);
    const N_d2 = cnd(d2_stable);

    let delta, theta, gamma, vega;

    // Gamma per 100 points move
    gamma = ((n_d1 * Math.exp(-q * stableT)) / (S * stableV * Math.sqrt(stableT))) * 100;
    
    // Vega per 1% IV change
    vega = (S * Math.exp(-q * stableT) * n_d1 * Math.sqrt(stableT)) / 100;

    if (type === "CE") {
        delta = Math.exp(-q * t) * cnd((Math.log(S / K) + (r - q + (v * v) / 2) * t) / (v * Math.sqrt(t)));
        theta = (-(S * v * Math.exp(-q * stableT) * n_d1) / (2 * Math.sqrt(stableT)) 
                 + q * S * Math.exp(-q * stableT) * N_d1 
                 - r * K * Math.exp(-r * stableT) * N_d2) / 365;
    } else {
        delta = Math.exp(-q * t) * (cnd((Math.log(S / K) + (r - q + (v * v) / 2) * t) / (v * Math.sqrt(t))) - 1);
        theta = (-(S * v * Math.exp(-q * stableT) * n_d1) / (2 * Math.sqrt(stableT)) 
                 - q * S * Math.exp(-q * stableT) * (1 - N_d1) 
                 + r * K * Math.exp(-r * stableT) * (1 - N_d2)) / 365;
    }

    return {
        delta: parseFloat(delta.toFixed(3)),
        gamma: parseFloat(gamma.toFixed(4)),
        theta: parseFloat(theta.toFixed(2)),
        vega: parseFloat(vega.toFixed(2))
    };
};
