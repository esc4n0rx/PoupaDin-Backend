const { initializeTemplates } = require('./initializeNotificationTemplates');
const NotificationSchedulerService = require('../services/notificationSchedulerService');
const NotificationService = require('../services/notificationService');
const PushNotificationService = require('../services/pushNotificationService');

// Comandos úteis para administração
const commands = {
    
    // Inicializar templates
    async initTemplates() {
        console.log('🔧 Inicializando templates...');
        await initializeTemplates();
        console.log('✅ Templates inicializados!');
    },
    
    // Executar tarefas de notificação
    async runNotificationTasks() {
        console.log('📋 Executando tarefas de notificação...');
        const result = await NotificationSchedulerService.runAllScheduledTasks();
        console.log('✅ Tarefas concluídas:', result);
        return result;
    },
    
    // Processar notificações pendentes
    async processPending() {
        console.log('📤 Processando notificações pendentes...');
        const result = await NotificationService.processPendingNotifications();
        console.log('✅ Processamento concluído:', result);
        return result;
    },
    
    // Enviar notificação de teste
    async sendTestNotification(userId, message) {
        console.log(`🧪 Enviando notificação de teste para usuário ${userId}...`);
        const result = await PushNotificationService.sendTestNotification(userId, message);
        console.log('✅ Notificação enviada:', result);
        return result;
    },
    
    // Estatísticas do sistema
    async getSystemStats() {
        const { data: userCount } = await require('../config/supabaseClient')
            .from('users')
            .select('id', { count: 'exact' });
            
        const { data: notificationCount } = await require('../config/supabaseClient')
            .from('notifications')
            .select('id', { count: 'exact' });
            
        const { data: tokenCount } = await require('../config/supabaseClient')
            .from('user_fcm_tokens')
            .select('id', { count: 'exact' })
            .eq('is_active', true);
        
        const stats = {
            users: userCount?.length || 0,
            notifications: notificationCount?.length || 0,
            active_tokens: tokenCount?.length || 0,
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Estatísticas do sistema:', stats);
        return stats;
    }
};

// Executar comando se chamado diretamente
if (require.main === module) {
    const [,, command, ...args] = process.argv;
    
    if (commands[command]) {
        commands[command](...args)
            .then(() => process.exit(0))
            .catch(error => {
                console.error('❌ Erro:', error);
                process.exit(1);
            });
    } else {
        console.log('Comandos disponíveis:');
        Object.keys(commands).forEach(cmd => {
            console.log(`  node src/scripts/commands.js ${cmd}`);
        });
        process.exit(1);
    }
}

module.exports = commands;