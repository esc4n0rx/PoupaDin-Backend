const cron = require('node-cron');
const RecurringTransactionService = require('./recurringTransactionService');
const NotificationSchedulerService = require('./notificationSchedulerService'); // NOVA LINHA
const NotificationService = require('./notificationService'); // NOVA LINHA

class CronService {
    static scheduledTasks = new Map();
    
    // Inicializar todos os cron jobs
    static init() {
        console.log('🕐 Iniciando serviços de cron...');
        
        // Processar transações recorrentes todos os dias às 09:00 no horário de SP
        this.scheduleRecurringTransactionsProcessor();
        
        // NOVA FUNCIONALIDADE: Processar notificações pendentes a cada 5 minutos
        this.scheduleNotificationProcessor();
        
        // NOVA FUNCIONALIDADE: Agendar notificações diárias às 08:00
        this.scheduleNotificationTasks();
        
        // NOVA FUNCIONALIDADE: Limpeza de tokens FCM inativos (semanal)
        this.scheduleTokenCleanup();
        
        console.log('✅ Serviços de cron inicializados com sucesso!');
    }
    
    // Agendar processamento de transações recorrentes
    static scheduleRecurringTransactionsProcessor() {
        const taskName = 'recurring-transactions-processor';
        
        // Executar todos os dias às 09:00 no horário de São Paulo
        const task = cron.schedule('0 9 * * *', async () => {
            console.log('🚀 Executando processamento de transações recorrentes...');
            
            try {
                const result = await RecurringTransactionService.processAllRecurringTransactions();
                
                console.log('📈 Resumo do processamento:', {
                    total: result.total,
                    executadas: result.executed,
                    falharam: result.failed,
                    puladas: result.skipped
                });
                
                if (result.failed > 0) {
                    console.warn(`⚠️ ${result.failed} transações falharam no processamento`);
                }
                
            } catch (error) {
                console.error('💥 Erro crítico no processamento de transações recorrentes:', error);
            }
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        this.scheduledTasks.set(taskName, task);
        console.log(`📅 Agendado: ${taskName} - todos os dias às 09:00 (SP)`);
    }

    // NOVA FUNCIONALIDADE: Processar notificações pendentes
    static scheduleNotificationProcessor() {
        const taskName = 'notification-processor';
        
        // Executar a cada 5 minutos
        const task = cron.schedule('*/5 * * * *', async () => {
            try {
                const result = await NotificationService.processPendingNotifications();
                
                if (result.total > 0) {
                    console.log(`🔔 Notificações processadas: ${result.successful} sucesso, ${result.failed} falhas`);
                }
                
            } catch (error) {
                console.error('💥 Erro no processamento de notificações:', error);
            }
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        this.scheduledTasks.set(taskName, task);
        console.log(`📅 Agendado: ${taskName} - a cada 5 minutos`);
    }

    // NOVA FUNCIONALIDADE: Agendar tarefas de notificação diárias
    static scheduleNotificationTasks() {
        const taskName = 'notification-tasks';
        
        // Executar todos os dias às 08:00
        const task = cron.schedule('0 8 * * *', async () => {
            console.log('📋 Executando tarefas de notificação agendadas...');
            
            try {
                const results = await NotificationSchedulerService.runAllScheduledTasks();
                
                console.log('📊 Resumo das tarefas de notificação:', results);
                
            } catch (error) {
                console.error('💥 Erro nas tarefas de notificação:', error);
            }
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        this.scheduledTasks.set(taskName, task);
        console.log(`📅 Agendado: ${taskName} - todos os dias às 08:00 (SP)`);
    }

    // NOVA FUNCIONALIDADE: Limpeza de tokens FCM inativos
    static scheduleTokenCleanup() {
        const taskName = 'fcm-token-cleanup';
        
        // Executar todo domingo às 03:00
        const task = cron.schedule('0 3 * * 0', async () => {
            console.log('🧹 Iniciando limpeza de tokens FCM inativos...');
            
            try {
                // Desativar tokens não usados há mais de 30 dias
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 30);
                
                const { data, error } = await require('../config/supabaseClient')
                    .from('user_fcm_tokens')
                    .update({ is_active: false })
                    .lt('last_used_at', cutoffDate.toISOString())
                    .eq('is_active', true)
                    .select();

                if (error) throw error;
                
                console.log(`🗑️ ${data?.length || 0} tokens FCM inativos desativados`);
                
            } catch (error) {
                console.error('💥 Erro na limpeza de tokens FCM:', error);
            }
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        this.scheduledTasks.set(taskName, task);
        console.log(`📅 Agendado: ${taskName} - domingos às 03:00 (SP)`);
    }

    // Agendar limpeza de logs antigos (opcional)
    static scheduleLogCleanup() {
        const taskName = 'log-cleanup';
        
        // Executar todo domingo às 02:00 para limpar logs antigos
        const task = cron.schedule('0 2 * * 0', async () => {
            console.log('🧹 Iniciando limpeza de logs antigos...');
            
            try {
                // Limpar logs de execução com mais de 90 dias
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 90);
               
               // Limpar logs de notificação antigos
               const { data: notificationLogs, error: notificationError } = await require('../config/supabaseClient')
                   .from('notification_delivery_logs')
                   .delete()
                   .lt('created_at', cutoffDate.toISOString())
                   .select();

               if (notificationError) throw notificationError;

               // Limpar logs de transações recorrentes antigos
               const { data: recurringLogs, error: recurringError } = await require('../config/supabaseClient')
                   .from('recurring_transaction_logs')
                   .delete()
                   .lt('executed_at', cutoffDate.toISOString())
                   .select();

               if (recurringError) throw recurringError;

               console.log(`🗑️ Limpeza concluída: ${notificationLogs?.length || 0} logs de notificação, ${recurringLogs?.length || 0} logs de transações removidos`);
               
           } catch (error) {
               console.error('💥 Erro na limpeza de logs:', error);
           }
       }, {
           scheduled: true,
           timezone: "America/Sao_Paulo"
       });
       
       this.scheduledTasks.set(taskName, task);
       console.log(`📅 Agendado: ${taskName} - domingos às 02:00 (SP)`);
   }

   // Parar uma tarefa específica
   static stopTask(taskName) {
       const task = this.scheduledTasks.get(taskName);
       if (task) {
           task.stop();
           this.scheduledTasks.delete(taskName);
           console.log(`⏹️ Tarefa ${taskName} parada`);
       }
   }

   // Parar todas as tarefas
   static stopAll() {
       console.log('⏹️ Parando todas as tarefas agendadas...');
       
       this.scheduledTasks.forEach((task, name) => {
           task.stop();
           console.log(`⏹️ ${name} parada`);
       });
       
       this.scheduledTasks.clear();
       console.log('✅ Todas as tarefas foram paradas');
   }

   // Executar processamento manual (para testes)
   static async runRecurringTransactionsNow() {
       console.log('🔧 Executando processamento manual de transações recorrentes...');
       
       try {
           const result = await RecurringTransactionService.processAllRecurringTransactions();
           console.log('✅ Processamento manual concluído:', result);
           return result;
       } catch (error) {
           console.error('💥 Erro no processamento manual:', error);
           throw error;
       }
   }

   // NOVA FUNCIONALIDADE: Executar tarefas de notificação manual
   static async runNotificationTasksNow() {
       console.log('🔧 Executando tarefas de notificação manualmente...');
       
       try {
           const result = await NotificationSchedulerService.runAllScheduledTasks();
           console.log('✅ Tarefas de notificação concluídas:', result);
           return result;
       } catch (error) {
           console.error('💥 Erro nas tarefas de notificação:', error);
           throw error;
       }
   }

   // Obter status das tarefas
   static getTasksStatus() {
       const status = {};
       
       this.scheduledTasks.forEach((task, name) => {
           status[name] = {
               running: task.running !== undefined ? task.running : true,
               scheduled: true
           };
       });
       
       return status;
   }
}

module.exports = CronService;