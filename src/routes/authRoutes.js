// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para registrar um novo usuário
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para fazer login
// POST /api/auth/login
router.post('/login', authController.login);

// Rota para solicitar redefinição de senha
// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// Rota para verificar código de recuperação (opcional)
// POST /api/auth/verify-reset-code
router.post('/verify-reset-code', authController.verifyResetCode);

// Rota para redefinir a senha com o código
// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;