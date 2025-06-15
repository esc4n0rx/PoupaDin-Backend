const NotificationService = require('../services/notificationService');
const PushNotificationService = require('../services/pushNotificationService');
const notificationModel = require('../models/notificationModel');
const {
    registerFCMTokenSchema,
    updateNotificationSettingsSchema,
    createNotificationSchema,
    createTemplateSchema,
    notificationFiltersSchema
} = require('../schemas/notificationSchema');

// 1. Registrar token FCM do dispositivo
const registerFCMToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = registerFCMTokenSchema.parse(req.body);

        const tokenData = await notificationModel.saveFCMToken(userId, validatedData);

        res.status(200).json({
            message: 'Token FCM registrado com sucesso!',
            token_data: tokenData
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao registrar token FCM:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Obter configurações de notificação do usuário
const getUserNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;

        let settings = await notificationModel.getUserNotificationSettings(userId);
        
        // Criar configurações padrão se não existirem
        if (!settings) {
            settings = await notificationModel.createDefaultUserSettings(userId);
        }

        res.status(200).json({ settings });
    } catch (error) {
        console.error('Erro ao buscar configurações de notificação:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Atualizar configurações de notificação
const updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = updateNotificationSettingsSchema.parse(req.body);

        // Verificar se configurações existem
        let settings = await notificationModel.getUserNotificationSettings(userId);
        
        if (!settings) {
            // Criar configurações padrão primeiro
            settings = await notificationModel.createDefaultUserSettings(userId);
        }

        // Atualizar configurações
        const updatedSettings = await notificationModel.updateUserNotificationSettings(userId, validatedData);

        res.status(200).json({
            message: 'Configurações atualizadas com sucesso!',
            settings: updatedSettings
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Listar notificações do usuário
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const filters = notificationFiltersSchema.parse(req.query);

        const notifications = await notificationModel.getNotificationsByUserId(
            userId,
            filters.limit || 20,
            filters.offset || 0,
            filters.unread_only || false
        );

        // Obter estatísticas
        const stats = await notificationModel.getNotificationStats(userId);

        res.status(200).json({
            notifications,
            stats,
            pagination: {
                limit: filters.limit || 20,
                offset: filters.offset || 0,
                has_more: notifications.length === (filters.limit || 20)
            }
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 5. Marcar notificação como lida
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationModel.markNotificationAsRead(id, userId);

        res.status(200).json({
            message: 'Notificação marcada como lida!',
            notification
        });
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 6. Marcar todas as notificações como lidas
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await notificationModel.markAllNotificationsAsRead(userId);

        res.status(200).json({
            message: `${notifications.length} notificações marcadas como lidas!`,
            updated_count: notifications.length
        });
    } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 7. Enviar notificação de teste
const sendTestNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;

        const result = await PushNotificationService.sendTestNotification(
            userId, 
            message || 'Esta é uma notificação de teste do PoupaDin! 🎉'
        );

        res.status(200).json({
            message: 'Notificação de teste enviada!',
            result
        });
    } catch (error) {
        console.error('Erro ao enviar notificação de teste:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 8. Criar notificação manual (admin)
const createManualNotification = async (req, res) => {
    try {
        const validatedData = createNotificationSchema.parse(req.body);
        
        // Se user_id não foi fornecido, usar o usuário atual
        const targetUserId = validatedData.user_id || req.user.id;

        const notification = await notificationModel.createNotification({
            ...validatedData,
            user_id: targetUserId,
            scheduled_for: validatedData.scheduled_for || new Date().toISOString()
        });

        // Entregar imediatamente se não foi agendada para o futuro
        if (!validatedData.scheduled_for || new Date(validatedData.scheduled_for) <= new Date()) {
            await NotificationService.deliverNotification(notification);
        }

        res.status(201).json({
            message: 'Notificação criada com sucesso!',
            notification
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao criar notificação manual:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 9. Listar templates de notificação
const getNotificationTemplates = async (req, res) => {
    try {
        const templates = await notificationModel.getAllTemplates();

        res.status(200).json({ templates });
    } catch (error) {
        console.error('Erro ao buscar templates:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 10. Criar template de notificação (admin)
const createNotificationTemplate = async (req, res) => {
    try {
        const validatedData = createTemplateSchema.parse(req.body);

        const template = await notificationModel.createTemplate(validatedData);

        res.status(201).json({
            message: 'Template criado com sucesso!',
            template
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao criar template:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 11. Obter estatísticas de notificações
const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await notificationModel.getNotificationStats(userId);

        res.status(200).json({ stats });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 12. Processar notificações pendentes manualmente (admin/debug)
const processPendingNotifications = async (req, res) => {
    try {
        const result = await NotificationService.processPendingNotifications();

        res.status(200).json({
            message: 'Notificações pendentes processadas!',
            result
        });
    } catch (error) {
        console.error('Erro ao processar notificações pendentes:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    registerFCMToken,
    getUserNotificationSettings,
    updateNotificationSettings,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    sendTestNotification,
    createManualNotification,
    getNotificationTemplates,
    createNotificationTemplate,
    getNotificationStats,
    processPendingNotifications
};