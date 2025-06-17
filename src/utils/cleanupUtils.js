const userModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel'); // NOVA LINHA

const cleanupExpiredResetCodes = async () => {
    try {
        await userModel.deleteExpiredResetCodes();
        console.log('🧹 Códigos de recuperação expirados removidos');
    } catch (error) {
        console.error('❌ Erro ao limpar códigos expirados:', error);
    }
};

// NOVA FUNÇÃO: Limpar refresh tokens expirados
const cleanupExpiredRefreshTokens = async () => {
    try {
        const removedCount = await RefreshTokenModel.cleanupExpiredTokens();
        console.log(`🧹 ${removedCount} refresh tokens expirados removidos`);
        return removedCount;
    } catch (error) {
        console.error('❌ Erro ao limpar refresh tokens expirados:', error);
        return 0;
    }
};

// NOVA FUNÇÃO: Limpeza completa (todos os tipos)
const runFullCleanup = async () => {
    console.log('🧹 Iniciando limpeza completa...');
    
    const results = {
        resetCodes: 0,
        refreshTokens: 0
    };
    
    try {
        await cleanupExpiredResetCodes();
        results.resetCodes = 1; // Sucesso
        
        results.refreshTokens = await cleanupExpiredRefreshTokens();
        
        console.log(`✅ Limpeza completa finalizada: ${results.refreshTokens} refresh tokens removidos`);
        return results;
    } catch (error) {
        console.error('❌ Erro na limpeza completa:', error);
        return results;
    }
};

module.exports = {
    cleanupExpiredResetCodes,
    cleanupExpiredRefreshTokens,  // NOVA EXPORTAÇÃO
    runFullCleanup                // NOVA EXPORTAÇÃO
};