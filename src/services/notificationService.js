const notificationModel = require('../models/notificationModel');
const pushNotificationService = require('./pushNotificationService');
const { sendPasswordResetEmail } = require('./mailService');

class NotificationService {
    
    // Tipos de notificação disponíveis
    static NOTIFICATION_TYPES = {
        RECURRING_REMINDER: 'recurring_reminder',
        BUDGET_ALERT: 'budget_alert', 
        BUDGET_LIMIT: 'budget_limit',
        GOAL_MILESTONE: 'goal_milestone',
        GOAL_COMPLETED: 'goal_completed',
        EXPENSE_REMINDER: 'expense_reminder',
        WEEKLY_REPORT: 'weekly_report',
        MONTHLY_REPORT: 'monthly_report',
        ACHIEVEMENT: 'achievement',
        SYSTEM_UPDATE: 'system_update'
    };

    // Prioridades de notificação
    static PRIORITIES = {
        LOW: 'low',
        NORMAL: 'normal', 
        HIGH: 'high',
        URGENT: 'urgent'
    };

    // Verificar se usuário pode receber notificação
    static async canReceiveNotification(userId, notificationType) {
        try {
            const settings = await notificationModel.getUserNotificationSettings(userId);
            
            if (!settings) {
                // Criar configurações padrão se não existirem
                await notificationModel.createDefaultUserSettings(userId);
                return true;
            }

            // Verificar canal geral
            if (!settings.push_enabled && !settings.email_enabled && !settings.in_app_enabled) {
                return false;
            }

            // Verificar tipo específico
            const typeMapping = {
                [this.NOTIFICATION_TYPES.RECURRING_REMINDER]: settings.recurring_transactions,
                [this.NOTIFICATION_TYPES.BUDGET_ALERT]: settings.budget_alerts,
                [this.NOTIFICATION_TYPES.BUDGET_LIMIT]: settings.budget_alerts,
                [this.NOTIFICATION_TYPES.GOAL_MILESTONE]: settings.goal_updates,
                [this.NOTIFICATION_TYPES.GOAL_COMPLETED]: settings.goal_updates,
                [this.NOTIFICATION_TYPES.EXPENSE_REMINDER]: settings.expense_reminders,
                [this.NOTIFICATION_TYPES.WEEKLY_REPORT]: settings.weekly_reports,
                [this.NOTIFICATION_TYPES.MONTHLY_REPORT]: settings.monthly_reports,
                [this.NOTIFICATION_TYPES.ACHIEVEMENT]: settings.achievement_notifications,
                [this.NOTIFICATION_TYPES.SYSTEM_UPDATE]: true // Sempre permitir atualizações do sistema
            };

            return typeMapping[notificationType] !== false;
        } catch (error) {
            console.error('Erro ao verificar permissões de notificação:', error);
            return false;
        }
    }

    // Verificar horário silencioso
    static async isQuietHours(userId) {
        try {
            const settings = await notificationModel.getUserNotificationSettings(userId);
            
            if (!settings || !settings.quiet_hours_enabled) {
                return false;
            }

            const now = new Date();
            const timezone = settings.timezone || 'America/Sao_Paulo';
            
            // Converter para timezone do usuário
            const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const currentHour = userTime.getHours();
            const currentMinute = userTime.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number);
            const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);
            
            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;

