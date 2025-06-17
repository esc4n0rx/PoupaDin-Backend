require('dotenv').config();
const express = require('express');
const envConfig = require('./src/config/envConfig');
const authRoutes = require('./src/routes/authRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const recurringTransactionRoutes = require('./src/routes/recurringTransactionRoutes');
const goalRoutes = require('./src/routes/goalRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const CronService = require('./src/services/cronService');
const { initializeFirebase } = require('./src/config/firebaseConfig');
const { initializeTemplates } = require('./src/scripts/initializeNotificationTemplates');
const { runFullCleanup } = require('./src/utils/cleanupUtils'); // MODIFICADO

const app = express();

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);

// Rota de health check
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'API is running',
        version: '1.0.0',
        tokenConfig: TokenUtils.getConfigInfo(),
        endpoints: {
            auth: '/api/auth',
            budget: '/api/budget',
            recurringTransactions: '/api/recurring-transactions',
            goals: '/api/goals',
            notifications: '/api/notifications'
        }
    });
});

// Rota para status dos cron jobs (apenas para desenvolvimento)
app.get('/api/system/cron-status', (req, res) => {
    const status = CronService.getTasksStatus();
    res.status(200).json({ cron_tasks: status });
});

// Rota para executar tarefas de notificação manualmente
app.post('/api/system/run-notifications', async (req, res) => {
    try {
        const result = await CronService.runNotificationTasksNow();
        res.status(200).json({ message: 'Tarefas de notificação executadas!', result });
    } catch (error) {
        console.error('Erro ao executar tarefas de notificação:', error);
        res.status(500).json({ message: 'Erro ao executar tarefas de notificação.' });
    }
});

// NOVA ROTA: Executar limpeza manual
app.post('/api/system/cleanup', async (req, res) => {
    try {
        const result = await runFullCleanup();
        res.status(200).json({ 
            message: 'Limpeza executada com sucesso!', 
            result 
        });
    } catch (error) {
        console.error('Erro ao executar limpeza:', error);
        res.status(500).json({ message: 'Erro ao executar limpeza.' });
    }
});

// Função de inicialização
async function initializeApp() {
    try {
        console.log('🚀 Inicializando PoupaDin Backend...');
        
        // Verificar variáveis de ambiente críticas
        const requiredEnvVars = [
            'ACCESS_TOKEN_SECRET',
            'REFRESH_TOKEN_SECRET',
            'ACCESS_TOKEN_EXPIRATION',
            'REFRESH_TOKEN_EXPIRATION'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
            missingVars.forEach(varName => console.error(`   - ${varName}`));
            throw new Error('Configuração incompleta');
        }
        
        console.log('✅ Variáveis de ambiente de autenticação configuradas');
        
        // Inicializar Firebase
        console.log('🔥 Inicializando Firebase...');
        initializeFirebase();
        
        // Inicializar templates de notificação
        console.log('📋 Inicializando templates de notificação...');
        await initializeTemplates();
        
        // Inicializar serviços de cron
        console.log('⏰ Inicializando serviços de cron...');
        CronService.init();
        
        // NOVO: Executar limpeza inicial
        console.log('🧹 Executando limpeza inicial...');
        await runFullCleanup();
        
        console.log('✅ Inicialização concluída com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro na inicialização:', error);
        process.exit(1); // Parar aplicação se configuração estiver incorreta
    }
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔐 Auth API available at http://localhost:${PORT}/api/auth`);
    console.log(`📊 Budget API available at http://localhost:${PORT}/api/budget`);
    console.log(`🔄 Recurring Transactions API available at http://localhost:${PORT}/api/recurring-transactions`);
    console.log(`🎯 Goals API available at http://localhost:${PORT}/api/goals`);
    console.log(`🔔 Notifications API available at http://localhost:${PORT}/api/notifications`);
    
    // Inicializar aplicação
    await initializeApp();
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