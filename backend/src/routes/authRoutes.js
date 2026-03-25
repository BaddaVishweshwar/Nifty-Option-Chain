const express = require('express');
const router = express.Router();
const authController = require('../auth/authController');

router.get('/login', authController.getAuthUrl);
router.get('/callback', authController.handleCallback);
router.get('/status', authController.getStatus);
router.get('/privacy-status', authController.getPrivacyStatus);
router.post('/verify-credentials', authController.verifyCredentials);

module.exports = router;
