const userModel = require('../models/userModel');

const cleanupExpiredResetCodes = async () => {
    try {
        await userModel.deleteExpiredResetCodes();
        console.log('🧹 Códigos de recuperação expirados removidos');
    } catch (error) {
        console.error('❌ Erro ao limpar códigos expirados:', error);
    }
};

module.exports = {
    cleanupExpiredResetCodes
};