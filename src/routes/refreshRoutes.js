const express = require('express');
const router = express.Router();
const RefreshController = require('../controllers/refreshController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Rota para renovar access token usando refresh token
// POST /api/auth/refresh
router.post('/refresh', RefreshController.refreshToken);

// Rota para logout (revogar refresh token específico)
// POST /api/auth/logout
router.post('/logout', RefreshController.logout);

// Rota para logout de todos os dispositivos (requer autenticação)
// POST /api/auth/logout-all
router.post('/logout-all', authenticateToken, RefreshController.logoutAll);

// Rota para verificar status dos tokens (desenvolvimento/debug)
// GET /api/auth/token-status
router.get('/token-status', authenticateToken, RefreshController.tokenStatus);

module.exports = router;