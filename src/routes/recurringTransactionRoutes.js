const express = require('express');
const router = express.Router();
const recurringTransactionController = require('../controllers/recurringTransactionController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rota para criar transação recorrente
// POST /api/recurring-transactions
router.post('/', recurringTransactionController.createRecurringTransaction);

// Rota para listar transações recorrentes do usuário
// GET /api/recurring-transactions
router.get('/', recurringTransactionController.getRecurringTransactions);

// Rota para obter transação recorrente específica
// GET /api/recurring-transactions/:id
router.get('/:id', recurringTransactionController.getRecurringTransactionById);

// Rota para atualizar transação recorrente
// PUT /api/recurring-transactions/:id
router.put('/:id', recurringTransactionController.updateRecurringTransaction);

// Rota para deletar transação recorrente
// DELETE /api/recurring-transactions/:id
router.delete('/:id', recurringTransactionController.deleteRecurringTransaction);

// Rota para obter logs de execução
// GET /api/recurring-transactions/:id/logs
router.get('/:id/logs', recurringTransactionController.getExecutionLogs);

// Rota para execução manual (para testes)
// POST /api/recurring-transactions/:id/execute
router.post('/:id/execute', recurringTransactionController.executeManually);

module.exports = router;