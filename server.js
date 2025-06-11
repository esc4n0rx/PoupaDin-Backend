require('dotenv').config();
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const recurringTransactionRoutes = require('./src/routes/recurringTransactionRoutes');
const CronService = require('./src/services/cronService');

const app = express();

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);

// Rota de health check
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'API is running',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            budget: '/api/budget',
            recurringTransactions: '/api/recurring-transactions'
        }
    });
});

// Rota para status dos cron jobs (apenas para desenvolvimento)
app.get('/api/system/cron-status', (req, res) => {
    const status = CronService.getTasksStatus();
    res.status(200).json({ cron_tasks: status });
});

// Inicializar serviços de cron
CronService.init();

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Budget API available at http://localhost:${PORT}/api/budget`);
    console.log(`🔄 Recurring Transactions API available at http://localhost:${PORT}/api/recurring-transactions`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recebido, parando serviços...');
    CronService.stopAll();
    server.close(() => {
        console.log('✅ Servidor encerrado graciosamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recebido, parando serviços...');
    CronService.stopAll();
    server.close(() => {
        console.log('✅ Servidor encerrado graciosamente');
        process.exit(0);
    });
});