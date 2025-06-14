const GoalService = require('../services/goalService');
const goalModel = require('../models/goalModel');
const { 
    createGoalSchema, 
    updateGoalSchema, 
    goalTransactionSchema,
    completeGoalSchema 
} = require('../schemas/goalSchema');

// 1. Criar objetivo
const createGoal = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createGoalSchema.parse(req.body);
        
        const goal = await GoalService.createGoal(userId, validatedData);
        
        res.status(201).json({
            message: 'Objetivo criado com sucesso!',
            goal: goal
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('limite máximo') ||
            error.message.includes('data alvo deve ser')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao criar objetivo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Listar objetivos do usuário
const getUserGoals = async (req, res) => {
    try {
        const userId = req.user.id;
        const includeInactive = req.query.include_inactive === 'true';
        
        const goals = await GoalService.getUserGoalsWithProgress(userId, includeInactive);
        
        res.status(200).json({ goals });
    } catch (error) {
        console.error('Erro ao buscar objetivos:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Obter objetivo específico
const getGoalById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const goal = await GoalService.getGoalWithProgress(userId, id);
        
        res.status(200).json({ goal });
    } catch (error) {
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão')) {
            return res.status(404).json({ message: error.message });
        }
        console.error('Erro ao buscar objetivo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Atualizar objetivo
const updateGoal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const validatedData = updateGoalSchema.parse(req.body);
        
        const goal = await GoalService.updateGoal(userId, id, validatedData);
        
        res.status(200).json({
            message: 'Objetivo atualizado com sucesso!',
            goal: goal
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão') ||
            error.message.includes('já concluído') ||
            error.message.includes('não pode ser menor')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao atualizar objetivo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 5. Deletar objetivo
const deleteGoal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        await GoalService.deleteGoal(userId, id);
        
        res.status(200).json({ message: 'Objetivo deletado com sucesso!' });
    } catch (error) {
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão') ||
            error.message.includes('com saldo')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao deletar objetivo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 6. Processar transação (depósito/saque)
const processTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = goalTransactionSchema.parse(req.body);
        
        const result = await GoalService.processGoalTransaction(userId, validatedData);
        
        let message = 'Transação processada com sucesso!';
        if (result.completed) {
            message = 'Parabéns! Você atingiu sua meta! 🎉';
        }
        
        res.status(200).json({
            message: message,
            new_amount: result.new_amount,
            goal: result.goal,
            completed: result.completed
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão') ||
            error.message.includes('inativos') ||
            error.message.includes('já foi concluído') ||
            error.message.includes('exceder a meta') ||
            error.message.includes('Saldo insuficiente')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao processar transação:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 7. Marcar objetivo como completo
const completeGoal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const goal = await GoalService.completeGoal(userId, id);
        
        res.status(200).json({
            message: 'Parabéns! Objetivo marcado como concluído! 🎉',
            goal: goal
        });
    } catch (error) {
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão') ||
            error.message.includes('já foi concluído') ||
            error.message.includes('atingiram a meta')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao marcar objetivo como completo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 8. Obter histórico de transações de um objetivo
const getGoalTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        // Verificar se objetivo pertence ao usuário
        await GoalService.getGoalWithProgress(userId, id);
        
        const transactions = await goalModel.getGoalTransactions(id, limit);
        
        res.status(200).json({ transactions });
    } catch (error) {
        if (error.message.includes('não encontrado') ||
            error.message.includes('não tem permissão')) {
            return res.status(404).json({ message: error.message });
        }
        console.error('Erro ao buscar transações do objetivo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 9. Obter relatório completo dos objetivos
const getGoalsReport = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const report = await GoalService.getGoalsReport(userId);
        
        res.status(200).json({ report });
    } catch (error) {
        console.error('Erro ao gerar relatório de objetivos:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 10. Obter estatísticas dos objetivos
const getGoalStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const statistics = await goalModel.getGoalStatistics(userId);
        
        res.status(200).json({ statistics });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    createGoal,
    getUserGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    processTransaction,
    completeGoal,
    getGoalTransactions,
    getGoalsReport,
    getGoalStatistics
};