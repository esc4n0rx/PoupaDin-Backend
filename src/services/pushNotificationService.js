const { getMessaging } = require('../config/firebaseConfig');
const notificationModel = require('../models/notificationModel');

class PushNotificationService {

    // Enviar push notification via FCM
    static async sendPushNotification(notification) {
        try {
            const messaging = getMessaging();
            if (!messaging) {
                throw new Error('Firebase Messaging não está configurado');
            }

            // Buscar tokens FCM do usuário
            const tokens = await notificationModel.getUserFCMTokens(notification.user_id);
            
            if (!tokens || tokens.length === 0) {
                throw new Error('Usuário não possui tokens FCM ativos');
            }

            const results = [];
            
            // Preparar payload da mensagem
            const messagePayload = this.buildMessagePayload(notification);

            // Enviar para cada token
            for (const tokenData of tokens) {
                try {
                    const message = {
                        ...messagePayload,
                        token: tokenData.fcm_token
                    };

                    const response = await messaging.send(message);
                    
                    results.push({
                        token: tokenData.fcm_token,
                        success: true,
                        messageId: response
                    });

                    // Atualizar última utilização do token
                    await this.updateTokenUsage(tokenData.fcm_token);

                } catch (error) {
                    console.error(`Erro ao enviar para token ${tokenData.fcm_token}:`, error);
                    
                    results.push({
                        token: tokenData.fcm_token,
                        success: false,
                        error: error.message
                    });

                    // Se o token é inválido, desativar
                    if (this.isInvalidTokenError(error)) {
                        await notificationModel.deactivateFCMToken(tokenData.fcm_token);
                        console.log(`Token inválido desativado: ${tokenData.fcm_token}`);
                    }
                }
            }

            const successfulSends = results.filter(r => r.success).length;
            const failedSends = results.filter(r => !r.success).length;

            console.log(`📱 Push notification enviado: ${successfulSends} sucesso, ${failedSends} falhas`);

            return {
                success: successfulSends > 0,
                total_tokens: tokens.length,
                successful_sends: successfulSends,
                failed_sends: failedSends,
                results
            };

        } catch (error) {
            console.error('Erro ao enviar push notification:', error);
            throw error;
        }
    }

    // CORREÇÃO: Construir payload da mensagem FCM garantindo que todos os valores em 'data' sejam strings
    static buildMessagePayload(notification) {
        const payload = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: {
                notification_id: notification.id,
                type: notification.type,
                priority: notification.priority,
                created_at: notification.created_at
            }
        };

        // CORREÇÃO: Converter action_data para string se existir
        if (notification.action_type && notification.action_data) {
            payload.data.action_type = notification.action_type;
            payload.data.action_data = JSON.stringify(notification.action_data);
        }

        // CORREÇÃO: Converter metadata para string se existir
        if (notification.metadata) {
            payload.data.metadata = JSON.stringify(notification.metadata);
        }

        // CORREÇÃO: Garantir que todos os valores em data sejam strings
        Object.keys(payload.data).forEach(key => {
            if (typeof payload.data[key] !== 'string') {
                payload.data[key] = String(payload.data[key]);
            }
        });

        // Configurações específicas por plataforma
        payload.android = {
            priority: this.getAndroidPriority(notification.priority),
            notification: {
                icon: 'ic_notification',
                color: notification.color || '#10B981',
                sound: notification.priority === 'urgent' ? 'urgent_sound' : 'default',
                channel_id: this.getChannelId(notification.type)
            }
        };

        payload.apns = {
            payload: {
                aps: {
                    alert: {
                        title: notification.title,
                        body: notification.body
                    },
                    sound: notification.priority === 'urgent' ? 'urgent_sound.wav' : 'default',
                    badge: 1,
                    'content-available': 1
                }
            }
        };

        return payload;
    }

    // Mapear prioridade para Android
    static getAndroidPriority(priority) {
        const priorityMap = {
            'low': 'min',
            'normal': 'default', 
            'high': 'high',
            'urgent': 'max'
        };
        return priorityMap[priority] || 'default';
    }

    // Obter ID do canal de notificação (Android)
    static getChannelId(notificationType) {
        const channelMap = {
            'recurring_reminder': 'recurring_transactions',
            'budget_alert': 'budget_alerts',
            'budget_limit': 'budget_alerts',
            'goal_milestone': 'goals',
            'goal_completed': 'goals',
            'expense_reminder': 'expenses',
            'weekly_report': 'reports',
            'monthly_report': 'reports',
            'achievement': 'achievements',
            'system_update': 'system'
        };
        return channelMap[notificationType] || 'default';
    }

    // Verificar se o erro indica token inválido
    static isInvalidTokenError(error) {
        const invalidTokenCodes = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
            'messaging/invalid-recipient'
        ];
        
        return invalidTokenCodes.some(code => 
            error.code === code || error.message.includes(code)
        );
    }

    // Atualizar última utilização do token
    static async updateTokenUsage(token) {
        try {
            const { data, error } = await require('../config/supabaseClient')
                .from('user_fcm_tokens')
                .update({ last_used_at: new Date().toISOString() })
                .eq('fcm_token', token);

            if (error) {
                console.error('Erro ao atualizar uso do token:', error);
            }
        } catch (error) {
            console.error('Erro ao atualizar token:', error);
        }
    }

    // Enviar para múltiplos usuários (broadcast)
    static async sendBroadcastNotification(userIds, notificationData) {
        const results = [];
        
        for (const userId of userIds) {
            try {
                const notification = { ...notificationData, user_id: userId };
                const result = await this.sendPushNotification(notification);
                results.push({ user_id: userId, success: true, result });
            } catch (error) {
                console.error(`Erro ao enviar para usuário ${userId}:`, error);
                results.push({ user_id: userId, success: false, error: error.message });
            }
        }

        return results;
    }

    // CORREÇÃO: Enviar notificação de teste com payload válido
    static async sendTestNotification(userId, message = 'Esta é uma notificação de teste') {
        const testNotification = {
            id: 'test-' + Date.now(),
            user_id: userId,
            title: '🧪 Teste - PoupaDin',
            body: message,
            type: 'system_update',
            priority: 'normal',
            created_at: new Date().toISOString(),
            action_type: 'open_app',
            action_data: { screen: 'home' },
            metadata: { test: true, timestamp: Date.now() }
        };

        return await this.sendPushNotification(testNotification);
    }
}

module.exports = PushNotificationService;