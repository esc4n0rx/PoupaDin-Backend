const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// ==================== CONFIGURAÇÕES E TOKENS ====================

// Rota para registrar token FCM
// POST /api/notifications/fcm-token
router.post('/fcm-token', notificationController.registerFCMToken);

// Rota para obter configurações de notificação
// GET /api/notifications/settings
router.get('/settings', notificationController.getUserNotificationSettings);

// Rota para atualizar configurações de notificação
// PUT /api/notifications/settings
router.put('/settings', notificationController.updateNotificationSettings);

// ==================== NOTIFICAÇÕES DO USUÁRIO ====================

// Rota para listar notificações do usuário
// GET /api/notifications?limit=20&offset=0&unread_only=true
router.get('/', notificationController.getUserNotifications);

// Rota para obter estatísticas de notificações
// GET /api/notifications/stats
router.get('/stats', notificationController.getNotificationStats);

// Rota para marcar notificação específica como lida
// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markNotificationAsRead);

// Rota para marcar todas as notificações como lidas
// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', notificationController.markAllNotificationsAsRead);

// ==================== TESTES E FERRAMENTAS ====================

// Rota para enviar notificação de teste
// POST /api/notifications/test
router.post('/test', notificationController.sendTestNotification);

// ==================== ADMIN/SISTEMA ====================

// Rota para criar notificação manual
// POST /api/notifications/manual
router.post('/manual', notificationController.createManualNotification);

// Rota para listar templates de notificação
// GET /api/notifications/templates
router.get('/templates', notificationController.getNotificationTemplates);

// Rota para criar template de notificação
// POST /api/notifications/templates
router.post('/templates', notificationController.createNotificationTemplate);

// Rota para processar notificações pendentes manualmente
// POST /api/notifications/process-pending
router.post('/process-pending', notificationController.processPendingNotifications);

module.exports = router;