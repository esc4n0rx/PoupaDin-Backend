const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const refreshRoutes = require('./refreshRoutes');

// Rotas de autenticação existentes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// Rotas de refresh token
router.use('/', refreshRoutes);

module.exports = router;