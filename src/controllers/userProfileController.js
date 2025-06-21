const UserProfileService = require('../services/userProfileService');
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const RefreshTokenModel = require('../models/refreshTokenModel');
const {
    updateProfileSchema,
    authenticatedPasswordResetSchema
} = require('../schemas/userProfileSchema');

/**
 * Controller para operações do perfil de usuário
 */
class UserProfileController {
    
    // 1. Obter perfil do usuário
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;
            
            const profile = await UserProfileService.getUserProfile(userId);
            
            res.status(200).json({
                message: 'Perfil obtido com sucesso',
                profile
            });
        } catch (error) {
            if (error.message === 'Perfil não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            console.error('Erro ao obter perfil:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
    
    // 2. Atualizar perfil
    static async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const validatedData = updateProfileSchema.parse(req.body);
            
            const updatedProfile = await UserProfileService.updateProfile(userId, validatedData);
            
            res.status(200).json({
                message: 'Perfil atualizado com sucesso!',
                profile: updatedProfile
            });
        } catch (error) {
            if (error instanceof require('zod').ZodError) {
                return res.status(400).json({
                    message: 'Erro de validação',
                    errors: error.errors
                });
            }
            if (error.message === 'Perfil não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            console.error('Erro ao atualizar perfil:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
    
    // 3. Upload de avatar
    static async uploadAvatar(req, res) {
        try {
            const userId = req.user.id;
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({
                    message: 'Nenhum arquivo foi enviado'
                });
            }
            
            const result = await UserProfileService.uploadAvatar(userId, file);
            
            res.status(200).json({
                message: 'Avatar atualizado com sucesso!',
                avatar: result
            });
        } catch (error) {
            console.error('Erro no upload de avatar:', error);
            res.status(500).json({ 
                message: error.message || 'Erro interno no servidor' 
            });
        }
    }
    
    // 4. Remover avatar
    static async removeAvatar(req, res) {
        try {
            const userId = req.user.id;
            
            await UserProfileService.removeAvatar(userId);
            
            res.status(200).json({
                message: 'Avatar removido com sucesso!'
            });
        } catch (error) {
            if (error.message === 'Perfil não encontrado' || 
                error.message === 'Usuário não possui avatar') {
                return res.status(400).json({ message: error.message });
            }
            console.error('Erro ao remover avatar:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
    
    // 5. Reset de senha autenticado
    static async resetPasswordAuthenticated(req, res) {
        try {
            const userId = req.user.id;
            const validatedData = authenticatedPasswordResetSchema.parse(req.body);
            
            // Buscar usuário atual
            const user = await userModel.findByEmail(req.user.email);
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }
            
            // Verificar senha atual
            const isCurrentPasswordValid = await comparePassword(
                validatedData.current_password, 
                user.password_hash
            );
            
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ 
                    message: 'Senha atual incorreta',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }
            
            // Verificar se nova senha é diferente da atual
            const isSamePassword = await comparePassword(
                validatedData.new_password, 
                user.password_hash
            );
            
            if (isSamePassword) {
                return res.status(400).json({ 
                    message: 'A nova senha deve ser diferente da senha atual',
                    code: 'SAME_PASSWORD'
                });
            }
            
            // Hash da nova senha
            const newPasswordHash = await hashPassword(validatedData.new_password);
            
            // Atualizar senha
            await userModel.updatePassword(userId, newPasswordHash);
            
            // Revogar todos os refresh tokens por segurança
            await RefreshTokenModel.revokeAllUserTokens(userId);
            
            console.log(`🔐 Senha alterada via autenticação para usuário: ${user.email} (${userId})`);
            
            res.status(200).json({
                message: 'Senha alterada com sucesso! Faça login novamente.',
                success: true,
                logoutRequired: true
            });
            
        } catch (error) {
            if (error instanceof require('zod').ZodError) {
                return res.status(400).json({
                    message: 'Erro de validação',
                    errors: error.errors
                });
            }
            console.error('Erro ao alterar senha:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
    
    // 6. Buscar perfis públicos
    static async searchProfiles(req, res) {
        try {
            const { search = '', limit = 20, offset = 0 } = req.query;
            
            const profiles = await UserProfileService.searchPublicProfiles(
                search, 
                parseInt(limit), 
                parseInt(offset)
            );
            
            res.status(200).json({
                profiles,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: profiles.length === parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erro ao buscar perfis:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
    
    // 7. Obter perfil público por ID
    static async getPublicProfile(req, res) {
        try {
            const { userId } = req.params;
            
            const profile = await UserProfileService.getUserProfile(userId);
            
            // Verificar se perfil é público
            if (!profile.privacy_settings?.profile_visible) {
                return res.status(403).json({ 
                    message: 'Este perfil é privado' 
                });
            }
            
            // Remover informações sensíveis para visualização pública
            const publicProfile = {
                user_id: profile.user_id,
                name: profile.name,
                bio: profile.bio,
                location: profile.location,
                website: profile.website,
                avatar_url: profile.avatar_url,
                avatar_urls: profile.avatar_urls,
                created_at: profile.created_at,
                // Mostrar email e telefone apenas se público
                email: profile.privacy_settings?.email_visible ? profile.users?.email : null,
                phone: profile.privacy_settings?.phone_visible ? profile.phone : null
            };
            
            res.status(200).json({
                message: 'Perfil público obtido com sucesso',
                profile: publicProfile
            });
        } catch (error) {
            if (error.message === 'Perfil não encontrado') {
                return res.status(404).json({ message: 'Perfil não encontrado' });
            }
            console.error('Erro ao obter perfil público:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    }
}

module.exports = UserProfileController;