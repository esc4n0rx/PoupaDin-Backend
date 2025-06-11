const cron = require('node-cron');
const RecurringTransactionService = require('./recurringTransactionService');

class CronService {
    static scheduledTasks = new Map();
    
    // Inicializar todos os cron jobs
    static init() {
        console.log('🕐 Iniciando serviços de cron...');
        
        // Processar transações recorrentes todos os dias às 09:00 no horário de SP
        this.scheduleRecurringTransactionsProcessor();
        
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
                
                // Aqui você pode adicionar notificações, logs no banco, etc.
                if (result.failed > 0) {
                    console.warn(`⚠️ ${result.failed} transações falharam no processamento`);
                }
                
            } catch (error) {
                console.error('💥 Erro crítico no processamento de transações recorrentes:', error);
            }
            }, {
                scheduled: true,
                timezone: "America/Sao_Paulo"
                });this.scheduledTasks.set(taskName, task);
                    console.log(`📅 Agendado: ${taskName} - todos os dias às 09:00 (SP)`);
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
            
            // Aqui você implementaria a limpeza no banco
            console.log(`🗑️ Limpeza de logs anteriores a ${cutoffDate.toISOString()} concluída`);
            
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