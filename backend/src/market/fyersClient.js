const fyers = require("fyers-api-v3");
const tokenStore = require("../auth/tokenStore");
require('dotenv').config();

const getFyersModel = () => {
  const token = tokenStore.getAccessToken();
  if (!token) return null;
  
  const fyersModel = new fyers.fyersModel();
  fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
  fyersModel.setAccessToken(token);
  return fyersModel;
};

module.exports = {
  getFyersModel
};
