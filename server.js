require('dotenv').config();
const express = require('express');
const { getCorsMiddleware, corsDebugMiddleware, corsErrorHandler } = require('./src/middlewares/corsMiddleware'); // NOVO
const envConfig = require('./src/config/envConfig');
const authRoutes = require('./src/routes/authRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const recurringTransactionRoutes = require('./src/routes/recurringTransactionRoutes');
const goalRoutes = require('./src/routes/goalRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const userProfileRoutes = require('./src/routes/userProfileRoutes');
const CronService = require('./src/services/cronService');
const { initializeFirebase } = require('./src/config/firebaseConfig');
const { initializeTemplates } = require('./src/scripts/initializeNotificationTemplates');
const { runFullCleanup } = require('./src/utils/cleanupUtils');
const StorageUtils = require('./src/utils/storageUtils');
const TokenUtils = require('./src/utils/tokenUtils'); // CORREÇÃO: import estava faltando

const app = express();

// NOVO: Aplicar CORS antes de qualquer rota
console.log('🌐 Configurando CORS...');
app.use(corsDebugMiddleware);
app.use(getCorsMiddleware());

// Middlewares existentes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API (sem mudanças)
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', userProfileRoutes);

// Rota de health check (atualizada)
app.get('/', (req, res) => {
    const { getAllowedOrigins } = require('./src/config/corsConfig');
    
    res.status(200).json({ 
        status: 'API is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        cors: {
            enabled: true,
            allowedOrigins: getAllowedOrigins()
        },
        tokenConfig: TokenUtils.getConfigInfo(),
        endpoints: {
            auth: '/api/auth',
            budget: '/api/budget',
            recurringTransactions: '/api/recurring-transactions',
            goals: '/api/goals',
            notifications: '/api/notifications',
            profile: '/api/profile'
        }
    });
});

// NOVO: Rota para testar CORS
app.get('/api/cors-test', (req, res) => {
    res.status(200).json({
        message: 'CORS está funcionando!',
        origin: req.headers.origin || 'no origin',
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    });
});

// Rotas de sistema existentes (sem mudanças)
app.get('/api/system/cron-status', (req, res) => {
    const status = CronService.getTasksStatus();
    res.status(200).json({ cron_tasks: status });
});

app.post('/api/system/run-notifications', async (req, res) => {
    try {
        const result = await CronService.runNotificationTasksNow();
        res.status(200).json({ message: 'Tarefas de notificação executadas!', result });
    } catch (error) {
        console.error('Erro ao executar tarefas de notificação:', error);
        res.status(500).json({ message: 'Erro ao executar tarefas de notificação.' });
    }
});

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

app.get('/api/system/storage-status', async (req, res) => {
    try {
        const health = await StorageUtils.checkHealth();
        
        res.status(200).json({
            storage_provider: 'cloudinary',
            status: health.status,
            message: health.message,
            cloud_name: health.cloudName,
            max_file_size: StorageUtils.MAX_FILE_SIZE,
            allowed_types: StorageUtils.ALLOWED_TYPES,
            timestamp: health.timestamp
        });
    } catch (error) {
        console.error('Erro ao verificar status do storage:', error);
        res.status(500).json({ message: 'Erro ao verificar storage' });
    }
});

// NOVO: Middleware de tratamento de erros de CORS
app.use(corsErrorHandler);

// Função de inicialização (sem mudanças)
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

        console.log('🖼️ Configurando Cloudinary...');
        await StorageUtils.initialize();
        
        // Inicializar templates de notificação
        console.log('📋 Inicializando templates de notificação...');
        await initializeTemplates();
        
        // Inicializar serviços de cron
        console.log('⏰ Inicializando serviços de cron...');
        CronService.init();
        
        // Executar limpeza inicial
        console.log('🧹 Executando limpeza inicial...');
        await runFullCleanup();
        
        console.log('✅ Inicialização concluída com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro na inicialização:', error);
        process.exit(1);
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
    console.log(`👤 Profile API available at http://localhost:${PORT}/api/profile`);
    console.log(`🧪 CORS Test available at http://localhost:${PORT}/api/cors-test`);
    
    // Inicializar aplicação
    await initializeApp();
});

// Graceful shutdown (sem mudanças)
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