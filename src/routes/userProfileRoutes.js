const express = require('express');
const router = express.Router();
const UserProfileController = require('../controllers/userProfileController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { uploadAvatarMiddleware } = require('../middlewares/uploadMiddleware');

// Middleware de autenticação para todas as rotas protegidas
router.use(authenticateToken);

// ==================== ROTAS DO PERFIL PRÓPRIO ====================

// Rota para obter perfil do usuário autenticado
// GET /api/profile
router.get('/', UserProfileController.getProfile);

// Rota para atualizar perfil
// PUT /api/profile
router.put('/', UserProfileController.updateProfile);

// Rota para upload de avatar
// POST /api/profile/avatar
router.post('/avatar', uploadAvatarMiddleware, UserProfileController.uploadAvatar);

// Rota para remover avatar
// DELETE /api/profile/avatar
router.delete('/avatar', UserProfileController.removeAvatar);

// Rota para reset de senha autenticado
// POST /api/profile/reset-password
router.post('/reset-password', UserProfileController.resetPasswordAuthenticated);

// ==================== ROTAS PÚBLICAS ====================

// Rota para buscar perfis públicos
// GET /api/profile/search?search=termo&limit=20&offset=0
router.get('/search', UserProfileController.searchProfiles);

// Rota para obter perfil público de outro usuário
// GET /api/profile/public/:userId
router.get('/public/:userId', UserProfileController.getPublicProfile);

module.exports = router;