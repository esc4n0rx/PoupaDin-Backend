/**
 * Configuração de CORS para o PoupaDin Backend
 * Permite origens específicas baseadas no ambiente
 */

// Origens permitidas por ambiente
const getAllowedOrigins = () => {
    const baseOrigins = [
        'https://poupadin.space',           // Frontend produção
        'https://www.poupadin.space',       // Frontend produção com www
        'https://app.poupadin.space',       // App web produção
    ];

    // Em desenvolvimento, permitir localhost
    if (process.env.NODE_ENV !== 'production') {
        baseOrigins.push(
            'http://localhost:3000',        // Next.js dev
            'http://localhost:3001',        // React dev alternativo
            'http://127.0.0.1:3000',        // Localhost alternativo
            'http://192.168.1.1:3000',      // IP local da rede
        );
    }

    // Permitir origens customizadas via variável de ambiente
    if (process.env.ALLOWED_ORIGINS) {
        const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
        baseOrigins.push(...customOrigins);
    }

    return baseOrigins;
};

// Configuração principal do CORS
const corsConfig = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        
        // Permitir requisições sem origin (ex: mobile apps, Postman)
        if (!origin) {
            return callback(null, true);
        }
        
        // Verificar se a origin está na lista permitida
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origem não permitida: ${origin}`);
            callback(new Error(`CORS: Origem não permitida: ${origin}`));
        }
    },
    
    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    
    // Headers permitidos
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
    ],
    
    // Headers expostos para o cliente
    exposedHeaders: [
        'X-Total-Count',
        'X-Token-Refresh-Suggested',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining'
    ],
    
    // Permitir cookies e credenciais
    credentials: true,
    
    // Cache do preflight (OPTIONS) por 24 horas
    maxAge: 86400,
    
    // Permitir preflight para todas as rotas
    preflightContinue: false,
    
    // Status code para OPTIONS requests bem-sucedidas
    optionsSuccessStatus: 200
};

// Configuração para desenvolvimento com CORS mais permissivo
const developmentCorsConfig = {
    origin: true, // Permitir qualquer origem em desenvolvimento
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = {
    corsConfig,
    developmentCorsConfig,
    getAllowedOrigins
};