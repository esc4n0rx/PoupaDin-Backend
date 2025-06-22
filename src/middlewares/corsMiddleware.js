const cors = require('cors');
const { corsConfig, developmentCorsConfig, getAllowedOrigins } = require('../config/corsConfig');

/**
 * Middleware de CORS configurado para o PoupaDin
 */

// Aplicar configuração baseada no ambiente
const getCorsMiddleware = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        console.log('🔓 CORS: Modo desenvolvimento - origens permissivas');
        return cors(developmentCorsConfig);
    } else {
        console.log('🔒 CORS: Modo produção - origens restritas');
        const allowedOrigins = getAllowedOrigins();
        console.log('✅ CORS: Origens permitidas:', allowedOrigins);
        return cors(corsConfig);
    }
};

// Middleware de log para debugging de CORS
const corsDebugMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;
    
    // Log apenas para requisições OPTIONS (preflight) ou quando há problemas
    if (method === 'OPTIONS' || origin) {
        console.log(`🌐 CORS: ${method} request from origin: ${origin || 'no origin'}`);
    }
    
    next();
};

// Middleware para tratar erros de CORS
const corsErrorHandler = (err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        console.error('❌ CORS Error:', err.message);
        return res.status(403).json({
            error: 'CORS Error',
            message: 'Origem não permitida',
            code: 'CORS_NOT_ALLOWED'
        });
    }
    next(err);
};

module.exports = {
    getCorsMiddleware,
    corsDebugMiddleware,
    corsErrorHandler
};