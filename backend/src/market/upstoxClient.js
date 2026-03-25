const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

class UpstoxClient {
    constructor() {
        this.apiKey = process.env.UPSTOX_API_KEY;
        this.apiSecret = process.env.UPSTOX_API_SECRET;
        this.redirectUri = process.env.UPSTOX_REDIRECT_URI;
        this.accessToken = null;
        this.baseUrl = 'https://api.upstox.com/v2';
    }

    setAccessToken(token) {
        this.accessToken = token;
    }

    getGenerateAuthUrl() {
        return `${this.baseUrl}/login/authorization/dialog?client_id=${this.apiKey}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code`;
    }

    async generateToken(code) {
        try {
            const response = await axios.post(`${this.baseUrl}/login/authorization/token`, querystring.stringify({
                code: code,
                client_id: this.apiKey,
                client_secret: this.apiSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code'
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                return response.data;
            }
            throw new Error('Invalid token response');
        } catch (error) {
            console.error('[Upstox] Token generation failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async getProfile() {
        return this.request('GET', '/user/profile');
    }

    async getOptionChain(instrumentKey, expiryDate) {
        // v2 option chain endpoint
        return this.request('GET', `/option/chain?instrument_key=${instrumentKey}&expiry_date=${expiryDate}`);
    }

    async getMarketQuote(instrumentKeys) {
        return this.request('GET', `/market-quote/quotes?instrument_key=${instrumentKeys.join(',')}`);
    }

    async getOptionGreeks(instrumentKeys) {
        // v3 market-quote/option-greek endpoint
        return this.request('GET', `/market-quote/option-greek?instrument_key=${instrumentKeys.join(',')}`, 'v3');
    }

    async request(method, endpoint, version = 'v2') {
        if (!this.accessToken) throw new Error('Not authenticated with Upstox');

        const url = `https://api.upstox.com/${version}${endpoint}`;
        try {
            const response = await axios({
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`[Upstox API ${version}] ${method} ${endpoint} failed:`, error.response?.data || error.message);
            throw error;
        }
    }
}

const upstoxClient = new UpstoxClient();

module.exports = {
    getUpstoxModel: () => upstoxClient
};
