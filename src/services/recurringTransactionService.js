const recurringTransactionModel = require('../models/recurringTransactionModel');
const budgetModel = require('../models/budgetModel');
const { FREQUENCY_TYPES } = require('../schemas/recurringTransactionSchema');

class RecurringTransactionService {
    
    // Calcular próxima data de execução
    static calculateNextExecution(frequency, startDate, executionDay = null) {
        const now = new Date();
        const start = new Date(startDate);
        
        // Garantir que estamos trabalhando com timezone SP
        const options = { timeZone: 'America/Sao_Paulo' };
        const nowSP = new Date(now.toLocaleString('en-US', options));
        const startSP = new Date(start.toLocaleString('en-US', options));
        
        let nextDate = new Date(startSP);
        
        switch (frequency) {
            case FREQUENCY_TYPES.DAILY:
                // Se já passou hoje, começa amanhã
                if (nowSP >= startSP) {
                    nextDate.setDate(nowSP.getDate() + 1);
                }
                break;
                
            case FREQUENCY_TYPES.WEEKLY:
                // Próxima semana no mesmo dia
                if (nowSP >= startSP) {
                    nextDate.setDate(startSP.getDate() + 7);
                    while (nextDate <= nowSP) {
                        nextDate.setDate(nextDate.getDate() + 7);
                    }
                }
                break;
                
            case FREQUENCY_TYPES.MONTHLY:
                const targetDay = executionDay || startSP.getDate();
                nextDate.setDate(targetDay);
                
                // Se já passou este mês, próximo mês
                if (nextDate <= nowSP) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    nextDate.setDate(targetDay);
                }
                
                // Ajustar para meses com menos dias
                if (nextDate.getDate() !== targetDay) {
                    nextDate.setDate(0); // Último dia do mês anterior
                }
                break;
                
            case FREQUENCY_TYPES.YEARLY:
                const targetMonth = startSP.getMonth();
                const targetDayOfYear = executionDay || startSP.getDate();
                
                nextDate.setMonth(targetMonth);
                nextDate.setDate(targetDayOfYear);
                
                // Se já passou este ano, próximo ano
                if (nextDate <= nowSP) {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                }
                break;
                
            default:
                throw new Error('Frequência inválida');
        }
        
