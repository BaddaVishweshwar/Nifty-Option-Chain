const express = require('express');
const router = express.Router();
const authController = require('../auth/authController');

router.get('/login', authController.getAuthUrl);
router.get('/callback', authController.handleCallback);

router.get('/upstox/login', authController.getUpstoxAuthUrl);
router.get('/upstox/callback', authController.handleUpstoxCallback);

router.get('/status', authController.getStatus);
router.post('/logout', authController.logout);
router.get('/privacy-status', authController.getPrivacyStatus);
router.post('/verify-credentials', authController.verifyCredentials);

module.exports = router;
