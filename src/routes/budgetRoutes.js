const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rota para verificar status do setup inicial
// GET /api/budget/setup-status
router.get('/setup-status', budgetController.checkSetupStatus);

// Rota para criar orçamento inicial (setup)
// POST /api/budget/setup
router.post('/setup', budgetController.createInitialBudget);

// Rota para obter orçamento atual
// GET /api/budget
router.get('/', budgetController.getCurrentBudget);

// Rota para obter categorias do orçamento
// GET /api/budget/categories
router.get('/categories', budgetController.getBudgetCategories);

// Rota para obter rendas do orçamento
// GET /api/budget/incomes
router.get('/incomes', budgetController.getBudgetIncomes);

// Rota para registrar despesa em categoria
// POST /api/budget/expense
router.post('/expense', budgetController.recordExpense);

// Rota para transferir valores entre categorias
// POST /api/budget/transfer
router.post('/transfer', budgetController.transferBetweenCategories);

// Rota para obter histórico de transações
// GET /api/budget/transactions
router.get('/transactions', budgetController.getTransactionHistory);

module.exports = router;