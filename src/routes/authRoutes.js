 
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para registrar um novo usuario
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para fazer login
// POST /api/auth/login
router.post('/login', authController.login);

// Rota para solicitar redefinicao de senha
// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// Rota para redefinir a senha com o token
// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);


module.exports = router;