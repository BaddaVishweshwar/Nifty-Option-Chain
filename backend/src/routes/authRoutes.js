const express = require('express');
const router = express.Router();
const authController = require('../auth/authController');

router.get('/login', authController.getAuthUrl);
router.get('/callback', authController.handleCallback);
router.get('/status', authController.getStatus);
router.get('/privacy-status', authController.getPrivacyStatus);
router.post('/verify-passphrase', authController.verifyPassphrase);

module.exports = router;
