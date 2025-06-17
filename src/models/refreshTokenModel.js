const supabase = require('../config/supabaseClient');
const TokenUtils = require('../utils/tokenUtils');

/**
 * Modelo para gerenciar Refresh Tokens
 */
class RefreshTokenModel {
    
    // Criar novo refresh token
    static async create(userId, token) {
        try {
            // Validar se userId é um UUID válido
            if (!this.isValidUUID(userId)) {
                throw new Error('User ID deve ser um UUID válido');
            }
            
            // Hash do token antes de armazenar
            const hashedToken = await TokenUtils.hashRefreshToken(token);
            
            // Calcular data de expiração (90 dias a partir de agora)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 90);
            
            const { data, error } = await supabase
                .from('refresh_tokens')
                .insert([{
                    user_id: userId, // Agora é UUID
                    token_hash: hashedToken,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar refresh token:', error);
            throw error;
        }
    }
    
    // Buscar refresh token válido por usuário e token
    static async findValidToken(userId, token) {
        try {
            // Validar se userId é um UUID válido
            if (!this.isValidUUID(userId)) {
                throw new Error('User ID deve ser um UUID válido');
            }
            
            const { data: tokens, error } = await supabase
                .from('refresh_tokens')
                .select('*')
                .eq('user_id', userId)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Verificar se algum token hash corresponde ao token fornecido
            for (const tokenRecord of tokens) {
                const isValid = await TokenUtils.compareRefreshToken(token, tokenRecord.token_hash);
                if (isValid) {
                    return tokenRecord;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar refresh token:', error);
            throw error;
        }
    }
    
    // Revogar refresh token específico
    static async revoke(tokenId) {
        try {
            const { error } = await supabase
                .from('refresh_tokens')
                .delete()
                .eq('id', tokenId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao revogar refresh token:', error);
            throw error;
        }
    }
    
    // Revogar todos os refresh tokens de um usuário
    static async revokeAllUserTokens(userId) {
        try {
            // Validar se userId é um UUID válido
            if (!this.isValidUUID(userId)) {
                throw new Error('User ID deve ser um UUID válido');
            }
            
            const { error } = await supabase
                .from('refresh_tokens')
                .delete()
                .eq('user_id', userId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao revogar todos os tokens do usuário:', error);
            throw error;
        }
    }
    
    // Limpar tokens expirados
    static async cleanupExpiredTokens() {
        try {
            const { data, error } = await supabase
                .from('refresh_tokens')
                .delete()
                .lt('expires_at', new Date().toISOString())
                .select();
            
            if (error) throw error;
            
            console.log(`🧹 ${data?.length || 0} refresh tokens expirados removidos`);
            return data?.length || 0;
        } catch (error) {
            console.error('Erro ao limpar tokens expirados:', error);
            throw error;
        }
    }
    
    // Contar tokens ativos de um usuário
    static async countUserActiveTokens(userId) {
        try {
            // Validar se userId é um UUID válido
            if (!this.isValidUUID(userId)) {
                return 0;
            }
            
            const { count, error } = await supabase
                .from('refresh_tokens')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .gte('expires_at', new Date().toISOString());
            
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Erro ao contar tokens ativos:', error);
            return 0;
        }
    }
    
    // Limitar número de tokens por usuário (segurança)
    static async limitUserTokens(userId, maxTokens = 5) {
        try {
            // Validar se userId é um UUID válido
            if (!this.isValidUUID(userId)) {
                throw new Error('User ID deve ser um UUID válido');
            }
            
            const { data: tokens, error } = await supabase
                .from('refresh_tokens')
                .select('id, created_at')
                .eq('user_id', userId)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Se exceder o limite, remover os mais antigos
            if (tokens.length >= maxTokens) {
                const tokensToRemove = tokens.slice(maxTokens - 1);
                const idsToRemove = tokensToRemove.map(t => t.id);
                
                const { error: deleteError } = await supabase
                    .from('refresh_tokens')
                    .delete()
                    .in('id', idsToRemove);
                
                if (deleteError) throw deleteError;
                
                console.log(`🔒 ${idsToRemove.length} tokens antigos removidos para usuário ${userId}`);
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao limitar tokens do usuário:', error);
            throw error;
        }
    }

    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return typeof uuid === 'string' && uuidRegex.test(uuid);
    }
}

module.exports = RefreshTokenModel;