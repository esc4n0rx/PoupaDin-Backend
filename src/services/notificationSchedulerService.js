const NotificationService = require('./notificationService');
const budgetModel = require('../models/budgetModel');
const goalModel = require('../models/goalModel');
const recurringTransactionModel = require('../models/recurringTransactionModel');
const notificationModel = require('../models/notificationModel');

class NotificationSchedulerService {

    // Agendar lembretes de transações recorrentes
    static async scheduleRecurringTransactionReminders() {
        try {
            console.log('🔄 Agendando lembretes de transações recorrentes...');
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = tomorrow.toISOString().split('T')[0];

            const today = new Date().toISOString().split('T')[0];

            // Buscar transações que serão executadas hoje ou amanhã
            const activeTransactions = await recurringTransactionModel.getActiveRecurringTransactions();
            
            let scheduledToday = 0;
            let scheduledTomorrow = 0;

            for (const transaction of activeTransactions) {
                try {
                    // Verificar se deve ser executada hoje
                    if (transaction.next_execution_date === today) {
                        await NotificationService.sendRecurringTransactionReminder(
                            transaction.budget_categories.budget_id, // Assumindo que temos o user_id através do budget
                            {
                                id: transaction.id,
                                description: transaction.description,
                                amount: transaction.amount,
                                category_name: transaction.budget_categories.name,
                                execution_date: 'hoje'
                            }
                        );
                        scheduledToday++;
                    }
                    
                    // Verificar se deve ser executada amanhã (lembrete antecipado)
                    if (transaction.next_execution_date === tomorrowDate) {
                        await NotificationService.createNotificationFromTemplate(
                            transaction.budget_categories.budget_id,
                            NotificationService.NOTIFICATION_TYPES.RECURRING_REMINDER,
                            {
                                transaction_name: transaction.description,
                                amount: `R$ ${transaction.amount.toFixed(2).replace('.', ',')}`,
                                category: transaction.budget_categories.name
                            },
                            {
                                priority: NotificationService.PRIORITIES.NORMAL,
                                scheduledFor: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
                                actionData: {
                                    type: 'open_recurring_transaction',
                                    transaction_id: transaction.id
                                }
                            }
                        );
                        scheduledTomorrow++;
                    }
                } catch (error) {
                    console.error(`Erro ao agendar lembrete para transação ${transaction.id}:`, error);
                }
            }

            console.log(`📅 Lembretes agendados: ${scheduledToday} para hoje, ${scheduledTomorrow} para amanhã`);
            return { today: scheduledToday, tomorrow: scheduledTomorrow };

        } catch (error) {
            console.error('Erro ao agendar lembretes de transações recorrentes:', error);
            throw error;
        }
    }

    // Agendar lembretes de despesas
    static async scheduleExpenseReminders() {
        try {
            console.log('📝 Agendando lembretes de despesas...');
            
            // Buscar usuários ativos (que fizeram login nos últimos 30 dias)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Por simplicidade, vamos enviar para todos os usuários com orçamento ativo
            const { data: activeUsers, error } = await require('../config/supabaseClient')
                .from('users')
                .select('id')
                .eq('initial_setup_completed', true);

            if (error) throw error;

            let scheduled = 0;
            const reminderTime = new Date();
            reminderTime.setHours(19, 0, 0, 0); // 19:00

            for (const user of activeUsers) {
                try {
                    // Verificar se usuário tem configurações de lembrete ativas
                    const settings = await notificationModel.getUserNotificationSettings(user.id);
                    
                    if (settings && settings.expense_reminders) {
                        await NotificationService.createNotificationFromTemplate(
                            user.id,
                            NotificationService.NOTIFICATION_TYPES.EXPENSE_REMINDER,
                            {},
                            {
                                priority: NotificationService.PRIORITIES.LOW,
                                scheduledFor: reminderTime
                            }
                        );
                        scheduled++;
                    }
                } catch (error) {
                    console.error(`Erro ao agendar lembrete para usuário ${user.id}:`, error);
                }
            }

            console.log(`📝 ${scheduled} lembretes de despesa agendados para 19:00`);
            return scheduled;

        } catch (error) {
            console.error('Erro ao agendar lembretes de despesas:', error);
            throw error;
        }
    }

