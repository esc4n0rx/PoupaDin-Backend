const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Utilitários para geração e validação de tokens JWT
 */
class TokenUtils {
    
    // Gerar Access Token (curta duração)
    static generateAccessToken(payload) {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET não configurado');
        }
        
        return jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { 
                expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
                issuer: 'poupadin-api',
                audience: 'poupadin-app'
            }
        );
    }
    
    // Gerar Refresh Token (longa duração)
    static generateRefreshToken(payload) {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET não configurado');
        }
        
        return jwt.sign(
            payload,
            process.env.REFRESH_TOKEN_SECRET,
            { 
                expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '90d',
                issuer: 'poupadin-api',
                audience: 'poupadin-app'
            }
        );
    }
    
    // Verificar Access Token
    static verifyAccessToken(token) {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET não configurado');
        }
        
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            issuer: 'poupadin-api',
            audience: 'poupadin-app'
        });
    }
    
    // Verificar Refresh Token
    static verifyRefreshToken(token) {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET não configurado');
        }
        
        return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
            issuer: 'poupadin-api',
            audience: 'poupadin-app'
        });
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
}

module.exports = TokenUtils;