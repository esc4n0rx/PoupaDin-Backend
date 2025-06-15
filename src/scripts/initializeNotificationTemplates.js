const notificationModel = require('../models/notificationModel');

// Templates padrão do sistema
const DEFAULT_TEMPLATES = [
    {
        type: 'recurring_reminder',
        title_template: '💳 {{transaction_name}} - {{amount}}',
        body_template: 'Sua {{transaction_name}} de {{amount}} será debitada hoje da categoria {{category}}',
        action_type: 'open_recurring_transaction',
        action_data: { screen: 'recurring_transactions' },
        icon: 'recurring',
        color: '#3B82F6'
    },
    {
        type: 'recurring_tomorrow',
        title_template: '📅 Lembrete: {{transaction_name}} amanhã',
        body_template: 'Amanhã será debitado {{amount}} da categoria {{category}} para {{transaction_name}}',
        action_type: 'open_recurring_transaction',
        action_data: { screen: 'recurring_transactions' },
        icon: 'calendar',
        color: '#8B5CF6'
    },
    {
        type: 'budget_alert',
        title_template: '⚠️ {{category_name}} - {{percentage}} usado',
        body_template: 'Você já gastou {{percentage}} do orçamento de {{category_name}}. Restam {{remaining}}',
        action_type: 'open_category',
        action_data: { screen: 'budget_detail' },
        icon: 'warning',
        color: '#F59E0B'
    },
    {
        type: 'budget_limit',
        title_template: '🚨 Limite excedido: {{category_name}}',
        body_template: 'Você excedeu o limite da categoria {{category_name}}! Revise seus gastos.',
        action_type: 'open_category',
        action_data: { screen: 'budget_detail', priority: 'urgent' },
        icon: 'alert',
        color: '#EF4444'
    },
    {
        type: 'goal_milestone',
        title_template: '🎯 {{goal_name}} - {{percentage}} concluído!',
        body_template: 'Parabéns! Você atingiu {{percentage}} da sua meta {{goal_name}}. Já economizou {{current_amount}}!',
        action_type: 'open_goal',
        action_data: { screen: 'goals_detail' },
        icon: 'target',
        color: '#10B981'
    },
    {
        type: 'goal_completed',
        title_template: '🏆 Meta atingida: {{goal_name}}!',
        body_template: 'Parabéns! Você completou sua meta {{goal_name}} e economizou {{amount}}! 🎉',
        action_type: 'open_goal',
        action_data: { screen: 'goals_detail', celebration: true },
        icon: 'trophy',
        color: '#059669'
    },
    {
        type: 'expense_reminder',
        title_template: '📝 Lembrete de despesa',
        body_template: 'Não se esqueça de registrar suas despesas de hoje para manter seu orçamento atualizado!',
        action_type: 'open_app',
        action_data: { screen: 'add_expense' },
        icon: 'edit',
        color: '#6366F1'
    },
    {
        type: 'weekly_report',
        title_template: '📊 Relatório Semanal - {{week_period}}',
        body_template: 'Seu resumo da semana: gastou {{total_spent}}, economizou {{total_saved}}. {{performance_message}}',
        action_type: 'open_app',
        action_data: { screen: 'reports', period: 'weekly' },
        icon: 'chart',
        color: '#8B5CF6'
    },
    {
        type: 'monthly_report',
        title_template: '📈 Relatório Mensal - {{month_name}}',
        body_template: 'Seu mês em números: gastou {{total_spent}}, economizou {{total_saved}}. {{comparison_message}}',
        action_type: 'open_app',
        action_data: { screen: 'reports', period: 'monthly' },
        icon: 'trending',
        color: '#7C3AED'
    },
    {
        type: 'achievement',
        title_template: '🌟 Conquista desbloqueada!',
        body_template: '{{achievement_name}}: {{achievement_description}}',
        action_type: 'open_app',
        action_data: { screen: 'achievements' },
        icon: 'star',
        color: '#F59E0B'
    },
    {
        type: 'system_update',
        title_template: '🔄 {{update_title}}',
        body_template: '{{update_message}}',
        action_type: 'open_app',
        action_data: { screen: 'home' },
        icon: 'info',
        color: '#6B7280'
    },
    {
        type: 'backup_reminder',
        title_template: '☁️ Backup dos seus dados',
        body_template: 'Seus dados estão seguros! Último backup realizado com sucesso.',
        action_type: 'open_app',
        action_data: { screen: 'settings', tab: 'backup' },
        icon: 'cloud',
        color: '#06B6D4'
    },
    {
        type: 'inactivity_reminder',
        title_template: '😊 Sentimos sua falta!',
        body_template: 'Há {{days_inactive}} dias você não usa o PoupaDin. Que tal verificar seu orçamento?',
        action_type: 'open_app',
        action_data: { screen: 'home' },
        icon: 'heart',
        color: '#EC4899'
    }
];

async function initializeTemplates() {
    try {
        console.log('🔧 Inicializando templates de notificação...');
        
        for (const template of DEFAULT_TEMPLATES) {
            try {
                // Verificar se template já existe
                const existing = await notificationModel.getTemplateByType(template.type);
                
                if (!existing) {
                    await notificationModel.createTemplate(template);
                    console.log(`✅ Template criado: ${template.type}`);
                } else {
                    console.log(`⏭️ Template já existe: ${template.type}`);
                }
            } catch (error) {
                console.error(`❌ Erro ao criar template ${template.type}:`, error.message);
            }
        }
        
        console.log('🎉 Inicialização de templates concluída!');
        return true;
    } catch (error) {
        console.error('💥 Erro crítico na inicialização de templates:', error);
        return false;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initializeTemplates()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { initializeTemplates, DEFAULT_TEMPLATES };