        return nextDate.toISOString().split('T')[0];
    }
    
    // Verificar se uma transação deve ser executada hoje
    static shouldExecuteToday(recurringTransaction) {
        const now = new Date();
        const options = { timeZone: 'America/Sao_Paulo' };
        const todaySP = new Date(now.toLocaleString('en-US', options))
            .toISOString().split('T')[0];
        
        const startDate = recurringTransaction.start_date;
        const lastExecuted = recurringTransaction.last_executed_at;
        
        // Se nunca foi executada, verificar se é hoje ou depois
        if (!lastExecuted) {
            return startDate <= todaySP;
        }
        
        // Calcular próxima execução baseada na última
        const nextExecution = this.calculateNextExecution(
            recurringTransaction.frequency,
            lastExecuted,
            recurringTransaction.execution_day
        );
        
        return nextExecution <= todaySP;
    }
    
    // Criar transação recorrente
    static async createRecurringTransaction(userId, transactionData) {
        // Verificar se categoria existe e pertence ao usuário
        const category = await budgetModel.getCategoryById(transactionData.category_id);
        if (!category) {
            throw new Error('Categoria não encontrada.');
        }
        
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== category.budget_id) {
            throw new Error('Você não tem permissão para acessar esta categoria.');
        }
        
        // Validar datas
        const startDate = new Date(transactionData.start_date);
        const endDate = transactionData.end_date ? new Date(transactionData.end_date) : null;
        
        if (endDate && endDate <= startDate) {
            throw new Error('A data de fim deve ser posterior à data de início.');
        }
        
        // Calcular próxima execução
        const nextExecution = this.calculateNextExecution(
            transactionData.frequency,
            transactionData.start_date,
            transactionData.execution_day
        );
        
        const recurringTransactionData = {
            ...transactionData,
            budget_id: budget.id,
            next_execution_date: nextExecution
        };
        
        return await recurringTransactionModel.createRecurringTransaction(recurringTransactionData);
    }
    
    // Executar transação recorrente
    static async executeRecurringTransaction(recurringTransaction) {
        const category = recurringTransaction.budget_categories;
        const amount = recurringTransaction.amount;
        const description = `${recurringTransaction.description} (Recorrente)`;
        
        // Verificar saldo suficiente
        if (category.current_balance < amount) {
            // Log de falha por saldo insuficiente
            await recurringTransactionModel.createExecutionLog({
                recurring_transaction_id: recurringTransaction.id,
                executed_at: new Date().toISOString(),
                success: false,
                error_message: 'Saldo insuficiente na categoria',
                attempted_amount: amount,
                category_balance: category.current_balance
            });
            
            return {
                success: false,
                error: 'Saldo insuficiente na categoria',
                transaction: recurringTransaction
            };
        }
        
        try {
            // Executar a despesa
            const newBalance = category.current_balance - amount;
            await budgetModel.updateCategoryBalance(category.id, newBalance);
            
            // Registrar transação no orçamento
            await budgetModel.createBudgetTransaction({
                budget_id: category.budget_id,
                category_id: category.id,
                transaction_type: 'expense',
                amount: amount,
                description: description,
                is_recurring: true,
                recurring_transaction_id: recurringTransaction.id
            });
            
            // Atualizar última execução
            const executionDate = new Date().toISOString();
            await recurringTransactionModel.updateLastExecution(
                recurringTransaction.id,
                executionDate
            );
            
            // Calcular próxima execução
            const nextExecution = this.calculateNextExecution(
                recurringTransaction.frequency,
                executionDate,
                recurringTransaction.execution_day
            );
            
            await recurringTransactionModel.updateRecurringTransaction(
                recurringTransaction.id,
                { next_execution_date: nextExecution }
            );
            
            // Log de sucesso
            await recurringTransactionModel.createExecutionLog({
                recurring_transaction_id: recurringTransaction.id,
                executed_at: executionDate,
                success: true,
                amount: amount,
                category_balance_before: category.current_balance,
                category_balance_after: newBalance
            });
            
            return {
                success: true,
                new_balance: newBalance,
                next_execution: nextExecution,
                transaction: recurringTransaction
            };
            
        } catch (error) {
            // Log de erro
            await recurringTransactionModel.createExecutionLog({
                recurring_transaction_id: recurringTransaction.id,
                executed_at: new Date().toISOString(),
                success: false,
                error_message: error.message,
                attempted_amount: amount,
                category_balance: category.current_balance
            });
            
            throw error;
        }
    }
    
    // Processar todas as transações recorrentes que devem ser executadas
    static async processAllRecurringTransactions() {
        console.log('🔄 Iniciando processamento de transações recorrentes...');
        
        const activeTransactions = await recurringTransactionModel.getActiveRecurringTransactions();
        const results = {
            total: activeTransactions.length,
            executed: 0,
            failed: 0,
            skipped: 0,
            details: []
        };
        
        for (const transaction of activeTransactions) {
            try {
                if (this.shouldExecuteToday(transaction)) {
                    const result = await this.executeRecurringTransaction(transaction);
                    
                    if (result.success) {
                        results.executed++;
                        console.log(`✅ Executada: ${transaction.description} - R$ ${transaction.amount}`);
                    } else {
                        results.failed++;
                        console.log(`❌ Falhou: ${transaction.description} - ${result.error}`);
                    }
                    
                    results.details.push(result);
                } else {
                    results.skipped++;
                    console.log(`⏭️ Pulada: ${transaction.description} - Não é dia de execução`);
                }
            } catch (error) {
                results.failed++;
                console.error(`💥 Erro ao processar ${transaction.description}:`, error.message);
                
                results.details.push({
                    success: false,
                    error: error.message,
                    transaction: transaction
                });
            }
        }
        
        console.log(`📊 Processamento concluído: ${results.executed} executadas, ${results.failed} falharam, ${results.skipped} puladas`);
        return results;
    }
}

module.exports = RecurringTransactionService;