            // Verificar se horário atual está no período silencioso
            if (startTime <= endTime) {
                // Mesmo dia (ex: 22:00 às 08:00 do dia seguinte)
                return currentTime >= startTime && currentTime <= endTime;
            } else {
                // Atravessa meia-noite (ex: 22:00 às 08:00)
                return currentTime >= startTime || currentTime <= endTime;
            }
        } catch (error) {
            console.error('Erro ao verificar horário silencioso:', error);
            return false;
        }
    }

    // Criar notificação com template
    static async createNotificationFromTemplate(userId, templateType, variables = {}, options = {}) {
        try {
            // Verificar se pode receber notificação
            const canReceive = await this.canReceiveNotification(userId, templateType);
            if (!canReceive) {
                console.log(`Usuário ${userId} não pode receber notificação ${templateType}`);
                return null;
            }

            // Buscar template
            const template = await notificationModel.getTemplateByType(templateType);
            if (!template) {
                throw new Error(`Template não encontrado para tipo: ${templateType}`);
            }

            // Processar template com variáveis
            const title = this.processTemplate(template.title_template, variables);
            const body = this.processTemplate(template.body_template, variables);

            // Verificar horário silencioso para notificações não urgentes
            const priority = options.priority || this.PRIORITIES.NORMAL;
            const isQuiet = await this.isQuietHours(userId);
            
            let scheduledFor = options.scheduledFor || new Date();
            
            if (isQuiet && priority !== this.PRIORITIES.URGENT) {
                // Agendar para o fim do horário silencioso
                const settings = await notificationModel.getUserNotificationSettings(userId);
                const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);
                
                const nextDelivery = new Date();
                nextDelivery.setHours(endHour, endMin, 0, 0);
                
                // Se já passou da hora de fim, agendar para o próximo dia
                if (nextDelivery <= new Date()) {
                    nextDelivery.setDate(nextDelivery.getDate() + 1);
                }
                
                scheduledFor = nextDelivery;
            }

            // Criar notificação
            const notificationData = {
                user_id: userId,
                template_id: template.id,
                title,
                body,
                type: templateType,
                priority,
                delivery_method: options.deliveryMethod || 'push',
                scheduled_for: scheduledFor.toISOString(),
                action_type: template.action_type,
                action_data: { ...template.action_data, ...options.actionData },
                metadata: {
                    variables,
                    template_version: template.updated_at,
                    ...options.metadata
                }
            };

            const notification = await notificationModel.createNotification(notificationData);
            
            // Se é para enviar imediatamente e não está no horário silencioso
            if (!isQuiet || priority === this.PRIORITIES.URGENT) {
                await this.deliverNotification(notification);
            }

            return notification;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            throw error;
        }
    }

    // Processar template com variáveis
    static processTemplate(template, variables) {
        let processed = template;
        
        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            processed = processed.replace(new RegExp(placeholder, 'g'), variables[key]);
        });

        return processed;
    }

    // Entregar notificação
    static async deliverNotification(notification) {
        try {
            const deliveryMethods = notification.delivery_method.split(',');
            const results = [];

            for (const method of deliveryMethods) {
                try {
                    let result;
                    
                    switch (method.trim()) {
                        case 'push':
                            result = await pushNotificationService.sendPushNotification(notification);
                            break;
                        case 'email':
                            result = await this.sendEmailNotification(notification);
                            break;
                        case 'in_app':
                            result = await this.sendInAppNotification(notification);
                            break;
                        default:
                            throw new Error(`Método de entrega não suportado: ${method}`);
                    }

                    results.push({ method, success: true, result });
                    
                    // Log de sucesso
                    await notificationModel.createDeliveryLog({
                        notification_id: notification.id,
                        delivery_method: method,
                        status: 'success',
                        response_data: result
                    });

                } catch (error) {
                    console.error(`Erro ao entregar notificação via ${method}:`, error);
                    results.push({ method, success: false, error: error.message });
                    
                    // Log de erro
                    await notificationModel.createDeliveryLog({
                        notification_id: notification.id,
                        delivery_method: method,
                        status: 'failed',
                        error_message: error.message
                    });
                }
            }

            // Atualizar status da notificação
            const hasSuccess = results.some(r => r.success);
            const hasFailure = results.some(r => !r.success);
            
            let status = 'failed';
            if (hasSuccess && !hasFailure) {
                status = 'sent';
            } else if (hasSuccess && hasFailure) {
                status = 'partial';
            }

            await notificationModel.updateNotificationStatus(notification.id, status, {
                sent_at: new Date().toISOString()
            });

            return { success: hasSuccess, results };
        } catch (error) {
            console.error('Erro ao entregar notificação:', error);
            
            await notificationModel.updateNotificationStatus(notification.id, 'failed');
            throw error;
        }
    }

    // Enviar notificação por email
    static async sendEmailNotification(notification) {
        // Para emails específicos, você pode usar templates diferentes
        // Por enquanto, vamos usar o serviço existente como base
        
        if (notification.type === 'password_reset') {
            // Usar serviço existente
            return await sendPasswordResetEmail(notification.user_email, notification.metadata.reset_code);
        }

        // Para outros tipos, implementar envio genérico
        console.log(`Email notification não implementado para tipo: ${notification.type}`);
        return { sent: false, reason: 'Email type not implemented' };
    }

    // Enviar notificação in-app
    static async sendInAppNotification(notification) {
        // Esta será implementada quando adicionarmos WebSockets
        console.log(`In-app notification: ${notification.title} para usuário ${notification.user_id}`);
        return { sent: true, method: 'in_app' };
    }

    // Processar notificações pendentes
    static async processPendingNotifications() {
        try {
            const pendingNotifications = await notificationModel.getPendingNotifications(50);
            const results = [];

            console.log(`📤 Processando ${pendingNotifications.length} notificações pendentes...`);

            for (const notification of pendingNotifications) {
                try {
                    const result = await this.deliverNotification(notification);
                    results.push({ 
                        notification_id: notification.id, 
                        success: result.success,
                        user_id: notification.user_id
                    });
                } catch (error) {
                    console.error(`Erro ao processar notificação ${notification.id}:`, error);
                    results.push({ 
                        notification_id: notification.id, 
                        success: false, 
                        error: error.message 
                    });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            console.log(`✅ Notificações processadas: ${successful} sucesso, ${failed} falhas`);
            
            return { total: results.length, successful, failed, results };
        } catch (error) {
            console.error('Erro ao processar notificações pendentes:', error);
            throw error;
        }
    }

    // Métodos de conveniência para tipos específicos
    static async sendRecurringTransactionReminder(userId, transactionData) {
        return await this.createNotificationFromTemplate(
            userId, 
            this.NOTIFICATION_TYPES.RECURRING_REMINDER,
            {
                transaction_name: transactionData.description,
                amount: `R$ ${transactionData.amount.toFixed(2).replace('.', ',')}`,
                category: transactionData.category_name,
                date: transactionData.execution_date
            },
            {
                priority: this.PRIORITIES.HIGH,
                actionData: {
                    type: 'open_recurring_transaction',
                    transaction_id: transactionData.id
                }
            }
        );
    }

    static async sendBudgetAlert(userId, categoryData, percentage) {
        const type = percentage >= 100 
            ? this.NOTIFICATION_TYPES.BUDGET_LIMIT 
            : this.NOTIFICATION_TYPES.BUDGET_ALERT;

        return await this.createNotificationFromTemplate(
            userId,
            type,
            {
                category_name: categoryData.name,
                percentage: `${percentage.toFixed(0)}%`,
                remaining: `R$ ${categoryData.remaining.toFixed(2).replace('.', ',')}`,
                limit: `R$ ${categoryData.allocated_amount.toFixed(2).replace('.', ',')}`
            },
            {
                priority: percentage >= 100 ? this.PRIORITIES.URGENT : this.PRIORITIES.HIGH,
                actionData: {
                    type: 'open_category',
                    category_id: categoryData.id
                }
            }
        );
    }

    static async sendGoalMilestone(userId, goalData, percentage) {
        return await this.createNotificationFromTemplate(
            userId,
            this.NOTIFICATION_TYPES.GOAL_MILESTONE,
            {
                goal_name: goalData.name,
                percentage: `${percentage.toFixed(0)}%`,
                current_amount: `R$ ${goalData.current_amount.toFixed(2).replace('.', ',')}`,
                target_amount: `R$ ${goalData.target_amount.toFixed(2).replace('.', ',')}`
            },
            {
                priority: this.PRIORITIES.NORMAL,
                actionData: {
                    type: 'open_goal',
                    goal_id: goalData.id
                }
            }
        );
    }

    static async sendGoalCompleted(userId, goalData) {
        return await this.createNotificationFromTemplate(
            userId,
            this.NOTIFICATION_TYPES.GOAL_COMPLETED,
            {
                goal_name: goalData.name,
                amount: `R$ ${goalData.target_amount.toFixed(2).replace('.', ',')}`
            },
            {
                priority: this.PRIORITIES.HIGH,
                actionData: {
                    type: 'open_goal',
                    goal_id: goalData.id
                }
            }
        );
    }
}

module.exports = NotificationService;