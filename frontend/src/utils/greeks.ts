// Standard Black-Scholes calculation for Options Greeks

const cumulativeDistribution = (x: number): number => {
    const b1 = 0.31938153;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c2 = 0.3989423;

    if (x >= 0.0) {
        const t = 1.0 / (1.0 + p * x);
        const b = (((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t);
        return 1.0 - c2 * Math.exp(-x * x / 2.0) * b;
    } else {
        const t = 1.0 / (1.0 - p * x);
        const b = (((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t);
        return c2 * Math.exp(-x * x / 2.0) * b;
    }
};

const standardNormalPDF = (x: number): number => {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
};

export const calculateGreeks = (
    type: "CE" | "PE" | string,
    S: number, // Spot
    K: number, // Strike
    t: number, // Time to expiry in years
    r: number, // Risk-free rate (e.g., 0.07)
    v: number  // Volatility (e.g., 0.15)
) => {
    if (t <= 0) t = 0.00001; // Avoid division by zero
    if (v <= 0) v = 0.01;   // Avoid zero volatility

    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);

    const N_d1 = cumulativeDistribution(d1);
    const N_d2 = cumulativeDistribution(d2);
    const n_d1 = standardNormalPDF(d1);

    let delta, theta, gamma, vega;

    gamma = n_d1 / (S * v * Math.sqrt(t));
    vega = (S * n_d1 * Math.sqrt(t)) / 100;

    if (type === "CE") {
        delta = N_d1;
        theta = (-(S * n_d1 * v) / (2 * Math.sqrt(t)) - r * K * Math.exp(-r * t) * N_d2) / 365;
    } else {
        delta = N_d1 - 1;
        theta = (-(S * n_d1 * v) / (2 * Math.sqrt(t)) + r * K * Math.exp(-r * t) * (1 - N_d2)) / 365;
    }

    return {
        delta: Number(delta.toFixed(4)),
        theta: Number(theta.toFixed(1)),
        gamma: Number(gamma.toFixed(5)),
        vega: Number(vega.toFixed(2))
    };
};
