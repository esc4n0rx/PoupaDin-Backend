const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rota para criar objetivo
// POST /api/goals
router.post('/', goalController.createGoal);

// Rota para listar objetivos do usuário
// GET /api/goals?include_inactive=true
router.get('/', goalController.getUserGoals);

// Rota para obter estatísticas dos objetivos
// GET /api/goals/statistics
router.get('/statistics', goalController.getGoalStatistics);

// Rota para obter relatório completo
// GET /api/goals/report
router.get('/report', goalController.getGoalsReport);

// Rota para obter objetivo específico
// GET /api/goals/:id
router.get('/:id', goalController.getGoalById);

// Rota para atualizar objetivo
// PUT /api/goals/:id
router.put('/:id', goalController.updateGoal);

// Rota para deletar objetivo
// DELETE /api/goals/:id
router.delete('/:id', goalController.deleteGoal);

// Rota para processar transação (depósito/saque)
// POST /api/goals/transaction
router.post('/transaction', goalController.processTransaction);

// Rota para marcar objetivo como completo
// POST /api/goals/:id/complete
router.post('/:id/complete', goalController.completeGoal);

// Rota para obter histórico de transações de um objetivo
// GET /api/goals/:id/transactions?limit=50
router.get('/:id/transactions', goalController.getGoalTransactions);

module.exports = router;