    // Gerar e enviar relatórios semanais
    static async generateWeeklyReports() {
        try {
            console.log('📊 Gerando relatórios semanais...');
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: activeUsers, error } = await require('../config/supabaseClient')
                .from('users')
                .select('id')
                .eq('initial_setup_completed', true);

            if (error) throw error;

            let reportsGenerated = 0;

            for (const user of activeUsers) {
                try {
                    const settings = await notificationModel.getUserNotificationSettings(user.id);
                    
                    if (!settings || !settings.weekly_reports) continue;

                    // Buscar orçamento do usuário
                    const budget = await budgetModel.findActiveBudgetByUserId(user.id);
                    if (!budget) continue;

                    // Buscar transações da semana
                    const { data: weekTransactions } = await require('../config/supabaseClient')
                        .from('budget_transactions')
                        .select('amount, transaction_type')
                        .eq('budget_id', budget.id)
                        .gte('created_at', oneWeekAgo.toISOString());

                    // Calcular estatísticas
                    const totalSpent = weekTransactions
                        .filter(t => t.transaction_type === 'expense')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    const totalSaved = weekTransactions
                        .filter(t => t.transaction_type === 'goal_deposit')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    // Determinar mensagem de performance
                    let performanceMessage = '';
                    if (totalSpent < 500) {
                        performanceMessage = 'Excelente controle dos gastos! 👏';
                    } else if (totalSpent < 1000) {
                        performanceMessage = 'Bom controle, continue assim! 👍';
                    } else {
                        performanceMessage = 'Que tal revisar os gastos? 🤔';
                    }

                    const weekPeriod = `${oneWeekAgo.toLocaleDateString('pt-BR')} - ${new Date().toLocaleDateString('pt-BR')}`;

                    await NotificationService.createNotificationFromTemplate(
                        user.id,
                        NotificationService.NOTIFICATION_TYPES.WEEKLY_REPORT,
                        {
                            week_period: weekPeriod,
                            total_spent: `R$ ${totalSpent.toFixed(2).replace('.', ',')}`,
                            total_saved: `R$ ${totalSaved.toFixed(2).replace('.', ',')}`,
                            performance_message: performanceMessage
                        },
                        {
                            priority: NotificationService.PRIORITIES.LOW,
                            scheduledFor: new Date() // Enviar imediatamente
                        }
                    );

                    reportsGenerated++;

                } catch (error) {
                    console.error(`Erro ao gerar relatório semanal para usuário ${user.id}:`, error);
                }
            }

            console.log(`📊 ${reportsGenerated} relatórios semanais gerados`);
            return reportsGenerated;

        } catch (error) {
            console.error('Erro ao gerar relatórios semanais:', error);
            throw error;
        }
    }

    // Gerar e enviar relatórios mensais
    static async generateMonthlyReports() {
        try {
            console.log('📈 Gerando relatórios mensais...');
            
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            lastMonth.setDate(1);
            
            const endOfLastMonth = new Date();
            endOfLastMonth.setDate(0);

            const { data: activeUsers, error } = await require('../config/supabaseClient')
                .from('users')
                .select('id')
                .eq('initial_setup_completed', true);

            if (error) throw error;

            let reportsGenerated = 0;

            for (const user of activeUsers) {
                try {
                    const settings = await notificationModel.getUserNotificationSettings(user.id);
                    
                    if (!settings || !settings.monthly_reports) continue;

                    // Buscar orçamento do usuário
                    const budget = await budgetModel.findActiveBudgetByUserId(user.id);
                    if (!budget) continue;

                    // Buscar transações do mês passado
                    const { data: monthTransactions } = await require('../config/supabaseClient')
                        .from('budget_transactions')
                        .select('amount, transaction_type')
                        .eq('budget_id', budget.id)
                        .gte('created_at', lastMonth.toISOString())
                        .lte('created_at', endOfLastMonth.toISOString());

                    // Calcular estatísticas
                    const totalSpent = monthTransactions
                        .filter(t => t.transaction_type === 'expense')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    const totalSaved = monthTransactions
                        .filter(t => t.transaction_type === 'goal_deposit')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    // Comparar com meta de orçamento
                    const budgetLimit = parseFloat(budget.allocated_amount);
                    const comparisonPercentage = (totalSpent / budgetLimit) * 100;
                    
                    let comparisonMessage = '';
                    if (comparisonPercentage <= 80) {
                        comparisonMessage = 'Ficou dentro do orçamento! 🎉';
                    } else if (comparisonPercentage <= 100) {
                        comparisonMessage = 'Quase no limite, mas foi bem! 👌';
                    } else {
                        comparisonMessage = 'Ultrapassou o orçamento. Vamos melhorar! 💪';
                    }

                    const monthName = lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                    await NotificationService.createNotificationFromTemplate(
                        user.id,
                        NotificationService.NOTIFICATION_TYPES.MONTHLY_REPORT,
                        {
                            month_name: monthName,
                            total_spent: `R$ ${totalSpent.toFixed(2).replace('.', ',')}`,
                            total_saved: `R$ ${totalSaved.toFixed(2).replace('.', ',')}`,
                            comparison_message: comparisonMessage
                        },
                        {
                            priority: NotificationService.PRIORITIES.NORMAL,
                            scheduledFor: new Date()
                        }
                    );

                    reportsGenerated++;

                } catch (error) {
                    console.error(`Erro ao gerar relatório mensal para usuário ${user.id}:`, error);
                }
            }

            console.log(`📈 ${reportsGenerated} relatórios mensais gerados`);
            return reportsGenerated;

        } catch (error) {
            console.error('Erro ao gerar relatórios mensais:', error);
            throw error;
        }
    }

    // Verificar usuários inativos
    static async checkInactiveUsers() {
        try {
            console.log('😴 Verificando usuários inativos...');
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Buscar usuários que não fazem login há 7 dias
            // (assumindo que temos um campo last_login_at na tabela users)
            const { data: inactiveUsers, error } = await require('../config/supabaseClient')
                .from('users')
                .select('id, last_login_at')
                .eq('initial_setup_completed', true)
                .lt('last_login_at', sevenDaysAgo.toISOString());

            if (error) throw error;

            let remindersScheduled = 0;

            for (const user of inactiveUsers) {
                try {
                    const settings = await notificationModel.getUserNotificationSettings(user.id);
                    
                    if (!settings || !settings.push_enabled) continue;

                    const daysInactive = Math.floor(
                        (new Date() - new Date(user.last_login_at)) / (1000 * 60 * 60 * 24)
                    );

                    await NotificationService.createNotificationFromTemplate(
                        user.id,
                        'inactivity_reminder',
                        {
                            days_inactive: daysInactive.toString()
                        },
                        {
                            priority: NotificationService.PRIORITIES.LOW,
                            scheduledFor: new Date()
                        }
                    );

                    remindersScheduled++;

                } catch (error) {
                    console.error(`Erro ao enviar lembrete para usuário inativo ${user.id}:`, error);
                }
            }

            console.log(`😴 ${remindersScheduled} lembretes de inatividade enviados`);
            return remindersScheduled;

        } catch (error) {
            console.error('Erro ao verificar usuários inativos:', error);
            throw error;
        }
    }

    // Executar todas as tarefas de agendamento
    static async runAllScheduledTasks() {
        console.log('🚀 Executando todas as tarefas de notificação agendadas...');
        
        const results = {
            recurring_reminders: 0,
            expense_reminders: 0,
            weekly_reports: 0,
            monthly_reports: 0,
            inactive_reminders: 0,
            pending_notifications: 0
        };

        try {
            // Processar notificações pendentes primeiro
            const pendingResult = await NotificationService.processPendingNotifications();
            results.pending_notifications = pendingResult.successful;

            // Agendar lembretes de transações recorrentes
            const recurringResult = await this.scheduleRecurringTransactionReminders();
            results.recurring_reminders = recurringResult.today + recurringResult.tomorrow;

            // Agendar lembretes de despesas (apenas em dias úteis)
            const today = new Date().getDay(); // 0 = Domingo, 6 = Sábado
            if (today >= 1 && today <= 5) { // Segunda a Sexta
                results.expense_reminders = await this.scheduleExpenseReminders();
            }

            // Relatórios semanais (apenas às segundas-feiras)
            if (today === 1) {
                results.weekly_reports = await this.generateWeeklyReports();
            }

            // Relatórios mensais (apenas no primeiro dia do mês)
            if (new Date().getDate() === 1) {
                results.monthly_reports = await this.generateMonthlyReports();
            }

            // Verificar usuários inativos (diariamente)
            results.inactive_reminders = await this.checkInactiveUsers();

            console.log('✅ Tarefas de notificação concluídas:', results);
            return results;

        } catch (error) {
            console.error('Erro nas tarefas de notificação:', error);
            throw error;
        }
    }
}

module.exports = NotificationSchedulerService;