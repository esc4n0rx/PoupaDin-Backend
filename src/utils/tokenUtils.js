const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { tokenConfig } = require('../config/envConfig'); // NOVA LINHA

/**
 * Utilitários para geração e validação de tokens JWT
 * Versão corrigida com melhor tratamento de configurações
 */
class TokenUtils {
    
    // Gerar Access Token (curta duração)
    static generateAccessToken(payload) {
        try {
            const config = tokenConfig.accessToken;
            
            // Validar payload
            if (!payload || typeof payload !== 'object') {
                throw new Error('Payload deve ser um objeto válido');
            }
            
            // Validar campos obrigatórios
            if (!payload.id || !payload.email) {
                throw new Error('Payload deve conter id e email');
            }
            
            console.log(`🔑 Gerando access token com expiração: ${config.expiresIn}`);
            
            return jwt.sign(
                payload,
                config.secret,
                { 
                    expiresIn: config.expiresIn,
                    issuer: config.issuer,
                    audience: config.audience,
                    subject: payload.id.toString() // Garantir que seja string
                }
            );
        } catch (error) {
            console.error('❌ Erro ao gerar access token:', error.message);
            throw new Error(`Falha na geração do access token: ${error.message}`);
        }
    }
    
    // Gerar Refresh Token (longa duração)
    static generateRefreshToken(payload) {
        try {
            const config = tokenConfig.refreshToken;
            
            // Validar payload
            if (!payload || typeof payload !== 'object') {
                throw new Error('Payload deve ser um objeto válido');
            }
            
            // Validar campos obrigatórios
            if (!payload.id || !payload.email) {
                throw new Error('Payload deve conter id e email');
            }
            
            console.log(`🔑 Gerando refresh token com expiração: ${config.expiresIn}`);
            
            return jwt.sign(
                payload,
                config.secret,
                { 
                    expiresIn: config.expiresIn,
                    issuer: config.issuer,
                    audience: config.audience,
                    subject: payload.id.toString() // Garantir que seja string
                }
            );
        } catch (error) {
            console.error('❌ Erro ao gerar refresh token:', error.message);
            throw new Error(`Falha na geração do refresh token: ${error.message}`);
        }
    }
    
    // Verificar Access Token
    static verifyAccessToken(token) {
        try {
            const config = tokenConfig.accessToken;
            
            if (!token) {
                throw new Error('Token não fornecido');
            }
            
            return jwt.verify(token, config.secret, {
                issuer: config.issuer,
                audience: config.audience
            });
        } catch (error) {
            // Re-throw com informação mais específica mantendo o tipo original
            if (error.name === 'TokenExpiredError') {
                const expiredError = new Error('Token expirado');
                expiredError.name = 'TokenExpiredError';
                throw expiredError;
            } else if (error.name === 'JsonWebTokenError') {
                const invalidError = new Error('Token inválido');
                invalidError.name = 'JsonWebTokenError';
                throw invalidError;
            }
            throw error;
        }
    }
    
    // Verificar Refresh Token
    static verifyRefreshToken(token) {
        try {
            const config = tokenConfig.refreshToken;
            
            if (!token) {
                throw new Error('Refresh token não fornecido');
            }
            
            return jwt.verify(token, config.secret, {
                issuer: config.issuer,
                audience: config.audience
            });
        } catch (error) {
            // Re-throw com informação mais específica mantendo o tipo original
            if (error.name === 'TokenExpiredError') {
                const expiredError = new Error('Refresh token expirado');
                expiredError.name = 'TokenExpiredError';
                throw expiredError;
            } else if (error.name === 'JsonWebTokenError') {
                const invalidError = new Error('Refresh token inválido');
                invalidError.name = 'JsonWebTokenError';
                throw invalidError;
            }
            throw error;
        }
    }
    
    // Gerar token aleatório para hash
    static generateRandomToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    // Hash do refresh token para armazenamento seguro
    static async hashRefreshToken(token) {
        const saltRounds = 12; // Mais seguro para tokens de longa duração
        return bcrypt.hash(token, saltRounds);
    }
    
    // Comparar refresh token com hash armazenado
    static async compareRefreshToken(token, hashedToken) {
        return bcrypt.compare(token, hashedToken);
    }
    
    // Extrair informações do token sem verificar (para debug)
    static decodeToken(token) {
        return jwt.decode(token, { complete: true });
    }
    
    // Verificar se token está próximo do vencimento (para renovação proativa)
    static isTokenExpiringSoon(token, thresholdMinutes = 5) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) return true;
            
            const expirationTime = decoded.exp * 1000; // Converter para ms
            const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
            
            return expirationTime <= thresholdTime;
        } catch (error) {
            return true; // Se não conseguir decodificar, assumir que precisa renovar
        }
    }
    
    // NOVA FUNÇÃO: Debug de configurações (sem expor secrets)
    static getConfigInfo() {
        return {
            accessTokenExpiration: tokenConfig.accessToken.expiresIn,
            refreshTokenExpiration: tokenConfig.refreshToken.expiresIn,
            issuer: tokenConfig.accessToken.issuer,
            audience: tokenConfig.accessToken.audience
        };
    }
}

module.exports = TokenUtils;