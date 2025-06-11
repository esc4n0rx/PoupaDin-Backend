const RecurringTransactionService = require('../services/recurringTransactionService');
const recurringTransactionModel = require('../models/recurringTransactionModel');
const budgetModel = require('../models/budgetModel');
const { 
    createRecurringTransactionSchema, 
    updateRecurringTransactionSchema 
} = require('../schemas/recurringTransactionSchema');

// 1. Criar transação recorrente
const createRecurringTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createRecurringTransactionSchema.parse(req.body);
        
        const recurringTransaction = await RecurringTransactionService.createRecurringTransaction(
            userId, 
            validatedData
        );
        
        res.status(201).json({
            message: 'Transação recorrente criada com sucesso!',
            recurring_transaction: recurringTransaction
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('não encontrada') ||
            error.message.includes('não tem permissão') ||
            error.message.includes('data de fim deve ser')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao criar transação recorrente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Listar transações recorrentes do usuário
const getRecurringTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget) {
            return res.status(404).json({ message: 'Nenhum orçamento encontrado.' });
        }
        
        const recurringTransactions = await recurringTransactionModel.getRecurringTransactionsByBudgetId(budget.id);
        
        res.status(200).json({ recurring_transactions: recurringTransactions });
    } catch (error) {
        console.error('Erro ao buscar transações recorrentes:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Obter transação recorrente específica
const getRecurringTransactionById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const recurringTransaction = await recurringTransactionModel.getRecurringTransactionById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ message: 'Transação recorrente não encontrada.' });
        }
        
        // Verificar se pertence ao usuário
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== recurringTransaction.budget_id) {
            return res.status(403).json({ message: 'Você não tem permissão para acessar esta transação.' });
        }
        
        res.status(200).json({ recurring_transaction: recurringTransaction });
    } catch (error) {
        console.error('Erro ao buscar transação recorrente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Atualizar transação recorrente
const updateRecurringTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const validatedData = updateRecurringTransactionSchema.parse(req.body);
        
        const recurringTransaction = await recurringTransactionModel.getRecurringTransactionById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ message: 'Transação recorrente não encontrada.' });
        }
        
        // Verificar se pertence ao usuário
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== recurringTransaction.budget_id) {
            return res.status(403).json({ message: 'Você não tem permissão para editar esta transação.' });
        }
        
        // Se mudou a frequência ou dia de execução, recalcular próxima execução
        let updateData = { ...validatedData };
        if (validatedData.frequency || validatedData.execution_day) {
            const nextExecution = RecurringTransactionService.calculateNextExecution(
                validatedData.frequency || recurringTransaction.frequency,
                recurringTransaction.last_executed_at || recurringTransaction.start_date,
                validatedData.execution_day || recurringTransaction.execution_day
            );
            updateData.next_execution_date = nextExecution;
        }
        
        const updatedTransaction = await recurringTransactionModel.updateRecurringTransaction(id, updateData);
        
        res.status(200).json({
            message: 'Transação recorrente atualizada com sucesso!',
            recurring_transaction: updatedTransaction
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao atualizar transação recorrente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 5. Deletar transação recorrente
const deleteRecurringTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const recurringTransaction = await recurringTransactionModel.getRecurringTransactionById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ message: 'Transação recorrente não encontrada.' });
        }
        
        // Verificar se pertence ao usuário
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== recurringTransaction.budget_id) {
            return res.status(403).json({ message: 'Você não tem permissão para deletar esta transação.' });
        }
        
        await recurringTransactionModel.deleteRecurringTransaction(id);
        
        res.status(200).json({ message: 'Transação recorrente deletada com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar transação recorrente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 6. Obter logs de execução
const getExecutionLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const recurringTransaction = await recurringTransactionModel.getRecurringTransactionById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ message: 'Transação recorrente não encontrada.' });
        }
        
        // Verificar se pertence ao usuário
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== recurringTransaction.budget_id) {
            return res.status(403).json({ message: 'Você não tem permissão para acessar estes logs.' });
        }
        
        const logs = await recurringTransactionModel.getExecutionLogs(id, limit);
        
        res.status(200).json({ execution_logs: logs });
    } catch (error) {
        console.error('Erro ao buscar logs de execução:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 7. Executar manualmente uma transação recorrente (para testes)
const executeManually = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const recurringTransaction = await recurringTransactionModel.getRecurringTransactionById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ message: 'Transação recorrente não encontrada.' });
        }
        
        // Verificar se pertence ao usuário
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== recurringTransaction.budget_id) {
            return res.status(403).json({ message: 'Você não tem permissão para executar esta transação.' });
        }
        
        // Buscar dados completos da transação para execução
        const activeTransactions = await recurringTransactionModel.getActiveRecurringTransactions();
        const fullTransaction = activeTransactions.find(t => t.id === id);
        
        if (!fullTransaction) {
            return res.status(400).json({ message: 'Transação não está ativa ou não foi encontrada.' });
        }
        
        const result = await RecurringTransactionService.executeRecurringTransaction(fullTransaction);
        
        if (result.success) {
            res.status(200).json({
                message: 'Transação executada com sucesso!',
                new_balance: result.new_balance,
                next_execution: result.next_execution
            });
        } else {
            res.status(400).json({
                message: 'Falha na execução da transação.',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erro ao executar transação manualmente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    createRecurringTransaction,
    getRecurringTransactions,
    getRecurringTransactionById,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    getExecutionLogs,
    executeManually
};