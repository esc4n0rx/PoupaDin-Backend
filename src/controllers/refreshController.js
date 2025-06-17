const TokenUtils = require('../utils/tokenUtils');
const RefreshTokenModel = require('../models/refreshTokenModel');
const userModel = require('../models/userModel');
const { z } = require('zod');

// Schema para validação do refresh token
const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token é obrigatório")
});

/**
 * Controller para renovação de tokens
 */
class RefreshController {
    
    // Renovar access token usando refresh token
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = refreshTokenSchema.parse(req.body);
            
            // 1. Verificar se o refresh token é válido (estrutura JWT)
            let decoded;
            try {
                decoded = TokenUtils.verifyRefreshToken(refreshToken);
            } catch (jwtError) {
                return res.status(401).json({ 
                    message: 'Refresh token inválido ou expirado.',
                    code: 'INVALID_REFRESH_TOKEN'
                });
            }
            
            // 2. Validar se o user ID é um UUID válido
            if (!RefreshTokenModel.isValidUUID(decoded.id)) {
                return res.status(401).json({ 
                    message: 'Token contém ID de usuário inválido.',
                    code: 'INVALID_USER_ID'
                });
            }
            
            // 3. Verificar se o refresh token existe no banco e está válido
            const tokenRecord = await RefreshTokenModel.findValidToken(decoded.id, refreshToken);
            if (!tokenRecord) {
                return res.status(401).json({ 
                    message: 'Refresh token não encontrado ou expirado.',
                    code: 'REFRESH_TOKEN_NOT_FOUND'
                });
            }
            
            // 4. Verificar se o usuário ainda existe e está ativo
            const user = await userModel.findByEmail(decoded.email);
            if (!user) {
                // Revogar token se usuário não existe mais
                await RefreshTokenModel.revoke(tokenRecord.id);
                return res.status(401).json({ 
                    message: 'Usuário não encontrado.',
                    code: 'USER_NOT_FOUND'
                });
            }
            
            // 5. Gerar novo access token
            const newAccessToken = TokenUtils.generateAccessToken({
                id: user.id,
                email: user.email
            });
            
            // 6. Gerar novo refresh token (rotação)
            const newRefreshToken = TokenUtils.generateRefreshToken({
                id: user.id,
                email: user.email
            });
            
            // 7. Revogar o refresh token atual
            await RefreshTokenModel.revoke(tokenRecord.id);
            
            // 8. Salvar novo refresh token
            await RefreshTokenModel.create(user.id, newRefreshToken);
            
            // 9. Limitar número de tokens por usuário
            await RefreshTokenModel.limitUserTokens(user.id, 5);
            
            console.log(`🔄 Token renovado para usuário: ${user.email} (${user.id})`);
            
            res.status(200).json({
                message: 'Token renovado com sucesso!',
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    initial_setup_completed: user.initial_setup_completed || false
                }
            });
            
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    message: 'Dados inválidos.', 
                    errors: error.errors 
                });
            }
            
            console.error('Erro na renovação do token:', error);
            res.status(500).json({ 
                message: 'Erro interno no servidor.',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    // Logout - revogar refresh token
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ 
                    message: 'Refresh token é obrigatório para logout.' 
                });
            }
            
            try {
                // Verificar e decodificar o refresh token
                const decoded = TokenUtils.verifyRefreshToken(refreshToken);
                
                // Validar UUID
                if (RefreshTokenModel.isValidUUID(decoded.id)) {
                    // Buscar e revogar o token
                    const tokenRecord = await RefreshTokenModel.findValidToken(decoded.id, refreshToken);
                    if (tokenRecord) {
                        await RefreshTokenModel.revoke(tokenRecord.id);
                    }
                }
                
                console.log(`👋 Logout realizado para usuário: ${decoded.email} (${decoded.id})`);
                
            } catch (jwtError) {
                // Mesmo com erro no JWT, retornar sucesso (idempotência)
                console.log('⚠️ Tentativa de logout com token inválido');
            }
            
            res.status(200).json({ 
                message: 'Logout realizado com sucesso!' 
            });
            
        } catch (error) {
            console.error('Erro no logout:', error);
            res.status(500).json({ 
                message: 'Erro interno no servidor.' 
            });
        }
    }
    
    // Logout de todos os dispositivos - revogar todos os refresh tokens
    static async logoutAll(req, res) {
        try {
            const userId = req.user.id; // Vem do middleware de autenticação
            
            // Validar UUID
            if (!RefreshTokenModel.isValidUUID(userId)) {
                return res.status(400).json({ 
                    message: 'ID de usuário inválido.' 
                });
            }
            
            await RefreshTokenModel.revokeAllUserTokens(userId);
            
            console.log(`🚪 Logout de todos os dispositivos para usuário ID: ${userId}`);
            
            res.status(200).json({ 
                message: 'Logout realizado de todos os dispositivos!'
            });
            
        } catch (error) {
            console.error('Erro no logout de todos os dispositivos:', error);
            res.status(500).json({ 
                message: 'Erro interno no servidor.' 
            });
        }
    }
    
    // Verificar status do token (para debugging)
    static async tokenStatus(req, res) {
        try {
            const userId = req.user.id;
            
            // Validar UUID
            if (!RefreshTokenModel.isValidUUID(userId)) {
                return res.status(400).json({ 
                    message: 'ID de usuário inválido.' 
                });
            }
            
            const activeTokensCount = await RefreshTokenModel.countUserActiveTokens(userId);
            
            res.status(200).json({
                userId: userId,
                activeRefreshTokens: activeTokensCount,
                maxTokensAllowed: 5
            });
            
        } catch (error) {
            console.error('Erro ao verificar status do token:', error);
            res.status(500).json({ 
                message: 'Erro interno no servidor.' 
            });
        }
    }
}

module.exports = RefreshController;