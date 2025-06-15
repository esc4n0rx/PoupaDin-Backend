const { z } = require('zod');

// Schema para registrar token FCM
const registerFCMTokenSchema = z.object({
    fcm_token: z.string().min(10, "Token FCM inválido"),
    device_type: z.enum(['ios', 'android'], "Tipo de dispositivo deve ser 'ios' ou 'android'"),
    device_id: z.string().min(1, "ID do dispositivo é obrigatório").optional(),
    app_version: z.string().optional()
});

// Schema para atualizar configurações de notificação
const updateNotificationSettingsSchema = z.object({
    push_enabled: z.boolean().optional(),
    email_enabled: z.boolean().optional(),
    in_app_enabled: z.boolean().optional(),
    recurring_transactions: z.boolean().optional(),
    budget_alerts: z.boolean().optional(),
    goal_updates: z.boolean().optional(),
    expense_reminders: z.boolean().optional(),
    weekly_reports: z.boolean().optional(),
    monthly_reports: z.boolean().optional(),
    achievement_notifications: z.boolean().optional(),
    marketing_notifications: z.boolean().optional(),
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)").optional(),
    quiet_hours_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)").optional(),
    timezone: z.string().optional(),
    max_daily_notifications: z.number().int().min(1).max(50).optional()
});

// Schema para criar notificação manual
const createNotificationSchema = z.object({
    user_id: z.string().uuid("ID do usuário inválido").optional(),
    title: z.string().min(1, "Título é obrigatório"),
    body: z.string().min(1, "Corpo da mensagem é obrigatório"),
    type: z.string().min(1, "Tipo é obrigatório"),
    delivery_method: z.enum(['push', 'email', 'in_app', 'push,email', 'push,in_app', 'email,in_app', 'push,email,in_app']).default('push'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    scheduled_for: z.string().datetime().optional(),
    action_type: z.string().optional(),
    action_data: z.object({}).optional(),
    metadata: z.object({}).optional()
});

// Schema para criar template de notificação
const createTemplateSchema = z.object({
    type: z.string().min(1, "Tipo é obrigatório"),
    title_template: z.string().min(1, "Template do título é obrigatório"),
    body_template: z.string().min(1, "Template do corpo é obrigatório"),
    action_type: z.string().optional(),
    action_data: z.object({}).optional(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar em formato hexadecimal").optional(),
    is_active: z.boolean().default(true)
});

// Schema para filtros de listagem
const notificationFiltersSchema = z.object({
    limit: z.string().transform(val => parseInt(val) || 20).refine(val => val > 0 && val <= 100, "Limit deve estar entre 1 e 100").optional(),
    offset: z.string().transform(val => parseInt(val) || 0).refine(val => val >= 0, "Offset deve ser maior ou igual a 0").optional(),
    unread_only: z.string().transform(val => val === 'true').optional(),
    type: z.string().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
});

module.exports = {
    registerFCMTokenSchema,
    updateNotificationSettingsSchema,
    createNotificationSchema,
    createTemplateSchema,
    notificationFiltersSchema
};