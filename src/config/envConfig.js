// src/config/envConfig.js

/**
 * Configurações centralizadas do ambiente
 * Garante que todas as variáveis necessárias estejam definidas
 */

// Verificar variáveis obrigatórias
const requiredEnvVars = [
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    throw new Error('Configuração incompleta - variáveis de ambiente obrigatórias ausentes');
}

// Configurações de token com valores padrão seguros
const tokenConfig = {
    // Access Token - curta duração para segurança
    accessToken: {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '15m', // 15 minutos por padrão
        issuer: 'poupadin-api',
        audience: 'poupadin-app'
    },
    
    // Refresh Token - longa duração para conveniência
    refreshToken: {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '90d', // 7 dias por padrão
        issuer: 'poupadin-api',
        audience: 'poupadin-app'
    }
};

// Validar formato dos valores de expiração
const validateExpirationFormat = (value, tokenType) => {
    // Regex para validar formato: número + unidade (s, m, h, d) ou apenas número
    const validFormats = /^(\d+[smhd]?|\d+)$/;
    
    if (!validFormats.test(value)) {
        throw new Error(
            `Formato inválido para ${tokenType}_EXPIRATION: "${value}". ` +
            'Use formatos como: "15m", "1h", "7d", "3600" (segundos)'
        );
    }
};

// Validar formatos
validateExpirationFormat(tokenConfig.accessToken.expiresIn, 'ACCESS_TOKEN');
validateExpirationFormat(tokenConfig.refreshToken.expiresIn, 'REFRESH_TOKEN');

// Configurações do banco de dados
const databaseConfig = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
};

// Verificar configurações do Supabase
if (!databaseConfig.supabaseUrl || !databaseConfig.supabaseAnonKey) {
    console.warn('⚠️ Configurações do Supabase não encontradas');
}

// Configurações de email
const emailConfig = {
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL
};

// Configurações do Firebase (opcional)
const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
};

// Log das configurações (sem mostrar secrets)
console.log('⚙️ Configurações carregadas:');
console.log(`   - Access Token expira em: ${tokenConfig.accessToken.expiresIn}`);
console.log(`   - Refresh Token expira em: ${tokenConfig.refreshToken.expiresIn}`);
console.log(`   - Supabase: ${databaseConfig.supabaseUrl ? '✅' : '❌'}`);
console.log(`   - Email (Resend): ${emailConfig.resendApiKey ? '✅' : '❌'}`);
console.log(`   - Firebase: ${firebaseConfig.projectId ? '✅' : '❌'}`);

module.exports = {
    tokenConfig,
    databaseConfig,
    emailConfig,
    firebaseConfig,
    
    // Getters para fácil acesso
    get accessTokenSecret() { return tokenConfig.accessToken.secret; },
    get refreshTokenSecret() { return tokenConfig.refreshToken.secret; },
    get accessTokenExpiration() { return tokenConfig.accessToken.expiresIn; },
    get refreshTokenExpiration() { return tokenConfig.refreshToken.expiresIn; }
};