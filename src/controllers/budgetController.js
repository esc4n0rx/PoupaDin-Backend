const budgetModel = require('../models/budgetModel');
const BudgetService = require('../services/budgetService');
const { 
    createBudgetSchema, 
    categoryExpenseSchema, 
    transferBetweenCategoriesSchema,
    updateCategorySchema 
} = require('../schemas/budgetSchema');

// 1. Verificar status do setup inicial
const checkSetupStatus = async (req, res) => {
    try {
        const userId = req.user.id; // Vem do middleware de autenticação
        
        const setupCompleted = await budgetModel.checkUserSetupStatus(userId);
        
        res.status(200).json({ 
            setup_completed: setupCompleted,
            message: setupCompleted ? 'Setup já foi concluído.' : 'Setup inicial necessário.'
        });
    } catch (error) {
        console.error('Erro ao verificar status do setup:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Criar orçamento inicial (setup)
const createInitialBudget = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createBudgetSchema.parse(req.body);
        
        // Verificar se usuário já tem orçamento ativo
        const existingBudget = await budgetModel.findActiveBudgetByUserId(userId);
        if (existingBudget) {
            return res.status(409).json({ message: 'Usuário já possui um orçamento ativo.' });
        }
        
        // Criar orçamento completo
        const budget = await BudgetService.createCompleteBudget(userId, validatedData);
        
        res.status(201).json({ 
            message: 'Orçamento criado com sucesso!',
            budget: {
                id: budget.id,
                name: budget.name,
                total_income: budget.total_income,
                allocated_amount: budget.allocated_amount,
                available_balance: budget.available_balance
            }
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('alocado não pode ser maior')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao criar orçamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Obter orçamento atual do usuário
const getCurrentBudget = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget) {
            return res.status(404).json({ message: 'Nenhum orçamento encontrado. Faça o setup inicial.' });
        }
        
        res.status(200).json({ budget });
    } catch (error) {
        console.error('Erro ao buscar orçamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Dar baixa em categoria (registrar despesa)
const recordExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = categoryExpenseSchema.parse(req.body);
        
        const result = await BudgetService.processExpense(userId, validatedData);
        
        res.status(200).json({ 
            message: 'Despesa registrada com sucesso!',
            new_balance: result.new_balance
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('Saldo insuficiente') || 
            error.message.includes('não encontrada') ||
            error.message.includes('não tem permissão')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao registrar despesa:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 5. Remanejar valores entre categorias
const transferBetweenCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = transferBetweenCategoriesSchema.parse(req.body);
        
        const result = await BudgetService.processTransfer(userId, validatedData);
        
        res.status(200).json({ 
            message: 'Transferência realizada com sucesso!',
            from_new_balance: result.from_new_balance,
            to_new_balance: result.to_new_balance
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        if (error.message.includes('Saldo insuficiente') || 
            error.message.includes('não foram encontradas') ||
            error.message.includes('devem ser diferentes') ||
            error.message.includes('exceder seu limite') ||
            error.message.includes('não tem permissão')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Erro ao transferir entre categorias:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 6. Obter histórico de transações
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        
        // Verificar se usuário tem orçamento
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget) {
            return res.status(404).json({ message: 'Nenhum orçamento encontrado.' });
        }
        
        const transactions = await budgetModel.getTransactionsByBudgetId(budget.id, limit);
        
        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Erro ao buscar histórico de transações:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 7. Obter categorias do orçamento
const getBudgetCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget) {
            return res.status(404).json({ message: 'Nenhum orçamento encontrado.' });
        }
        
        const categories = await budgetModel.getCategoriesByBudgetId(budget.id);
        
        res.status(200).json({ categories });
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 8. Obter rendas do orçamento
const getBudgetIncomes = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget) {
            return res.status(404).json({ message: 'Nenhum orçamento encontrado.' });
        }
        
        const incomes = await budgetModel.getIncomesByBudgetId(budget.id);
        
        res.status(200).json({ incomes });
    } catch (error) {
        console.error('Erro ao buscar rendas:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    checkSetupStatus,
    createInitialBudget,
    getCurrentBudget,
    recordExpense,
    transferBetweenCategories,
    getTransactionHistory,
    getBudgetCategories,
    getBudgetIncomes
};